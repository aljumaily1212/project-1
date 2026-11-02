export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, unknown>,
    public retryAfter?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const NETWORK_ERROR = 0;
