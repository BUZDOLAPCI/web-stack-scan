/**
 * Standard response envelope for all tools
 */
export interface ResponseEnvelope<T> {
  ok: boolean;
  data: T;
  meta: {
    source?: string;
    retrieved_at: string;
    pagination: {
      next_cursor: string | null;
    };
    warnings: string[];
  };
}

/**
 * Category of detected technology
 */
export type TechnologyCategory =
  | 'frontend-framework'
  | 'backend-framework'
  | 'css-framework'
  | 'cms'
  | 'ecommerce'
  | 'server'
  | 'runtime'
  | 'analytics'
  | 'tracking'
  | 'marketing'
  | 'library'
  | 'other';

/**
 * Confidence level of detection
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * A detected technology
 */
export interface DetectedTechnology {
  name: string;
  version?: string;
  confidence: ConfidenceLevel;
  category: TechnologyCategory;
  evidence?: string;
}

/**
 * Analytics detection type
 */
export type AnalyticsType = 'analytics' | 'tracking' | 'marketing';

/**
 * A detected analytics tool
 */
export interface DetectedAnalytics {
  name: string;
  type: AnalyticsType;
  evidence?: string;
}

/**
 * Fingerprint result data
 */
export interface FingerprintData {
  url: string;
  technologies: DetectedTechnology[];
  analytics: DetectedAnalytics[];
  headers: Record<string, string>;
}

/**
 * Frameworks detection result data
 */
export interface FrameworksData {
  detected: DetectedTechnology[];
}

/**
 * Analytics detection result data
 */
export interface AnalyticsData {
  detected: DetectedAnalytics[];
}

/**
 * Signature pattern for detection
 */
export interface SignaturePattern {
  name: string;
  patterns: (string | RegExp)[];
  category: TechnologyCategory;
  versionPattern?: RegExp;
}

/**
 * Header signature for detection
 */
export interface HeaderSignature {
  header: string;
  patterns: {
    pattern: string | RegExp;
    technology: string;
    category: TechnologyCategory;
  }[];
}

/**
 * Analytics signature for detection
 */
export interface AnalyticsSignature {
  name: string;
  type: AnalyticsType;
  patterns: (string | RegExp)[];
}

/**
 * MCP Tool definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * MCP Tool call request
 */
export interface ToolCallRequest {
  method: 'tools/call';
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

/**
 * MCP JSON-RPC request
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * MCP JSON-RPC response
 */
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Server configuration
 */
export interface ServerConfig {
  port: number;
  host: string;
  timeout: number;
}
