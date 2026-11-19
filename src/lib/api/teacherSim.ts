import { sleep } from "../utils";
/** Like `simulate`, for composite async work. Inner service calls already simulate latency, so this adds none. */
export async function simulateAsync<T>(fn: () => Promise<T>): Promise<T> { await sleep(30); return structuredClone(await fn()); }
