import { notFound } from "next/navigation";
import { isRole } from "@/config/roles";
import { ScreenHost } from "@/components/layout/screen-host";

export default async function RolePage({ params, searchParams }: { params: Promise<{ role: string; slug?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { role, slug } = await params;
  const sp = await searchParams;
  if (!isRole(role)) notFound();
  const flat: Record<string, string> = {};
  Object.entries(sp).forEach(([k, v]) => { if (typeof v === "string") flat[k] = v; else if (Array.isArray(v)) flat[k] = v[0]; });
  return <ScreenHost role={role} slug={slug ?? []} searchParams={flat} />;
}
