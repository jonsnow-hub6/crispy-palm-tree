export function createStringSearchRegex(text: string) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}
const secondsInMinute = 60;
const secondsInHour = secondsInMinute * 60;
const secondsInDay = secondsInHour * 24;

export function areTimesClose(
  date1: Date,
  date2: Date,
  maxDiffInSeconds = 300,
) {
  const seconds1 =
    date1.getHours() * secondsInHour +
    date1.getMinutes() * secondsInMinute +
    date1.getSeconds();
  const seconds2 =
    date2.getHours() * secondsInHour +
    date2.getMinutes() * secondsInMinute +
    date2.getSeconds();

  let diff = Math.abs(seconds1 - seconds2);

  // Account for 24-hour wrap around
  if (diff > secondsInDay / 2) {
    // More than 12 hours apart means it might be closer via midnight
    diff = secondsInDay - diff;
  }

  return diff <= maxDiffInSeconds;
}
