"use client";
import { ErrorState } from "@/components/ui";
export default function RouteError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="This screen hit a snag" body="Your work is safe. Try loading it again." onRetry={reset} />;
}
