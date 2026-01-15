import { startStdioTransport, startHttpTransport } from './transport/index.js';
import type { ServerConfig } from './types.js';

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

// Re-export for convenience
export { startStdioTransport, startHttpTransport } from './transport/index.js';
