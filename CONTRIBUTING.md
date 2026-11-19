# Team workflow

Accept the collaborator invite, clone this private repo, and follow the README quick start.

```sh
git switch main
git pull --ff-only
git switch -c your-name/short-description
```

Make a focused change, run `npm test`, push your branch, and open a pull request that says what changed and how you checked it.

- UI lives in `src/ui/`, styles in `src/styles.css`. Tell the team before large edits to `Roadmap.tsx` or `styles.css` to avoid conflicts.
- Logic changes in `src/core/` need a test in `tests/`.
- Never commit real student data, `.cache/`, credentials, `node_modules` or `dist`.
- Each teammate runs their own dev server, DegreeWorks sign-in and Ollama. Saved plans stay in each browser.
