interface ApiErrorBody {
  error?: string;
  message?: string;
  issues?: unknown;
  upstream_status?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: ApiErrorBody,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** 공통 JSON fetch 래퍼. 에러는 ApiError로 변환. */
export async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new ApiError(
      body?.message ?? body?.error ?? `http_${res.status}`,
      res.status,
      body,
    );
  }
  return (await res.json()) as T;
}
