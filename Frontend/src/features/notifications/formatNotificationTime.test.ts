import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatNotificationTime } from './formatNotificationTime';

describe('formatNotificationTime', () => {
  const now = new Date('2026-08-20T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays recent timestamps as relative text', () => {
    expect(formatNotificationTime(new Date(now.getTime() - 30_000))).toBe('Just now');
    expect(formatNotificationTime(new Date(now.getTime() - 5 * 60_000))).toBe('5 minutes ago');
    expect(formatNotificationTime(new Date(now.getTime() - 2 * 60 * 60_000))).toBe('2 hours ago');
  });

  it('displays older timestamps as localized dates', () => {
    const oldTimestamp = new Date('2026-08-17T12:00:00.000Z');

    expect(formatNotificationTime(oldTimestamp)).toBe(oldTimestamp.toLocaleDateString());
  });

  it.each([undefined, null, '', 'not-a-date', new Date(Number.NaN)])(
    'handles an invalid or missing timestamp (%s)',
    (timestamp) => {
      expect(formatNotificationTime(timestamp)).toBe('Unknown time');
    },
  );
});
