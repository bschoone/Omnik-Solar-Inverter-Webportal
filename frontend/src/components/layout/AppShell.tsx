import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

function docsHref(): string {
  return (
    import.meta.env.VITE_DOCS_URL ??
    (import.meta.env.DEV ? "http://localhost:3000/documentation" : "/documentation")
  );
}

export function AppShell({ title, children }: Props) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">{title}</h1>
        <a className="docs-link" href={docsHref()} target="_blank" rel="noreferrer">
          API docs
        </a>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
