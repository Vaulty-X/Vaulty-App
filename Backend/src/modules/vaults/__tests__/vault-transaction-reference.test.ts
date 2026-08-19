import { generateVaultTransactionReference } from "../vault-transaction-reference";

const DEPOSIT_PATTERN = /^dep-[0-9a-f]{32}$/;
const WITHDRAWAL_PATTERN = /^wth-[0-9a-f]{32}$/;

describe("generateVaultTransactionReference", () => {
  it("uses a dep- prefix and 32 hex chars for deposits", () => {
    const reference = generateVaultTransactionReference("deposit");

    expect(reference).toMatch(DEPOSIT_PATTERN);
  });

  it("uses a wth- prefix and 32 hex chars for withdrawals", () => {
    const reference = generateVaultTransactionReference("withdrawal");

    expect(reference).toMatch(WITHDRAWAL_PATTERN);
  });

  it("does not embed obvious sensitive fields in the reference", () => {
    const reference = generateVaultTransactionReference("deposit");

    expect(reference).not.toMatch(/@/);
    expect(reference).not.toMatch(/user/i);
    expect(reference.toLowerCase()).not.toContain("gmail");
  });

  it("generates unique values across many calls", () => {
    const count = 10_000;
    const references = new Set<string>();

    for (let i = 0; i < count; i++) {
      const operation = i % 2 === 0 ? "deposit" : "withdrawal";
      references.add(generateVaultTransactionReference(operation));
    }

    expect(references.size).toBe(count);
  });
});