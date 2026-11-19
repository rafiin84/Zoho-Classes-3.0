import { sleep } from "../utils";

/** Simulated network latency. Deterministic: same call always ~same delay. */
export async function simulate<T>(value: T | (() => T), opts: { ms?: number; failKey?: string } = {}): Promise<T> {
  await sleep(opts.ms ?? 180 + Math.floor(Math.random() * 120));
  if (opts.failKey && typeof window !== "undefined" && (window as any).__demoFail?.[opts.failKey]) {
    throw new ServiceError("Service temporarily unavailable (simulated).", "network");
  }
  const v = typeof value === "function" ? (value as () => T)() : value;
  return structuredClone(v);
}

export type ServiceErrorKind = "validation" | "network" | "permission" | "unavailable";
export class ServiceError extends Error {
  constructor(message: string, public kind: ServiceErrorKind = "unavailable") {
    super(message);
  }
}
/** Toggle simulated failure for a service key from the demo menu: setDemoFailure('feed', true) */
export function setDemoFailure(key: string, on: boolean) {
  if (typeof window === "undefined") return;
  const w = window as any;
  w.__demoFail = { ...(w.__demoFail ?? {}), [key]: on };
}
export const page = <T,>(items: T[], pageNo: number, size = 10) => ({
  items: items.slice(pageNo * size, pageNo * size + size),
  total: items.length,
  nextPage: (pageNo + 1) * size < items.length ? pageNo + 1 : null,
});
