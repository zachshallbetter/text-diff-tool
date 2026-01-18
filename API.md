# Text Diff Tool API Documentation

## Base URL

All API endpoints are prefixed with `/api`.

## API Version

Current API version: `v1`

## Rate Limiting

- **Diff endpoints**: 200 requests per minute per IP
- **Other endpoints**: 1000 requests per minute per IP

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: ISO timestamp when limit resets

## Request Headers

- `Content-Type: application/json` (required for POST requests)
- `X-Request-ID`: Automatically generated unique request ID (returned in response headers)

## Response Headers

- `X-Request-ID`: Unique identifier for the request
- `X-Cache`: `HIT` or `MISS` (for diff endpoints)
- `X-RateLimit-*`: Rate limiting information

## Endpoints

### Health Check

**GET** `/api/health`

Returns detailed health status and system information.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-17T22:00:00.000Z",
  "uptime": 123,
  "memory": {
    "heapUsed": 45,
    "heapTotal": 128,
    "rss": 180,
    "external": 2
  },
  "cache": {
    "total": 42,
    "active": 40,
    "expired": 2,
    "maxSize": 1000
  },
  "nodeVersion": "v20.10.0",
  "platform": "darwin"
}
```

---

### Version Information

**GET** `/api/version`

Returns the API version information.

**Response:**
```json
{
  "version": "1.0.0",
  "name": "text-diff-tool",
  "apiVersion": "v1"
}
```

---

### Metrics

**GET** `/api/metrics`

Returns performance metrics and system statistics.

**Response:**
```json
{
  "metrics": {
    "POST /api/diff": {
      "count": 1250,
      "totalDuration": 45230,
      "minDuration": 2,
      "maxDuration": 450,
      "errors": 3,
      "avgDuration": 36.184,
      "errorRate": 0.24
    }
  },
  "cache": {
    "total": 42,
    "active": 40,
    "expired": 2,
    "maxSize": 1000
  },
  "rateLimit": {
    "diff": {
      "activeWindows": 15,
      "maxRequests": 200,
      "windowMs": 60000
    },
    "api": {
      "activeWindows": 8,
      "maxRequests": 1000,
      "windowMs": 60000
    }
  }
}
```

---

### API Documentation

**GET** `/api/docs`

Returns comprehensive API documentation in JSON format.

**Response:**
```json
{
  "name": "Text Diff Tool API",
  "version": "1.0.0",
  "endpoints": { ... }
}
```

---

### Compute Diff

**POST** `/api/diff`

Computes the difference between two text blocks.

**Request Body:**
```json
{
  "original": "string (required)",
  "modified": "string (required)",
  "options": {
    "granularity": "line | word | character (default: 'line')",
    "ignoreWhitespace": "boolean (default: false)",
    "ignoreCase": "boolean (default: false)"
  }
}
```

**Request Limits:**
- Maximum size: 10MB per field (`original` or `modified`)

**Response:**
```json
{
  "changes": [
    {
      "type": "added | removed | modified | unchanged",
      "original": "string (optional)",
      "modified": "string (optional)",
      "originalLine": "number (optional, 1-indexed)",
      "modifiedLine": "number (optional, 1-indexed)"
    }
  ],
  "stats": {
    "added": 0,
    "removed": 0,
    "modified": 0,
    "unchanged": 0
  },
  "meta": {
    "duration": 5,
    "timestamp": "2024-01-17T22:00:00.000Z",
    "options": {},
    "cached": false
  }
}
```

**Response Headers:**
- `X-Cache`: `HIT` if served from cache, `MISS` if computed

**Caching:**
- Results are cached for 5 minutes
- Cache key is based on input content and options
- Only fast computations (< 5s) are cached

**Error Responses:**

- `400 Bad Request` - Invalid request format or validation error
- `500 Internal Server Error` - Server error during diff computation

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/diff \
  -H "Content-Type: application/json" \
  -d '{
    "original": "Hello world",
    "modified": "Hello there",
    "options": {
      "granularity": "word"
    }
  }'
```

---

### Advanced Diff

**POST** `/api/diff/advanced`

Computes diff with additional insights and navigation information.

**Request Body:** Same as `/api/diff`

**Response:**
```json
{
  "changes": [...],
  "stats": {...},
  "insights": {
    "totalChanges": 5,
    "changePercentage": 25.5,
    "similarity": 74.5,
    "largestChange": "Sample text...",
    "changeDistribution": {
      "added": 2,
      "removed": 1,
      "modified": 2,
      "unchanged": 15
    }
  },
  "navigation": {
    "totalChanges": 5,
    "changeIndices": [2, 5, 8, 12, 15]
  },
  "meta": {
    "duration": 8,
    "timestamp": "2024-01-17T22:00:00.000Z",
    "options": {}
  }
}
```

---

### Batch Diff

**POST** `/api/diff/batch`

Compute multiple diffs in a single request (up to 10).

**Request Body:**
```json
{
  "diffs": [
    {
      "id": "diff-1",
      "original": "Hello world",
      "modified": "Hello there",
      "options": {
        "granularity": "word"
      }
    },
    {
      "id": "diff-2",
      "original": "Text 1",
      "modified": "Text 2"
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "diff-1",
      "success": true,
      "result": {
        "changes": [...],
        "stats": {...}
      }
    },
    {
      "id": "diff-2",
      "success": false,
      "error": "Error message"
    }
  ],
  "meta": {
    "total": 2,
    "successful": 1,
    "failed": 1,
    "duration": 15,
    "timestamp": "2024-01-17T22:00:00.000Z"
  }
}
```

**Limits:**
- Maximum 10 diffs per batch request

---

## Error Format

All error responses follow this format:

```json
{
  "error": "Error type",
  "errorCode": "ERROR_CODE",
  "details": "Detailed error message",
  "message": "Additional context (development only)",
  "requestId": "abc12345",
  "retryAfter": 60
}
```

**Error Codes:**
- `MISSING_FIELDS` - Required fields are missing
- `INVALID_TYPE` - Invalid field type
- `PAYLOAD_TOO_LARGE` - Request exceeds size limit
- `INVALID_OPTIONS` - Invalid options object
- `INVALID_GRANULARITY` - Invalid granularity value
- `INVALID_OPTION_TYPE` - Invalid option value type
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `DIFF_COMPUTATION_ERROR` - Error during diff computation
- `ADVANCED_DIFF_ERROR` - Error in advanced diff
- `BATCH_DIFF_ERROR` - Error in batch processing
- `ENDPOINT_NOT_FOUND` - API endpoint not found
- `INTERNAL_ERROR` - Internal server error

## CORS

The API supports CORS and allows requests from any origin. Allowed methods:
- GET
- POST
- OPTIONS

## Caching

Diff results are automatically cached:
- **TTL**: 5 minutes
- **Max entries**: 1000
- **Cache key**: SHA-256 hash of inputs and options
- **Auto-cleanup**: Expired entries removed every minute

Cache status is indicated by the `X-Cache` response header.

## Performance

- Response times are included in `meta.duration` (milliseconds)
- Metrics available at `/api/metrics`
- Average response times tracked per endpoint
- Error rates monitored

## Content-Type

All requests should use `Content-Type: application/json` header.

## Response Times

Response times are included in the `meta.duration` field of diff responses, measured in milliseconds.
