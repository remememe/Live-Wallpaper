import { App, PluginSettingTab, Setting } from "obsidian";
import type LiveWallpaperPlugin from "../main";
import { SettingsApp } from "./Settings";
import { ScheduledApp } from "./ScheduledWallpaperSettings";
import { TransparencySettingsTab as TransparencySettingsApp } from "./TransparencySettings";

export class LiveWallpaperSettingManager extends PluginSettingTab {
  plugin: LiveWallpaperPlugin;
  private readonly regularTab: SettingsApp;
  private readonly scheduledTab: ScheduledApp;
  private readonly transparencyTab: TransparencySettingsApp;
  private activeTab: "regular" | "transparency" | "dynamic" | "experimental";

  constructor(app: App, plugin: LiveWallpaperPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.regularTab = new SettingsApp(app, plugin);
    this.scheduledTab = new ScheduledApp(app, plugin);
    this.transparencyTab = new TransparencySettingsApp(app, plugin);
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
          .setButtonText("Transparency settings")
          .setClass(this.activeTab === "transparency" ? "mod-cta" : "mod-off")
          .onClick(() => {
            this.activeTab = "transparency";
            this.display();
          });
      });      

    const contentContainer = containerEl.createDiv({
      cls: "live-wallpaper-settings-content",
    });

    if (this.activeTab === "regular") {
      this.regularTab.containerEl = contentContainer;
      this.regularTab.display();
    } 
    else if (this.activeTab === "transparency") {
      this.transparencyTab.containerEl = contentContainer;
      this.transparencyTab.display();
    } 
    else {
      this.scheduledTab.containerEl = contentContainer;
      this.scheduledTab.display();
    }
  }
}
