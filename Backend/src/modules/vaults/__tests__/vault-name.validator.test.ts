import {
  VAULT_NAME_MAX_LENGTH,
  VaultNameValidationError,
  assertValidVaultName,
  validateVaultName,
} from '../vault-name.validator';

describe('validateVaultName', () => {
  it('rejects a blank string', () => {
    const result = validateVaultName('');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/blank/i);
  });

  it('rejects whitespace-only names', () => {
    const result = validateVaultName('   \t\n  ');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/whitespace/i);
  });

  it('trims surrounding whitespace and returns the cleaned value', () => {
    const result = validateVaultName('  My Vault  ');
    expect(result.valid).toBe(true);
    expect(result.value).toBe('My Vault');
  });

  it('rejects names longer than 100 characters', () => {
    const tooLong = 'a'.repeat(VAULT_NAME_MAX_LENGTH + 1);
    const result = validateVaultName(tooLong);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at most 100/i);
    expect(result.error).toMatch(/100/);
  });

  it('accepts an exactly-100-character name', () => {
    const exact = 'a'.repeat(VAULT_NAME_MAX_LENGTH);
    const result = validateVaultName(exact);
    expect(result.valid).toBe(true);
    expect(result.value).toBe(exact);
  });

  it('rejects non-string input', () => {
    expect(validateVaultName(123).valid).toBe(false);
    expect(validateVaultName(null).valid).toBe(false);
    expect(validateVaultName(undefined).valid).toBe(false);
  });
});

describe('assertValidVaultName', () => {
  it('returns the trimmed name when valid', () => {
    expect(assertValidVaultName('  Valid Name  ')).toBe('Valid Name');
  });

  it('throws VaultNameValidationError with a clear message when invalid', () => {
    expect(() => assertValidVaultName('   ')).toThrow(VaultNameValidationError);
    expect(() => assertValidVaultName('   ')).toThrow(/whitespace/i);
  });
});
