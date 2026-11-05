"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/error-screen";

// A page crashed while drawing. "Try again" re-draws it without reloading the whole site.
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Page crashed:", error);
  }, [error]);
  return <ErrorScreen code={500} onRetry={reset} />;
}
