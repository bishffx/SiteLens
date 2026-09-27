import { randomBytes } from "crypto";

/**
 * Generates unique prefix-tagged IDs for audits and comparisons.
 */
export function generateAuditId(): string {
  const timestamp = Date.now().toString(36);
  const randomHex = randomBytes(4).toString("hex");
  return `audit_${timestamp}_${randomHex}`;
}

export function generateComparisonId(): string {
  const timestamp = Date.now().toString(36);
  const randomHex = randomBytes(4).toString("hex");
  return `cmp_${timestamp}_${randomHex}`;
}
