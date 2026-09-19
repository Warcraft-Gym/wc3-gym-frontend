# Pitfalls

* [.env is not tracked, and /api exists only locally](env-not-tracked.md) - One module reads NEXT_PUBLIC_BACKEND_URL and throws when it is unset. On Vercel the value is absolute, and /api exists only behind the dev proxy.
* [A preview must never point at the production backend](preview-stack.md) - A preview signs in on the dev Clerk instance; the production backend verifies with the production key, so every /me answers 401 and the login spins.
* [A race icon needs a race for the row](race-icon-context.md) - The profile race was passed to the name component on a table with no race dimension; the icon then asserted a fact no row held.
* [No CI on pull requests: build the merged pair](no-ci-build-the-merged-pair.md) - Two green branches broke main together because one removed a helper the other imported, and Vercel builds only after the merge.
* [Outdated optimize dep after a worktree switch](vite-outdated-dep.md) - Vite's dependency cache belongs to one tree; after switching worktrees every module answers 504 until the server restarts with --force.
* [The edge-cached read must carry no bearer](edge-cache-no-bearer.md) - A backend route cached at the edge is never cached for a request with an Authorization header, so the wrapper skips the bearer on it; the backend also had to write the CORS header itself.
* [A worktree needs its own install and env file](worktree-node-modules-and-icon-font.md) - A worktree has no node_modules and no env file of its own; install and copy the env file inside its next/ folder before the first run.
