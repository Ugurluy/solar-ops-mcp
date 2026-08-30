import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  current: "sites" | "explorer";
};

export function AppShell({ children, current }: AppShellProps) {
  return (
    <div className="shell">
      <header className="nav">
        <Link className="nav__brand" href="/">
          PV Ops
        </Link>
        <nav className="nav__links" aria-label="Primary">
          <Link href="/" aria-current={current === "sites" ? "page" : undefined}>
            Sites
          </Link>
          <Link
            href="/explorer"
            aria-current={current === "explorer" ? "page" : undefined}
          >
            Tool Explorer
          </Link>
        </nav>
      </header>
      <p className="banner">
        Synthetic demonstration data. Not operational advice and not a live
        vendor integration.
      </p>
      {children}
      <footer className="footer">
        <p>
          Same tools are available over stdio and <code>/api/mcp</code>.
          Weather from Open-Meteo.com (CC BY 4.0). Air quality from CAMS /
          Copernicus Atmosphere Monitoring Service.
        </p>
      </footer>
    </div>
  );
}
