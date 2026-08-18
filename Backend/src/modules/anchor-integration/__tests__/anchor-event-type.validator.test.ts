import {
    ANCHOR_DEPOSIT_EVENT_TYPES,
    INVALID_EVENT_TYPE_ERROR,
    validateAnchorEventType,
  } from "../anchor-event-type.validator";
  
  describe("validateAnchorEventType", () => {
    it.each([...ANCHOR_DEPOSIT_EVENT_TYPES])(
      "accepts supported deposit event type %s",
      (eventType) => {
        expect(validateAnchorEventType(eventType)).toEqual({
          valid: true,
          eventType,
        });
      },
    );
  
    it("accepts a supported type after trimming whitespace", () => {
      expect(validateAnchorEventType("  deposit.settled  ")).toEqual({
        valid: true,
        eventType: "deposit.settled",
      });
    });
  
    it.each([
      ["missing (undefined)", undefined],
      ["missing (null)", null],
      ["empty string", ""],
      ["whitespace only", "   "],
      ["unknown string", "deposit.unknown"],
      ["wrong case", "DEPOSIT.SETTLED"],
      ["withdrawal event", "withdrawal.settled"],
      ["non-deposit platform event", "customer.updated"],
      ["non-string number", 1],
    ])("rejects %s", (_label, value) => {
      expect(validateAnchorEventType(value)).toEqual({
        valid: false,
        error: INVALID_EVENT_TYPE_ERROR,
      });
    });
  
    it("does not echo the raw input in the error", () => {
      const result = validateAnchorEventType("drop-table-users");
  
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.message).toBe(INVALID_EVENT_TYPE_ERROR.message);
        expect(result.error.message).not.toContain("drop-table-users");
      }
    });
  });