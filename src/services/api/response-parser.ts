/**
 * API Response Utility - Handles consistent response parsing across the application
 * 
 * This utility provides:
 * - Consistent error extraction from backend responses
 * - Response body parsing and validation
 * - Type-safe response handling with Zod schemas
 * - Detailed error logging for debugging
 */

import { z } from 'zod';
import { ApiErrorClass } from '../../types/api';

/**
 * Backend response formats supported:
 * 
 * Success (2xx):
 * - { success: true, data: T }
 * - { success: true, ...spreadData } (for auth endpoints)
 * - { data: T }
 * - T (raw data)
 * 
 * Error (4xx/5xx):
 * - { success: false, message: string }
 * - { success: false, error: string }
 * - { success: false, error: [{ msg: string }, ...] } (express-validator)
 * - { message: string }
 * - { error: string }
 */

/**
 * Extract structured error message from backend response
 */
export const extractErrorMessage = (data: unknown): string => {
  if (!data || typeof data !== 'object') {
    return 'Unknown error occurred';
  }

  const obj = data as Record<string, unknown>;

  // Direct message field
  if (typeof obj.message === 'string' && obj.message.trim()) {
    return obj.message;
  }

  // Direct error field (string)
  if (typeof obj.error === 'string' && obj.error.trim()) {
    return obj.error;
  }

  // Express-validator error array
  if (Array.isArray(obj.error) && obj.error.length > 0) {
    const first = obj.error[0] as Record<string, unknown>;
    if (typeof first?.msg === 'string' && first.msg.trim()) {
      return first.msg;
    }
  }

  return 'An unexpected error occurred';
};

/**
 * Parse backend response with optional Zod validation
 * 
 * @param response - Raw response object from axios
 * @param schema - Optional Zod schema for validation
 * @param fallbackExtractor - Optional function to extract data from response
 * @returns Parsed and validated data
 * @throws ApiErrorClass on validation failure
 */
export const parseApiResponse = <T>(
  response: unknown,
  options?: {
    schema?: z.ZodType<T>;
    fallbackExtractor?: (data: unknown) => unknown;
    context?: string;
  }
): T => {
  if (!response || typeof response !== 'object') {
    throw new ApiErrorClass(
      'Invalid response format: expected object',
      'INVALID_RESPONSE_FORMAT',
      500,
      { context: options?.context }
    );
  }

  const obj = response as Record<string, unknown>;

  // Try to extract data based on common backend patterns
  let data: unknown;

  // Pattern 1: { success: true, data: T }
  if (obj.success === true && obj.data !== undefined) {
    data = obj.data;
  }
  // Pattern 2: { success: true, ...spreadData }
  else if (obj.success === true) {
    // Return the object itself, excluding success field
    const { success, ...rest } = obj;
    data = rest;
  }
  // Pattern 3: { data: T }
  else if (obj.data !== undefined) {
    data = obj.data;
  }
  // Pattern 4: Use fallback extractor if provided
  else if (options?.fallbackExtractor) {
    data = options.fallbackExtractor(response);
  }
  // Pattern 5: Return object as-is
  else {
    data = response;
  }

  // Validate with schema if provided
  if (options?.schema) {
    try {
      return options.schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ApiErrorClass(
          `Response validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          'RESPONSE_VALIDATION_ERROR',
          500,
          { 
            context: options.context,
            validationErrors: error.errors,
            receivedData: data
          }
        );
      }
      throw error;
    }
  }

  return data as T;
};

/**
 * Safe response parser with try-catch and detailed logging
 */
export const safeParseResponse = <T>(
  response: unknown,
  options?: {
    schema?: z.ZodType<T>;
    fallbackExtractor?: (data: unknown) => unknown;
    context?: string;
    onError?: (error: ApiErrorClass) => void;
  }
): T => {
  try {
    return parseApiResponse(response, options);
  } catch (error) {
    if (error instanceof ApiErrorClass) {
      options?.onError?.(error);
      throw error;
    }

    const apiError = new ApiErrorClass(
      'Failed to parse API response',
      'PARSE_ERROR',
      500,
      { context: options?.context, originalError: String(error) }
    );

    options?.onError?.(apiError);
    throw apiError;
  }
};

/**
 * Convert array of response data to mapped objects
 */
export const parseArrayResponse = <T>(
  response: unknown,
  mapper: (item: unknown) => T,
  options?: {
    context?: string;
  }
): T[] => {
  const data = parseApiResponse<unknown[]>(response, {
    fallbackExtractor: (r) => {
      if (Array.isArray(r)) return r;
      if (typeof r === 'object' && r !== null) {
        const obj = r as Record<string, unknown>;
        if (Array.isArray(obj.data)) return obj.data;
        if (Array.isArray(obj.issues)) return obj.issues;
        if (Array.isArray(obj.items)) return obj.items;
      }
      return [];
    },
    context: options?.context,
  });

  if (!Array.isArray(data)) {
    throw new ApiErrorClass(
      'Expected array response but received object',
      'INVALID_ARRAY_RESPONSE',
      500,
      { context: options?.context, receivedType: typeof data }
    );
  }

  try {
    return data.map(mapper);
  } catch (error) {
    throw new ApiErrorClass(
      `Failed to map response items: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'MAP_ERROR',
      500,
      { context: options?.context, originalError: error }
    );
  }
};

/**
 * Debug helper to log API response structure
 */
export const debugLogResponse = (
  label: string,
  response: unknown,
  options?: { maxDepth?: number }
): void => {
  if (process.env.NODE_ENV !== 'development') return;

  const stringify = (obj: unknown, depth = 0): string => {
    const maxDepth = options?.maxDepth ?? 2;
    if (depth > maxDepth) return '[...]';
    if (obj === null) return 'null';
    if (typeof obj !== 'object') return String(obj);

    if (Array.isArray(obj)) {
      return `[${obj.map(item => stringify(item, depth + 1)).join(', ')}]`;
    }

    const entries = Object.entries(obj as Record<string, unknown>)
      .map(([key, value]) => `${key}: ${stringify(value, depth + 1)}`)
      .join(', ');
    return `{${entries}}`;
  };

  console.debug(`[API Response Debug] ${label}`, stringify(response));
};
