// Source of truth for UI keys: every other Lang must define exactly these.
export const en = {
  "home.tagline": "Portfolio is on its way.",
  "header.menu": "Menu",
  "header.close": "Close menu",
  "header.skip": "Skip to content",
  "nav.label": "Site sections",
  "nav.home": "Home",
  "nav.cv": "CV",
  "nav.projects": "Projects",
  "nav.gallery": "Gallery",
  "nav.blog": "Blog",
  "meta.home":
    "Portfolio of WebRunner, a web developer: projects, CV, blog and photos.",
  "meta.cv": "Experience, technologies, education and certifications.",
  "meta.projects": "Pet projects with case studies: what was built and how.",
  "meta.gallery": "Photo albums.",
  "meta.blog": "Posts about web development.",
  "footer.contacts": "Contacts",
  "footer.copyEmail": "Copy email",
  "footer.copied": "Copied",
  "footer.copyFailed": "Couldn't copy",
  "stub.soon": "This section is on its way.",
  "notFound.title": "Page not found",
  "notFound.text": "There is no page at this address.",
  "notFound.home": "Go to the home page",
  "langSwitcher.label": "Language",
  "themeSwitcher.label": "Theme",
  "themeSwitcher.light": "Light",
  "themeSwitcher.dark": "Dark",
  "themeSwitcher.system": "System",
}

export type MessageKey = keyof typeof en

export type Messages = Record<MessageKey, string>
