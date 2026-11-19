import { Providers } from "@/components/layout/providers";
import { AppShell } from "@/components/layout/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Providers><AppShell>{children}</AppShell></Providers>;
}
