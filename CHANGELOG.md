# Changelog

All notable changes to the Text Diff Tool project.

## [1.0.0] - Current

### Added

#### Core Features
- **Multi-level Diffing** - Line, word, character, sentence, and paragraph granularity
- **Semantic Analysis** - Meaning-aware change detection with similarity scoring
- **Change Explanations** - Automatic explanations of what changed and why
- **Key Word Extraction** - Identify important terms added/removed
- **Text Analysis** - Readability scores, word counts, key term extraction
- **Change Summarization** - High-level summaries with impact assessment

#### React Frontend
- **Modern React UI** - React 18 + TypeScript + Vite
- **Monaco Editor** - VS Code-like editing experience
- **Real-time Diff** - Automatic computation as you type (debounced)
- **Interactive Navigation** - Keyboard shortcuts (Ctrl+↑/↓) to jump between changes
- **Dark/Light Themes** - Seamless theme switching
- **Responsive Design** - Works on desktop and mobile
- **Filter & Search** - Filter by change type, navigate changes

#### API & Backend
- **RESTful API** - Comprehensive endpoints optimized for agent consumption
- **OpenAPI/Swagger** - Interactive API documentation at `/api-docs`
- **Semantic Diff Endpoint** - `/api/diff/semantic` with full analysis
- **Streaming Diff** - `/api/diff/stream` with Server-Sent Events
- **Text Analysis** - `/api/analyze` endpoint
- **Batch Processing** - `/api/diff/batch` for multiple diffs
- **Advanced Diff** - `/api/diff/advanced` with insights

#### Infrastructure
- **Intelligent Caching** - In-memory caching with SHA-256 keys and TTL
- **Rate Limiting** - Per-endpoint rate limits (200/min for diff, 1000/min for others)
- **Security Headers** - Helmet.js with CSP configured for Monaco
- **Request Tracking** - Unique request IDs for debugging
- **Performance Metrics** - Endpoint-level metrics collection
- **CI/CD Pipeline** - GitHub Actions workflow

#### Developer Experience
- **TypeScript** - Full type safety throughout
- **Code Consolidation** - Backend reduced to 5 core files
- **Vite** - Fast builds and hot module replacement
- **Comprehensive Documentation** - README, API docs, implementation guides

### Changed

- **Frontend Migration** - Migrated from vanilla JS to React 18
- **Code Organization** - Consolidated backend from 12+ files to 5 files
- **API Enhancements** - Added semantic analysis and streaming support
- **Documentation** - Comprehensive README with all features documented

### Technical Details

#### Backend Structure (5 files)
- `core.ts` - Diff algorithm, types, utilities, formatters, semantic analysis
- `utils.ts` - Cache, rate limiting, metrics, version
- `server.ts` - Express server, middleware, OpenAPI config, API routes
- `cli.ts` - CLI entry point
- `index.ts` - Library exports

#### Frontend Structure
- React components in `src/frontend/components/`
- Custom hooks in `src/frontend/hooks/`
- Vite configuration for fast development

#### Dependencies
- `react`, `react-dom` - Frontend framework
- `@monaco-editor/react` - Editor integration
- `vite` - Build tool and dev server
- `express` - Backend framework
- `swagger-jsdoc`, `swagger-ui-express` - API documentation
- `helmet` - Security headers

### Performance

- Caching reduces computation time by ~90% for repeated requests
- Real-time diff with 500ms debounce for smooth UX
- Streaming support for large texts
- Efficient rendering for moderate to large diffs

### Security

- Security headers via Helmet.js
- Request validation and sanitization
- Rate limiting per IP
- Input size limits (10MB per field)
- Comprehensive error handling
