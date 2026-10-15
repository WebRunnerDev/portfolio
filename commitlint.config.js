// Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:` …). CI checks every
// commit of a PR; merge commits are ignored by commitlint itself.
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Subjects may start with a domain term or component name: "RTL …", "Lang …".
    "subject-case": [0],
    // Bodies are written as unwrapped paragraphs; only the header is checked.
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
  },
}
