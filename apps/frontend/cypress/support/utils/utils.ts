export function createStringSearchRegex(text: string) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

export function areTimesClose(
  date1: Date,
  date2: Date,
  maxDiffInSeconds = 300,
) {
  const seconds1 =
    date1.getHours() * 3600 + date1.getMinutes() * 60 + date1.getSeconds();
  const seconds2 =
    date2.getHours() * 3600 + date2.getMinutes() * 60 + date2.getSeconds();

  let diff = Math.abs(seconds1 - seconds2);

  // Account for 24-hour wrap around
  if (diff > 43200) {
    // More than 12 hours apart means it might be closer via midnight
    diff = 86400 - diff;
  }

  return diff <= maxDiffInSeconds;
}
