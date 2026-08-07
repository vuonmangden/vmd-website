export interface ApiSuccessResponse<T = unknown> {
  data: T;
  meta?: Record<string, unknown>;
  correlationId: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  correlationId: string;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}
