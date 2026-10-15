// Runs on staged files from the pre-commit hook (.husky/pre-commit).
// Globs run in parallel, so each file matches exactly one of them.
export default {
  "*.{js,mjs,ts,tsx}": ["eslint --fix --no-warn-ignored", "prettier --write"],
  "*.{json,jsonc,css,html,yml,yaml}": "prettier --write",
}
