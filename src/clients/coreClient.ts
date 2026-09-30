import { getCoreAPIMairie360 } from '@mairie360/core-api-openapi/endpoints/coreAPIMairie360';
import { HttpError, mapUpstreamError } from '@mairie360/bffs-lib';
import axios, { type AxiosRequestConfig } from 'axios';
import type { Request } from 'express';
import { ZodError } from 'zod';
import { authorization, baseUrl } from './upstream';

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
 * Error to throw for a failed Core call. Only the upstream 4xx the route declares in its contract
 * (`declared`) are kept; any other status, a network failure and an unusable answer (invalid JSON,
 * missing fields) become a 502. The upstream body is never relayed.
 */
export function coreError(error: unknown, declared: readonly number[] = []): HttpError {
  if (axios.isAxiosError(error) && error.response === undefined) return new HttpError(502, 'The CORE_API service is unavailable.');
  if (error instanceof ZodError) return new HttpError(502, 'The CORE_API answer is invalid.');
  return mapUpstreamError(error, declared);
}
