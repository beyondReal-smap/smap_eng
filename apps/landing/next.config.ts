import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 모노레포 루트에 pnpm-lock.yaml 이 있어 Next 가 workspace root 를 상위로 추론 → 메인 앱 src 를 함께 컴파일하려는 문제 방지
  turbopack: {
    root: process.cwd(),
  },
  // 비-랜딩 경로는 Next 메인 앱(5029)으로 catch-all 프록시 라우트가 직접 forward 합니다.
  // (apps/landing/src/app/[...path]/route.ts 참조)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/fonts/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/book_icon.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
