/**
 * PM2 process manifest for eng (구 smap_eng, 2026-07-06 /home/jin/projects/eng로 이름변경)
 *
 * 관리 서비스:
 *  - eng-web: Next.js landing/front proxy on port 5112 (apps/landing)
 *  - eng-next: Next.js app/API server on port 5111
 *  (로컬 컨테이너 이전 시 5027/5029가 타 프로젝트와 충돌하여 5112/5111로 변경)
 *  - eng-tts: Supertonic TTS FastAPI on port 5113
 *  - eng-tts-testpage: TTS 합성 테스트 페이지(개발/QA) on port 5105 → 5113 프록시
 *
 * 이미지(FLUX) 서비스는 HF access 승인 후 별도 entry 추가 예정.
 *
 * 사용:
 *   bash scripts/deploy.sh                       # 정식 배포 (install + build + reload)
 *   pm2 status
 *   pm2 logs eng-web
 *   pm2 restart eng-web --update-env
 *   pm2 stop all
 *
 * eng-next 는 scripts/start-next.sh wrapper 를 통해 기동된다.
 * .next/BUILD_ID 부재 시 wrapper 가 즉시 exit 1 → max_restarts 가드로 크래시 루프 차단.
 */
const ROOT = __dirname;

module.exports = {
  apps: [
    {
      name: 'eng-web',
      cwd: `${ROOT}/apps/landing`,
      script: `${ROOT}/apps/landing/node_modules/.bin/next`,
      args: 'start -p 5112 -H 127.0.0.1',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: '5112',
        NEXT_ORIGIN: 'http://127.0.0.1:5111',
      },
      max_memory_restart: '2G',
      autorestart: true,
      out_file: './logs/web-out.log',
      error_file: './logs/web-error.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'eng-next',
      cwd: ROOT,
      script: './scripts/start-next.sh',
      interpreter: 'bash',
      env: {
        NODE_ENV: 'production',
        PORT: '5111',
        SUPERTONIC_BASE_URL: 'http://127.0.0.1:5113',
      },
      max_memory_restart: '2G',
      autorestart: true,
      // 9899회 크래시 루프(2026-04-27) 방어. wrapper 가 BUILD_ID 부재 시 exit 1 하므로
      // 미빌드 배포가 반영되어도 11회 재시도 후 errored 로 멈춘다.
      // 정상 기동 시 Ready 까지 ~150ms 라 30s 면 충분히 안정 판정.
      min_uptime: '30s',
      max_restarts: 10,
      out_file: './logs/next-out.log',
      error_file: './logs/next-error.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'eng-tts',
      cwd: `${ROOT}/services/tts`,
      script: './.venv/bin/uvicorn',
      args: 'server:app --host 127.0.0.1 --port 5113 --log-level info',
      interpreter: 'none',
      // Supertonic(99M ONNX)은 Kokoro PyTorch(~1.2G) 대비 메모리 footprint가 작다.
      // 다만 백그라운드 prefetch가 연속 합성을 누적시키면 합성 buffer가 spike할 수 있다
      // (Kokoro 시절 2026-04-25~26 OOM 재시작 루프 이력). ONNX 전환으로 여유가 커졌으나
      // 단발성 spike까지 안전하도록 3G headroom을 유지한다(시스템 RAM 7.8G, swap 2G).
      // 실측 후 하향 가능.
      max_memory_restart: '3G',
      autorestart: true,
      out_file: `${ROOT}/logs/tts-out.log`,
      error_file: `${ROOT}/logs/tts-error.log`,
      merge_logs: true,
      time: true,
    },
    {
      // TTS 합성을 브라우저에서 빠르게 들어보는 개발/QA용 테스트 페이지.
      // 모델을 로드하지 않고 eng-tts(5113)로 합성 요청을 프록시만 하므로
      // 메모리 footprint가 매우 작다(프록시 + 정적 HTML). 운영 server.py 무관.
      name: 'eng-tts-testpage',
      cwd: `${ROOT}/services/tts`,
      script: './.venv/bin/uvicorn',
      args: 'test_page:app --host 127.0.0.1 --port 5105 --log-level info',
      interpreter: 'none',
      env: {
        SUPERTONIC_BASE_URL: 'http://127.0.0.1:5113',
      },
      max_memory_restart: '300M',
      autorestart: true,
      out_file: `${ROOT}/logs/tts-testpage-out.log`,
      error_file: `${ROOT}/logs/tts-testpage-error.log`,
      merge_logs: true,
      time: true,
    },
    {
      // 매주 일요일 20:00(KST 서버 로컬타임)에 보호자 주간 리포트 푸시를 트리거.
      // scripts/notify-weekly-report.mjs가 내부 HTTP 엔드포인트에 POST 한 번 후 종료 →
      // PM2 cron_restart가 다음 일요일에 다시 띄움. autorestart=false로 재시작 루프 차단.
      // 시크릿 토큰은 환경에서 주입 (.env.local의 CRON_TOKEN).
      name: 'eng-cron-weekly',
      cwd: ROOT,
      script: './scripts/notify-weekly-report.mjs',
      interpreter: 'node',
      autorestart: false,
      cron_restart: '0 20 * * 0',
      env: {
        NODE_ENV: 'production',
        NEXT_LOCAL_URL: 'http://127.0.0.1:5111',
      },
      out_file: `${ROOT}/logs/cron-weekly-out.log`,
      error_file: `${ROOT}/logs/cron-weekly-error.log`,
      merge_logs: true,
      time: true,
    },
  ],
};
