import { ScheduledWallpapersOptions } from './main';

export default class Scheduler {
  static applyScheduledWallpaper(Wallpapers: string[], options: ScheduledWallpapersOptions): number | null {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    if (!Wallpapers || Wallpapers.length === 0 || !options) {
      return null;
    }
    if (options.dayNightMode && options.dayStartTime && options.nightStartTime) {
      const [dayHour, dayMinute] = options.dayStartTime.split(":").map(Number);
      const [nightHour, nightMinute] = options.nightStartTime.split(":").map(Number);
      const dayTime = dayHour * 60 + dayMinute;
      const nightTime = nightHour * 60 + nightMinute;

      const isDay = dayTime < nightTime
        ? currentTime >= dayTime && currentTime < nightTime
        : currentTime >= dayTime || currentTime < nightTime; 

      const index = isDay ? 0 : 1;
      if (Wallpapers[index]) return index;
    }

    if (options.weekly) {
      let day = now.getDay();            
      day = (day + 6) % 7;               
      if (Wallpapers[day]) return day;
    }

    if (options.shuffle) {
      const randomIndex = Math.floor(Math.random() * Wallpapers.length);
      return randomIndex;
    }

    return null;
  }
  static ValidateText(text: string): boolean {
    const timePattern = /^(?:[01]?\d|2[0-3])(?::[0-5]\d){1,2}$/;
    return timePattern.test(text);
  }
  static Check(options: ScheduledWallpapersOptions, exceptKey?: keyof ScheduledWallpapersOptions): boolean {
    return Object.entries(options).some(
      ([key, value]) => key !== exceptKey && value === true
    );
  }
}
