const pages = [
  ["/", "index"],
  ["/a/", "A"],
  ["/b/", "B"],
  ["/c/", "C"],
  ["/d/", "D"],
  ["/e/", "E"],
]
const nav = document.createElement("nav")
nav.className = "spike-nav"
for (const [href, label] of pages) {
  const a = document.createElement("a")
  a.href = href
  a.textContent = label
  if (location.pathname === href) a.setAttribute("aria-current", "page")
  nav.append(a)
}
document.body.append(nav)
