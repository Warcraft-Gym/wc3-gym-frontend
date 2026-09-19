# Conventions

* [Code style](code-style.md) - Next.js and React with shadcn/ui and Tailwind, pure helpers in .mjs files with node tests, theme tokens instead of colour values, Title Case page titles, and one-line comments.
* [Git and pull requests](git-and-pull-requests.md) - One branch and one pull request per change, squash merged, pushes batched because every push builds a preview, and the merged combination built before a second merge.
* [How this bundle is written](okf-bundle.md) - The rules for every file under docs/okf, and the one rule for talking about the other repositories.
* [Testing](testing.md) - Pure helpers have node tests beside them; a user-visible change is verified by rendering the real page, with known traps in worktrees.
