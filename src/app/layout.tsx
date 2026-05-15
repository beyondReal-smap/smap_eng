import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { PwaRegister } from '@/components/pwa-register';
import { ShortcutHelp } from '@/components/shortcut-help';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthSessionProvider } from '@/components/providers/session-provider';
import { auth } from '@/auth';
import './globals.css';

export const metadata: Metadata = {
  // 절대 URL 생성 기준점. OG/twitter 이미지 경로(/book_icon.png)와 alternates.canonical을
  // 자동 절대화한다.
  metadataBase: new URL('https://eng.smap.site'),
  // template은 자식 페이지에서 title을 지정하면 "[제목] | 하루책" 형태로 자동 합성.
  title: {
    default: '하루책 | AI가 매일 만드는 아이 맞춤 영어 동화',
    template: '%s | 하루책',
  },
  description:
    '하루책은 아이의 연령과 영어 수준에 맞춘 동화, TTS 낭독, 퀴즈, 단어장을 제공하는 AI 영어 리딩 서비스입니다.',
  manifest: '/manifest.webmanifest',
  applicationName: '하루책',
  appleWebApp: {
    capable: true,
    title: '하루책',
    statusBarStyle: 'default',
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
  },
  alternates: {
    canonical: '/',
  },
  // 앱 경로(/book, /quiz 등)에서도 랜딩과 동일한 브랜드 아이콘을 노출.
  icons: {
    icon: [{ url: '/book_icon.png', type: 'image/png', sizes: '128x128' }],
    apple: [{ url: '/book_icon.png', sizes: '128x128', type: 'image/png' }],
    shortcut: ['/book_icon.png'],
  },
  openGraph: {
    type: 'website',
    siteName: '하루책',
    title: 'AI가 매일 만드는 아이 맞춤 영어 동화',
    description: '영어 동화 생성, 문장별 낭독, 퀴즈와 단어 복습까지 한 번에 이어지는 리딩 루틴.',
    url: 'https://eng.smap.site/',
    images: [{ url: '/book_icon.png', width: 128, height: 128, alt: '하루책' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI가 매일 만드는 아이 맞춤 영어 동화',
    description: '영어 동화 생성, 문장별 낭독, 퀴즈와 단어 복습까지 한 번에 이어지는 리딩 루틴.',
    images: ['/book_icon.png'],
  },
};

export const viewport: Viewport = {
  // 다크 모드 제거(2026-04-24) — light 단일 테마 컬러.
  // '#faf6ea'는 warm paper 배경(oklch 0.982 0.012 92)에 대응.
  themeColor: '#faf6ea',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Auth.js 세션을 SSR 단계에서 미리 읽어 SessionProvider에 주입한다.
  // 이렇게 해야 AccountMenu 등 useSession() 사용 컴포넌트가 hydration
  // 즉시 정확한 상태로 그려진다. 누락 시 fetch 응답이 도착하기 전까지
  // 우상단에 "로그인" 버튼이 잠시(또는 끝까지) 노출되는 회귀가 발생.
  const session = await auth();
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* 랜딩과 동일한 AtoZ 로컬 폰트 우선 로드 — CDN A2Z는 fallback.
           초기 렌더 FOUT을 최소화하기 위해 주요 3 웨이트를 preload. */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/AtoZ-4Regular.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/AtoZ-7Bold.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/AtoZ-9Black.woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <AuthSessionProvider session={session}>
          <ThemeProvider>
            {/* ViewTransition 제거(2026-04-26) — children diff(/book → /loading.tsx →
                /page.tsx) 단계마다 page-out/page-in 슬라이드업이 fire되면서 본문이
                "두 번 올라오는" 깜빡임을 일으켰다. view-transition-name 명명으로 morph
                처리도 시도했으나 ViewTransition default가 우선 적용되어 무력화. 페이지
                전환 애니메이션을 끄는 쪽이 사용자 체감상 더 자연스럽다는 결론. */}
            {children}
            <ShortcutHelp />
            <Toaster richColors position="bottom-center" />
            <PwaRegister />
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
