/**
 * Box–Muller sample; clamped so scheduling delays stay ≥ `minMs` (strictly positive).
 */
export function sampleNormalPositive(meanMs: number, stdMs: number, minMs: number): number {
  const u1 = Math.max(Number.EPSILON, Math.random());
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const raw = meanMs + stdMs * z;
  return Math.max(minMs, raw);
}
