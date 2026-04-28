interface ApiErrorBody {
  error?: string;
  message?: string;
  issues?: unknown;
  upstream_status?: number;
  /** error === 'insufficient_credits' 일 때만 포함. 잔액·필요량 UI에 사용. */
  credits?: {
    balance: number;
    required: number;
  };
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

/**
 * 401 폭주 방지용 디바운스 + 단일 redirect 가드.
 * 이미 로그인 페이지로 가고 있는데 reader/스토어/배치 폴링 등
 * 다중 호출이 동시에 401을 받으면 toast가 N개 쌓이고 redirect가 race한다.
 */
let unauthorizedHandled = false;

function handleUnauthorizedOnce(): void {
  if (typeof window === 'undefined') return;
  if (unauthorizedHandled) return;
  unauthorizedHandled = true;
  // 동적 import — 서버 번들 오염 방지 + sonner는 이미 layout에 마운트되어 있음.
  void import('sonner').then(({ toast }) => {
    toast.error('세션이 만료되었어요. 다시 로그인해 주세요.');
  });
  // 1초 여유: toast가 보이도록 + 진행 중인 다른 요청들이 동일 가드로 묶이도록.
  window.setTimeout(() => {
    const here = window.location.pathname + window.location.search;
    // 이미 /login이면 추가 redirect 불필요.
    if (window.location.pathname.startsWith('/login')) return;
    const callback = encodeURIComponent(here || '/');
    window.location.href = `/login?callbackUrl=${callback}`;
  }, 1000);
}

/** 공통 JSON fetch 래퍼. 에러는 ApiError로 변환. 401은 자동 로그인 안내. */
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
    if (res.status === 401) handleUnauthorizedOnce();
    throw new ApiError(
      body?.message ?? body?.error ?? `http_${res.status}`,
      res.status,
      body,
    );
  }
  return (await res.json()) as T;
}
