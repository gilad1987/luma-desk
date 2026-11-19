import type { OriginalProvider } from '../luma/lumaData';

/**
 * The `originalProvider` of the desk's data, to spread into it: the application that wrote the file before the desk
 * exported it. It is information for the user and for the next export only, so a missing or malformed one is left
 * out and the rest of the data still counts; every export before this field has none.
 */
export function readOriginalProvider(raw: object): { readonly originalProvider?: OriginalProvider } {
  const value: unknown = 'originalProvider' in raw ? raw.originalProvider : undefined;
  if (typeof value !== 'object' || value === null) return {};
  const provider: unknown = 'provider' in value ? value.provider : undefined;
  const providerVersion: unknown = 'providerVersion' in value ? value.providerVersion : undefined;
  if (typeof provider !== 'string' || typeof providerVersion !== 'string') return {};
  return { originalProvider: { provider, providerVersion } };
}
