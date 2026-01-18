/**
 * Express server with middleware, OpenAPI, and API routes
 */

import express, { type Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import type { Options } from 'swagger-jsdoc';
import helmet from 'helmet';
import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { diff, streamDiff, analyzeText, summarizeChanges } from './core.js';
import type { DiffOptions } from './core.js';
import { VERSION, diffCache, diffRateLimiter, apiRateLimiter, metrics } from './utils.js';
import {
  computeDiffInsights,
  getAllChangeIndices,
} from './core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Express Request Type Extension
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

// ============================================================================
// Middleware
// ============================================================================

export function requestId(req: Request, res: Response, next: NextFunction) {
  req.id = randomBytes(4).toString('hex');
  res.setHeader('X-Request-ID', req.id);
  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const requestId = req.id || 'unknown';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const isError = res.statusCode >= 400;
    
    metrics.record(`${req.method} ${req.path}`, duration, isError);
    
    console.log(
      `[${timestamp}] [${requestId}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: 'Internal server error',
    errorCode: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    requestId: req.id,
  });
}

export function validateDiffRequest(req: Request, res: Response, next: NextFunction) {
  const { original, modified, options } = req.body;

  if (original === undefined || modified === undefined) {
    return res.status(400).json({
      error: 'Missing required fields',
      errorCode: 'MISSING_FIELDS',
      details: 'Both "original" and "modified" fields are required',
      requestId: req.id,
    });
  }

  if (typeof original !== 'string') {
    return res.status(400).json({
      error: 'Invalid field type',
      errorCode: 'INVALID_TYPE',
      details: '"original" must be a string',
      requestId: req.id,
    });
  }

  if (typeof modified !== 'string') {
    return res.status(400).json({
      error: 'Invalid field type',
      errorCode: 'INVALID_TYPE',
      details: '"modified" must be a string',
      requestId: req.id,
    });
  }

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (original.length > MAX_SIZE) {
    return res.status(400).json({
      error: 'Request too large',
      errorCode: 'PAYLOAD_TOO_LARGE',
      details: `"original" exceeds maximum size of ${MAX_SIZE} bytes`,
      requestId: req.id,
    });
  }

  if (modified.length > MAX_SIZE) {
    return res.status(400).json({
      error: 'Request too large',
      errorCode: 'PAYLOAD_TOO_LARGE',
      details: `"modified" exceeds maximum size of ${MAX_SIZE} bytes`,
      requestId: req.id,
    });
  }

  if (options !== undefined) {
    if (typeof options !== 'object' || Array.isArray(options)) {
      return res.status(400).json({
        error: 'Invalid options',
        errorCode: 'INVALID_OPTIONS',
        details: '"options" must be an object',
        requestId: req.id,
      });
    }

    if (options.granularity !== undefined) {
      const validGranularities = ['line', 'word', 'character'];
      if (!validGranularities.includes(options.granularity)) {
        return res.status(400).json({
          error: 'Invalid granularity',
          errorCode: 'INVALID_GRANULARITY',
          details: `granularity must be one of: ${validGranularities.join(', ')}`,
          requestId: req.id,
        });
      }
    }

    if (options.ignoreWhitespace !== undefined && typeof options.ignoreWhitespace !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid option type',
        errorCode: 'INVALID_OPTION_TYPE',
        details: '"ignoreWhitespace" must be a boolean',
        requestId: req.id,
      });
    }

    if (options.ignoreCase !== undefined && typeof options.ignoreCase !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid option type',
        errorCode: 'INVALID_OPTION_TYPE',
        details: '"ignoreCase" must be a boolean',
        requestId: req.id,
      });
    }
  }

  next();
}

export function rateLimiter(limiter: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';
    const result = limiter.check(identifier);

    if (!result.allowed) {
      res.setHeader('X-RateLimit-Limit', limiter.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
      return res.status(429).json({
        error: 'Too many requests',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        requestId: req.id,
      });
    }

    res.setHeader('X-RateLimit-Limit', limiter.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
    next();
  };
}

// ============================================================================
// OpenAPI Configuration
// ============================================================================

const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Text Diff Tool API',
      version: '1.0.0',
      description: 'Modern text diff API with advanced features including caching, rate limiting, and real-time computation',
      contact: {
        name: 'API Support',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        DiffOptions: {
          type: 'object',
          properties: {
            granularity: {
              type: 'string',
              enum: ['line', 'word', 'character', 'sentence', 'paragraph'],
              default: 'line',
              description: 'Diff granularity level',
            },
            ignoreWhitespace: {
              type: 'boolean',
              default: false,
              description: 'Ignore whitespace differences',
            },
            ignoreCase: {
              type: 'boolean',
              default: false,
              description: 'Ignore case differences',
            },
            semanticAnalysis: {
              type: 'boolean',
              default: false,
              description: 'Enable semantic analysis for better text understanding',
            },
            similarityThreshold: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              default: 0.5,
              description: 'Minimum similarity threshold for semantic matching',
            },
          },
        },
        DiffChange: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['added', 'removed', 'modified', 'unchanged'],
            },
            original: {
              type: 'string',
              nullable: true,
            },
            modified: {
              type: 'string',
              nullable: true,
            },
            originalLine: {
              type: 'number',
              nullable: true,
              description: 'Line number in original (1-indexed)',
            },
            modifiedLine: {
              type: 'number',
              nullable: true,
              description: 'Line number in modified (1-indexed)',
            },
            similarity: {
              type: 'number',
              nullable: true,
              minimum: 0,
              maximum: 1,
              description: 'Semantic similarity score for modified changes',
            },
            explanation: {
              type: 'string',
              nullable: true,
              description: 'Explanation of the change for agent understanding',
            },
            keyWords: {
              type: 'object',
              nullable: true,
              properties: {
                added: {
                  type: 'array',
                  items: { type: 'string' },
                },
                removed: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
          required: ['type'],
        },
        DiffStats: {
          type: 'object',
          properties: {
            added: { type: 'number' },
            removed: { type: 'number' },
            modified: { type: 'number' },
            unchanged: { type: 'number' },
          },
        },
        DiffResult: {
          type: 'object',
          properties: {
            changes: {
              type: 'array',
              items: { $ref: '#/components/schemas/DiffChange' },
            },
            stats: { $ref: '#/components/schemas/DiffStats' },
            meta: {
              type: 'object',
              properties: {
                duration: { type: 'number', description: 'Computation time in ms' },
                timestamp: { type: 'string', format: 'date-time' },
                options: { $ref: '#/components/schemas/DiffOptions' },
                cached: { type: 'boolean' },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            errorCode: { type: 'string' },
            details: { type: 'string' },
            message: { type: 'string' },
            requestId: { type: 'string' },
          },
        },
      },
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check and system information',
      },
      {
        name: 'Diff',
        description: 'Text diff operations',
      },
      {
        name: 'Metrics',
        description: 'Performance metrics and statistics',
      },
    ],
  },
  apis: [
    join(__dirname, './server.ts'),
    join(__dirname, './**/*.ts'),
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();
const DEFAULT_PORT = 3000;
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Monaco Editor
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for Monaco Editor
}));

// Middleware
app.use(requestId);
app.use(requestLogger);
app.use(express.json({ limit: '20mb' }));
app.use(express.static(join(__dirname, '../public')));

// CORS headers
app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================================================
// API Routes
// ============================================================================

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     description: Returns detailed health status and system information
 *     responses:
 *       200:
 *         description: Service is healthy
 */
app.get('/api/health', rateLimiter(apiRateLimiter), (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const cacheStats = diffCache.getStats();

  res.json({
    status: 'ok',
    version: VERSION,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    },
    cache: cacheStats,
    nodeVersion: process.version,
    platform: process.platform,
  });
});

/**
 * @swagger
 * /api/version:
 *   get:
 *     summary: Get API version
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Version information
 */
app.get('/api/version', rateLimiter(apiRateLimiter), (req: Request, res: Response) => {
  res.json({
    version: VERSION,
    name: 'text-diff-tool',
    apiVersion: 'v1',
  });
});

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: Get performance metrics
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Performance metrics and statistics
 */
app.get('/api/metrics', rateLimiter(apiRateLimiter), (req: Request, res: Response) => {
  res.json({
    metrics: metrics.getAll(),
    cache: diffCache.getStats(),
    rateLimit: {
      diff: diffRateLimiter.getStats(),
      api: apiRateLimiter.getStats(),
    },
  });
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Text Diff Tool API Documentation',
}));

// API documentation endpoint (JSON)
app.get('/api/docs', (req: Request, res: Response) => {
  res.json({
    name: 'Text Diff Tool API',
    version: VERSION,
    endpoints: {
      'GET /api/health': {
        description: 'Health check endpoint',
        response: {
          status: 'ok',
          version: 'string',
          timestamp: 'ISO string',
          uptime: 'number (seconds)',
        },
      },
      'GET /api/version': {
        description: 'Get API version information',
        response: {
          version: 'string',
          name: 'string',
        },
      },
      'POST /api/diff': {
        description: 'Compute diff between two texts',
        request: {
          original: 'string (required)',
          modified: 'string (required)',
          options: {
            granularity: "'line' | 'word' | 'character' (default: 'line')",
            ignoreWhitespace: 'boolean (default: false)',
            ignoreCase: 'boolean (default: false)',
          },
        },
        response: {
          changes: 'array',
          stats: 'object',
        },
        limits: {
          maxSize: '10MB per field',
        },
      },
    },
  });
});

/**
 * @swagger
 * /api/diff:
 *   post:
 *     summary: Compute diff between two texts
 *     tags: [Diff]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - original
 *               - modified
 *             properties:
 *               original:
 *                 type: string
 *               modified:
 *                 type: string
 *               options:
 *                 $ref: '#/components/schemas/DiffOptions'
 *     responses:
 *       200:
 *         description: Diff result
 *       400:
 *         description: Invalid request
 *       429:
 *         description: Rate limit exceeded
 */
app.post(
  '/api/diff',
  rateLimiter(diffRateLimiter),
  validateDiffRequest,
  (req: Request, res: Response) => {
    try {
      const { original, modified, options } = req.body as {
        original: string;
        modified: string;
        options?: DiffOptions;
      };

      const opts = options || {};
      const startTime = Date.now();

      // Check cache first
      const cached = diffCache.get(original, modified, opts);
      if (cached) {
        const duration = Date.now() - startTime;
        res.setHeader('X-Cache', 'HIT');
        return res.json({
          ...cached,
          meta: {
            duration,
            timestamp: new Date().toISOString(),
            options: opts,
            cached: true,
          },
        });
      }

      // Compute diff
      const result = diff(original, modified, opts);
      const duration = Date.now() - startTime;

      // Cache result
      if (duration < 5000 && result.changes.length < 10000) {
        diffCache.set(original, modified, opts, result);
      }

      res.setHeader('X-Cache', 'MISS');
      res.json({
        ...result,
        meta: {
          duration,
          timestamp: new Date().toISOString(),
          options: opts,
          cached: false,
        },
      });
    } catch (error) {
      console.error('Diff computation error:', error);
      res.status(500).json({
        error: 'Failed to compute diff',
        errorCode: 'DIFF_COMPUTATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id,
      });
    }
  }
);

/**
 * Advanced diff endpoint with insights
 */
app.post(
  '/api/diff/advanced',
  rateLimiter(diffRateLimiter),
  validateDiffRequest,
  (req: Request, res: Response) => {
    try {
      const { original, modified, options } = req.body as {
        original: string;
        modified: string;
        options?: DiffOptions;
      };

      const opts = options || {};
      const startTime = Date.now();
      const result = diff(original, modified, opts);
      const duration = Date.now() - startTime;

      const insights = computeDiffInsights(result);
      const changeIndices = getAllChangeIndices(result.changes);

      res.json({
        ...result,
        insights,
        navigation: {
          totalChanges: changeIndices.length,
          changeIndices,
        },
        meta: {
          duration,
          timestamp: new Date().toISOString(),
          options: opts,
        },
      });
    } catch (error) {
      console.error('Advanced diff error:', error);
      res.status(500).json({
        error: 'Failed to compute advanced diff',
        errorCode: 'ADVANCED_DIFF_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id,
      });
    }
  }
);

/**
 * Real-time streaming diff endpoint (Server-Sent Events)
 */
app.post('/api/diff/stream', rateLimiter(diffRateLimiter), validateDiffRequest, async (req: Request, res: Response) => {
  try {
    const { original, modified, options } = req.body as {
      original: string;
      modified: string;
      options?: DiffOptions;
    };

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    const opts = { ...options, semanticAnalysis: options?.semanticAnalysis ?? true };
    let lastResult: any = null;

    try {
      for await (const chunk of streamDiff(original, modified, opts)) {
        if (chunk.complete && chunk.partial) {
          // Final result with analysis
          const insights = computeDiffInsights(chunk.partial);
          const summary = summarizeChanges(chunk.partial);
          const originalAnalysis = analyzeText(original);
          const modifiedAnalysis = analyzeText(modified);

          lastResult = {
            ...chunk.partial,
            insights,
            summary,
            analysis: {
              original: originalAnalysis,
              modified: modifiedAnalysis,
            },
            meta: {
              timestamp: new Date().toISOString(),
              options: opts,
            },
          };

          res.write(`data: ${JSON.stringify({ type: 'complete', data: lastResult })}\n\n`);
        } else if (chunk.partial) {
          res.write(`data: ${JSON.stringify({ type: 'progress', progress: chunk.progress, partial: chunk.partial })}\n\n`);
        }
      }
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
    } finally {
      res.end();
    }
  } catch (error) {
    console.error('Stream diff error:', error);
    res.status(500).json({
      error: 'Failed to stream diff',
      errorCode: 'STREAM_DIFF_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      requestId: req.id,
    });
  }
});

/**
 * Text analysis endpoint
 */
app.post('/api/analyze', rateLimiter(apiRateLimiter), (req: Request, res: Response) => {
  try {
    const { text } = req.body as { text: string };

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        errorCode: 'INVALID_FIELD',
        details: '"text" field is required and must be a string',
        requestId: req.id,
      });
    }

    const analysis = analyzeText(text);
    res.json({
      analysis,
      meta: {
        timestamp: new Date().toISOString(),
        textLength: text.length,
      },
    });
  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze text',
      errorCode: 'ANALYSIS_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      requestId: req.id,
    });
  }
});

/**
 * Enhanced diff endpoint with semantic analysis and agent-friendly output
 */
app.post(
  '/api/diff/semantic',
  rateLimiter(diffRateLimiter),
  validateDiffRequest,
  (req: Request, res: Response) => {
    try {
      const { original, modified, options } = req.body as {
        original: string;
        modified: string;
        options?: DiffOptions;
      };

      const opts = {
        ...options,
        semanticAnalysis: true,
        similarityThreshold: options?.similarityThreshold || 0.5,
      };
      const startTime = Date.now();

      // Check cache
      const cached = diffCache.get(original, modified, opts);
      if (cached) {
        const duration = Date.now() - startTime;
        res.setHeader('X-Cache', 'HIT');
        const insights = computeDiffInsights(cached);
        const summary = summarizeChanges(cached);
        return res.json({
          ...cached,
          insights,
          summary,
          analysis: {
            original: analyzeText(original),
            modified: analyzeText(modified),
          },
          meta: {
            duration,
            timestamp: new Date().toISOString(),
            options: opts,
            cached: true,
          },
        });
      }

      // Compute diff with semantic analysis
      const result = diff(original, modified, opts);
      const duration = Date.now() - startTime;

      // Cache result
      if (duration < 5000 && result.changes.length < 10000) {
        diffCache.set(original, modified, opts, result);
      }

      const insights = computeDiffInsights(result);
      const summary = summarizeChanges(result);

      res.setHeader('X-Cache', 'MISS');
      res.json({
        ...result,
        insights,
        summary,
        analysis: {
          original: analyzeText(original),
          modified: analyzeText(modified),
        },
        meta: {
          duration,
          timestamp: new Date().toISOString(),
          options: opts,
          cached: false,
        },
      });
    } catch (error) {
      console.error('Semantic diff error:', error);
      res.status(500).json({
        error: 'Failed to compute semantic diff',
        errorCode: 'SEMANTIC_DIFF_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id,
      });
    }
  }
);

/**
 * Batch diff endpoint
 */
app.post('/api/diff/batch', rateLimiter(diffRateLimiter), (req: Request, res: Response) => {
  try {
    const { diffs } = req.body as {
      diffs: Array<{
        id?: string;
        original: string;
        modified: string;
        options?: DiffOptions;
      }>;
    };

    if (!Array.isArray(diffs) || diffs.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        details: '"diffs" must be a non-empty array',
      });
    }

    if (diffs.length > 10) {
      return res.status(400).json({
        error: 'Batch too large',
        details: 'Maximum 10 diffs per batch request',
      });
    }

    const startTime = Date.now();
    const results = diffs.map((diffReq, index) => {
      try {
        const result = diff(
          diffReq.original,
          diffReq.modified,
          diffReq.options || {}
        );
        return {
          id: diffReq.id || `diff-${index}`,
          success: true,
          result,
        };
      } catch (error) {
        return {
          id: diffReq.id || `diff-${index}`,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    const duration = Date.now() - startTime;

    res.json({
      results,
      meta: {
        total: diffs.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        duration,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Batch diff error:', error);
    res.status(500).json({
      error: 'Failed to process batch diff',
      errorCode: 'BATCH_DIFF_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      requestId: req.id,
    });
  }
});

// Serve the main HTML page (React app)
app.get('/', (req: Request, res: Response) => {
  try {
    // In production, serve the built React app
    const indexPath = join(__dirname, '../public/index.html');
    try {
      const html = readFileSync(indexPath, 'utf-8');
      res.send(html);
    } catch {
      // Fallback if React app not built yet
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Text Diff Tool</title></head>
          <body>
            <h1>Text Diff Tool</h1>
            <p>Please run <code>pnpm dev</code> to start the development server.</p>
            <p>Or run <code>pnpm build</code> to build the production version.</p>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Failed to load HTML:', error);
    res.status(500).send('Failed to load interface');
  }
});

// 404 handler for API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    errorCode: 'ENDPOINT_NOT_FOUND',
    message: `API endpoint ${req.method} ${req.path} not found`,
    requestId: req.id,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/version',
      'GET /api/docs',
      'GET /api/metrics',
      'POST /api/diff',
      'POST /api/diff/advanced',
      'POST /api/diff/semantic',
      'POST /api/diff/stream',
      'POST /api/diff/batch',
      'POST /api/analyze',
    ],
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// ============================================================================
// Server Startup
// ============================================================================

function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    
    server.listen(startPort, () => {
      const port = (server.address() as { port: number })?.port;
      server.close(() => resolve(port));
    });
    
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(error);
      }
    });
  });
}

async function startServer() {
  try {
    const actualPort = await findAvailablePort(PORT);
    const server = app.listen(actualPort, () => {
      console.log(`\n╔══════════════════════════════════════════════════════════╗`);
      console.log(`║     Text Diff Tool v${VERSION.padEnd(35)} ║`);
      console.log(`╚══════════════════════════════════════════════════════════╝\n`);
      console.log(`🌐 Web Interface:  http://localhost:${actualPort}`);
      console.log(`📚 API Docs:        http://localhost:${actualPort}/api-docs`);
      console.log(`🔍 API Base:        http://localhost:${actualPort}/api\n`);
      if (actualPort !== PORT) {
        console.log(`⚠️  Port ${PORT} was in use, using port ${actualPort} instead\n`);
      }
      console.log(`📋 Available Endpoints:`);
      console.log(`   GET  /api/health          - Health check & system info`);
      console.log(`   GET  /api/version         - Version information`);
      console.log(`   GET  /api/docs            - API documentation (JSON)`);
      console.log(`   GET  /api/metrics         - Performance metrics`);
      console.log(`   POST /api/diff            - Compute diff`);
      console.log(`   POST /api/diff/advanced   - Advanced diff with insights`);
      console.log(`   POST /api/diff/semantic   - Semantic diff with analysis`);
      console.log(`   POST /api/diff/stream     - Real-time streaming diff (SSE)`);
      console.log(`   POST /api/diff/batch      - Batch diff processing`);
      console.log(`   POST /api/analyze          - Text content analysis\n`);
      console.log(`✨ Modern Features:`);
      console.log(`   📱 PWA Support            - Installable, offline-capable`);
      console.log(`   🔒 Security Headers        - Helmet.js enabled`);
      console.log(`   ⚡ Web Workers            - Non-blocking computation`);
      console.log(`   💾 Intelligent Caching    - Auto-caching enabled`);
      console.log(`   🚦 Rate Limiting          - Per-endpoint limits\n`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
