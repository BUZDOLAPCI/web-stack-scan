import { startStdioTransport, startHttpTransport, createHttpServer } from './transport/index.js';
import type { ServerConfig } from './types.js';
import type { Server } from 'http';

export type TransportType = 'stdio' | 'http';

export interface StartServerOptions {
  transport: TransportType;
  config?: Partial<ServerConfig>;
}

/**
 * Start the MCP server with the specified transport
 */
export function startServer(options: StartServerOptions): void {
  const { transport, config } = options;

  switch (transport) {
    case 'stdio':
      startStdioTransport();
      break;

    case 'http':
      startHttpTransport(config);
      break;

    default:
      throw new Error(`Unknown transport: ${transport}`);
  }
}

/**
 * Create a standalone HTTP server instance without starting it.
 * Useful for testing or custom server configurations.
 */
export function createStandaloneServer(): Server {
  return createHttpServer();
}

// Re-export for convenience
export { startStdioTransport, startHttpTransport, createHttpServer } from './transport/index.js';
