import { App, PluginSettingTab, Setting, Platform, Notice } from "obsidian";
import LiveWallpaperPlugin, { DEFAULT_SETTINGS } from "../main";
import { getPathExists, getWallpaperPath, wallpaperExists } from "./SettingsUtils";
const positions = new Map<string, string>([
  ['right', 'Right'],
  ['left', 'Left'],
  ['center', 'Center'],
]);

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
    const setting = new Setting(containerEl)
      .setName("Wallpaper source")
      .setDesc("Select an image, GIF, or video file to use as your wallpaper");

    if (!anyOptionEnabled) {
      setting.addButton(async (btn) => {
        const pathExists = await getPathExists(
          this.plugin,
          this.plugin.settings.wallpaperPath
        );

        if (pathExists) {
          btn
            .setIcon('circle-check')
            .setTooltip('Wallpaper path exists');
        } else {
          btn
            .setIcon('circle-x')
            .setTooltip('Wallpaper path is missing');
        }
      });
      setting.addButton((btn) =>
        btn
          .setButtonText("History")
          .setIcon("history")
          .setClass("mod-cta")
          .onClick(async () => {
            containerEl.empty();
            await this.plugin.cleanInvalidWallpaperHistory();
            this.plugin.settings.HistoryPaths.forEach((entry) => {
              new Setting(containerEl)
                .setName(entry.fileName)
                .setDesc(entry.path)
                .addButton((button) => {
                  button.setButtonText("Select").onClick(async () => {
                    const pluginId = this.plugin.manifest.id;
                    const baseDir = `${this.app.vault.configDir}/plugins/${pluginId}/wallpapers`;
                    const sourceFullPath = `${this.app.vault.configDir}/${entry.path}`;
                    const targetFullPath = `${baseDir}/active/normal/${entry.fileName}`;

                    const exists = await this.app.vault.adapter.exists(targetFullPath);
                    if (!exists) {
                      try {
                        await this.app.vault.adapter.copy(sourceFullPath, targetFullPath);
                      } catch (e) {
                        console.error("Failed to copy wallpaper from history to active/normal", e);
                        return;
                      }
                    }
                    const relativeTargetFullPath = targetFullPath.replace(`${this.app.vault.configDir}/`, '');
                    const folder = relativeTargetFullPath.substring(0, relativeTargetFullPath.lastIndexOf('/'));
                    await this.plugin.removeAllExcept(folder, relativeTargetFullPath);
                    this.plugin.settings.wallpaperPath = `plugins/${pluginId}/wallpapers/active/normal/${entry.fileName}`;
                    this.plugin.settings.wallpaperType = entry.type;

                    this.plugin.applyWallpaper(false);
                    this.display();
                  });
                });
            });
          })
      );
    }

    setting.addButton((btn) => {
      btn
        .setButtonText("Check wallpaper")
        .setIcon("image-file")
        .onClick(async () => {
          const path = await getWallpaperPath(this.plugin,anyOptionEnabled);

          if (!path) {
            new Notice("No wallpaper path set.");
            return;
          }

          if (await wallpaperExists(this.plugin, path)) {
            new Notice("Wallpaper loaded successfully.");
          } else {
            new Notice("Wallpaper file not found. Resetting path.");
            this.plugin.settings.wallpaperPath = "";
            await this.plugin.saveSettings();
          }
        });
    });

    if (!anyOptionEnabled) {
      setting.addButton((btn) =>
        btn
          .setButtonText("Browse")
          .setIcon("folder-open")
          .setClass("mod-cta")
          .onClick(() => this.plugin.openFilePicker())
      );
    }
    new Setting(containerEl)
      .setName("Use full-resolution wallpapers")
      .setDesc("Keeps the original image size. To apply, add the wallpaper again.")
      .addToggle((Toggle) => {
        Toggle
          .setValue(this.plugin.settings.Quality)
          .onChange(async (value) => {
            this.plugin.settings.Quality = value;
            await this.plugin.saveSettings();
          });
      });
    if(this.plugin.settings.INBUILD)
    {   
      const media = document.getElementById('live-wallpaper-media') as HTMLImageElement | HTMLVideoElement;
      new Setting(containerEl)
        .setName('Image position')
        .setDesc('Adjust the image alignment when the main focus is off-center.')
        .addDropdown((dropdown) => {
          positions.forEach((label, key) => {
            dropdown.addOption(key, label);
          });
          dropdown
            .setValue(this.plugin.settings.Position)
            .onChange(async (value) => {
              this.plugin.settings.Position = value;
              await this.plugin.saveSettings();
              if (media) {
                this.plugin.applyMediaStyles(media);
              }
          });
      });
      new Setting(containerEl)
      .setName('Disable image cover')
      .setDesc('Toggle this option to turn off object-fit: cover for the image.')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.useObjectFit)
          .onChange(async (value) => {
            this.plugin.settings.useObjectFit = value;
            await this.plugin.saveSettings();
            if (media) {
              this.plugin.applyMediaStyles(media);
            }
          });
      });
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
          slider.setDisabled(true);
          valueEl.textContent = ` 100%`;
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
    if (this.plugin.settings.AdnvOpend) {
      this.plugin.settings.opacity = 100;
      this.plugin.settings.zIndex = 0;
      this.plugin.saveSettings().then(() => {
        this.plugin.applyWallpaper(anyOptionEnabled);
      });
    }
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
            const media = document.getElementById('live-wallpaper-media') as HTMLImageElement | HTMLVideoElement;
            this.plugin.settings.INBUILD = value;
            await this.plugin.saveSettings();
            this.display();
            this.plugin.applyMediaStyles(media);
          })
      );
  }
}
