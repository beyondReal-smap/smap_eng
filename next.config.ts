import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev 서버를 외부 IP/도메인에서 접속할 때 HMR·폰트 등 dev 리소스가
  // cross-origin으로 차단되지 않도록 허용 호스트를 명시한다.
  // 참고: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: [
    "3.38.195.121",
    "172.17.0.3",
  ],

  webpack(config, { dev }) {
    if (!dev && process.env.NEXT_WEBPACK_CACHE_MEMORY === "1" && config.cache) {
      config.cache = { type: "memory" };
    }

    return config;
  },

  /**
   * Next.js 16 Turbopack은 빌드 타임에 `public/` 디렉토리의 파일 목록을
   * 스냅샷으로 고정한다. 따라서 빌드 이후 런타임에 생성되는 TTS wav 파일과
   * FLUX 이미지는 디스크에 존재해도 정적 서빙 대상이 아니며 404가 반환된다.
   *
   * 해결: `/audio/*` · `/images/*` 요청을 API 라우트로 rewrite하여
   * 서버에서 직접 파일을 읽어 스트림 응답한다. DB의 webPath와 클라이언트 코드는
   * 그대로 유지된다.
   */
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: "/audio/:file", destination: "/api/static/audio/:file" },
        { source: "/images/:file", destination: "/api/static/images/:file" },
      ],
      // Expo 웹 정적 빌드는 public/mobile 아래에 배치된다. fallback에 두어야
      // 실제 정적 자산(/_expo/static/...js 등)은 디스크에서 직접 서빙되고,
      // 매칭되지 않는 SPA 라우트(/mobile/onboarding 등)만 index.html로 폴백된다.
      // afterFiles에 두면 JS/CSS 번들도 HTML로 응답되어 SyntaxError가 난다.
      // 주의: pnpm mobile:export는 next build 이전에 실행해야 한다 — turbopack은
      // 빌드 타임에 public/ 스냅샷을 고정하므로 이후 추가된 파일은 서빙되지 않는다.
      fallback: [
        { source: "/mobile", destination: "/mobile/index.html" },
        { source: "/mobile/:path*", destination: "/mobile/index.html" },
      ],
    };
  },
};

export default nextConfig;
