import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import LiveWallpaperPlugin from "../main";
import Scheduler from "../Scheduler";
import SettingsUtils from "./SettingsUtils";
import WallpaperConfigUtils from "../WallpaperConfigUtils";
export class ScheduledApp extends PluginSettingTab {
	plugin: LiveWallpaperPlugin;

	constructor(app: App, plugin: LiveWallpaperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl)
			.setName("Day and night mode")
			.setDesc("Enable different wallpapers for day and night")
			.addToggle((toggle) =>
				toggle
					.setValue(
						this.plugin.settings.ScheduledOptions.dayNightMode,
					)
					.onChange(async (value) => {
						const otherEnabled = Scheduler.Check(
							this.plugin.settings.ScheduledOptions,
							"dayNightMode",
						);

						if (value && otherEnabled) {
							new Notice("Only one mode can be enabled at a time.");
							toggle.setValue(false);
							return;
						}
						this.plugin.settings.ScheduledOptions.dayNightMode = value;
						this.plugin.settings.currentWallpaper = await WallpaperConfigUtils.GetCurrentConfig(this.plugin);
						await this.plugin.saveSettings();
						this.display();
						this.plugin.applyWallpaper();
					}),
			);

		if (this.plugin.settings.ScheduledOptions.dayNightMode) {
			const paths = WallpaperConfigUtils.getPaths(this.plugin.settings.currentWallpaper.Index,this.plugin.settings.WallpaperConfigs);
			if (!paths[0]) paths[0] = "";
			if (!paths[1]) paths[1] = "";

			new Setting(containerEl)
				.setName("Day Wallpaper")
				.setDesc("Wallpaper to use during the day")
				.addButton((btn) =>
					btn
						.setIcon("folder-open")
						.setTooltip("Browse for file")
						.onClick(() => this.plugin.openFilePicker(1,true)),
				)

			new Setting(containerEl)
				.setName("Night Wallpaper")
				.setDesc("Wallpaper to use at night")
				.addButton((btn) =>
					btn
						.setIcon("folder-open")
						.setTooltip("Browse for file")
						.onClick(() => this.plugin.openFilePicker(2,true)),
				);
			let dayTimeValue =
				this.plugin.settings.ScheduledOptions.dayStartTime;
			let nightTimeValue =
				this.plugin.settings.ScheduledOptions.nightStartTime;

			const Time = new Setting(containerEl)
				.setName("Time")
				.setDesc("Enter time in HH:MM format (e.g., 23:54)");

			Time.addText((area) => {
				area
					.setPlaceholder("HH:MM")
					.setValue(this.plugin.settings.ScheduledOptions.dayStartTime ?? "",)
					.onChange((value) => {
						dayTimeValue = value;
					});
			});

			Time.addText((area) => {
				area
					.setPlaceholder("HH:MM")
					.setValue(this.plugin.settings.ScheduledOptions.nightStartTime ?? "",)
					.onChange((value) => {
						nightTimeValue = value;
					});
			});

			new Setting(containerEl).addButton((btn) =>
				btn
					.setButtonText("Apply now")
					.setCta()
					.onClick(async () => {
						if (Scheduler.ValidateText(dayTimeValue) && Scheduler.ValidateText(nightTimeValue)) {
							this.plugin.settings.ScheduledOptions.dayStartTime = dayTimeValue;
							this.plugin.settings.ScheduledOptions.nightStartTime = nightTimeValue;
							await this.plugin.saveSettings();
							new Notice("Wallpaper schedule has been set.");
							this.plugin.applyWallpaper();
						} 
						else {
							new Notice(
								"One or both time values are invalid. Use HH:MM format.",
							);
						}
					}),
			);
			new Setting(containerEl)
				.setName("Check day and night wallpapers")
				.setDesc(
					"Check whether the paths to the day and night wallpapers are set and whether the files exist.",
				)
				.addButton(async (btn) => {
					btn.setButtonText("Check").onClick(async () => {
						const dayPath = this.plugin.settings.WallpaperConfigs[1].path;
						const nightPath = this.plugin.settings.WallpaperConfigs[2].path;

						const dayExists = dayPath
							? await SettingsUtils.getPathExists(this.plugin, dayPath)
							: false;
						const nightExists = nightPath
							? await SettingsUtils.getPathExists(this.plugin, nightPath)
							: false;

						if (dayExists && nightExists) {
							new Notice("Both wallpapers (day and night) are set and exist.");
						} 
						else if (!dayExists && !nightExists) {
							new Notice("Both wallpapers are missing: day and night.");
						} 
						else if (!dayExists) {
							new Notice("The day wallpaper is not set or does not exist.");
						} 
						else {
							new Notice("The night wallpaper is not set or does not exist.");
						}
					});
				});
		}
		new Setting(containerEl)
			.setName("Weekly mode")
			.setDesc("Enable different wallpapers for any day")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.ScheduledOptions.weekly)
					.onChange(async (value) => {
						const otherEnabled = Scheduler.Check(
							this.plugin.settings.ScheduledOptions,
							"weekly",
						);

						if (value && otherEnabled) {
							new Notice("Only one mode can be enabled at a time.");
							toggle.setValue(false);
							return;
						}
						this.plugin.settings.ScheduledOptions.weekly = value;
						this.plugin.settings.currentWallpaper = await WallpaperConfigUtils.GetCurrentConfig(this.plugin);
						await this.plugin.saveSettings();
						this.display();
						this.plugin.applyWallpaper();
					}),
			);

		if (this.plugin.settings.ScheduledOptions.weekly) {
			const paths = WallpaperConfigUtils.getPaths(this.plugin.settings.currentWallpaper.Index,this.plugin.settings.WallpaperConfigs);
			let selectedDay = "Monday";
			const daysOfWeek = [
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
				"Sunday",
			];
			daysOfWeek.forEach((_, index) => {
				if (!paths[index]) {
					paths[index] = "";
				}
			});
			new Setting(containerEl)
				.setName("Day Wallpaper")
				.setDesc("Wallpaper to use during the day")
				.addButton((btn) =>
					btn
						.setIcon("folder-open")
						.setTooltip("Browse for file")
						.onClick(() => {
							const index = daysOfWeek.indexOf(selectedDay);
							if (index !== -1) {
								this.plugin.openFilePicker(index + 3,true);
							} 
							else {
								console.warn("Invalid day selected");
							}
						}),
				)
				.addDropdown((dropdown) => {
					daysOfWeek.forEach((day) => {
						dropdown.addOption(day, day);
					});
					dropdown.setValue(selectedDay);
					dropdown.onChange((value) => {
						selectedDay = value;
					});
				});
			new Setting(containerEl)
				.setName("Check weekly wallpapers")
				.setDesc(
					"Check if the paths for the weekly wallpapers are set and if the files exist.",
				)
				.addButton((btn) => {
					btn.setButtonText("Check").onClick(async () => {
						const missingDays = [];
						for (let i = 0; i < paths.length; i++) {
							const pathExists = await SettingsUtils.getPathExists(this.plugin, paths[i]);
							if (!pathExists) {
								missingDays.push(daysOfWeek[i]);
							}
						}

						if (missingDays.length > 0) {
							new Notice(`Missing wallpapers for: ${missingDays.join(", ")}`);
						} 
						else {
							new Notice("All weekly wallpapers are loaded.");
						}
					});
				});
		}
		const WALLPAPER_INTERVALS: Record<string, string> = {
			"00:01": "Every 1 minute",
			"00:05": "Every 5 minutes",
			"00:10": "Every 10 minutes",
			"00:30": "Every 30 minutes",
			"01:00": "Every 1 hour",
			"custom": "Custom interval",
		};

		const currentInterval = this.plugin.settings.ScheduledOptions.intervalCheckTime ?? "00:10";

		new Setting(containerEl)
			.setName("Wallpaper change interval")
			.setDesc("How often the wallpaper should be checked and changed")
			.addDropdown((dropdown) => {
				dropdown.addOptions(WALLPAPER_INTERVALS);
				dropdown.setValue(this.plugin.settings.ScheduledOptions.isCustomInterval ? "custom" : currentInterval);
				dropdown.onChange(async (value) => {
					if (value !== "custom") {
						this.plugin.settings.ScheduledOptions.intervalCheckTime = value;
						this.plugin.settings.ScheduledOptions.isCustomInterval = false;
						await this.plugin.saveSettings();
						this.plugin.startDayNightWatcher();
						this.display(); 
					} else {
						this.plugin.settings.ScheduledOptions.intervalCheckTime = "00:42";
						this.plugin.settings.ScheduledOptions.isCustomInterval = true;
						await this.plugin.saveSettings();
						this.display();
					}
				});
			});

		if (this.plugin.settings.ScheduledOptions.isCustomInterval) {
			let customValue = currentInterval;
			new Setting(containerEl)
				.setName("Custom interval")
				.setDesc("Enter time in HH:MM format (e.g., 00:42)")
				.addText((text) => {
					text
						.setPlaceholder("HH:MM")
						.setValue(currentInterval)
						.onChange((value) => {
							customValue = value;
						});
				});

			new Setting(containerEl)
				.addButton((btn) =>
					btn
						.setButtonText("Apply custom interval")
						.setCta()
						.onClick(async () => {
							if (!Scheduler.ValidateText(customValue)) {
								new Notice("Invalid format. Use HH:MM.");
								return;
							}

							this.plugin.settings.ScheduledOptions.intervalCheckTime = customValue;
							await this.plugin.saveSettings();
							this.plugin.startDayNightWatcher();
							new Notice("Custom interval applied.");
						})
				);
		}
	}
}
