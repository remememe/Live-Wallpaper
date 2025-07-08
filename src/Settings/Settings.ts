import { App, PluginSettingTab, Setting, Platform } from "obsidian";
import LiveWallpaperPlugin, { DEFAULT_SETTINGS } from "../main";

export class SettingsApp extends PluginSettingTab {
  plugin: LiveWallpaperPlugin;
  constructor(app: App, plugin: LiveWallpaperPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const anyOptionEnabled = Object.values(
      this.plugin.settings.scheduledWallpapers.options
    ).some((v) => v === true);
    if (!anyOptionEnabled) {
      const setting = new Setting(containerEl)
        .setName("Wallpaper source")
        .setDesc(
          "Select an image, GIF, or video file to use as your wallpaper"
        );
      if (this.plugin.settings.INBUILD) {
        setting.addButton((btn) =>
          btn
            .setButtonText("History")
            .setIcon("history")
            .setClass("mod-cta")
            .onClick(() => {
              containerEl.empty();
              this.plugin.settings.HistoryPaths.forEach((entry) => {
                new Setting(containerEl)
                  .setName(entry.fileName)
                  .setDesc(entry.path)
                  .addButton((button) => {
                    button.setButtonText("Select").onClick(() => {
                      this.plugin.settings.wallpaperPath = entry.path;
                      this.plugin.settings.wallpaperType = entry.type;
                      this.plugin.applyWallpaper(false);
                      this.display();
                    });
                  });
              });
            })
        );
      }

      setting.addButton((btn) =>
        btn
          .setButtonText("Browse")
          .setIcon("folder-open")
          .setClass("mod-cta")
          .onClick(() => this.plugin.openFilePicker())
      );
    }
    new Setting(containerEl)
      .setName("Wallpaper opacity")
      .setDesc(
        "Controls the transparency level of the wallpaper (0% = fully transparent, 100% = fully visible)"
      )
      .addSlider((slider) => {
        const valueEl = containerEl.createEl("span", {
          text: ` ${this.plugin.settings.opacity}%`,
          cls: "setting-item-description",
        });

        const initialValue = this.plugin.settings.AdnvOpend
          ? 100
          : this.plugin.settings.opacity;

        if (this.plugin.settings.AdnvOpend) {
          this.plugin.settings.opacity = 100;
          valueEl.textContent = ` 100%`;
          this.plugin.saveSettings();
          this.plugin.applyWallpaper(anyOptionEnabled);
        }

        slider
          .setLimits(0, 80, 1)
          .setValue(initialValue)
          .setDisabled(this.plugin.settings.AdnvOpend)
          .setDynamicTooltip()
          .setInstant(true)
          .onChange(async (v) => {
            if (!this.plugin.settings.AdnvOpend) {
              this.plugin.settings.opacity = v;
              valueEl.textContent = ` ${v}%`;
              await this.plugin.saveSettings();
              this.plugin.applyWallpaper(anyOptionEnabled);
            }
          });
      });

    new Setting(containerEl)
      .setName("Blur radius")
      .setDesc("Applies a blur effect to the wallpaper in pixels")
      .addSlider((slider) => {
        const valueEl = containerEl.createEl("span", {
          text: ` ${this.plugin.settings.blurRadius}px`,
          cls: "setting-item-description",
        });
        slider
          .setInstant(true)
          .setLimits(0, 20, 1)
          .setValue(this.plugin.settings.blurRadius)
          .onChange(async (v) => {
            this.plugin.settings.blurRadius = v;
            valueEl.textContent = ` ${v}px`;
            await this.plugin.saveSettings();
            this.plugin.applyWallpaper(anyOptionEnabled);
          });
      });

    new Setting(containerEl)
      .setName("Brightness")
      .setDesc("Adjusts the wallpaper brightness (100% = normal)")
      .addSlider((slider) => {
        const valueEl = containerEl.createEl("span", {
          text: ` ${this.plugin.settings.brightness}%`,
          cls: "setting-item-description",
        });
        slider
          .setInstant(true)
          .setLimits(20, 130, 1)
          .setValue(this.plugin.settings.brightness)
          .onChange(async (v) => {
            this.plugin.settings.brightness = v;
            valueEl.textContent = ` ${v}%`;
            await this.plugin.saveSettings();
            this.plugin.applyWallpaper(anyOptionEnabled);
          });
      });

    new Setting(containerEl)
      .setName("Layer position (z‑index)")
      .setDesc(
        "Determines the stacking order: higher values bring the wallpaper closer to the front"
      )
      .addSlider((slider) => {
        const valueEl = containerEl.createEl("span", {
          text: ` ${this.plugin.settings.zIndex}`,
          cls: "setting-item-description",
        });
        if (this.plugin.settings.AdnvOpend) {
          this.plugin.settings.zIndex = 0;
          valueEl.textContent = ` 0`;
          this.plugin.saveSettings();
          this.plugin.applyWallpaper(anyOptionEnabled);
        }
        slider
          .setInstant(true)
          .setLimits(-10, 100, 1)
          .setValue(this.plugin.settings.zIndex)
          .setDisabled(this.plugin.settings.AdnvOpend)
          .onChange(async (v) => {
            if (!this.plugin.settings.AdnvOpend) {
              this.plugin.settings.zIndex = v;
              valueEl.textContent = ` ${v}`;
              await this.plugin.saveSettings();
              this.plugin.applyWallpaper(anyOptionEnabled);
            }
          });
      });
    new Setting(containerEl)
      .setName("Change playback speed")
      .setDesc(
        "Adjust the playback speed for videos (0.25x – 2x). This does not affect GIFs."
      )
      .addSlider((slider) => {
        const valueEl = containerEl.createSpan({
          text: `${this.plugin.settings.playbackSpeed.toFixed(2)}x`,
          cls: "setting-item-description",
        });
        slider
          .setInstant(true)
          .setLimits(0.25, 2, 0.25)
          .setValue(this.plugin.settings.playbackSpeed)
          .onChange(async (val) => {
            this.plugin.settings.playbackSpeed = val;
            await this.plugin.saveSettings();
            await this.plugin.applyWallpaper(false);
            valueEl.setText(`${val.toFixed(2)}x`);
          });
      });
    if (Platform.isMobileApp) {
      const desc = document.createElement("div");
      desc.textContent =
        "On mobile devices, zooming can affect background size. You can manually set the height and width to maintain consistency.";

      containerEl.appendChild(desc);

      new Setting(containerEl)
        .setName("Background width")
        .setDesc(
          "Set a custom width for the background on mobile (e.g., 100vw or 500px)."
        )
        .addText((text) =>
          text
            .setPlaceholder("e.g., 100vw")
            .setValue(this.plugin.settings.mobileBackgroundWidth || "")
            .onChange(async (value) => {
              this.plugin.settings.mobileBackgroundWidth = value;
              await this.plugin.saveSettings();
              this.plugin.ChangeWallpaperContainer();
            })
        );

      new Setting(containerEl)
        .setName("Background height")
        .setDesc(
          "Set a custom height for the background on mobile (e.g., 100vh or 800px)."
        )
        .addText((text) =>
          text
            .setPlaceholder("e.g., 100vh")
            .setValue(this.plugin.settings.mobileBackgroundHeight || "")
            .onChange(async (value) => {
              this.plugin.settings.mobileBackgroundHeight = value;
              await this.plugin.saveSettings();
              this.plugin.ChangeWallpaperContainer();
            })
        );
      new Setting(containerEl)
        .setName("Match screen size")
        .setDesc(
          "Automatically set the background size to match your device's screen dimensions."
        )
        .addButton((button) =>
          button.setButtonText("Resize to screen").onClick(async () => {
            this.plugin.settings.mobileBackgroundHeight =
              window.innerHeight.toString() + "px";
            this.plugin.settings.mobileBackgroundWidth =
              window.innerWidth.toString() + "px";
            this.plugin.ChangeWallpaperContainer();
            await this.plugin.saveSettings();
            this.display();
          })
        );
    }
    new Setting(containerEl)
      .setName("Reset options")
      .setDesc("Resets all settings")
      .addButton((Button) =>
        Button.setButtonText("Reset").onClick(async () => {
          const defaults = DEFAULT_SETTINGS;
          this.plugin.settings.wallpaperPath = defaults.wallpaperPath;
          this.plugin.settings.wallpaperType = defaults.wallpaperType;
          this.plugin.settings.HistoryPaths = defaults.HistoryPaths;
          this.plugin.settings.playbackSpeed = defaults.playbackSpeed;
          this.plugin.settings.opacity = defaults.opacity;
          this.plugin.settings.zIndex = defaults.zIndex;
          this.plugin.settings.blurRadius = defaults.blurRadius;
          this.plugin.settings.brightness = defaults.brightness;
          this.plugin.settings.mobileBackgroundHeight =
            defaults.mobileBackgroundHeight;
          this.plugin.settings.mobileBackgroundWidth =
            defaults.mobileBackgroundWidth;
          await this.plugin.saveSettings();
          this.plugin.applyWallpaper(anyOptionEnabled);
          this.display();
        })
      );
    new Setting(containerEl)
      .setName("Under construction")
      .setDesc("Feature under construction")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.INBUILD)
          .onChange(async (value) => {
            this.plugin.settings.INBUILD = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );
  }
}
