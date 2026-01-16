// Main exports for the web-stack-scan MCP server

// Types
export type {
  ResponseEnvelope,
  TechnologyCategory,
  ConfidenceLevel,
  DetectedTechnology,
  AnalyticsType,
  DetectedAnalytics,
  FingerprintData,
  FrameworksData,
  AnalyticsData,
  SignaturePattern,
  HeaderSignature,
  AnalyticsSignature,
  ToolDefinition,
  ServerConfig,
} from './types.js';

// Tools
export {
  fingerprint,
  detectFrameworks,
  detectAnalytics,
  toolDefinitions,
  fingerprintToolDefinition,
  detectFrameworksToolDefinition,
  detectAnalyticsToolDefinition,
} from './tools/index.js';

// Config
export {
  defaultServerConfig,
  headerSignatures,
  frameworkSignatures,
  analyticsSignatures,
  signatureConfig,
} from './config.js';

// Server
export { startServer, startStdioTransport, startHttpTransport } from './server.js';
export type { TransportType, StartServerOptions } from './server.js';

// Transport
export { createHttpServer, startHttpTransport as startHttpServer } from './transport/http.js';
