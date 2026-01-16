export interface FetchOptions {
  userAgent: string;
  timeoutMs: number;
  retries: number;
}

export interface FetchResult {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  text: () => Promise<string>;
  body: ReadableStream<Uint8Array> | null;
}

export type HttpErrorType = 'network' | 'http' | 'timeout';

export class HttpError extends Error {
  readonly type: HttpErrorType;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(
    type: HttpErrorType,
    message: string,
    retryable: boolean,
    status?: number
  ) {
    super(message);
    this.name = 'HttpError';
    this.type = type;
    this.retryable = retryable;
    this.status = status;
  }
}

export function isHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError;
}
