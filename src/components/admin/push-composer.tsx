'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 관리자 푸시 발송 폼.
 *
 * 흐름:
 *  1) 대상 모드 선택 (단건 / 세그먼트)
 *  2) 단건이면 이메일/ID 입력 → onBlur 시 미리보기 호출
 *  3) 세그먼트면 라디오 선택 → 선택 변경 시 미리보기 호출
 *  4) 제목/본문/딥링크 입력 + 우측 미리보기 카드 실시간 갱신
 *  5) 발송 버튼 → 확인 모달 → /api/admin/push/send 호출 → 결과 토스트
 *
 * 모든 fetch 실패는 사용자 친화 한글 메시지로 표시. HTTP 코드/내부 키 노출 금지.
 */

type AudienceMode = 'single' | 'segment';

type SegmentKey = 'all_active' | 'subscribers' | 'dormant' | 'new_users';

const SEGMENT_OPTIONS: { key: SegmentKey; label: string; description: string }[] = [
  {
    key: 'all_active',
    label: '활성 사용자',
    description: '지난 30일 안에 앱을 켠 적이 있는 사용자',
  },
  { key: 'subscribers', label: '구독자', description: '구독 결제 이력이 있는 사용자' },
  {
    key: 'dormant',
    label: '도르맨트',
    description: '푸시 토큰은 있지만 14일 이상 활동이 없는 사용자',
  },
  { key: 'new_users', label: '신규 가입', description: '가입한 지 7일 이내인 사용자' },
];

interface PreviewState {
  loading: boolean;
  count: number | null;
  notFound: boolean;
  error: string | null;
}

const EMPTY_PREVIEW: PreviewState = {
  loading: false,
  count: null,
  notFound: false,
  error: null,
};

