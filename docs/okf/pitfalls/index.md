# Pitfalls

* [.env is not tracked, and /api is not api/](env-not-tracked.md) - A missing VITE_BACKEND_URL used to become the string undefined in every URL; now the app throws at load. On Vercel the value must be absolute.
* [A preview must never point at the production backend](preview-stack.md) - A preview signs in on the dev Clerk instance; the production backend verifies with the production key, so every /me answers 401 and the login spins.
* [A race icon needs a race for the row](race-icon-context.md) - The profile race was passed to the name component on a table with no race dimension; the icon then asserted a fact no row held.
* [No CI on pull requests: build the merged pair](no-ci-build-the-merged-pair.md) - Two green branches broke main together because one removed a helper the other imported, and Vercel builds only after the merge.
* [Outdated optimize dep after a worktree switch](vite-outdated-dep.md) - Vite's dependency cache belongs to one tree; after switching worktrees every module answers 504 until the server restarts with --force.
* [The edge-cached read must carry no bearer](edge-cache-no-bearer.md) - A backend route cached at the edge is never cached for a request with an Authorization header, so the wrapper skips the bearer on it; the backend also had to write the CORS header itself.
* [Worktrees inherit node_modules and lose the icon font](worktree-node-modules-and-icon-font.md) - A worktree's node_modules is empty and works by resolving up; the dev server then refuses the icon font, so every icon is an empty box in a screenshot.
