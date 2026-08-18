/**
 * Server-side validation for vault names.
 *
 * Vault names are user-facing and must meet consistent quality and security
 * requirements. Client-side checks can be bypassed, so every vault name must be
 * validated here before it is persisted or displayed.
 *
 * Rules (see issue #13):
 *  - Reject blank and whitespace-only names.
 *  - Trim surrounding whitespace.
 *  - Limit names to {@link VAULT_NAME_MAX_LENGTH} characters (after trimming).
 *  - Return clear, actionable validation errors.
 */

export const VAULT_NAME_MAX_LENGTH = 100;

export interface VaultNameValidationResult {
  valid: boolean;
  /** The trimmed, canonical name — present only when `valid` is `true`. */
  value?: string;
  /** A human-readable reason the name was rejected — present only when `valid` is `false`. */
  error?: string;
}

/**
 * Validate a raw vault-name input.
 *
 * Always returns a {@link VaultNameValidationResult}: `valid: true` with the
 * trimmed `value` on success, or `valid: false` with a clear `error` message on
 * failure. It never throws, so callers can surface the error directly to clients.
 */
export function validateVaultName(raw: unknown): VaultNameValidationResult {
  if (typeof raw !== 'string') {
    return { valid: false, error: 'Vault name must be a string.' };
  }

  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'Vault name must not be blank or whitespace-only.',
    };
  }

  if (trimmed.length > VAULT_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Vault name must be at most ${VAULT_NAME_MAX_LENGTH} characters (received ${trimmed.length}).`,
    };
  }

  return { valid: true, value: trimmed };
}

/** Thrown by {@link assertValidVaultName} when a vault name fails validation. */
export class VaultNameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultNameValidationError';
  }
}

/**
 * Validate a vault name and return its trimmed, canonical form.
 *
 * Convenience wrapper for call sites that would rather handle a thrown
 * {@link VaultNameValidationError} than inspect a {@link VaultNameValidationResult}.
 */
export function assertValidVaultName(raw: unknown): string {
  const result = validateVaultName(raw);
  if (!result.valid) {
    throw new VaultNameValidationError(result.error ?? 'Invalid vault name.');
  }
  return result.value as string;
}
