import { Skeleton } from "@/components/ui";
export default function Loading() {
  return <div className="space-y-4" role="status" aria-label="Loading"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-44 w-full" /><div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div></div>;
}
