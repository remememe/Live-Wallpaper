import { ChangeWallpaperContainer } from "../Wallpaper/wallpaperDom";
import { UpdatePaths } from "../Wallpaper/mediaUtils";
import { applyMediaStyles } from "../Wallpaper/wallpaperMedia";
import WallpaperApplier from "../Wallpaper/WallpaperApplier";
import { toggleModalStyles } from "../Styles/ModalStyles";
import { removeAllExcept, removeUnusedFilesInFolder } from "../FilePicker/fileUtils";
import { cleanInvalidWallpaperHistory } from "../FilePicker/historyManager";
import { App, PluginSettingTab, Setting, Platform, Notice } from "obsidian";
import type LiveWallpaperPlugin from "../main";
import { DEFAULT_SETTINGS }  from "../main";
import SettingsUtils from "./SettingsUtils";
import WallpaperConfigUtils from "../WallpaperConfigUtils";
import { openFilePicker } from "../FilePicker/filePicker";
const positions = new Map<number, string>([
  [100, 'Right'],
  [0, 'Left'],
  [50, 'Center'],
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
    const setting = new Setting(containerEl)
      .setName("Wallpaper source")
      .setDesc("Select an image, GIF, or video file to use as your wallpaper");
    setting.addButton(async (btn) => {
      const pathExists = await SettingsUtils.getPathExists(
        this.plugin,
        this.plugin.settings.currentWallpaper.path
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
          await cleanInvalidWallpaperHistory(this.plugin);
          this.plugin.settings.HistoryPaths.forEach((entry) => {
            new Setting(containerEl)
              .setName(entry.fileName)
              .setDesc(entry.path)
              .addButton((button) => {
                button.setButtonText("Select").onClick(async () => {
                  this.plugin.settings.currentWallpaper = await WallpaperConfigUtils.GetCurrentConfig(this.plugin);
                  const Index = this.plugin.settings.currentWallpaper.Index;
                  const pluginId = this.plugin.manifest.id;
                  const baseDir = `${this.app.vault.configDir}/plugins/${pluginId}/wallpapers`;

                  const sourceFullPath = `${this.app.vault.configDir}/${entry.path}`;
                  const ActiveSubFolder = WallpaperConfigUtils.computeActiveSubfolder(Index);

                  const targetFullPath = `${baseDir}/active/${ActiveSubFolder}/${entry.fileName}`;

                  const exists = await this.app.vault.adapter.exists(targetFullPath);
                  if (!exists) {
                    try {
                      await this.app.vault.adapter.copy(sourceFullPath, targetFullPath);
                    } catch (e) {
                      console.error("Failed to copy wallpaper from history to active folder", e);
                      return;
                    }
                  }

                  const relativeTargetFullPath = targetFullPath.replace(`${this.app.vault.configDir}/`, '');
                  const folder = relativeTargetFullPath.substring(0, relativeTargetFullPath.lastIndexOf('/'));

                  if (ActiveSubFolder === "normal") {
                    await removeAllExcept(this.plugin,folder,relativeTargetFullPath);
                  } 
                  else {
                    const Path = `.obsidian/plugins/${pluginId}/wallpapers/active/${ActiveSubFolder}`;
                    await removeUnusedFilesInFolder(this.plugin,Path,this.plugin.settings.currentWallpaper.Index,this.plugin.settings.currentWallpaper.path);
                  }

                  this.plugin.settings.currentWallpaper.path = `plugins/${pluginId}/wallpapers/active/${ActiveSubFolder}/${entry.fileName}`;
                  this.plugin.settings.currentWallpaper.type = entry.type;
                  this.plugin.settings.WallpaperConfigs[Index].path = `plugins/${pluginId}/wallpapers/active/${ActiveSubFolder}/${entry.fileName}`;
                  this.plugin.settings.WallpaperConfigs[Index].type = entry.type;
                  await Promise.all(
                    Array.from(this.plugin.windows).map(async (win) => {
                      await toggleModalStyles(win.document,this.plugin);
                      await WallpaperApplier.applyWallpaper(this.plugin,true,win.document);
                    })
                  );
                  UpdatePaths(this.plugin,{path: this.plugin.settings.currentWallpaper.path,type: this.plugin.settings.currentWallpaper.type});
                  await this.plugin.saveSettings();
                  this.display();
                });
              });
          });
        })
    );
    setting.addButton((btn) => {
      btn
        .setButtonText("Check wallpaper")
        .setIcon("image-file")
        .onClick(async () => {
          const path = await SettingsUtils.getWallpaperPath(this.plugin,this.plugin.settings.currentWallpaper.Index);
          if (!path) {
            new Notice("No wallpaper path set.");
            return;
          }

          if (await SettingsUtils.wallpaperExists(this.plugin, path)) {
            new Notice("Wallpaper loaded successfully.");
          } 
          else {
            new Notice("Wallpaper file not found. Resetting path.");
            this.plugin.settings.currentWallpaper.path = "";
            await this.plugin.saveSettings();
          }
        });
    });
    setting.addButton((btn) =>
      btn
        .setButtonText("Browse")
        .setIcon("folder-open")
        .setClass("mod-cta")
        .onClick(async (evt: MouseEvent) => {
          const doc = (evt.currentTarget as HTMLElement).ownerDocument;

          await openFilePicker(this.plugin,this.plugin.settings.currentWallpaper.Index,false, doc);

          for (const win of this.plugin.windows) {
            await toggleModalStyles(win.document,this.plugin);
          }
        })
    );
    new Setting(containerEl)
      .setName("Use global configuration")
      .setDesc("When enabled, all wallpapers will use the global settings instead of individual configurations.")
      .addToggle(toggle => { toggle
        .setValue(this.plugin.settings.globalConfig.enabled)
        .onChange(async (value) => {
            this.plugin.settings.globalConfig.enabled = value;
            this.plugin.settings.Preview = false;
            this.plugin.settings.currentWallpaper = await WallpaperConfigUtils.GetCurrentConfig(this.plugin);
            await Promise.all(
              Array.from(this.plugin.windows).map(async (win) => {
                const media = win.document.getElementById('live-wallpaper-media') as
                  HTMLImageElement | HTMLVideoElement;

                await toggleModalStyles(win.document,this.plugin);
                applyMediaStyles(media,this.plugin.settings.currentWallpaper);
                await WallpaperApplier.applyWallpaper(this.plugin,false, win.document); 
              })
            );
            UpdatePaths(this.plugin,{path:this.plugin.settings.currentWallpaper.path,type:this.plugin.settings.currentWallpaper.type});
            await this.plugin.saveSettings();
            this.display();
        });
      });
    if(!this.plugin.settings.globalConfig.enabled)
    {
      const Preview = new Setting(containerEl)
        .setName("Wallpaper preview")
        .setDesc("Preview and test specific wallpaper schedules below.");

      Preview.addDropdown(dropdown => {
        const MODAL_EFFECTS: Record<string, string> = {
          "0": "No Schedule",
          "1": "Day",
          "2": "Night",
          "3": "Monday",
          "4": "Tuesday",
          "5": "Wednesday",
          "6": "Thursday",
          "7": "Friday",
          "8": "Saturday",
          "9": "Sunday"
        };

        dropdown
          .addOptions(MODAL_EFFECTS)
          .setValue(this.plugin.settings.Preview ? this.plugin.settings.currentWallpaper.Index.toString() : "X") 
          .onChange(async (value) => {
            const index = parseInt(value, 10);
            const targetConfig = this.plugin.settings.WallpaperConfigs[index];
            if (targetConfig) {
              this.plugin.settings.currentWallpaper = targetConfig;
              this.plugin.settings.Preview = true;
              await Promise.all(
                Array.from(this.plugin.windows).map(async (win) => {
                  await toggleModalStyles(win.document,this.plugin);
                  await WallpaperApplier.applyWallpaper(this.plugin,false,win.document);
                }
              ));
              UpdatePaths(this.plugin,{path:this.plugin.settings.currentWallpaper.path,type:this.plugin.settings.currentWallpaper.type});
              new Notice(`Previewing wallpaper for ${MODAL_EFFECTS[value]}`);
              
              await this.plugin.saveSettings();
              this.display();
            }
          });
      });

      Preview.addButton(button => {
        button
          .setButtonText("Turn off preview")
          .setIcon("eye-off")
          .onClick(async () => {
            const currentConfig = await WallpaperConfigUtils.GetCurrentConfig(this.plugin);
            if (currentConfig) {
              this.plugin.settings.currentWallpaper = { ...currentConfig };
              this.plugin.settings.Preview = false;
              await Promise.all(
                Array.from(this.plugin.windows).map(async (win) => {
                  await toggleModalStyles(win.document,this.plugin);
                  await WallpaperApplier.applyWallpaper(this.plugin,false,win.document);
                })
              );
              new Notice("Preview turned off restored scheduled wallpaper.");
              UpdatePaths(this.plugin,{path:this.plugin.settings.currentWallpaper.path,type:this.plugin.settings.currentWallpaper.type});
              await this.plugin.saveSettings();
              this.display();
            }
          });
      });
    }
    new Setting(containerEl)
      .setName("Use full-resolution wallpapers")
      .setDesc("Keeps the original image size. To apply, add the wallpaper again.")
      .addToggle((Toggle) => {
        Toggle
          .setValue(this.plugin.settings.currentWallpaper.Quality)
          .onChange(async (value) => {
            this.plugin.settings.currentWallpaper.Quality = value;
            await this.plugin.saveSettings();
          });
      });
    new Setting(containerEl)
      .setName("Limit wallpaper size")
      .setDesc("Enable to restrict wallpapers to a maximum size (currently 12 MB). Disable for unlimited size.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.SizeLimited)
          .onChange(async (value) => {
            this.plugin.settings.SizeLimited = value;
            await this.plugin.saveSettings();
          });
      });
    new Setting(containerEl)
      .setName("Enable reposition") 
      .setDesc("Toggle to adjust the wallpaper's position and scale.")
      .addToggle(Toggle => {
        Toggle
          .setValue(this.plugin.settings.currentWallpaper.Reposition)
          .onChange(async (value) => {
            for (const win of this.plugin.windows) {
              const media = win.document.getElementById('live-wallpaper-media') as HTMLImageElement | HTMLVideoElement;
              if (value) {
                SettingsUtils.enableReposition(this.plugin,win.document);
                SettingsUtils.applyImagePosition(media,this.plugin.settings.currentWallpaper.positionX,this.plugin.settings.currentWallpaper.positionY,this.plugin.settings.currentWallpaper.Scale);
              } 
              else {
                SettingsUtils.disableReposition(win);
                applyMediaStyles(media,this.plugin.settings.currentWallpaper);
              }
            }
            this.plugin.settings.currentWallpaper.Reposition = value;
            await this.plugin.saveSettings();
            this.display();
        })
      })
    if (this.plugin.settings.currentWallpaper.Reposition) {
      new Setting(containerEl)
        .setName('Horizontal position')
        .setDesc('Adjust the horizontal position of the wallpaper.')
        .addSlider(slider => {
          slider
            .setLimits(0, 100, 1) 
            .setValue(this.plugin.settings.currentWallpaper.positionX) 
            .setDynamicTooltip()
            .setInstant(true)
            .onChange(async (value) => {
              this.plugin.settings.currentWallpaper.positionX = value;
              this.plugin.debouncedSave();
              await Promise.all(
                Array.from(this.plugin.windows).map(async (win) => {
                const media = win.document.getElementById('live-wallpaper-media') as HTMLImageElement | HTMLVideoElement;
                if (media) {
                  SettingsUtils.applyImagePosition(media,this.plugin.settings.currentWallpaper.positionX,this.plugin.settings.currentWallpaper.positionY,this.plugin.settings.currentWallpaper.Scale);
                }
              }));
            });
        });

      new Setting(containerEl)
        .setName('Vertical position')
        .setDesc('Adjust the vertical position of the wallpaper.')
        .addSlider(slider => {
          slider
            .setLimits(0, 100, 1)
            .setValue(this.plugin.settings.currentWallpaper.positionY)
            .setDynamicTooltip()
            .setInstant(true)
            .onChange(async (value) => {
              this.plugin.settings.currentWallpaper.positionY = value;
              this.plugin.debouncedSave();
              await Promise.all(
                Array.from(this.plugin.windows).map(async (win) => {
                const media = win.document.getElementById('live-wallpaper-media') as HTMLImageElement | HTMLVideoElement;
                if (media) {
                  SettingsUtils.applyImagePosition(media,this.plugin.settings.currentWallpaper.positionX,this.plugin.settings.currentWallpaper.positionY,this.plugin.settings.currentWallpaper.Scale);
                }
              }));
            });
        });
      new Setting(containerEl)
        .setName('Image scale') 
        .setDesc('Adjust the size of the wallpaper.') 
        .addSlider(slider => {
          slider
            .setLimits(0.5,2,0.1)
            .setValue(this.plugin.settings.currentWallpaper.Scale ?? 1)
            .setDynamicTooltip()
            .setInstant(true)
            .onChange(async (value) => {
              this.plugin.settings.currentWallpaper.Scale = value;
              this.plugin.debouncedSave();
              await Promise.all(
                Array.from(this.plugin.windows).map(async (win) => {
                  const media = win.document.getElementById('live-wallpaper-media') as HTMLImageElement;
                  if (media) {
                    await SettingsUtils.applyImagePosition(
                      media,
                      this.plugin.settings.currentWallpaper.positionX,
                      this.plugin.settings.currentWallpaper.positionY,
                      this.plugin.settings.currentWallpaper.Scale
                    );
                  }
                })
              );
            });
        })
      new Setting(containerEl)
        .setName('Image position')
        .setDesc('Adjust the image alignment when the main focus is off-center.')
        .addDropdown((dropdown) => {
          positions.forEach((label, key) => {
            dropdown.addOption(key.toString(), label);
          });
          dropdown
            .setValue(this.plugin.settings.currentWallpaper.position)
            .onChange(async (value) => {
              this.plugin.settings.currentWallpaper.position = value;
              this.plugin.debouncedSave();
              await Promise.all(
                Array.from(this.plugin.windows).map(async (win) => {
                const media = win.document.getElementById('live-wallpaper-media') as HTMLImageElement | HTMLVideoElement;
                if (media) {
                  this.plugin.settings.currentWallpaper.positionX = Number.parseInt(value);
                  SettingsUtils.applyImagePosition(media,this.plugin.settings.currentWallpaper.positionX,this.plugin.settings.currentWallpaper.positionY,this.plugin.settings.currentWallpaper.Scale);
                }
              }));
              this.display();
            });
      });
    }
    else{
      new Setting(containerEl)
        .setName('Disable image cover')
        .setDesc('Toggle this option to turn off object-fit: cover for the image.')
        .addToggle(toggle => {
          toggle
            .setValue(this.plugin.settings.currentWallpaper.useObjectFit)
            .onChange(async (value) => {
              for (const win of this.plugin.windows) {
                const media = win.document.getElementById('live-wallpaper-media') as HTMLImageElement | HTMLVideoElement;
                if (media) {
                  Object.assign(media.style, {
                    objectFit: this.plugin.settings.currentWallpaper.useObjectFit ? 'unset' : 'cover'
                  });
                }
              }
              this.plugin.settings.currentWallpaper.useObjectFit = value;
              this.plugin.debouncedSave();
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
          text: ` ${this.plugin.settings.currentWallpaper.opacity}%`,
          cls: "setting-item-description",
        });

        const initialValue = this.plugin.settings.AdnvOpend
          ? 100
          : this.plugin.settings.currentWallpaper.opacity;

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
              this.plugin.settings.currentWallpaper.opacity = v;
              valueEl.textContent = ` ${v}%`;
              this.plugin.debouncedApplyWallpaper();
              this.plugin.debouncedSave();
            }
          });
      });

    new Setting(containerEl)
      .setName("Blur radius")
      .setDesc("Applies a blur effect to the wallpaper in pixels")
      .addSlider((slider) => {
        const valueEl = containerEl.createEl("span", {
          text: ` ${this.plugin.settings.currentWallpaper.blurRadius}px`,
          cls: "setting-item-description",
        });
        slider
          .setInstant(true)
          .setLimits(0, 20, 1)
          .setValue(this.plugin.settings.currentWallpaper.blurRadius)
          .onChange(async (v) => {
            this.plugin.settings.currentWallpaper.blurRadius = v;
            valueEl.textContent = ` ${v}px`;
            this.plugin.debouncedApplyWallpaper();
            this.plugin.debouncedSave();
          });
      });

    new Setting(containerEl)
      .setName("Brightness")
      .setDesc("Adjusts the wallpaper brightness (100% = normal)")
      .addSlider((slider) => {
        const valueEl = containerEl.createEl("span", {
          text: ` ${this.plugin.settings.currentWallpaper.brightness}%`,
          cls: "setting-item-description",
        });
        slider
          .setInstant(true)
          .setLimits(20, 130, 1)
          .setValue(this.plugin.settings.currentWallpaper.brightness)
          .onChange(async (v) => {
            this.plugin.settings.currentWallpaper.brightness = v;
            valueEl.textContent = ` ${v}%`;
            this.plugin.debouncedApplyWallpaper();
            this.plugin.debouncedSave();
          });
      });
    new Setting(containerEl)
      .setName("Contrast")
      .setDesc("Controls the wallpaper contrast intensity 100% represents the original image")
      .addSlider((slider) => {
        const valueEl = containerEl.createEl("span", {
          text: ` ${this.plugin.settings.currentWallpaper.contrast}%`,
          cls: "setting-item-description",
        });
        slider
          .setInstant(true)
          .setLimits(0, 200, 1)
          .setValue(this.plugin.settings.currentWallpaper.contrast)
          .onChange(async (v) => {
            this.plugin.settings.currentWallpaper.contrast = v;
            valueEl.textContent = ` ${v}%`;
            this.plugin.debouncedApplyWallpaper();
            this.plugin.debouncedSave();
          });
      });
    new Setting(containerEl)
      .setName("Layer position (z‑index)")
      .setDesc(
        "Determines the stacking order: higher values bring the wallpaper closer to the front"
      )
      .addSlider((slider) => {
        const valueEl = containerEl.createEl("span", {
          text: ` ${this.plugin.settings.currentWallpaper.zIndex}`,
          cls: "setting-item-description",
        });
        slider
          .setInstant(true)
          .setLimits(-10, 100, 1)
          .setValue(this.plugin.settings.currentWallpaper.zIndex)
          .setDisabled(this.plugin.settings.AdnvOpend)
          .onChange(async (v) => {
            if (!this.plugin.settings.AdnvOpend) {
              this.plugin.settings.currentWallpaper.zIndex = v;
              valueEl.textContent = ` ${v}`;
              this.plugin.debouncedApplyWallpaper();
              this.plugin.debouncedSave();
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
          text: `${this.plugin.settings.currentWallpaper.playbackSpeed.toFixed(2)}x`,
          cls: "setting-item-description",
        });
        slider
          .setInstant(true)
          .setLimits(0.25, 2, 0.25)
          .setValue(this.plugin.settings.currentWallpaper.playbackSpeed)
          .onChange(async (val) => {
            this.plugin.settings.currentWallpaper.playbackSpeed = val;
            this.plugin.debouncedApplyWallpaper();
            this.plugin.debouncedSave();
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
              for (const win of this.plugin.windows) {
                ChangeWallpaperContainer(win.document,{width:this.plugin.settings.mobileBackgroundWidth,height:this.plugin.settings.mobileBackgroundHeight});
              }
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
              for (const win of this.plugin.windows) {
                ChangeWallpaperContainer(win.document,{width:this.plugin.settings.mobileBackgroundWidth,height:this.plugin.settings.mobileBackgroundHeight});
              }
            })
        );
      new Setting(containerEl)
        .setName("Match screen size")
        .setDesc(
          "Automatically set the background size to match your device's screen dimensions."
        )
        .addButton((button) =>
          button.setButtonText("Resize to screen").onClick(async () => {
            for (const win of this.plugin.windows) {
              this.plugin.settings.mobileBackgroundHeight = win.innerHeight.toString() + "px";
              this.plugin.settings.mobileBackgroundWidth = win.innerWidth.toString() + "px";
              ChangeWallpaperContainer(win.document,{width:this.plugin.settings.mobileBackgroundWidth,height:this.plugin.settings.mobileBackgroundHeight});
            }
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
          this.plugin.settings.currentWallpaper.path = defaults.currentWallpaper.path;
          this.plugin.settings.currentWallpaper.type = defaults.currentWallpaper.type;
          this.plugin.settings.HistoryPaths = defaults.HistoryPaths;
          this.plugin.settings.currentWallpaper.playbackSpeed = defaults.currentWallpaper.playbackSpeed;
          this.plugin.settings.currentWallpaper.opacity = defaults.currentWallpaper.opacity;
          this.plugin.settings.currentWallpaper.zIndex = defaults.currentWallpaper.zIndex;
          this.plugin.settings.currentWallpaper.blurRadius = defaults.currentWallpaper.blurRadius;
          this.plugin.settings.currentWallpaper.brightness = defaults.currentWallpaper.brightness;
          this.plugin.settings.currentWallpaper.contrast = defaults.currentWallpaper.contrast;
          this.plugin.settings.mobileBackgroundHeight =
            defaults.mobileBackgroundHeight;
          this.plugin.settings.mobileBackgroundWidth =
            defaults.mobileBackgroundWidth;
          await this.plugin.saveSettings();
          for (const win of this.plugin.windows) {
            WallpaperApplier.applyWallpaper(this.plugin,false,win.document);
          }
          this.display();
        })
      );
  }
}
