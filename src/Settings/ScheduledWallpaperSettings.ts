import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import LiveWallpaperPlugin from "../main";
import Scheduler from "../Scheduler";
import SettingsUtils from "./SettingsUtils";
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
						this.plugin.settings.scheduledWallpapers.options.dayNightMode,
					)
					.onChange(async (value) => {
						const otherEnabled = Scheduler.Check(
							this.plugin.settings.scheduledWallpapers.options,
							"dayNightMode",
						);

						if (value && otherEnabled) {
							new Notice("Only one mode can be enabled at a time.");
							toggle.setValue(false);
							return;
						}
						this.plugin.settings.scheduledWallpapers.options.dayNightMode =
							value;
						await this.plugin.saveSettings();
						this.display();
						this.plugin.applyWallpaper(true);
					}),
			);

		if (this.plugin.settings.scheduledWallpapers.options.dayNightMode) {
			const paths = this.plugin.settings.scheduledWallpapers.wallpaperDayPaths;
			if (!paths[0]) paths[0] = "";
			if (!paths[1]) paths[1] = "";

			new Setting(containerEl)
				.setName("Day Wallpaper")
				.setDesc("Wallpaper to use during the day")
				.addButton((btn) =>
					btn
						.setIcon("folder-open")
						.setTooltip("Browse for file")
						.onClick(() => this.plugin.openFilePicker(0)),
				);

			new Setting(containerEl)
				.setName("Night Wallpaper")
				.setDesc("Wallpaper to use at night")
				.addButton((btn) =>
					btn
						.setIcon("folder-open")
						.setTooltip("Browse for file")
						.onClick(() => this.plugin.openFilePicker(1)),
				);
			let dayTimeValue =
				this.plugin.settings.scheduledWallpapers.options.dayStartTime;
			let nightTimeValue =
				this.plugin.settings.scheduledWallpapers.options.nightStartTime;

			const Time = new Setting(containerEl)
				.setName("Time")
				.setDesc("Enter time in HH:MM format (e.g., 23:54)");

			Time.addText((area) => {
				area
					.setPlaceholder("HH:MM")
					.setValue(
						this.plugin.settings.scheduledWallpapers.options.dayStartTime ?? "",
					)
					.onChange((value) => {
						dayTimeValue = value;
					});
			});

			Time.addText((area) => {
				area
					.setPlaceholder("HH:MM")
					.setValue(
						this.plugin.settings.scheduledWallpapers.options.nightStartTime ??
							"",
					)
					.onChange((value) => {
						nightTimeValue = value;
					});
			});

			new Setting(containerEl).addButton((btn) =>
				btn
					.setButtonText("Apply now")
					.setCta()
					.onClick(async () => {
						if (
							Scheduler.ValidateText(dayTimeValue) &&
							Scheduler.ValidateText(nightTimeValue)
						) {
							this.plugin.settings.scheduledWallpapers.options.dayStartTime =
								dayTimeValue;
							this.plugin.settings.scheduledWallpapers.options.nightStartTime =
								nightTimeValue;
							await this.plugin.saveSettings();
							new Notice("Wallpaper schedule has been set.");
							this.plugin.applyWallpaper(true);
						} else {
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
						const dayPath =
							this.plugin.settings.scheduledWallpapers.wallpaperDayPaths[0];
						const nightPath =
							this.plugin.settings.scheduledWallpapers.wallpaperDayPaths[1];

						const dayExists = dayPath
							? await SettingsUtils.getPathExists(this.plugin, dayPath)
							: false;
						const nightExists = nightPath
							? await SettingsUtils.getPathExists(this.plugin, nightPath)
							: false;

						if (dayExists && nightExists) {
							new Notice("Both wallpapers (day and night) are set and exist.");
						} else if (!dayExists && !nightExists) {
							new Notice("Both wallpapers are missing: day and night.");
						} else if (!dayExists) {
							new Notice("The day wallpaper is not set or does not exist.");
						} else {
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
					.setValue(this.plugin.settings.scheduledWallpapers.options.weekly)
					.onChange(async (value) => {
						const otherEnabled = Scheduler.Check(
							this.plugin.settings.scheduledWallpapers.options,
							"weekly",
						);

						if (value && otherEnabled) {
							new Notice("Only one mode can be enabled at a time.");
							toggle.setValue(false);
							return;
						}
						this.plugin.settings.scheduledWallpapers.options.weekly = value;
						await this.plugin.saveSettings();
						this.display();
						this.plugin.applyWallpaper(true);
					}),
			);

		if (this.plugin.settings.scheduledWallpapers.options.weekly) {
			const paths = this.plugin.settings.scheduledWallpapers.wallpaperWeekPaths;
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
								this.plugin.openFilePicker(index);
							} else {
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
						} else {
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

		const currentInterval = this.plugin.settings.scheduledWallpapers.options.intervalCheckTime ?? "00:10";

		new Setting(containerEl)
			.setName("Wallpaper change interval")
			.setDesc("How often the wallpaper should be checked and changed")
			.addDropdown((dropdown) => {
				dropdown.addOptions(WALLPAPER_INTERVALS);
				dropdown.setValue(this.plugin.settings.scheduledWallpapers.options.isCustomInterval ? "custom" : currentInterval);
				dropdown.onChange(async (value) => {
					if (value !== "custom") {
						this.plugin.settings.scheduledWallpapers.options.intervalCheckTime = value;
						this.plugin.settings.scheduledWallpapers.options.isCustomInterval = false;
						await this.plugin.saveSettings();
						this.plugin.startDayNightWatcher();
						this.display(); 
					} else {
						this.plugin.settings.scheduledWallpapers.options.intervalCheckTime = "00:42";
						this.plugin.settings.scheduledWallpapers.options.isCustomInterval = true;
						await this.plugin.saveSettings();
						this.display();
					}
				});
			});

		if (this.plugin.settings.scheduledWallpapers.options.isCustomInterval) {
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

							this.plugin.settings.scheduledWallpapers.options.intervalCheckTime = customValue;
							await this.plugin.saveSettings();
							this.plugin.startDayNightWatcher();
							new Notice("Custom interval applied.");
						})
				);
		}
	}
}
