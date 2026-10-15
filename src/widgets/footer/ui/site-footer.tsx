export function SiteFooter() {
  return (
    <footer className="border-t border-border [view-transition-name:site-footer]">
      <div className="mx-auto max-w-(--zsd-x-zsd-layout-content-max) px-zsd-lg py-zsd-xl text-zsd-body-sm text-zsd-on-surface-muted md:px-zsd-xxl">
        <p>© {new Date().getFullYear()} WebRunner</p>
      </div>
    </footer>
  )
}
