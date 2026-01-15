import type {
  ResponseEnvelope,
  FrameworksData,
  DetectedTechnology,
  ConfidenceLevel,
} from '../types.js';
import { frameworkSignatures, headerSignatures } from '../config.js';

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
 * Extract version from content using a pattern
 */
function extractVersion(content: string, versionPattern?: RegExp): string | undefined {
  if (!versionPattern) return undefined;

  const match = content.match(versionPattern);
  return match ? match[1] : undefined;
}

/**
 * Calculate confidence based on number of pattern matches
 */
function calculateConfidence(matchCount: number, totalPatterns: number): ConfidenceLevel {
  const ratio = matchCount / totalPatterns;
  if (ratio >= 0.5 || matchCount >= 3) return 'high';
  if (ratio >= 0.25 || matchCount >= 2) return 'medium';
  return 'low';
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
 * Detect technologies from headers
 */
function detectFromHeaders(headers: Record<string, string>): DetectedTechnology[] {
  const detected: DetectedTechnology[] = [];
  const normalizedHeaders: Record<string, string> = {};

  // Normalize header names to lowercase
  for (const [key, value] of Object.entries(headers)) {
    normalizedHeaders[key.toLowerCase()] = value;
  }

  for (const signature of headerSignatures) {
    const headerValue = normalizedHeaders[signature.header.toLowerCase()];
    if (!headerValue) continue;

    for (const { pattern, technology, category } of signature.patterns) {
      if (matchesPattern(headerValue, pattern)) {
        detected.push({
          name: technology,
          confidence: 'high',
          category,
          evidence: `${signature.header}: ${headerValue}`,
        });
        break; // Only detect once per header
      }
    }
  }

  return detected;
}

/**
 * Detect technologies from HTML content
 */
function detectFromHtml(html: string): DetectedTechnology[] {
  const detected: DetectedTechnology[] = [];

  for (const signature of frameworkSignatures) {
    let matchCount = 0;
    let matchedPatterns: (string | RegExp)[] = [];

    for (const pattern of signature.patterns) {
      if (matchesPattern(html, pattern)) {
        matchCount++;
        matchedPatterns.push(pattern);
      }
    }

    if (matchCount > 0) {
      const confidence = calculateConfidence(matchCount, signature.patterns.length);
      const version = extractVersion(html, signature.versionPattern);
      const evidence = findEvidence(html, matchedPatterns);

      detected.push({
        name: signature.name,
        version,
        confidence,
        category: signature.category,
        evidence,
      });
    }
  }

  return detected;
}

/**
 * Deduplicate detected technologies, keeping the one with highest confidence
 */
function deduplicateTechnologies(technologies: DetectedTechnology[]): DetectedTechnology[] {
  const techMap = new Map<string, DetectedTechnology>();
  const confidenceOrder: ConfidenceLevel[] = ['high', 'medium', 'low'];

  for (const tech of technologies) {
    const existing = techMap.get(tech.name);
    if (!existing) {
      techMap.set(tech.name, tech);
    } else {
      // Keep the one with higher confidence
      const existingIndex = confidenceOrder.indexOf(existing.confidence);
      const newIndex = confidenceOrder.indexOf(tech.confidence);
      if (newIndex < existingIndex) {
        techMap.set(tech.name, tech);
      } else if (newIndex === existingIndex && !existing.version && tech.version) {
        // Prefer the one with version info
        techMap.set(tech.name, tech);
      }
    }
  }

  return Array.from(techMap.values());
}

/**
 * Detect frontend/backend frameworks from HTML content and optional headers
 *
 * @param html - The HTML content to analyze
 * @param headers - Optional HTTP headers to analyze
 * @returns Response envelope with detected technologies
 */
export function detectFrameworks(
  html: string,
  headers?: Record<string, string>
): ResponseEnvelope<FrameworksData> {
  const warnings: string[] = [];
  let detected: DetectedTechnology[] = [];

  if (!html || html.trim().length === 0) {
    warnings.push('Empty HTML content provided');
  } else {
    detected = [...detected, ...detectFromHtml(html)];
  }

  if (headers && Object.keys(headers).length > 0) {
    detected = [...detected, ...detectFromHeaders(headers)];
  }

  // Deduplicate results
  detected = deduplicateTechnologies(detected);

  // Sort by confidence (high first)
  const confidenceOrder: ConfidenceLevel[] = ['high', 'medium', 'low'];
  detected.sort((a, b) => {
    return confidenceOrder.indexOf(a.confidence) - confidenceOrder.indexOf(b.confidence);
  });

  return createResponse({ detected }, warnings);
}

/**
 * Tool definition for detect_frameworks
 */
export const detectFrameworksToolDefinition = {
  name: 'detect_frameworks',
  description: 'Detect frontend/backend frameworks from HTML content and optional headers',
  inputSchema: {
    type: 'object' as const,
    properties: {
      html: {
        type: 'string',
        description: 'The HTML content to analyze',
      },
      headers: {
        type: 'object',
        description: 'Optional HTTP headers to analyze',
        additionalProperties: { type: 'string' },
      },
    },
    required: ['html'],
  },
};
