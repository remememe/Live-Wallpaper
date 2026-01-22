import LiveWallpaperPlugin, {WallpaperConfig,defaultWallpaper} from "./main";
import Scheduler from "./Scheduler";
export default class WallpaperConfigUtils {
	static async GetCurrentConfig(Plugin: LiveWallpaperPlugin): Promise<WallpaperConfig> {
		const Settings = Plugin.settings;
		const AnyScheduledWallpaperEnabled = Scheduler.Check(Settings.ScheduledOptions);
		if(Settings.Preview) return Plugin.settings.currentWallpaper;
		else if (AnyScheduledWallpaperEnabled) {
			const index = this.getWallpaperIndex(Plugin);
			if(index == undefined)
			{
				Plugin.settings.WallpaperConfigs = WallpaperConfigUtils.NewConfig(Plugin.settings.WallpaperConfigs);
				Plugin.saveSettings();
				return Plugin.settings.WallpaperConfigs[Plugin.settings.WallpaperConfigs.length - 1];
			}
			if(Settings.globalConfig.enabled)
			{
				return WallpaperConfigUtils.applyGlobalConfig(Settings.WallpaperConfigs[index],Settings.globalConfig.config);
			}
			return Settings.WallpaperConfigs[index];
		}
		if(Settings.globalConfig.enabled) return WallpaperConfigUtils.applyGlobalConfig(Settings.WallpaperConfigs[0],Settings.globalConfig.config);
		return Settings.WallpaperConfigs[0];
	}
	static getWallpaperIndex(Plugin: LiveWallpaperPlugin): number | undefined {
		const now = new Date();
		const options = Plugin.settings.ScheduledOptions;
		if (options.dayNightMode) {
			const currentHour = now.getHours();
			const currentMinute = now.getMinutes();
			const currentTime = currentHour * 60 + currentMinute;

			const [dayHour, dayMinute] = options.dayStartTime.split(":").map(Number);
			const [nightHour, nightMinute] = options.nightStartTime
				.split(":")
				.map(Number);

			const dayTime = dayHour * 60 + dayMinute;
			const nightTime = nightHour * 60 + nightMinute;

			const isDay =
				dayTime < nightTime
					? currentTime >= dayTime && currentTime < nightTime
					: currentTime >= dayTime || currentTime < nightTime;
			return isDay ? 1 : 2;
		}
		else if (options.weekly) {
			let day = now.getDay();
			day = ((day + 6) % 7) + 1;
			return day + 2; 
		}
		else if (options.autoSwitch) {
			const min = 10;
			const max = Plugin.settings.WallpaperConfigs.length - 1;
			if(min>max) return undefined;
			const range = max - min + 1;
			const index =
			((Plugin.settings.currentWallpaper.Index + 1 - min) % range + range) % range + min;
			return index;
		}
		return 1;
	}
	static getPaths(slotIndex: number, Configs: WallpaperConfig[])
	{
		const configs = Configs;

		if (slotIndex >= 1 && slotIndex <= 2) {
			return configs
				.slice(1, 3)
				.map(cfg => (cfg.path));
		} 
		else if(slotIndex <= 9) {
			return configs
				.slice(3, 10)
				.map(cfg => (cfg.path));
		}
		else {
			return configs
				.slice(10, Configs.length)
				.map(cfg => (cfg.path));
		}
	}
	static getPathAndType(slotIndex: number, Configs: WallpaperConfig[]) {
		const configs = Configs;

		if (slotIndex >= 1 && slotIndex <= 2) {
			return configs
				.slice(1, 3)
				.map(cfg => ({ path: cfg.path, type: cfg.type }));
		} 
		else if(slotIndex <= 9) {
			return configs
				.slice(3, 10)
				.map(cfg => ({ path: cfg.path, type: cfg.type }));
		}
		else {
			return configs
				.slice(10, Configs.length)
				.map(cfg => ({ path: cfg.path, type: cfg.type }));
		}
	}
	static applyGlobalConfig(config: WallpaperConfig,globalConfig: WallpaperConfig) {
		globalConfig.path = config.path;
		globalConfig.type = config.type;
		globalConfig.Index = config.Index;
		return globalConfig;
	}
	static computeActiveSubfolder(slotIndex: number): string {
		if (slotIndex >= 10) return 'autoSwitch';
		else if (slotIndex > 2) return 'weekly';
		else if(slotIndex != 0) return 'daily';
		return 'normal';
	}
	static NewConfig(configs: WallpaperConfig[]): WallpaperConfig[] {
		return [
			...configs,
			{
			...defaultWallpaper,
			Index: configs.length,
			},
		];
	}
	static RemoveConfig(configs: WallpaperConfig[],config: WallpaperConfig): WallpaperConfig[] {
		return configs
			.filter(c => c.Index !== config.Index)
			.map((c, i) => ({ ...c, Index: i }));
	}
	static ClearConfigsFromIndex(configs: WallpaperConfig[],startIndex: number): WallpaperConfig[] {
		return configs.filter(c => c.Index < startIndex);
	}
}
