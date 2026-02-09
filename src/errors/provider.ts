import { CognitError } from './base.js';

export class ProviderError extends CognitError {
  readonly code: string = 'PROVIDER_ERROR';
  readonly module = 'providers';

  constructor(
    message: string,
    readonly providerId: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export class ProviderFetchError extends ProviderError {
  override readonly code = 'PROVIDER_FETCH_ERROR';

  constructor(
    readonly url: string,
    providerId: string,
    readonly statusCode?: number,
    options?: ErrorOptions,
  ) {
    super(
      `Failed to fetch from ${providerId}: ${url} (${statusCode ?? 'network error'})`,
      providerId,
      options,
    );
  }
}

export class ProviderMatchError extends ProviderError {
  override readonly code = 'PROVIDER_MATCH_ERROR';
}

export class NoCognitivesFoundError extends ProviderError {
  override readonly code = 'NO_COGNITIVES_FOUND';

  constructor(readonly source: string, providerId: string) {
    super(`No cognitives found at: ${source}`, providerId);
  }
}
