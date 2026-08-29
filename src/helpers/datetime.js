import { DateTime } from 'luxon';

// Backend stores datetime in UTC as naive datetime (e.g., "2025-01-15 18:00:00")
// Parse it as UTC and display in user's local timezone
export const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return 'Not set';
  try {
    const dt = DateTime.fromISO(dateTimeStr + 'Z', { zone: 'UTC' });

    if (!dt.isValid) return dateTimeStr;

    return dt.toLocal().toLocaleString({
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  } catch {
    return dateTimeStr;
  }
};
