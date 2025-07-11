import { PluginSettingTab, App, Setting } from "obsidian";
import type LiveWallpaperPlugin from "../main";

export class LiveWallpaperSettingTab extends PluginSettingTab {
  plugin: LiveWallpaperPlugin;
  constructor(app: App, plugin: LiveWallpaperPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const advancedSection = containerEl.createDiv();
    const anyOptionEnabled = Object.values(
      this.plugin.settings.scheduledWallpapers.options
    ).some((v) => v === true);
    new Setting(advancedSection).setName("Experimental options").setHeading();

    new Setting(advancedSection).setName(
      "fine-tune advanced transparency settings to seamlessly integrate your wallpaper. these experimental features allow for deeper customization but may require css knowledge."
    );

    const toggleAdvancedButton = advancedSection.createEl("button", {
      text: this.plugin.settings.AdnvOpend
        ? "Disable experimental settings"
        : "Enable experimental settings",
    });

    const advancedOptionsContainer = advancedSection.createDiv();
    advancedOptionsContainer.style.display = this.plugin.settings.AdnvOpend
      ? "block"
      : "none";

    toggleAdvancedButton.onclick = () => {
      this.plugin.settings.AdnvOpend = !this.plugin.settings.AdnvOpend;
      advancedOptionsContainer.style.display = this.plugin.settings.AdnvOpend
        ? "block"
        : "none";
      toggleAdvancedButton.setText(
        this.plugin.settings.AdnvOpend
          ? "Hide advanced options"
          : "Show advanced options"
      );
      this.plugin.toggleModalStyles();
      this.plugin.settings.opacity = 40;
      this.plugin.settings.zIndex = 5;
      this.plugin.applyWallpaper(anyOptionEnabled);
      this.plugin.saveSettings();
      this.display();
    };

    const tableDescription = advancedOptionsContainer.createEl("p", {
      cls: "advanced-options-description",
    });
    tableDescription.innerHTML =
      "Define UI elements and CSS attributes that should be made transparent. " +
      "This allows the wallpaper to appear behind the interface, improving readability and aesthetic. " +
      "Each row lets you specify a target element (CSS selector) and the attribute you want to override.<br><br>" +
      "Example targets and attributes you can modify:<br>" +
      "• target: <code>.theme-dark</code>, attribute: <code>--background-primary</code><br>" +
      "• target: <code>.theme-dark</code>, attribute: <code>--background-secondary</code><br>" +
      "• target: <code>.theme-dark</code>, attribute: <code>--background-secondary-alt</code><br>" +
      "• target: <code>.theme-dark</code>, attribute: <code>--col-pr-background</code><br>" +
      "• target: <code>.theme-dark</code>, attribute: <code>--col-bckg-mainpanels</code><br>" +
      "• target: <code>.theme-dark</code>, attribute: <code>--col-txt-titlebars</code><br><br>" +
      "You can inspect elements and variables using browser dev tools (CTRL + SHIFT + I) to discover more attributes to adjust.";

    const tableContainer = advancedOptionsContainer.createEl("div", {
      cls: "text-arena-table-container",
    });
    const table = tableContainer.createEl("table", { cls: "text-arena-table" });

    const thead = table.createEl("thead");
    const headerRow = thead.createEl("tr");
    headerRow.createEl("th", { text: "Target element (CSS selector)" });
    headerRow.createEl("th", { text: "Attribute to modify" });

    const tbody = table.createEl("tbody");

    this.plugin.settings.TextArenas.forEach((entry, index) => {
      const row = tbody.createEl("tr");

      const targetCell = row.createEl("td");
      new Setting(targetCell).addText((text) => {
        text.setValue(entry.target).onChange((value) => {
          this.plugin.settings.TextArenas[index].target = value;
          this.plugin.saveSettings();
        });
      });

      const attrCell = row.createEl("td");
      new Setting(attrCell).addText((text) => {
        text.setValue(entry.attribute).onChange((value) => {
          this.plugin.RemoveChanges(index);
          this.plugin.settings.TextArenas[index].attribute = value;
          this.plugin.saveSettings();
          this.plugin.ApplyChanges(index);
        });
      });

      const actionCell = row.createEl("td");
      new Setting(actionCell).addExtraButton((btn) => {
        btn
          .setIcon("cross")
          .setTooltip("Remove this entry")
          .onClick(() => {
            this.plugin.RemoveChanges(index);
            this.plugin.settings.TextArenas.splice(index, 1);
            this.plugin.saveSettings();
            this.display();
          });
      });
    });

    new Setting(advancedOptionsContainer).addButton((btn) =>
      btn
        .setButtonText("Add new element")
        .setClass("text-arena-center-button")
        .setTooltip("Add a new row to the table")
        .onClick(() => {
          this.plugin.settings.TextArenas.push({ target: "", attribute: "" });
          this.display();
        })
    );
    let colorPickerRef: any = null;

    const colorSetting = new Setting(advancedOptionsContainer)
      .setName("Custom background color")
      .setDesc("Set a custom color for the plugin's styling logic")
      .addColorPicker((picker) => {
        colorPickerRef = picker;
        picker
          .setValue(this.plugin.settings.Color || "#000000")
          .onChange(async (value) => {
            this.plugin.settings.Color = value;
            await this.plugin.saveSettings();
            this.plugin.applyBackgroundColor();
          });
      })
      .addExtraButton((btn) =>
        btn
          .setIcon("reset")
          .setTooltip("Reset to default")
          .onClick(async () => {
            this.plugin.settings.Color = "";
            await this.plugin.saveSettings();
            this.plugin.applyBackgroundColor();
            if (colorPickerRef) {
              colorPickerRef.setValue("#000000");
            }
          })
      );
  }
}
