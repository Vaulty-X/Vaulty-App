export type NotificationTimestamp = string | number | Date | null | undefined;

const INVALID_TIME_LABEL = 'Unknown time';
const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

function formatRelativeTime(value: number, unit: 'minute' | 'hour') {
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}

/** Formats notification timestamps for quick scanning. */
export function formatNotificationTime(timestamp: NotificationTimestamp): string {
  if (timestamp === null || timestamp === undefined || timestamp === '') {
    return INVALID_TIME_LABEL;
  }

  const date = timestamp instanceof Date ? new Date(timestamp.getTime()) : new Date(timestamp);
  const timestampMs = date.getTime();

  if (Number.isNaN(timestampMs)) {
    return INVALID_TIME_LABEL;
  }

  const elapsed = Date.now() - timestampMs;

  // Future timestamps are better represented as dates than as misleading "ago" text.
  if (elapsed < 0 || elapsed >= ONE_DAY) {
    return date.toLocaleDateString();
  }

  if (elapsed < ONE_MINUTE) {
    return 'Just now';
  }

  if (elapsed < ONE_HOUR) {
    return formatRelativeTime(Math.floor(elapsed / ONE_MINUTE), 'minute');
  }

  return formatRelativeTime(Math.floor(elapsed / ONE_HOUR), 'hour');
}
