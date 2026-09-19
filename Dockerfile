FROM node:lts-alpine

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

# The app is next/. The /user-guide page reads ADMIN_UI_USER_GUIDE.md one folder up.
WORKDIR /app/next

COPY next/package.json next/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY ADMIN_UI_USER_GUIDE.md /app/
COPY next/ ./

# Next inlines every NEXT_PUBLIC_ value into the browser bundle at build time.
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_PROXY_URL
RUN pnpm build

EXPOSE 5003
CMD ["pnpm", "start", "-p", "5003"]
