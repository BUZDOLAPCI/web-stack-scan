import type { ResponseEnvelope, FingerprintData } from '../types.js';
import { defaultServerConfig } from '../config.js';
import { detectFrameworks } from './frameworks.js';
import { detectAnalytics } from './analytics.js';

/**
 * Creates a standard response envelope
 */
function createResponse<T>(
  data: T,
  source?: string,
  warnings: string[] = []
): ResponseEnvelope<T> {
  return {
    ok: true,
    data,
    meta: {
      source,
      retrieved_at: new Date().toISOString(),
      pagination: { next_cursor: null },
      warnings,
    },
  };
}

/**
 * Creates an error response envelope
 */
function createErrorResponse(
  message: string,
  url: string
): ResponseEnvelope<FingerprintData> {
  return {
    ok: false,
    data: {
      url,
      technologies: [],
      analytics: [],
      headers: {},
    },
    meta: {
      source: url,
      retrieved_at: new Date().toISOString(),
      pagination: { next_cursor: null },
      warnings: [message],
    },
  };
}

/**
 * Validate and normalize URL
 */
function normalizeUrl(url: string): string {
  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  return url;
}

/**
 * Convert Headers to plain object
 */
function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Fetch URL with timeout
 */
async function fetchWithTimeout(
  url: string,
  timeout: number
): Promise<{ html: string; headers: Record<string, string> }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'WebStackScan/1.0 (Tech Stack Fingerprinting)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const headers = headersToObject(response.headers);

    return { html, headers };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Full fingerprint: fetch URL, analyze headers and HTML, return detected technologies
 *
 * @param url - The URL to fingerprint
 * @param timeout - Optional timeout in milliseconds (default: 10000)
 * @returns Response envelope with detected technologies and analytics
 */
export async function fingerprint(
  url: string,
  timeout?: number
): Promise<ResponseEnvelope<FingerprintData>> {
  const warnings: string[] = [];

  // Validate and normalize URL
  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeUrl(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid URL';
    return createErrorResponse(message, url);
  }

  // Fetch the page
  let html: string;
  let headers: Record<string, string>;

  try {
    const result = await fetchWithTimeout(
      normalizedUrl,
      timeout ?? defaultServerConfig.timeout
    );
    html = result.html;
    headers = result.headers;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch URL';
    if (error instanceof Error && error.name === 'AbortError') {
      return createErrorResponse(`Request timeout after ${timeout ?? defaultServerConfig.timeout}ms`, normalizedUrl);
    }
    return createErrorResponse(`Failed to fetch URL: ${message}`, normalizedUrl);
  }

  // Detect frameworks
  const frameworksResult = detectFrameworks(html, headers);
  if (frameworksResult.meta.warnings.length > 0) {
    warnings.push(...frameworksResult.meta.warnings);
  }

  // Detect analytics
  const analyticsResult = detectAnalytics(html);
  if (analyticsResult.meta.warnings.length > 0) {
    warnings.push(...analyticsResult.meta.warnings);
  }

  const data: FingerprintData = {
    url: normalizedUrl,
    technologies: frameworksResult.data.detected,
    analytics: analyticsResult.data.detected,
    headers,
  };

  return createResponse(data, normalizedUrl, warnings);
}

/**
 * Tool definition for fingerprint
 */
export const fingerprintToolDefinition = {
  name: 'fingerprint',
  description: 'Full fingerprint: fetch URL, analyze headers and HTML, return detected technologies',
  inputSchema: {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fingerprint',
      },
      timeout: {
        type: 'number',
        description: 'Optional timeout in milliseconds (default: 10000)',
      },
    },
    required: ['url'],
  },
};
