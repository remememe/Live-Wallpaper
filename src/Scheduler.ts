import { ScheduledWallpapersOptions } from './main';

export default class Scheduler {
  static ValidateText(text: string): boolean {
    const timePattern = /^(?:[01]?\d|2[0-3])(?::[0-5]\d){1,2}$/;
    return timePattern.test(text);
  }
  static Check(options: ScheduledWallpapersOptions, exceptKey?: keyof ScheduledWallpapersOptions): boolean {
    const BOOLEAN_KEYS: (keyof ScheduledWallpapersOptions)[] = [
      "dayNightMode",
      "weekly",
      "shuffle"
    ];

    return BOOLEAN_KEYS.some((k) => {
      if (k === exceptKey) return false;
      const val = options[k];
      return val === true || val === "true";
    });
  }
  static getIntervalInMs(options: ScheduledWallpapersOptions): number {
    const timeStr = options.intervalCheckTime ?? "00:10";
    const [hh, mm] = timeStr.split(":").map(Number);
    return ((hh * 60) + mm) * 60 * 1000;
  }
}
