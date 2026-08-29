import { DateTime } from 'luxon';

// A bare value is UTC; a zoned one carries its own offset
export const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return 'Not set';
  try {
    const dt = DateTime.fromISO(dateTimeStr, { zone: 'UTC' });

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
