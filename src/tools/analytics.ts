import type { ResponseEnvelope, AnalyticsData, DetectedAnalytics } from '../types.js';
import { analyticsSignatures } from '../config.js';

/**
 * Creates a standard response envelope
 */
function createResponse<T>(data: T, warnings: string[] = []): ResponseEnvelope<T> {
  return {
    ok: true,
    data,
    meta: {
      retrieved_at: new Date().toISOString(),
      pagination: { next_cursor: null },
      warnings,
    },
  };
}

/**
 * Check if a pattern matches the content
 */
function matchesPattern(content: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    return content.includes(pattern);
  }
  return pattern.test(content);
}

/**
 * Find evidence of a match in the content
 */
function findEvidence(content: string, patterns: (string | RegExp)[]): string | undefined {
  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      const index = content.indexOf(pattern);
      if (index !== -1) {
        const start = Math.max(0, index - 20);
        const end = Math.min(content.length, index + pattern.length + 20);
        return `...${content.slice(start, end)}...`;
      }
    } else {
      const match = content.match(pattern);
      if (match) {
        return match[0];
      }
    }
  }
  return undefined;
}

/**
 * Detect analytics and tracking scripts from HTML content
 *
 * @param html - The HTML content to analyze
 * @returns Response envelope with detected analytics tools
 */
export function detectAnalytics(html: string): ResponseEnvelope<AnalyticsData> {
  const warnings: string[] = [];
  const detected: DetectedAnalytics[] = [];
  const seenNames = new Set<string>();

  if (!html || html.trim().length === 0) {
    warnings.push('Empty HTML content provided');
    return createResponse({ detected }, warnings);
  }

  // Normalize HTML for pattern matching
  const normalizedHtml = html.toLowerCase();

  for (const signature of analyticsSignatures) {
    // Skip if already detected
    if (seenNames.has(signature.name)) {
      continue;
    }

    for (const pattern of signature.patterns) {
      // Check against both original and normalized HTML
      if (matchesPattern(html, pattern) || matchesPattern(normalizedHtml, pattern)) {
        const evidence = findEvidence(html, [pattern]);

        detected.push({
          name: signature.name,
          type: signature.type,
          evidence,
        });

        seenNames.add(signature.name);
        break; // Move to next signature once detected
      }
    }
  }

  return createResponse({ detected }, warnings);
}

/**
 * Tool definition for detect_analytics
 */
export const detectAnalyticsToolDefinition = {
  name: 'detect_analytics',
  description: 'Detect analytics and tracking scripts (Google Analytics, Facebook Pixel, etc.) from HTML content',
  inputSchema: {
    type: 'object' as const,
    properties: {
      html: {
        type: 'string',
        description: 'The HTML content to analyze for analytics scripts',
      },
    },
    required: ['html'],
  },
};
