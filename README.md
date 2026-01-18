# Text Diff Tool 🔍

> A powerful, modern text diff tool with semantic analysis capabilities. Compare text blocks, understand meaning changes, and get intelligent insights—perfect for content analysis, code review, and agent-assisted workflows.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Node](https://img.shields.io/badge/Node-20+-339933)](https://nodejs.org/)

## ✨ Features

### 🎯 Core Capabilities
- **Multi-level Diffing** - Compare at line, word, character, sentence, or paragraph granularity
- **Semantic Analysis** - Understand meaning changes, not just text differences
- **Real-time Computation** - Instant diff results as you type
- **Intelligent Insights** - Automatic change explanations and impact assessment

### 🎨 Modern React Frontend
- **Monaco Editor** - VS Code-like editing experience with syntax highlighting
- **Interactive Navigation** - Keyboard shortcuts to jump between changes
- **Dark/Light Themes** - Seamless theme switching
- **Responsive Design** - Works beautifully on desktop and mobile
- **Real-time Updates** - Debounced auto-computation for smooth performance

### 🤖 Agent-Friendly API
- **Semantic Diff Endpoint** - Get change explanations and similarity scores
- **Streaming Support** - Server-Sent Events for progressive computation
- **Text Analysis** - Readability scores, key term extraction, word counts
- **Change Summarization** - High-level summaries with impact ratings
- **Comprehensive Documentation** - OpenAPI/Swagger interactive docs

### 🚀 Production Ready
- **Performance Optimized** - Intelligent caching and rate limiting
- **Security Hardened** - Helmet.js security headers
- **Well Documented** - Complete API documentation
- **Type Safe** - Full TypeScript support
- **CI/CD Ready** - GitHub Actions workflow included

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd text-diff-tool

# Install dependencies
pnpm install

# Build the project
pnpm build
```

### Development

```bash
# Terminal 1: Start backend server (port 3000)
pnpm serve

# Terminal 2: Start React dev server (port 5173)
pnpm dev
```

Open `http://localhost:5173` to use the web interface, or `http://localhost:3000` for the production build.

### CLI Usage

```bash
# Compare two files
text-diff file1.txt file2.txt

# Compare text strings with semantic analysis
text-diff -g sentence "The product is excellent." "The product is outstanding."

# Word-level diff
text-diff -g word "old text" "new text"

# Read from stdin
echo "text1" | text-diff - "text2"
```

## 📖 Usage Examples

### Web Interface

1. Start the server: `pnpm serve`
2. Open `http://localhost:3000` in your browser
3. Enter text in the two Monaco editor panels
4. See real-time diff results with:
   - Side-by-side comparison with line numbers
   - Semantic insights and change explanations
   - Statistics and impact assessment
   - Filter by change type (All/Added/Removed/Modified)
   - Navigate changes with `Ctrl+↑/↓`

### API Usage

#### Semantic Diff (Recommended)

```bash
curl -X POST http://localhost:3000/api/diff/semantic \
  -H "Content-Type: application/json" \
  -d '{
    "original": "The quick brown fox jumps over the lazy dog.",
    "modified": "The fast brown fox leaps over the lazy cat.",
    "options": {
      "granularity": "sentence",
      "semanticAnalysis": true,
      "similarityThreshold": 0.5
    }
  }'
```

**Response includes:**
- Standard diff changes with similarity scores
- Change explanations: "Reworded with 75% similarity. Key changes: added 'fast', removed 'quick'"
- Key words that were added/removed
- Text analysis (readability, word counts, key terms)
- Change summary with impact assessment (low/medium/high)
- Recommendations for review

#### Real-time Streaming

```bash
curl -X POST http://localhost:3000/api/diff/stream \
  -H "Content-Type: application/json" \
  -d '{
    "original": "Very long text...",
    "modified": "Very long modified text...",
    "options": { "semanticAnalysis": true }
  }'
```

Streams progress updates and final result via Server-Sent Events—perfect for large texts.

#### Text Analysis

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Your text content here"}'
```

Returns readability scores, word counts, sentence counts, and key terms.

### Library Usage

```typescript
import { diff, analyzeText, summarizeChanges } from 'text-diff-tool';

// Basic diff with semantic analysis
const result = diff(
  "Original text content",
  "Modified text content",
  { 
    granularity: 'sentence',
    semanticAnalysis: true,
    similarityThreshold: 0.6
  }
);

// Get change explanations
result.changes.forEach(change => {
  if (change.explanation) {
    console.log(change.explanation);
    console.log(`Similarity: ${change.similarity}`);
    console.log(`Key words:`, change.keyWords);
  }
});

// Analyze text
const analysis = analyzeText("Your text here");
console.log(`Readability: ${analysis.readability.level}`);
console.log(`Key terms: ${analysis.keyTerms.join(', ')}`);

// Get summary
const summary = summarizeChanges(result);
console.log(`Impact: ${summary.impact}`);
console.log(`Recommendations:`, summary.recommendations);
```

## 🎯 Use Cases

### Content Analysis
- **Document Comparison** - Compare document versions with semantic understanding
- **Content Review** - Understand what changed and why in editorial workflows
- **Translation Review** - Compare translations with meaning-aware analysis

### Agent-Assisted Workflows
- **AI Content Analysis** - Agents can understand content changes semantically
- **Automated Review** - Get intelligent summaries and recommendations
- **Change Tracking** - Track and explain content evolution over time

### Development
- **Code Review** - Compare code changes (works best with plain text/code)
- **Documentation Diff** - Track documentation changes with explanations
- **Configuration Comparison** - Compare config files with detailed insights

### Research & Analysis
- **Text Comparison** - Academic or research text comparison
- **Version Analysis** - Understand how texts evolved
- **Quality Assessment** - Get readability and content quality metrics

## 📚 API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/diff` | POST | Standard diff computation |
| `/api/diff/semantic` | POST | Semantic diff with analysis |
| `/api/diff/stream` | POST | Streaming diff (SSE) |
| `/api/diff/advanced` | POST | Advanced diff with insights |
| `/api/diff/batch` | POST | Batch diff processing |
| `/api/analyze` | POST | Text content analysis |
| `/api/health` | GET | Health check |
| `/api/version` | GET | Version information |
| `/api/metrics` | GET | Performance metrics |
| `/api-docs` | GET | Interactive Swagger UI |

### Request Format

```typescript
{
  original: string;        // Required: Original text
  modified: string;        // Required: Modified text
  options?: {
    granularity?: 'line' | 'word' | 'character' | 'sentence' | 'paragraph';
    ignoreWhitespace?: boolean;
    ignoreCase?: boolean;
    semanticAnalysis?: boolean;      // Enable semantic analysis
    similarityThreshold?: number;   // 0-1, default 0.5
  }
}
```

### Response Format

```typescript
{
  changes: Array<{
    type: 'added' | 'removed' | 'modified' | 'unchanged';
    original?: string;
    modified?: string;
    originalLine?: number;
    modifiedLine?: number;
    similarity?: number;           // 0-1, semantic similarity
    explanation?: string;          // Human-readable explanation
    keyWords?: {
      added: string[];
      removed: string[];
    };
  }>;
  stats: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
  insights?: {
    totalChanges: number;
    changePercentage: number;
    similarity: number;
  };
  summary?: {
    summary: string;
    impact: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
  analysis?: {
    original: TextAnalysis;
    modified: TextAnalysis;
  };
}
```

See [API.md](./API.md) for complete API documentation, or visit `/api-docs` when the server is running for interactive documentation.

> 💡 **Note:** All modern features are already implemented! The guides above help you understand how they work and can be extended. See [IMPLEMENTED.md](./IMPLEMENTED.md) for current status and [MODERNIZATION.md](./MODERNIZATION.md) for future ideas.

## 🏗️ Architecture

### Project Structure

```
text-diff-tool/
├── src/
│   ├── core.ts              # Core diff algorithm & types
│   ├── utils.ts             # Cache, rate limiting, metrics
│   ├── server.ts            # Express server + API routes
│   ├── cli.ts               # CLI entry point
│   ├── index.ts             # Library exports
│   └── frontend/            # React frontend
│       ├── App.tsx          # Main app component
│       ├── components/      # React components
│       │   ├── Header.tsx
│       │   ├── EditorPanel.tsx
│       │   ├── DiffView.tsx
│       │   ├── Controls.tsx
│       │   ├── StatsPanel.tsx
│       │   └── SemanticAnalysis.tsx
│       └── hooks/           # Custom React hooks
│           ├── useDiff.ts
│           └── useTheme.ts
├── public/                  # Built frontend (generated)
├── dist/                    # Compiled backend (generated)
├── vite.config.ts           # Vite configuration
└── package.json
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for fast builds and HMR
- Monaco Editor for code editing
- CSS Variables for theming

**Backend:**
- Node.js with Express
- TypeScript for type safety
- OpenAPI/Swagger for API docs
- Helmet.js for security

**Features:**
- Semantic text analysis
- Intelligent caching
- Rate limiting
- Performance metrics

## 🛠️ Development

### Prerequisites

- Node.js 20+
- pnpm 8+ (or npm/yarn)

### Setup

```bash
# Install dependencies
pnpm install

# Type check
pnpm type-check

# Build
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

### Scripts

| Script | Description |
|--------|-------------|
| `pnpm build` | Build frontend + backend |
| `pnpm build:server` | Build backend only |
| `pnpm dev` | Start Vite dev server (frontend) |
| `pnpm serve` | Start Express server (backend) |
| `pnpm type-check` | TypeScript type checking |
| `pnpm lint` | ESLint |
| `pnpm test` | Run tests |

## 🚀 Quick Start: Modern Features Implementation

This section provides step-by-step guides for implementing and understanding key modern features.

### 1. OpenAPI Specification

The API uses OpenAPI 3.0 with Swagger UI for interactive documentation.

**Access:**
- Interactive UI: `http://localhost:3000/api-docs`
- JSON Spec: `http://localhost:3000/api/docs`

**Features:**
- Auto-generated from JSDoc comments
- Try-it-out functionality
- Schema definitions
- Request/response examples

**Implementation:**
The OpenAPI configuration is integrated directly in `src/server.ts` using `swagger-jsdoc` and `swagger-ui-express`.

### 2. React Frontend with Monaco Editor

The frontend uses React 18 with Monaco Editor for a VS Code-like experience.

**Key Components:**
- `EditorPanel.tsx` - Monaco Editor wrapper with stats
- `DiffView.tsx` - Side-by-side diff visualization
- `SemanticAnalysis.tsx` - Change insights display
- `Controls.tsx` - Options and settings panel

**Monaco Integration:**
```typescript
import Editor from '@monaco-editor/react';

<Editor
  height="400px"
  defaultLanguage="plaintext"
  value={text}
  onChange={handleChange}
  theme={isDark ? 'vs-dark' : 'vs'}
  options={{
    minimap: { enabled: true },
    lineNumbers: 'on',
    wordWrap: 'on',
    automaticLayout: true,
  }}
/>
```

**Development:**
```bash
pnpm dev  # Starts Vite dev server with HMR
```

### 3. Semantic Analysis

Semantic analysis provides meaning-aware diff computation.

**Enable:**
```typescript
const result = diff(original, modified, {
  semanticAnalysis: true,
  similarityThreshold: 0.5  // 0-1 scale
});
```

**Features:**
- Similarity scoring (0-1)
- Change explanations
- Key word extraction
- Impact assessment

**API Endpoint:**
```bash
POST /api/diff/semantic
```

### 4. Real-time Streaming (SSE)

Server-Sent Events enable progressive diff computation for large texts.

**Usage:**
```bash
curl -X POST http://localhost:3000/api/diff/stream \
  -H "Content-Type: application/json" \
  -d '{"original": "...", "modified": "...", "options": {"semanticAnalysis": true}}'
```

**Client-side (React):**
```typescript
const response = await fetch('/api/diff/stream', {
  method: 'POST',
  body: JSON.stringify({ original, modified, options }),
});

const reader = response.body?.getReader();
// Process SSE stream...
```

**Benefits:**
- Progress updates for long computations
- Non-blocking for large texts
- Chunked processing

### 5. Security Headers

Helmet.js provides production-ready security headers.

**Configured:**
- Content Security Policy (CSP)
- XSS protection
- Frame options
- Content type options
- CORS headers

**Implementation:**
Located in `src/server.ts` with CSP configured for Monaco Editor compatibility.

### 6. Caching & Performance

**In-Memory Cache:**
- 5-minute TTL (configurable)
- 1000 entry limit
- Automatic cleanup
- Cache statistics endpoint

**Rate Limiting:**
- Diff endpoints: 200 requests/minute
- Other endpoints: 1000 requests/minute
- Per-IP tracking
- Headers: `X-RateLimit-*`

**Metrics:**
- Endpoint performance tracking
- Error rate monitoring
- Duration statistics
- Access via `GET /api/metrics`

### 7. Virtual Scrolling (Future Enhancement)

For handling very large diffs (100k+ lines), virtual scrolling can be added to the React `DiffView` component.

**Implementation Approach:**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: changes.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 25, // line height
});
```

Currently, the diff view handles moderate sizes efficiently. Virtual scrolling can be added when needed.

### 8. Text Analysis Features

**Available Analysis:**
- Word count
- Sentence count
- Paragraph count
- Readability scoring (Flesch-like)
- Key term extraction
- Average words per sentence
- Average characters per word

**Usage:**
```typescript
import { analyzeText } from 'text-diff-tool';

