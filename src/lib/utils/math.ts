/**
 * Mathematical utilities for deterministic scoring and metrics.
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function round(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function calculateDelta(current: number, baseline: number): number {
  return round(current - baseline, 1);
}
