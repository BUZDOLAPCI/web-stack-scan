import * as readline from 'readline';
import type { JsonRpcRequest, JsonRpcResponse } from '../types.js';
import {
  fingerprint,
  detectFrameworks,
  detectAnalytics,
  toolDefinitions,
} from '../tools/index.js';

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

      case 'notifications/initialized': {
        // This is a notification, no response needed
        return {
          jsonrpc: '2.0',
          id,
          result: {},
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
 * Start the stdio transport
 */
export function startStdioTransport(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', async (line) => {
    if (!line.trim()) return;

    try {
      const request: JsonRpcRequest = JSON.parse(line);
      const response = await handleRequest(request);

      // Don't send response for notifications
      if (request.method.startsWith('notifications/')) {
        return;
      }

      process.stdout.write(JSON.stringify(response) + '\n');
    } catch (error) {
      const errorResponse: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: 0,
        error: {
          code: -32700,
          message: 'Parse error',
        },
      };
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
  });

  rl.on('close', () => {
    process.exit(0);
  });

  // Handle errors gracefully
  process.on('SIGINT', () => {
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    process.exit(0);
  });
}
