import { App, PluginSettingTab, Setting } from "obsidian";
import LiveWallpaperPlugin from "../main";
import { SettingsApp } from "./Settings";
import { ScheduledApp } from "./ScheduledWallpaperSettings";
import { LiveWallpaperSettingTab as AdvancedSettingsApp } from "./AdvnSettings";

export class LiveWallpaperSettingManager extends PluginSettingTab {
  plugin: LiveWallpaperPlugin;
  private regularTab: SettingsApp;
  private scheduledTab: ScheduledApp;
  private advancedTab: AdvancedSettingsApp;
  private activeTab: "regular" | "advanced" | "dynamic";

  constructor(app: App, plugin: LiveWallpaperPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.regularTab = new SettingsApp(app, plugin);
    this.scheduledTab = new ScheduledApp(app, plugin);
    this.advancedTab = new AdvancedSettingsApp(app, plugin);
    this.activeTab = "regular";
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const navContainer = containerEl.createDiv({
      cls: "live-wallpaper-settings-nav",
    });

    new Setting(navContainer)
      .addButton((button) => {
        button
          .setButtonText("General settings")
          .setClass(this.activeTab === "regular" ? "mod-cta" : "mod-off")
          .onClick(() => {
            this.activeTab = "regular";
            this.display();
          });
      })
      .addButton((button) => {
        button
          .setButtonText("Scheduled themes")
          .setClass(this.activeTab === "dynamic" ? "mod-cta" : "mod-off")
          .onClick(() => {
            this.activeTab = "dynamic";
            this.display();
          });
      })
      .addButton((button) => {
        button
          .setButtonText("Advanced settings")
          .setClass(this.activeTab === "advanced" ? "mod-cta" : "mod-off")
          .onClick(() => {
            this.activeTab = "advanced";
            this.display();
          });
      });

    const contentContainer = containerEl.createDiv({
      cls: "live-wallpaper-settings-content",
    });
    if (this.activeTab === "regular") {
      this.regularTab.containerEl = contentContainer;
      this.regularTab.display();
    } else if (this.activeTab === "advanced") {
      this.advancedTab.containerEl = contentContainer;
      this.advancedTab.display();
    } else {
      this.scheduledTab.containerEl = contentContainer;
      this.scheduledTab.display();
    }
  }
}
