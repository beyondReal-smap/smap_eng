import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://eng.smap.site'),
  title: {
    default: '하루책 | 우리 아이 맞춤, 매일 새 영어 동화',
    template: '%s | 하루책',
  },
  description:
    '하루책은 아이의 연령과 영어 수준에 맞춘 동화, TTS 낭독, 퀴즈, 단어장을 제공하는 맞춤 영어 리딩 서비스입니다.',
  applicationName: '하루책',
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [{ url: '/book_icon.png', type: 'image/png', sizes: '128x128' }],
    apple: [{ url: '/book_icon.png', sizes: '128x128', type: 'image/png' }],
    shortcut: ['/book_icon.png'],
  },
  openGraph: {
    type: 'website',
    siteName: '하루책',
    title: '우리 아이 맞춤, 매일 새 영어 동화',
    description: '영어 동화 생성, 문장별 낭독, 퀴즈와 단어 복습까지 한 번에 이어지는 리딩 루틴.',
    url: 'https://eng.smap.site/',
    images: [{ url: '/book_icon.png', width: 128, height: 128, alt: '하루책' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '우리 아이 맞춤, 매일 새 영어 동화',
    description: '영어 동화 생성, 문장별 낭독, 퀴즈와 단어 복습까지 한 번에 이어지는 리딩 루틴.',
    images: ['/book_icon.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#07111f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 초기 렌더 깜빡임(FOUT) 최소화를 위해 주요 웨이트 4종만 preload */}
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
      <body>{children}</body>
    </html>
  );
}
