"use client";

import { AppShell } from "../components/AppShell";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell current="sites">
      <div className="error-box">
        <h1>The dashboard could not load</h1>
        <p>{error.message}</p>
        <button className="button" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </AppShell>
  );
}
