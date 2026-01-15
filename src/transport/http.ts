import express, { Request, Response, NextFunction } from 'express';
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
async function handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
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
 * Create and configure the Express app
 */
export function createApp(): express.Application {
  const app = express();

  // Parse JSON bodies
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'web-stack-scan' });
  });

  // MCP JSON-RPC endpoint
  app.post('/mcp', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request: JsonRpcRequest = req.body;

      if (!request.jsonrpc || request.jsonrpc !== '2.0') {
        res.status(400).json({
          jsonrpc: '2.0',
          id: request.id || 0,
          error: {
            code: -32600,
            message: 'Invalid Request: missing or invalid jsonrpc version',
          },
        });
        return;
      }

      const response = await handleRequest(request);
      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  // Direct REST endpoints for convenience
  app.post('/api/fingerprint', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { url, timeout } = req.body;
      if (!url) {
        res.status(400).json({ error: 'Missing required parameter: url' });
        return;
      }
      const result = await fingerprint(url, timeout);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/frameworks', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { html, headers } = req.body;
      if (!html) {
        res.status(400).json({ error: 'Missing required parameter: html' });
        return;
      }
      const result = detectFrameworks(html, headers);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/analytics', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { html } = req.body;
      if (!html) {
        res.status(400).json({ error: 'Missing required parameter: html' });
        return;
      }
      const result = detectAnalytics(html);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Error handling middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({
      ok: false,
      error: err.message || 'Internal server error',
    });
  });

  return app;
}

/**
 * Start the HTTP transport
 */
export function startHttpTransport(config: Partial<ServerConfig> = {}): void {
  const { port, host } = { ...defaultServerConfig, ...config };
  const app = createApp();

  app.listen(port, host, () => {
    console.log(`web-stack-scan HTTP server listening on http://${host}:${port}`);
    console.log(`MCP endpoint: http://${host}:${port}/mcp`);
    console.log(`Health check: http://${host}:${port}/health`);
  });
}
