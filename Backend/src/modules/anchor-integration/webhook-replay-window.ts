export interface ReplayWindowConfig {
  /**
   * Maximum allowed age of a webhook in milliseconds.
   * Timestamps older than (now - maxAgeMs) are rejected as expired.
   */
  maxAgeMs: number;

  /**
   * Maximum allowed future tolerance in milliseconds.
   * Timestamps newer than (now + maxFutureMs) are rejected as unreasonably far in the future.
   * This handles slight clock skew between the provider and our server.
   */
  maxFutureMs: number;
}

export class WebhookReplayValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookReplayValidationError';
  }
}

/**
 * Validates a webhook timestamp against a defined replay window.
 *
 * @param providerTimestamp The timestamp provided by the webhook payload or headers (in milliseconds, or ISO string).
 * @param config Configuration for the allowed replay window.
 * @param currentTimestamp Optional current timestamp for testing purposes. Defaults to Date.now().
 * @throws {WebhookReplayValidationError} if the timestamp is expired or too far in the future.
 * @returns {boolean} true if valid.
 */
export function validateWebhookTimestamp(
  providerTimestamp: number | string | Date,
  config: ReplayWindowConfig,
  currentTimestamp: number = Date.now()
): boolean {
  const timestampMs = new Date(providerTimestamp).getTime();

  if (isNaN(timestampMs)) {
    throw new WebhookReplayValidationError('Invalid timestamp format');
  }

  const ageMs = currentTimestamp - timestampMs;

  if (ageMs > config.maxAgeMs) {
    throw new WebhookReplayValidationError(`Webhook timestamp expired. Age: ${ageMs}ms, Max allowed: ${config.maxAgeMs}ms`);
  }

  // If ageMs is negative, the timestamp is in the future.
  const futureMs = -ageMs;
  if (futureMs > config.maxFutureMs) {
    throw new WebhookReplayValidationError(`Webhook timestamp is unreasonably far in the future. Future by: ${futureMs}ms, Max allowed: ${config.maxFutureMs}ms`);
  }

  return true;
}
