import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import LiveWallpaperPlugin from "../main";
import Scheduler from "../Scheduler";
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
			const paths = this.plugin.settings.scheduledWallpapers.wallpaperPaths;
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
			const paths = this.plugin.settings.scheduledWallpapers.wallpaperPaths;
			paths.forEach((path, i) => {
				if (!path) paths[i] = "";
			});

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
		}
	}
}
