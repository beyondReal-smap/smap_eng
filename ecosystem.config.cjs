/**
 * PM2 process manifest for smap_eng
 *
 * 관리 서비스:
 *  - smap-eng-web: Next.js landing/front proxy on port 5027 (apps/landing)
 *  - smap-eng-next: Next.js app/API server on port 5029
 *  - smap-eng-tts: Kokoro TTS FastAPI on port 8880
 *
 * 이미지(FLUX) 서비스는 HF access 승인 후 별도 entry 추가 예정.
 *
 * 사용:
 *   bash scripts/deploy.sh                       # 정식 배포 (install + build + reload)
 *   pm2 status
 *   pm2 logs smap-eng-web
 *   pm2 restart smap-eng-web --update-env
 *   pm2 stop all
 *
 * smap-eng-next 는 scripts/start-next.sh wrapper 를 통해 기동된다.
 * .next/BUILD_ID 부재 시 wrapper 가 즉시 exit 1 → max_restarts 가드로 크래시 루프 차단.
 */
const ROOT = __dirname;

module.exports = {
  apps: [
    {
      name: 'smap-eng-web',
      cwd: `${ROOT}/apps/landing`,
      script: `${ROOT}/apps/landing/node_modules/.bin/next`,
      args: 'start -p 5027 -H 127.0.0.1',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: '5027',
        NEXT_ORIGIN: 'http://127.0.0.1:5029',
      },
      max_memory_restart: '2G',
      autorestart: true,
      out_file: './logs/web-out.log',
      error_file: './logs/web-error.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'smap-eng-next',
      cwd: ROOT,
      script: './scripts/start-next.sh',
      interpreter: 'bash',
      env: {
        NODE_ENV: 'production',
        PORT: '5029',
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
      name: 'smap-eng-tts',
      cwd: `${ROOT}/services/tts`,
      script: './.venv/bin/uvicorn',
      args: 'server:app --host 127.0.0.1 --port 8880 --log-level info',
      interpreter: 'none',
      // Kokoro PyTorch 모델은 합성 중 메모리 spike(>1G)가 발생해 1G에선 PM2가
      // SIGTERM으로 재시작을 반복했다(2026-04-25 19:22~19:25 사례). 2G로 올렸으나
      // 백그라운드 prefetch가 연속 합성을 누적시키며 다시 2G를 넘어 PM2가 30초
      // 모니터링 주기마다 SIGINT를 보내는 재시작 루프 발생(2026-04-26 14:05~14:07).
      // 모델 ~1.2G + 합성 buffer 누적분을 흡수하도록 3G로 상향. 시스템 RAM 7.8G,
      // swap 2G 환경에서 단발성 spike까지 안전.
      max_memory_restart: '3G',
      autorestart: true,
      out_file: `${ROOT}/logs/tts-out.log`,
      error_file: `${ROOT}/logs/tts-error.log`,
      merge_logs: true,
      time: true,
    },
  ],
};
