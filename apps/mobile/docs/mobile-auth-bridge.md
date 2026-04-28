# Mobile Auth Bridge Contract

The native app is ready to consume a short-lived mobile API token.

## Deep link callback

Backend redirects to:

```text
smapeng://auth/callback?code=<one_time_exchange_code>&expiresAt=<epoch_seconds>
```

The app exchanges the code through:

```http
POST /api/auth/mobile/exchange
Content-Type: application/json

{ "code": "<one_time_exchange_code>" }
```

Then the app stores the returned access token in `expo-secure-store` and attaches it to API requests:

```http
Authorization: Bearer <mobile_access_token>
```

## Email/password login

The app can also request a mobile API token directly with the parent email account:

```http
POST /api/auth/mobile/password
Content-Type: application/json

{ "email": "parent@example.com", "password": "<password>" }
```

The response shape is the same as `/api/auth/mobile/exchange`.

## Backend endpoints

The repository cannot create a new route file under `src/app/api/auth`, so the implementation wraps the existing NextAuth catch-all handler from `src/auth.ts`.

- `GET /api/auth/mobile/start?provider=google|kakao&redirect=smapeng://auth/callback`
- `POST /api/auth/mobile/exchange`
- `POST /api/auth/mobile/password`
- Bearer-token support in `requireUserId()`

## Security requirements

- Exchange code is one-time and expires quickly.
- Access token is random, hashed at rest, and short-lived.
- Never put OAuth provider access tokens in the deep link.
- Keep current NextAuth database session as the source of truth.
- Revoke mobile tokens when the parent logs out or changes account security state.
