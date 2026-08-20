import { randomBytes } from "crypto";

export type VaultTransactionOperation = "deposit" | "withdrawal";

const PREFIXES: Record<VaultTransactionOperation, string> = {
  deposit: "dep",
  withdrawal: "wth",
};

/** 16 bytes = 32 hex chars. Plenty of entropy to avoid collisions. */
const RANDOM_BYTE_LENGTH = 16;

export function generateVaultTransactionReference(
  operation: VaultTransactionOperation,
): string {
  const prefix = PREFIXES[operation];
  const uniquePart = randomBytes(RANDOM_BYTE_LENGTH).toString("hex");
  return `${prefix}-${uniquePart}`;
}