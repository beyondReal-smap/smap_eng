# SMAP English Mobile

Expo 기반 iOS/Android 앱입니다. 기존 Next.js 서버의 `/api/*`를 호출하고, AI 생성·DB·TTS 저장 로직은 서버에 유지합니다.

## Get started

1. 환경변수를 설정합니다.

   ```bash
   cp .env.example .env.local
   ```

2. 앱을 실행합니다.

   ```bash
   pnpm start
   ```

3. 플랫폼별 실행

   ```bash
   pnpm android
   pnpm ios
   ```

## API base URL

`EXPO_PUBLIC_API_BASE_URL`이 없으면 개발 모드에서 다음 기본값을 사용합니다.

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator/web: `http://localhost:3000`

실기기 테스트는 같은 네트워크의 개발 서버 주소를 지정해야 합니다.

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:3000 pnpm start
```

## Current scope

- Expo Router 기반 앱 셸
- 프로필/책장/책 상세 API 클라이언트
- 리더 화면과 `expo-audio` 음성 재생 버튼
- `expo-secure-store` 기반 모바일 세션 저장소
- `smapeng://auth/callback` 딥링크 로그인 콜백
- 이메일/비밀번호 및 Google/Kakao 기반 모바일 로그인

백엔드 인증 API 계약은 [docs/mobile-auth-bridge.md](./docs/mobile-auth-bridge.md)에 정리되어 있습니다.

## Production build

EAS Build 사용 시 `EXPO_PUBLIC_API_BASE_URL`을 빌드 프로필 또는 Expo 환경변수에 설정해야 합니다.

```bash
npx eas-cli@latest build --platform all
```
