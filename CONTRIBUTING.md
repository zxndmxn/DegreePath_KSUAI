# Team workflow

Accept your collaborator invitation, clone this private repository, and follow the README.

```sh
git switch main
git pull --ff-only
git switch -c your-name/short-description
```

Make a focused change, run npm test, commit, push your branch, and open a pull request explaining the behavior and checks. Coordinate edits to main.ts and style.css to avoid overlap.

Keep fictional data labeled. Do not commit credentials, .env files, real student records, node_modules, or dist. Retain source evidence for verified academic rules.

Each teammate runs their own dev server. Browser-local saved plans do not travel with Git commits.
