---
type: Pitfall
title: A proxy route must drop the encoding headers of the answer
description: Node fetch unpacks a compressed answer but keeps its content-encoding header; a route that passes the answer on unchanged sends a body the browser cannot decode.
tags: [session, deploy]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-19T10:56:13Z }
sources:
  - id: route
    resource: ../../../next/src/app/clerk-proxy/[...p]/route.ts
    title: The Clerk proxy route
---

# What happens

A route handler on the Node runtime that forwards a request with `fetch` gets the answer already unpacked: Node sets its own `accept-encoding`, receives a compressed body and decodes it. The answer object still carries `content-encoding` and the packed `content-length`. Returned unchanged, the browser reads the header, tries to decode a plain body and stops with a content decoding error. In Clerk proxy mode that stops every sign-in. Removing `accept-encoding` from the forwarded request changes nothing, because Node sets the header itself.

# The rule

- A route that returns a fetched answer builds a new `Response` from the body, the status and a copy of the headers without `content-encoding` and `content-length`. The host compresses the answer again on its way out.
- Every other header passes through, and each `set-cookie` stays its own line.
- Proxy mode runs only on the production instance, so a local run cannot show this. After a change to the proxy route, request `/__clerk/v1/environment` on the deployed site with `curl --compressed` and a browser's `Accept-Encoding`; the exit code must be 0. Then load `/login` and confirm that the sign-in button draws with no console error.
