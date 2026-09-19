# GNL Admin Frontend

Dashboard for managing GNL esports leagues: team management, match scheduling, fantasy betting and player statistics. The app is a Next.js App Router app in `next/`, with shadcn/ui components and Tailwind.

## Prerequisites

- **Node.js** (LTS version) - [Download](https://nodejs.org/en)
- **pnpm** - `corepack enable`
- **Docker Desktop** (optional, for containerized deployment) - [Install Docker](https://www.docker.com/products/docker-desktop)

## Quick start

```bash
git clone <repository-url>
cd wc3-gym-frontend/next
pnpm install
cp .env.example .env
pnpm dev
```

The app runs at http://localhost:3000. `.env` is not tracked; copy `.env.example` once per clone.

Point the app at a backend in one of two ways:

- **A running backend:** set `NEXT_PUBLIC_BACKEND_URL=/api` and start with `PROXY_TARGET=http://localhost:5002 pnpm dev`. The dev server sends `/api/*` to that target with the prefix stripped.
- **A deployed backend:** set `NEXT_PUBLIC_BACKEND_URL` to its absolute URL and leave `PROXY_TARGET` unset.

### Environment variables

Next inlines every `NEXT_PUBLIC_` value into the public bundle at build time. Do not put a secret in one.

| Name | Purpose |
|------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | Base URL for API calls: `/api` behind the proxy, else the backend's absolute URL. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key. |
| `NEXT_PUBLIC_CLERK_PROXY_URL` | Clerk proxy URL. Set on the production project only. |
| `CLERK_SECRET_KEY` | Read by the Clerk proxy route on the server. It never reaches the browser. |
| `PROXY_TARGET` | Backend the dev server proxies `/api/*` to. Read from the shell, not from `.env`. |

Vercel holds its own values for the production and preview builds.

## Scripts

Run these from `next/`.

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the dev server (http://localhost:3000) |
| `pnpm build` | Build for production |
| `pnpm start` | Serve the production build |
| `pnpm test` | Run the helper, store and knowledge-bundle tests |
| `pnpm lint` | Run ESLint |

## Project structure

```
wc3-gym-frontend/
├── next/                   # the app
│   ├── src/app/            # routes, layouts and views
│   ├── src/components/     # shared components
│   ├── src/helpers/        # framework-free logic, with its tests
│   ├── src/hooks/          # client state: theme, player panel, delete dialog
│   ├── src/lib/            # route table, session guard, Clerk wiring
│   ├── src/stores/         # API clients, one module per resource
│   ├── next.config.ts      # rewrites and redirects
│   └── vercel.json         # Vercel reads this file; the project root is next/
├── docs/okf/               # the public knowledge bundle
├── ADMIN_UI_USER_GUIDE.md  # the /user-guide page renders this file
├── DESIGN.md               # design rules
└── Dockerfile              # builds and serves the app on port 5003
```

## Docker

```bash
docker build -t gnl_admin_ui:latest --build-arg NEXT_PUBLIC_BACKEND_URL=<backend url> .
docker run -d -p 5003:5003 gnl_admin_ui:latest
```

The image builds `next/` and serves it on port 5003. Every `NEXT_PUBLIC_` value is baked in at build time, so a new backend URL needs a new image.

## Authentication

Sign-in runs through Clerk. The admin-token login at `/admin-login` still works: the token is the one the backend reads from `ADMIN_TOKEN`, and every API request carries `Authorization: Bearer <token>`.

## Troubleshooting

- **API requests fail with 404 or a CORS error.** Check the backend is running, and that `NEXT_PUBLIC_BACKEND_URL` and `PROXY_TARGET` agree with each other.
- **Port already in use.** `pnpm dev --port <port>`, or stop the process holding it.
- **A dependency looks stale.** Delete `next/node_modules` and run `pnpm install` again.

## Additional resources

- [User Guide](ADMIN_UI_USER_GUIDE.md)
- [Design Rules](DESIGN.md)
- [Guide for agents and contributors](AGENTS.md)
- [Next.js Documentation](https://nextjs.org/docs)
