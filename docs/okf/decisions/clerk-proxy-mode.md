---
type: Decision
title: Clerk in proxy mode on production
description: Production runs the Clerk production instance through an edge function on this domain, because Clerk cannot own a vercel.app subdomain.
tags: [session]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../next/src/app/clerk-proxy/[...p]/route.ts
    title: The proxy
---

# Decision

Since 2026-08-30. `api/clerk-proxy.js` forwards `/__clerk/*` to Clerk's API with the proxy URL and the secret key, and `vercel.json` rewrites the path to it before the SPA catch-all. Previews and local development stay on the dev instance.

# Why

The production domain is a `vercel.app` subdomain, which Clerk cannot bind by DNS; proxy mode is Clerk's supported way to serve its API from such a domain. The backend owns the decision to use Clerk at all.

# Consequences

- A Clerk change on production is made in the production instance's dashboard, not the dev one.
- The session cookie is HttpOnly; a sign-out calls Clerk, never clears storage.
- The cached `me` is keyed to the publishable key, so an instance switch needs no manual clearing.