export function PushComposer() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [mode, setMode] = useState<AudienceMode>('single');
  const [singleIdentifier, setSingleIdentifier] = useState('');
  const [segment, setSegment] = useState<SegmentKey>('all_active');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState('');

  const [preview, setPreview] = useState<PreviewState>(EMPTY_PREVIEW);
  const [result, setResult] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);

  const audience = mode === 'single' ? 'single' : segment;

  const refreshPreview = useCallback(async () => {
    if (mode === 'single' && !singleIdentifier.trim()) {
      setPreview(EMPTY_PREVIEW);
      return;
    }
    setPreview((p) => ({ ...p, loading: true, error: null }));
    try {
      const res = await fetch('/api/admin/push/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience,
          targetIdentifier: mode === 'single' ? singleIdentifier.trim() : undefined,
        }),
      });
      if (!res.ok) {
        throw new Error('대상 수를 불러오지 못했어요.');
      }
      const data: { audienceCount: number; notFound: boolean } = await res.json();
      setPreview({
        loading: false,
        count: data.audienceCount,
        notFound: data.notFound,
        error: null,
      });
    } catch (err) {
      setPreview({
        loading: false,
        count: null,
        notFound: false,
        error: (err as Error).message,
      });
    }
  }, [audience, mode, singleIdentifier]);

  // 세그먼트 변경 또는 모드 전환 시 자동 갱신. 단건은 onBlur에서 명시적으로 호출.
  useEffect(() => {
    if (mode === 'segment') {
      void refreshPreview();
    } else {
      setPreview(EMPTY_PREVIEW);
    }
  }, [mode, segment, refreshPreview]);

  const canSubmit = useMemo(() => {
    if (!body.trim()) return false;
    if (preview.loading || pending) return false;
    if (mode === 'single') {
      return !!singleIdentifier.trim() && (preview.count ?? 0) > 0;
    }
    return (preview.count ?? 0) > 0;
  }, [body, preview, pending, mode, singleIdentifier]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const confirmMsg =
      mode === 'single'
        ? `이 사용자에게 푸시를 보낼까요?`
        : `${preview.count?.toLocaleString() ?? '0'}명에게 푸시를 보낼까요?`;
    if (!window.confirm(confirmMsg)) return;

    startTransition(async () => {
      setResult(null);
      try {
        const res = await fetch('/api/admin/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audience,
            targetIdentifier: mode === 'single' ? singleIdentifier.trim() : undefined,
            title: title.trim() || undefined,
            body: body.trim(),
            deepLink: deepLink.trim() || undefined,
          }),
        });
        if (!res.ok) {
          throw new Error('발송에 실패했어요. 잠시 후 다시 시도해 주세요.');
        }
        const data: {
          audienceCount: number;
          sendCount: number;
          success: number;
          failure: number;
          dropped: number;
          status: 'completed' | 'failed';
          reason?: string;
        } = await res.json();
        if (data.status === 'failed') {
          setResult({
            kind: 'error',
            message:
              data.reason === 'target_not_found'
                ? '대상 사용자를 찾지 못했어요.'
                : '발송 대상이 없어요.',
          });
        } else {
          setResult({
            kind: 'success',
            message: `${data.audienceCount}명에게 전송 시도, 성공 ${data.success} · 실패 ${data.failure + data.dropped}.`,
          });
          // 본문/제목은 초기화하지만 audience 설정은 유지 — 연속 발송 편의.
          setTitle('');
          setBody('');
          setDeepLink('');
          router.refresh();
        }
      } catch (err) {
        setResult({ kind: 'error', message: (err as Error).message });
      }
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <section className="space-y-6">
        <Card>
          <SectionTitle>대상</SectionTitle>
          <div className="space-y-3 px-4 pb-4">
            <RadioRow
              checked={mode === 'single'}
              onChange={() => setMode('single')}
              label="단건"
              description="이메일 또는 사용자 ID로 한 명에게만 보냅니다."
            />
            {mode === 'single' && (
              <div className="ml-7 space-y-2">
                <input
                  type="text"
                  inputMode="email"
                  autoComplete="off"
                  placeholder="user@example.com 또는 user_id"
                  value={singleIdentifier}
                  onChange={(e) => setSingleIdentifier(e.target.value)}
                  onBlur={() => void refreshPreview()}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-xs text-muted-foreground">
                  {preview.loading
                    ? '확인 중…'
                    : preview.count === 1
                      ? '✓ 대상 1명 확인됨'
                      : preview.notFound
                        ? '⚠ 해당 사용자를 찾지 못했어요. 푸시 등록이 안 된 사용자일 수 있어요.'
                        : '입력 후 다른 곳을 누르면 대상이 확인돼요.'}
                </p>
              </div>
            )}

            <RadioRow
              checked={mode === 'segment'}
              onChange={() => setMode('segment')}
              label="세그먼트"
              description="조건에 맞는 사용자 전체에게 일괄 발송합니다."
            />
            {mode === 'segment' && (
              <div className="ml-7 space-y-2">
                {SEGMENT_OPTIONS.map((opt) => (
                  <label key={opt.key} className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="segment"
                      checked={segment === opt.key}
                      onChange={() => setSegment(opt.key)}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-semibold">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <SectionTitle>메시지</SectionTitle>
          <div className="space-y-3 px-4 pb-4">
            <Field label="제목 (선택)">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
                placeholder="예: 새 동화가 도착했어요"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </Field>
            <Field label="본문 (필수)">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="예: Mina의 새 모험이 책장에 도착했어요. 지금 읽어보세요."
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-right text-[10px] text-muted-foreground">{body.length} / 200</p>
            </Field>
            <Field label="딥링크 (선택)">
              <input
                type="text"
                value={deepLink}
                onChange={(e) => setDeepLink(e.target.value)}
                maxLength={500}
                placeholder="예: smapeng://book/123"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-xs text-muted-foreground">
                탭하면 이동할 화면. 비워두면 앱 홈이 열려요.
              </p>
            </Field>
          </div>
        </Card>

        {result && (
          <div
            role="status"
            className={`rounded-2xl border px-4 py-3 text-sm ${
              result.kind === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {result.message}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">
            {preview.loading ? (
              '대상 인원을 확인하고 있어요…'
            ) : preview.count !== null ? (
              <>
                예상 수신자{' '}
                <span className="font-bold text-foreground">
                  {preview.count.toLocaleString()}
                </span>
                명
              </>
            ) : preview.error ? (
              <span className="text-rose-600">{preview.error}</span>
            ) : (
              '대상을 선택하면 인원이 표시돼요.'
            )}
          </div>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? '발송 중…' : '발송하기'}
          </button>
        </div>
      </section>

      <aside className="space-y-3">
        <SectionTitle>미리보기</SectionTitle>
        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <PushPreviewCard title={title} body={body} />
          <p className="mt-3 text-[11px] text-muted-foreground">
            실제 알림 표시는 OS·기기 설정에 따라 다를 수 있어요.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-border bg-card">{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function RadioRow({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="radio" name="audience-mode" checked={checked} onChange={onChange} className="mt-1" />
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </label>
  );
}

function PushPreviewCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-background p-3 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-block h-4 w-4 rounded bg-primary/30" aria-hidden />
        <span className="font-semibold uppercase tracking-wider">하루책</span>
        <span>· 지금</span>
      </div>
      <div className="mt-1.5 text-sm font-bold text-foreground">
        {title || <span className="text-muted-foreground">(제목 없음)</span>}
      </div>
      <div className="mt-0.5 text-sm text-foreground/80">
        {body || <span className="text-muted-foreground">본문이 여기에 표시돼요.</span>}
      </div>
    </div>
  );
}
