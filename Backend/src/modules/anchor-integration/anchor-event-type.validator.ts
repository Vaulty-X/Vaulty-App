export const ANCHOR_DEPOSIT_EVENT_TYPES = [
    "deposit.initiated",
    "deposit.received",
    "deposit.settled",
    "deposit.failed",
    "deposit.refunded",
  ] as const;
  
  export type AnchorDepositEventType =
    (typeof ANCHOR_DEPOSIT_EVENT_TYPES)[number];
  
  export const INVALID_EVENT_TYPE_ERROR = {
    code: "INVALID_EVENT_TYPE",
    message: "Unsupported or missing event type",
  } as const;
  
  export type AnchorEventTypeValidationResult =
    | { valid: true; eventType: AnchorDepositEventType }
    | { valid: false; error: typeof INVALID_EVENT_TYPE_ERROR };
  
  const SUPPORTED = new Set<string>(ANCHOR_DEPOSIT_EVENT_TYPES);
  
  export function validateAnchorEventType(
    eventType: unknown,
  ): AnchorEventTypeValidationResult {
    if (typeof eventType !== "string") {
      return { valid: false, error: INVALID_EVENT_TYPE_ERROR };
    }
  
    const normalized = eventType.trim();
  
    if (!SUPPORTED.has(normalized)) {
      return { valid: false, error: INVALID_EVENT_TYPE_ERROR };
    }
  
    return {
      valid: true,
      eventType: normalized as AnchorDepositEventType,
    };
  }