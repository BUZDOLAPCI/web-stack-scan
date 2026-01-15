# web-stack-scan

MCP server for fingerprinting website tech stacks from headers and HTML signatures.

## Features

- **Fingerprint websites** - Analyze any URL to detect technologies used
- **Detect frameworks** - Identify frontend/backend frameworks from HTML and headers
- **Detect analytics** - Find analytics and tracking scripts
- **No headless browser** - Lightweight static HTML analysis
- **Extensible signatures** - Easy to add new detection patterns

## Installation

```bash
npm install
npm run build
```

## Usage

### As MCP Server (stdio)

```bash
# Start with stdio transport for MCP clients
npm run start:stdio
# or
node dist/cli.js --stdio
```

### As HTTP Server

```bash
# Start HTTP server (default port 3000)
npm run start:http
# or
node dist/cli.js --http --port 8080
```

### CLI Options

```
web-stack-scan [OPTIONS]

OPTIONS:
  --stdio, -s     Use stdio transport (default)
  --http, -h      Use HTTP transport
  --port, -p      Port for HTTP server (default: 3000)
  --host          Host for HTTP server (default: 127.0.0.1)
  --version, -v   Print version
  --help          Print this help message
```

## MCP Tools

### fingerprint

Full fingerprint: fetch URL, analyze headers and HTML, return detected technologies.

**Parameters:**
- `url` (string, required) - The URL to fingerprint
- `timeout` (number, optional) - Timeout in milliseconds (default: 10000)

**Example:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "fingerprint",
    "arguments": {
      "url": "https://example.com"
    }
  }
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "url": "https://example.com",
    "technologies": [
      {
        "name": "React",
        "version": "18.2.0",
        "confidence": "high",
        "category": "frontend-framework"
      },
      {
        "name": "nginx",
        "confidence": "high",
        "category": "server"
      }
    ],
    "analytics": [
      {
        "name": "Google Analytics",
        "type": "analytics"
      }
    ],
    "headers": {
      "server": "nginx",
      "content-type": "text/html"
    }
  },
  "meta": {
    "source": "https://example.com",
    "retrieved_at": "2024-01-15T10:30:00.000Z",
    "pagination": { "next_cursor": null },
    "warnings": []
  }
}
```

### detect_frameworks

Detect frontend/backend frameworks from HTML content and optional headers.

**Parameters:**
- `html` (string, required) - The HTML content to analyze
- `headers` (object, optional) - HTTP headers to analyze

**Example:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "detect_frameworks",
    "arguments": {
      "html": "<html><body><div data-reactroot></div></body></html>",
      "headers": {
        "X-Powered-By": "Express"
      }
    }
  }
}
```

### detect_analytics

Detect analytics and tracking scripts from HTML content.

**Parameters:**
- `html` (string, required) - The HTML content to analyze

**Example:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "detect_analytics",
    "arguments": {
      "html": "<html><head><script>gtag('config', 'UA-12345-1');</script></head></html>"
    }
  }
}
```

## REST API (HTTP mode)

When running in HTTP mode, the following REST endpoints are available:

### POST /api/fingerprint

```bash
curl -X POST http://localhost:3000/api/fingerprint \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### POST /api/frameworks

```bash
curl -X POST http://localhost:3000/api/frameworks \
  -H "Content-Type: application/json" \
  -d '{"html": "<html>...</html>", "headers": {"X-Powered-By": "Express"}}'
```

### POST /api/analytics

```bash
curl -X POST http://localhost:3000/api/analytics \
  -H "Content-Type: application/json" \
  -d '{"html": "<html>...</html>"}'
```

### GET /health

```bash
curl http://localhost:3000/health
# Returns: {"status": "ok", "service": "web-stack-scan"}
```

## Detected Technologies

### From Headers

| Header | Technologies |
|--------|-------------|
| X-Powered-By | Express, PHP, ASP.NET, Next.js |
| Server | nginx, Apache, Cloudflare, Microsoft IIS |
| X-Drupal-Cache | Drupal |
| X-Generator | WordPress, Ghost, Drupal, Joomla |
| X-Shopify-Stage | Shopify |

### From HTML/Scripts

| Category | Technologies |
|----------|-------------|
| Frontend Frameworks | React, Vue.js, Angular, Svelte |
| Meta Frameworks | Next.js, Nuxt, Gatsby, Remix |
| Libraries | jQuery |
| CSS Frameworks | Bootstrap, Tailwind CSS |
| CMS | WordPress, Wix |
| E-commerce | Shopify |

### Analytics & Tracking

| Type | Services |
|------|----------|
| Analytics | Google Analytics, Hotjar, Segment, Mixpanel, Heap, Amplitude |
| Tracking | Google Tag Manager |
| Marketing | Facebook Pixel, Intercom, HubSpot, Drift, LinkedIn Insight, Twitter Pixel, Pinterest Tag, TikTok Pixel |

## Extending Signatures

Signatures are defined in `src/config.ts`. To add new signatures:

### Add a Framework Signature

```typescript
// In frameworkSignatures array
{
  name: 'MyFramework',
  patterns: [
    /my-framework/i,
    /myframework\.js/,
  ],
  category: 'frontend-framework',
  versionPattern: /myframework@(\d+\.\d+\.\d+)/,
}
```

### Add a Header Signature

```typescript
// In headerSignatures array
{
  header: 'x-my-header',
  patterns: [
    { pattern: /mytech/i, technology: 'MyTech', category: 'backend-framework' },
  ],
}
```

### Add an Analytics Signature

```typescript
// In analyticsSignatures array
{
  name: 'My Analytics',
  type: 'analytics',
  patterns: [
    /myanalytics\.com/,
    /myanalytics\.track/,
  ],
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck

# Build
npm run build
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | HTTP server port | 3000 |
| HOST | HTTP server host | 127.0.0.1 |
| FETCH_TIMEOUT | URL fetch timeout (ms) | 10000 |

## Response Format

All tools return a standard response envelope:

```typescript
{
  ok: boolean;           // Success status
  data: T;               // Response data
  meta: {
    source?: string;     // Data source (URL for fingerprint)
    retrieved_at: string; // ISO-8601 timestamp
    pagination: {
      next_cursor: string | null;
    };
    warnings: string[];   // Any warnings or errors
  };
}
```

## License

MIT
