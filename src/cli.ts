#!/usr/bin/env node

import { startServer } from './server.js';
import type { TransportType } from './server.js';

/**
 * Parse command line arguments
 */
function parseArgs(): { transport: TransportType; port?: number; host?: string } {
  const args = process.argv.slice(2);

  let transport: TransportType = 'stdio';
  let port: number | undefined;
  let host: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--stdio':
      case '-s':
        transport = 'stdio';
        break;

      case '--http':
      case '-h':
        transport = 'http';
        break;

      case '--port':
      case '-p':
        port = parseInt(args[++i], 10);
        if (isNaN(port)) {
          console.error('Invalid port number');
          process.exit(1);
        }
        break;

      case '--host':
        host = args[++i];
        break;

      case '--help':
        printHelp();
        process.exit(0);
        break;

      case '--version':
      case '-v':
        console.log('web-stack-scan v1.0.0');
        process.exit(0);
        break;

      default:
        console.error(`Unknown argument: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  return { transport, port, host };
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
web-stack-scan - MCP server for fingerprinting website tech stacks

USAGE:
  web-stack-scan [OPTIONS]

OPTIONS:
  --stdio, -s     Use stdio transport (default)
  --http, -h      Use HTTP transport
  --port, -p      Port for HTTP server (default: 3000)
  --host          Host for HTTP server (default: 127.0.0.1)
  --version, -v   Print version
  --help          Print this help message

EXAMPLES:
  # Start with stdio transport (for MCP clients)
  web-stack-scan --stdio

  # Start HTTP server on port 8080
  web-stack-scan --http --port 8080

  # Start HTTP server on all interfaces
  web-stack-scan --http --host 0.0.0.0 --port 3000

ENVIRONMENT VARIABLES:
  PORT           HTTP server port (default: 3000)
  HOST           HTTP server host (default: 127.0.0.1)
  FETCH_TIMEOUT  Timeout for fetching URLs in ms (default: 10000)
`);
}

/**
 * Main entry point
 */
function main(): void {
  const { transport, port, host } = parseArgs();

  try {
    startServer({
      transport,
      config: {
        ...(port !== undefined && { port }),
        ...(host !== undefined && { host }),
      },
    });

    if (transport === 'stdio') {
      // For stdio, we don't print anything to stdout as it's used for communication
      console.error('web-stack-scan MCP server started (stdio mode)');
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
