import { getCoreAPIMairie360 } from '@mairie360/core-api-openapi/endpoints/coreAPIMairie360';
import axios, { type AxiosRequestConfig } from 'axios';
import type { Request } from 'express';
import { ZodError } from 'zod';
import { authorization, baseUrl, UpstreamError } from './upstream';

// Core API is only called through the operations of its published contract (@mairie360/core-api-openapi).
// Wrap every other upstream API the same way, from its own @mairie360/<name>-api-openapi package.
const coreAxios = axios.create({ timeout: 10_000, headers: { Accept: 'application/json' } });

export const coreApi = getCoreAPIMairie360(coreAxios);

/**
 * Options of a Core call on behalf of the caller. The URL is read again on every request (the
 * environment can change without a restart); a caller without a session is refused before the call.
 */
export function asCaller(req: Request): AxiosRequestConfig {
  // Session first: a caller without one gets a 401 even when Core API is not configured.
  const Authorization = authorization(req);
  return { baseURL: baseUrl('CORE_API'), headers: { Authorization } };
}

/** Options of a call without a session (availability probes). */
export function withoutSession(timeout = 5_000): AxiosRequestConfig {
  return { baseURL: baseUrl('CORE_API'), timeout };
}

/**
 * An upstream 4xx is kept, an upstream failure (5xx) becomes a 502 without relaying its body, a
 * network failure a 502 "unavailable", and an unusable answer (invalid JSON, missing fields) a 502
 * "invalid answer".
 */
export function coreError(error: unknown): unknown {
  if (error instanceof UpstreamError) return error;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === undefined) return new UpstreamError(502, 'The CORE_API service is unavailable.');
    return new UpstreamError(status >= 500 ? 502 : status, `The CORE_API service answered ${status}.`);
  }
  if (error instanceof ZodError) return new UpstreamError(502, 'The CORE_API answer is invalid.');
  return error;
}
