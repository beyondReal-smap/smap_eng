import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/seo/json-ld';
import { PACKAGE_COMPARISON, STAR_PACKAGES, formatKrw } from '@/lib/billing/packages';
import { SITE } from '@/lib/content';
import {
  breadcrumbSchema,
  softwareApplicationSchema,
  webPageSchema,
} from '@/lib/seo/json-ld';

const [smallest] = STAR_PACKAGES;
const DESCRIPTION = `${SITE.name}은 정기 구독이 아니라 필요할 때만 충전하는 별(크레딧) 방식입니다. 별 1개로 동화 한 권을 만들 수 있고 ${formatKrw(smallest.priceKrw)}부터 시작합니다. 낭독·한글 해석·퀴즈·단어장·보호자 리포트는 추가 비용 없이 포함됩니다.`;

export const metadata: Metadata = {
  title: '이용 요금',
  description: DESCRIPTION,
  alternates: {
    canonical: '/pricing',
    types: { 'text/markdown': '/pricing.md' },
  },
  openGraph: {
    type: 'article',
    title: '하루책 이용 요금 — 별 충전 패키지',
    description: DESCRIPTION,
    url: '/pricing',
  },
};

/**
 * 요금 안내 — 결제 화면(`/subscribe`)과 분리된 **공개 정보 페이지**.
 *
 * 분리 이유: `/subscribe`는 결제 흐름(패키지 선택 → 결제창)이 목적이라 크롤러가
 * 읽어야 할 정보와 사용자가 눌러야 할 버튼이 뒤섞인다. 가격 정보를 별도 URL에
 * 정적으로 노출해야 "하루책 얼마예요?"류 질의에 안정적으로 인용된다.
 *
 * 가격·기능 목록은 `@/lib/billing/packages`가 SSOT이므로 이 페이지는 렌더만 한다
 * (env로 가격을 바꾸면 결제 화면과 이 페이지가 동시에 따라온다).
 */
export default function PricingPage() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageSchema({ path: '/pricing', name: '하루책 이용 요금', description: DESCRIPTION }),
          softwareApplicationSchema(),
          breadcrumbSchema([
            { name: '홈', path: '/' },
            { name: '이용 요금', path: '/pricing' },
          ]),
        ]}
      />

      <article className="space-y-12">
        <header className="space-y-4">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            이용 요금
          </h1>
          <p className="leading-relaxed text-muted-foreground">{DESCRIPTION}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            별은 만료되지 않고 가족 계정 단위로 합산됩니다. 한 번 만든 책은 별 잔액과 무관하게
            계속 볼 수 있으며, 자동결제와 해지 절차가 없습니다.
          </p>
        </header>

        <section aria-labelledby="packages" className="space-y-5">
          <h2 id="packages" className="font-heading text-2xl font-bold tracking-tight">
            충전 패키지
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {STAR_PACKAGES.map((pack) => (
              <article
                key={pack.id}
                className={`flex flex-col gap-3 rounded-2xl border p-6 ${
                  pack.highlighted
                    ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border/60 bg-card/40'
                }`}
              >
                {pack.highlighted && (
                  <span className="w-fit rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                    추천
                  </span>
                )}
                <h3 className="font-heading text-xl font-bold">{pack.name}</h3>
                <p className="text-sm text-muted-foreground">{pack.tagline}</p>
                <p className="text-2xl font-extrabold tracking-tight">
                  {formatKrw(pack.priceKrw)}
                </p>
                <p className="text-xs text-muted-foreground">
                  별 {pack.stars}개 · 동화 {pack.stars}권 · 권당 약 {formatKrw(pack.perStarKrw)}
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {pack.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span aria-hidden className="text-primary">
                        ·
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="text-sm">
            <Link
              href="/subscribe"
              className="font-medium underline underline-offset-4"
            >
              별 충전하러 가기
            </Link>
          </p>
        </section>

        <section aria-labelledby="comparison" className="space-y-4">
          <h2 id="comparison" className="font-heading text-2xl font-bold tracking-tight">
            패키지 비교
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4 font-semibold">항목</th>
                  {STAR_PACKAGES.map((pack) => (
                    <th key={pack.id} className="py-2 pr-4 font-semibold">
                      {pack.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PACKAGE_COMPARISON.map((row) => (
                  <tr key={row.label} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium">{row.label}</td>
                    {STAR_PACKAGES.map((pack) => {
                      const value = row.values[pack.id];
                      return (
                        <td key={pack.id} className="py-3 pr-4 text-muted-foreground">
                          {value === true ? '포함' : value === false ? '미포함' : value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="payment" className="space-y-4">
          <h2 id="payment" className="font-heading text-2xl font-bold tracking-tight">
            결제와 환불
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            웹에서는 카드 결제를 지원하며, iOS·Android 앱에서는 각 스토어의 인앱 결제로
            충전합니다. 결제 영수증은 결제 완료 화면과 보호자 모드에서 다시 확인할 수 있습니다.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            환불은 결제일로부터 7일 이내이고 별을 사용하지 않았다면 전액, 일부 사용했다면 남은
            별의 비율만큼 이루어집니다. 7일이 지난 뒤 남은 별은 결제대행 수수료 등을 공제하고
            환불됩니다. 이미 동화 생성에 사용된 별은 외부 AI 호출 비용이 발생했으므로 환불
            대상이 아닙니다. 자세한 기준은{' '}
            <Link href="/legal/refund" className="font-medium underline underline-offset-4">
              환불정책
            </Link>
            에 안내되어 있습니다.
          </p>
        </section>
      </article>
    </>
  );
}
