# Intelli‑Talent Mobile PWA

Mobile-first PWA for daily HR self-service.

Scope v1:

- Collaborator: dashboard, congés, documents, document requests, onboarding, ARIA, notifications, settings.
- Manager: dashboard, team, request review, own congés/document requests, aggregate QVT, ARIA.
- HR/Admin/QVT: redirected to the desktop app because those workflows remain desktop-first.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Default dev URL: `http://localhost:5174`

The dev server proxies `/api` to `http://localhost:3000`.

## Build and tests

```bash
npm run build
npm test -- --run
```

The production build generates:

- `dist/manifest.webmanifest`
- `dist/sw.js`
- cached static shell/assets

Authenticated API responses are not globally cached. Offline mutations are intentionally not supported in v1.
