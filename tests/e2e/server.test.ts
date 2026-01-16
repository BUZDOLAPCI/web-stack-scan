import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest';
import { createHttpServer } from '../../src/transport/http.js';
import type { Server } from 'http';

// Simple test client for the HTTP server
async function request(
  server: Server,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const testServer = server.listen(0, '127.0.0.1', () => {
      const address = testServer.address();
      if (!address || typeof address === 'string') {
        testServer.close();
        reject(new Error('Failed to get server address'));
        return;
      }

      const options = {
        hostname: '127.0.0.1',
        port: address.port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(options, (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          testServer.close();
          try {
            resolve({
              status: res.statusCode,
              body: JSON.parse(data),
            });
          } catch {
            resolve({
              status: res.statusCode,
              body: data,
            });
          }
        });
      });

      req.on('error', (err: Error) => {
        testServer.close();
        reject(err);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
}

describe('HTTP Server E2E', () => {
  let server: Server;

  beforeAll(() => {
    server = createHttpServer();
  });

  afterAll(() => {
    server.close();
  });

  describe('Health endpoint', () => {
    it('should return health status', async () => {
      const testServer = createHttpServer();
      const response = await request(testServer, 'GET', '/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        service: 'web-stack-scan',
      });
    });
  });

  describe('MCP endpoint', () => {
    it('should return server info on initialize', async () => {
      const testServer = createHttpServer();
      const response = await request(testServer, 'POST', '/mcp', {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      });

      expect(response.status).toBe(200);
      expect((response.body as any).jsonrpc).toBe('2.0');
      expect((response.body as any).id).toBe(1);
      expect((response.body as any).result.serverInfo.name).toBe('web-stack-scan');
    });

    it('should list available tools', async () => {
      const testServer = createHttpServer();
      const response = await request(testServer, 'POST', '/mcp', {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      });

      expect(response.status).toBe(200);
      const result = (response.body as any).result;
      expect(result.tools).toHaveLength(3);

      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('fingerprint');
      expect(toolNames).toContain('detect_frameworks');
      expect(toolNames).toContain('detect_analytics');
    });

    it('should call detect_frameworks tool', async () => {
      const html = `
        <html>
          <body>
            <div data-reactroot></div>
            <script src="react.min.js"></script>
          </body>
        </html>
      `;

      const testServer = createHttpServer();
      const response = await request(testServer, 'POST', '/mcp', {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'detect_frameworks',
          arguments: { html },
        },
      });

      expect(response.status).toBe(200);
      const result = (response.body as any).result;
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const toolResult = JSON.parse(result.content[0].text);
      expect(toolResult.ok).toBe(true);
      expect(toolResult.data.detected.some((t: any) => t.name === 'React')).toBe(true);
    });

    it('should call detect_analytics tool', async () => {
      const html = `
        <html>
          <head>
            <script>gtag('config', 'UA-12345-1');</script>
          </head>
          <body></body>
        </html>
      `;

      const testServer = createHttpServer();
      const response = await request(testServer, 'POST', '/mcp', {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'detect_analytics',
          arguments: { html },
        },
      });

      expect(response.status).toBe(200);
      const result = (response.body as any).result;
      const toolResult = JSON.parse(result.content[0].text);
      expect(toolResult.ok).toBe(true);
      expect(toolResult.data.detected.some((a: any) => a.name === 'Google Analytics')).toBe(true);
    });

    it('should return error for unknown method', async () => {
      const testServer = createHttpServer();
      const response = await request(testServer, 'POST', '/mcp', {
        jsonrpc: '2.0',
        id: 5,
        method: 'unknown/method',
        params: {},
      });

      expect(response.status).toBe(200);
      expect((response.body as any).error).toBeDefined();
      expect((response.body as any).error.code).toBe(-32601);
    });

    it('should return error for unknown tool', async () => {
      const testServer = createHttpServer();
      const response = await request(testServer, 'POST', '/mcp', {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'unknown_tool',
          arguments: {},
        },
      });

      expect(response.status).toBe(200);
      expect((response.body as any).error).toBeDefined();
      expect((response.body as any).error.message).toContain('unknown_tool');
    });

    it('should reject invalid JSON-RPC version', async () => {
      const testServer = createHttpServer();
      const response = await request(testServer, 'POST', '/mcp', {
        jsonrpc: '1.0',
        id: 7,
        method: 'tools/list',
      });

      expect(response.status).toBe(400);
      expect((response.body as any).error).toBeDefined();
    });
  });

  describe('REST API endpoints', () => {
    it('should detect frameworks via REST API', async () => {
      const testServer = createHttpServer();
      const response = await request(testServer, 'POST', '/api/frameworks', {
        html: '<html><body><div data-reactroot></div></body></html>',
      });

      expect(response.status).toBe(200);
      expect((response.body as any).ok).toBe(true);
      expect((response.body as any).data.detected.some((t: any) => t.name === 'React')).toBe(true);
    });

    it('should detect frameworks with headers via REST API', async () => {
      const testServer = createHttpServer();
      const response = await request(testServer, 'POST', '/api/frameworks', {
        html: '<html><body></body></html>',
        headers: { 'X-Powered-By': 'Express' },
      });

      expect(response.status).toBe(200);
      expect((response.body as any).data.detected.some((t: any) => t.name === 'Express')).toBe(true);
    });

    it('should detect analytics via REST API', async () => {
      const testServer = createHttpServer();
      const response = await request(testServer, 'POST', '/api/analytics', {
        html: '<html><head><script>fbq("track", "PageView");</script></head></html>',
      });

      expect(response.status).toBe(200);
      expect((response.body as any).ok).toBe(true);
      expect((response.body as any).data.detected.some((a: any) => a.name === 'Facebook Pixel')).toBe(true);
    });

    it('should return error for missing html parameter', async () => {
      const testServer = createHttpServer();
      const response = await request(testServer, 'POST', '/api/frameworks', {});

      expect(response.status).toBe(400);
      expect((response.body as any).error).toContain('html');
    });

    it('should return error for missing html in analytics', async () => {
      const testServer = createHttpServer();
      const response = await request(testServer, 'POST', '/api/analytics', {});

      expect(response.status).toBe(400);
      expect((response.body as any).error).toContain('html');
    });
  });

  describe('Fingerprint endpoint with mocked fetch', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should fingerprint URL via REST API', async () => {
      const mockHtml = `
        <html>
          <head>
            <script src="https://cdn.shopify.com/s/files/1/script.js"></script>
          </head>
          <body>Shopify Store</body>
        </html>
      `;

      const mockHeaders = new Headers({
        'Content-Type': 'text/html',
        'Server': 'cloudflare',
      });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
        headers: mockHeaders,
      } as Response);

      const testServer = createHttpServer();
      const response = await request(testServer, 'POST', '/api/fingerprint', {
        url: 'https://example.com',
      });

      expect(response.status).toBe(200);
      expect((response.body as any).ok).toBe(true);
      expect((response.body as any).data.technologies.some((t: any) => t.name === 'Shopify')).toBe(true);
      expect((response.body as any).data.technologies.some((t: any) => t.name === 'Cloudflare')).toBe(true);
    });

    it('should fingerprint URL via MCP', async () => {
      const mockHtml = '<html><body><div v-if="show">Vue App</div></body></html>';

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
        headers: new Headers({ 'X-Powered-By': 'Express' }),
      } as Response);

      const testServer = createHttpServer();
      const response = await request(testServer, 'POST', '/mcp', {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'fingerprint',
          arguments: { url: 'https://example.com' },
        },
      });

      expect(response.status).toBe(200);
      const result = (response.body as any).result;
      const toolResult = JSON.parse(result.content[0].text);

      expect(toolResult.ok).toBe(true);
      expect(toolResult.data.url).toBe('https://example.com');
      expect(toolResult.data.technologies.some((t: any) => t.name === 'Vue.js')).toBe(true);
      expect(toolResult.data.technologies.some((t: any) => t.name === 'Express')).toBe(true);
    });

    it('should return error for missing url in fingerprint', async () => {
      const testServer = createHttpServer();
      const response = await request(testServer, 'POST', '/api/fingerprint', {});

      expect(response.status).toBe(400);
      expect((response.body as any).error).toContain('url');
    });
  });
});
