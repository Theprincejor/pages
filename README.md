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
