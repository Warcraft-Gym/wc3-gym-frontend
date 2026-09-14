---
type: Pitfall
title: The edge-cached read must carry no bearer
description: A backend route cached at the edge is never cached for a request with an Authorization header, so the wrapper skips the bearer on it; the backend also had to write the CORS header itself.
tags: [pitfall, cache, fetch]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../src/helpers/fetch-wrapper.js
    title: EDGE_CACHED
---

# What happened

The season ladder read is cached at the Vercel edge to keep egress down. A request with a bearer is never cached, so the wrapper sends none on that route. Separately, an entry filled by a non-browser client was stored without the CORS header and browsers reported a network error until it expired; the backend now writes the header in the handler.

# The rule

A route added to `EDGE_CACHED` must be open on the backend and must write its own CORS header there. Tell the backend when adding one.
