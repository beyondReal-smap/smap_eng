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
   * 스냅샷으로 고정한다. 따라서 빌드 이후 런타임에 생성되는 TTS 오디오 파일과
   * FLUX 이미지는 디스크에 존재해도 정적 서빙 대상이 아니며 404가 반환된다.
   *
   * 해결: `/audio/*` · `/images/*` 요청을 API 라우트로 rewrite하여
   * 서버에서 직접 파일을 읽어 스트림 응답한다. DB의 webPath와 클라이언트 코드는
   * 그대로 유지된다.
   *
   * ⚠️ 반드시 beforeFiles에 둘 것. afterFiles에 두면 public/에 실재하는 파일은
   * 정적 서빙이 우선해 API 라우트의 인증·소유권 검증(BOLA 방어)이 통째로
   * 우회된다(2026-06-11 발견 — 무인증으로 타 사용자 오디오 열거 가능했음).
   * `:file`은 단일 세그먼트만 매칭하므로 `/images/covers/*`·`/images/landing/*`
   * 같은 하위 디렉토리 정적 UI 자산은 영향받지 않고 그대로 정적 서빙된다.
   */
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/audio/:file", destination: "/api/static/audio/:file" },
        { source: "/images/:file", destination: "/api/static/images/:file" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
