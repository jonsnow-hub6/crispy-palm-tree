export function createStringSearchRegex(text: string) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}
export function dateToSeconds(date: Date): number {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

export function timeToSeconds(time: {
  hours: number;
  minutes: number;
  seconds: number;
}): number {
  return time.hours * 3600 + time.minutes * 60 + time.seconds;
}
