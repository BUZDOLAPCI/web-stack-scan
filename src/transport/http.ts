import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import type { JsonRpcRequest, JsonRpcResponse, ServerConfig } from '../types.js';
import {
  fingerprint,
  detectFrameworks,
  detectAnalytics,
  toolDefinitions,
} from '../tools/index.js';
import { defaultServerConfig } from '../config.js';

/**
 * Handle a single JSON-RPC request
 */
async function handleJsonRpcRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { id, method, params } = request;

  try {
    switch (method) {
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'web-stack-scan',
              version: '1.0.0',
            },
          },
        };
      }

      case 'tools/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: toolDefinitions,
          },
        };
      }

      case 'tools/call': {
        const toolName = params?.name as string;
        const args = params?.arguments as Record<string, unknown>;

        let result: unknown;

        switch (toolName) {
          case 'fingerprint': {
            const url = args?.url as string;
            const timeout = args?.timeout as number | undefined;
            result = await fingerprint(url, timeout);
            break;
          }

          case 'detect_frameworks': {
            const html = args?.html as string;
            const headers = args?.headers as Record<string, string> | undefined;
            result = detectFrameworks(html, headers);
            break;
          }

          case 'detect_analytics': {
            const html = args?.html as string;
            result = detectAnalytics(html);
            break;
          }

          default:
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32601,
                message: `Unknown tool: ${toolName}`,
              },
            };
        }

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: `Internal error: ${message}`,
      },
    };
  }
}

/**
 * Read the request body as a string
 */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

/**
 * Send a JSON response
 */
function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * Handle health check endpoint
 */
function handleHealthCheck(res: ServerResponse): void {
  sendJson(res, 200, { status: 'ok', service: 'web-stack-scan' });
}

/**
 * Handle not found
 */
function handleNotFound(res: ServerResponse): void {
  sendJson(res, 404, { error: 'Not found' });
}

/**
 * Handle method not allowed
 */
function handleMethodNotAllowed(res: ServerResponse): void {
  sendJson(res, 405, { error: 'Method not allowed' });
}

/**
 * Handle MCP JSON-RPC endpoint
 */
async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readBody(req);
    const request: JsonRpcRequest = JSON.parse(body);

    if (!request.jsonrpc || request.jsonrpc !== '2.0') {
      sendJson(res, 400, {
        jsonrpc: '2.0',
        id: request.id || 0,
        error: {
          code: -32600,
          message: 'Invalid Request: missing or invalid jsonrpc version',
        },
      });
      return;
    }

    const response = await handleJsonRpcRequest(request);
    sendJson(res, 200, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendJson(res, 500, {
      ok: false,
      error: message,
    });
  }
}

/**
 * Handle REST API fingerprint endpoint
 */
async function handleFingerprintApi(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readBody(req);
    const { url, timeout } = JSON.parse(body);

    if (!url) {
      sendJson(res, 400, { error: 'Missing required parameter: url' });
      return;
    }

    const result = await fingerprint(url, timeout);
    sendJson(res, 200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendJson(res, 500, { ok: false, error: message });
  }
}

/**
 * Handle REST API frameworks endpoint
 */
async function handleFrameworksApi(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readBody(req);
    const { html, headers } = JSON.parse(body);

    if (!html) {
      sendJson(res, 400, { error: 'Missing required parameter: html' });
      return;
    }

    const result = detectFrameworks(html, headers);
    sendJson(res, 200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendJson(res, 500, { ok: false, error: message });
  }
}

/**
 * Handle REST API analytics endpoint
 */
async function handleAnalyticsApi(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readBody(req);
    const { html } = JSON.parse(body);

    if (!html) {
      sendJson(res, 400, { error: 'Missing required parameter: html' });
      return;
    }

    const result = detectAnalytics(html);
    sendJson(res, 200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendJson(res, 500, { ok: false, error: message });
  }
}

/**
 * Create and configure the HTTP server
 */
export function createHttpServer(): Server {
  const httpServer = createServer();

  httpServer.on('request', async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url!, `http://${req.headers.host || 'localhost'}`);
    const method = req.method?.toUpperCase();

    try {
      switch (url.pathname) {
        case '/mcp':
          if (method === 'POST') {
            await handleMcpRequest(req, res);
          } else {
            handleMethodNotAllowed(res);
          }
          break;

        case '/health':
          if (method === 'GET') {
            handleHealthCheck(res);
          } else {
            handleMethodNotAllowed(res);
          }
          break;

        case '/api/fingerprint':
          if (method === 'POST') {
            await handleFingerprintApi(req, res);
          } else {
            handleMethodNotAllowed(res);
          }
          break;

        case '/api/frameworks':
          if (method === 'POST') {
            await handleFrameworksApi(req, res);
          } else {
            handleMethodNotAllowed(res);
          }
          break;

        case '/api/analytics':
          if (method === 'POST') {
            await handleAnalyticsApi(req, res);
          } else {
            handleMethodNotAllowed(res);
          }
          break;

        default:
          handleNotFound(res);
      }
    } catch (error) {
      console.error('Server error:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      sendJson(res, 500, { ok: false, error: message });
    }
  });

  return httpServer;
}

/**
 * Start the HTTP transport
 */
export function startHttpTransport(config: Partial<ServerConfig> = {}): Server {
  const { port, host } = { ...defaultServerConfig, ...config };
  const httpServer = createHttpServer();

  httpServer.listen(port, host, () => {
    console.log(`web-stack-scan HTTP server listening on http://${host}:${port}`);
    console.log(`MCP endpoint: http://${host}:${port}/mcp`);
    console.log(`Health check: http://${host}:${port}/health`);
  });

  return httpServer;
}
