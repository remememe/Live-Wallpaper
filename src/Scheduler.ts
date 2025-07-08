import { ScheduledWallpapersOptions } from './main';

export default class Scheduler {
  static applyScheduledWallpaper(Wallpapers: string[], options: ScheduledWallpapersOptions): number | null {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    if (!Wallpapers || Wallpapers.length === 0 || !options) {
      return null;
    }

    if (options.dayNightMode) {
      const isDay = hour >= 7 && hour < 19;
      const index = isDay ? 0 : 1;
      if (Wallpapers[index]) return index;
    }

    if (options.weekly) {
      if (Wallpapers[day]) return day;
    }

    if (options.shuffle) {
      const randomIndex = Math.floor(Math.random() * Wallpapers.length);
      return randomIndex;
    }

    return null;
  }
}
