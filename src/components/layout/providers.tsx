"use client";
import { useEffect, useLayoutEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { useApp } from "@/stores/app-store";
import { Toaster } from "@/components/ui";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 0, refetchOnWindowFocus: false } } }));
  const { theme, highContrast, largeText } = useApp();
  // Layout effect so persisted prefs load before any child effect writes default state back.
  useLayoutEffect(() => { useApp.persist.rehydrate(); }, []);
  useEffect(() => {
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => { document.documentElement.dataset.contrast = highContrast ? "high" : "normal"; document.documentElement.dataset.textsize = largeText ? "large" : "normal"; }, [highContrast, largeText]);
  return (
    <QueryClientProvider client={qc}>
      <MotionConfig reducedMotion="user">{children}<Toaster /></MotionConfig>
    </QueryClientProvider>
  );
}