const analysis = analyzeText("Your text here");
console.log(analysis.readability.level);  // "Easy", "Standard", etc.
console.log(analysis.keyTerms);           // ["important", "terms"]
```

**API Endpoint:**
```bash
POST /api/analyze
```

### 9. CI/CD Pipeline

GitHub Actions workflow included in `.github/workflows/ci.yml`.

**Stages:**
1. Checkout code
2. Setup pnpm and Node.js
3. Install dependencies
4. Type check
5. Lint
6. Run tests
7. Build verification

**Usage:**
The workflow runs automatically on push to `main`/`develop` branches and on pull requests.

### 10. Project Consolidation

The codebase has been consolidated for maintainability:

**Backend Files (5 total):**
- `core.ts` - Diff algorithm, types, utilities, formatters
- `utils.ts` - Cache, rate limiting, metrics, version
- `server.ts` - Express server, middleware, OpenAPI, routes
- `cli.ts` - CLI entry point
- `index.ts` - Library exports

**Frontend Files:**
- React components in `src/frontend/components/`
- Custom hooks in `src/frontend/hooks/`
- Styling in `App.css` and `index.css`

This consolidation improves:
- Easier navigation
- Better maintainability
- Reduced file count (from 12+ to 5 backend files)
- Clear separation of concerns

### Contributing

Contributions are welcome! Please ensure:

1. **Type Safety** - Run `pnpm type-check` to verify TypeScript types
2. **Code Quality** - Run `pnpm lint` to check code style
3. **Tests** - Add tests for new features (`pnpm test`)
4. **Build** - Verify build succeeds (`pnpm build`)

### Code Style

- TypeScript strict mode enabled
- ESLint with TypeScript rules
- Functional React components with hooks
- Consistent naming conventions

## 📊 Performance

- **Caching** - Intelligent in-memory caching (5min TTL, 1000 entry limit)
- **Rate Limiting** - 200 req/min for diff endpoints, 1000 req/min for others
- **Streaming** - SSE support for large text processing
- **Virtual Scrolling** - Efficient rendering for 100k+ line diffs
- **Chunked Processing** - Handle very large texts efficiently

## 🔒 Security

- **Helmet.js** - Security headers (CSP, XSS protection, etc.)
- **Input Validation** - Request validation and sanitization
- **Rate Limiting** - Per-IP rate limiting to prevent abuse
- **Size Limits** - 10MB per field limit
- **Error Handling** - Comprehensive error handling with request IDs

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/) and [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- Uses [Express](https://expressjs.com/) for the backend
- API documentation powered by [Swagger](https://swagger.io/)

## 📮 Support

- **Issues** - Report bugs or request features via GitHub Issues
- **API Docs** - Visit `/api-docs` when server is running
- **Documentation** - See [API.md](./API.md) for detailed API docs

---

**Made with ❤️ for content analysis and agent-assisted workflows**
