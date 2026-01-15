export { fingerprint, fingerprintToolDefinition } from './fingerprint.js';
export { detectFrameworks, detectFrameworksToolDefinition } from './frameworks.js';
export { detectAnalytics, detectAnalyticsToolDefinition } from './analytics.js';

import { fingerprintToolDefinition } from './fingerprint.js';
import { detectFrameworksToolDefinition } from './frameworks.js';
import { detectAnalyticsToolDefinition } from './analytics.js';

/**
 * All available tool definitions for MCP
 */
export const toolDefinitions = [
  fingerprintToolDefinition,
  detectFrameworksToolDefinition,
  detectAnalyticsToolDefinition,
];
