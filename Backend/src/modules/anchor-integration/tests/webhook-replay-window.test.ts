import { validateWebhookTimestamp, ReplayWindowConfig, WebhookReplayValidationError } from '../webhook-replay-window';

describe('validateWebhookTimestamp', () => {
  const config: ReplayWindowConfig = {
    maxAgeMs: 5 * 60 * 1000, // 5 minutes
    maxFutureMs: 1 * 60 * 1000, // 1 minute
  };

  const NOW = new Date('2024-01-01T12:00:00Z').getTime();

  it('should accept a timestamp exactly at the current time', () => {
    expect(() => validateWebhookTimestamp(NOW, config, NOW)).not.toThrow();
    expect(validateWebhookTimestamp(NOW, config, NOW)).toBe(true);
  });

  it('should accept a timestamp slightly in the past (within window)', () => {
    const pastTimestamp = NOW - (4 * 60 * 1000); // 4 minutes ago
    expect(validateWebhookTimestamp(pastTimestamp, config, NOW)).toBe(true);
  });

  it('should accept a timestamp slightly in the future (within window)', () => {
    const futureTimestamp = NOW + (30 * 1000); // 30 seconds in the future
    expect(validateWebhookTimestamp(futureTimestamp, config, NOW)).toBe(true);
  });

  it('should reject a timestamp that is too old (expired)', () => {
    const expiredTimestamp = NOW - (6 * 60 * 1000); // 6 minutes ago
    expect(() => validateWebhookTimestamp(expiredTimestamp, config, NOW)).toThrow(WebhookReplayValidationError);
    expect(() => validateWebhookTimestamp(expiredTimestamp, config, NOW)).toThrow('Webhook timestamp expired');
  });

  it('should reject a timestamp that is too far in the future', () => {
    const farFutureTimestamp = NOW + (2 * 60 * 1000); // 2 minutes in the future
    expect(() => validateWebhookTimestamp(farFutureTimestamp, config, NOW)).toThrow(WebhookReplayValidationError);
    expect(() => validateWebhookTimestamp(farFutureTimestamp, config, NOW)).toThrow('Webhook timestamp is unreasonably far in the future');
  });

  it('should handle string timestamps (ISO format)', () => {
    const isoString = new Date(NOW - 60000).toISOString(); // 1 minute ago
    expect(validateWebhookTimestamp(isoString, config, NOW)).toBe(true);
  });

  it('should handle Date object timestamps', () => {
    const dateObj = new Date(NOW - 60000); // 1 minute ago
    expect(validateWebhookTimestamp(dateObj, config, NOW)).toBe(true);
  });

  it('should throw an error for invalid timestamp formats', () => {
    expect(() => validateWebhookTimestamp('invalid-date', config, NOW)).toThrow(WebhookReplayValidationError);
    expect(() => validateWebhookTimestamp('invalid-date', config, NOW)).toThrow('Invalid timestamp format');
  });

  it('boundary condition: exactly at maxAgeMs should be accepted', () => {
    const exactMaxAge = NOW - config.maxAgeMs;
    expect(validateWebhookTimestamp(exactMaxAge, config, NOW)).toBe(true);
  });

  it('boundary condition: exactly at maxFutureMs should be accepted', () => {
    const exactMaxFuture = NOW + config.maxFutureMs;
    expect(validateWebhookTimestamp(exactMaxFuture, config, NOW)).toBe(true);
  });

  it('boundary condition: slightly older than maxAgeMs should be rejected', () => {
    const justExpired = NOW - config.maxAgeMs - 1;
    expect(() => validateWebhookTimestamp(justExpired, config, NOW)).toThrow(WebhookReplayValidationError);
  });

  it('boundary condition: slightly newer than maxFutureMs should be rejected', () => {
    const justTooFuture = NOW + config.maxFutureMs + 1;
    expect(() => validateWebhookTimestamp(justTooFuture, config, NOW)).toThrow(WebhookReplayValidationError);
  });
});
