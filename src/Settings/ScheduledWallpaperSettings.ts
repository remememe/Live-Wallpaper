import { App,PluginSettingTab,Setting } from "obsidian";
import LiveWallpaperPlugin from "../main";

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
            this.plugin.settings.scheduledWallpapers.options.dayNightMode
          )
          .onChange(async (value) => {
            this.plugin.settings.scheduledWallpapers.options.dayNightMode =
              value;
            await this.plugin.saveSettings();
            this.display();
            this.plugin.applyWallpaper(true);
          })
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
            .onClick(() => this.plugin.openFilePicker(0))
        );

      new Setting(containerEl)
        .setName("Night Wallpaper")
        .setDesc("Wallpaper to use at night")
        .addButton((btn) =>
          btn
            .setIcon("folder-open")
            .setTooltip("Browse for file")
            .onClick(() => this.plugin.openFilePicker(1))
        );
    }
  }
}
