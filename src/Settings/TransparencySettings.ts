import { PluginSettingTab, App, Setting, Platform } from "obsidian";
import LiveWallpaperPlugin, { DEFAULT_SETTINGS } from "../main";
import type { ModalEffect } from "../main";
import SettingsUtils from "./SettingsUtils";

export class TransparencySettingsTab extends PluginSettingTab {
  plugin: LiveWallpaperPlugin;
  constructor(app: App, plugin: LiveWallpaperPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const transparencySection = containerEl.createDiv();

    new Setting(transparencySection)
      .setName("Transparency options")
      .setHeading();

    new Setting(transparencySection).setName(
      "Fine-tune transparency and visual effects to seamlessly integrate your wallpaper. These features allow for deeper customization but may require CSS knowledge."
    );

    const toggleTransparencyButton = transparencySection.createEl("button", {
      text: this.plugin.settings.AdnvOpend
        ? "Disable transparency settings"
        : "Enable transparency settings",
    });

    const transparencyOptionsContainer = transparencySection.createDiv();
    transparencyOptionsContainer.style.display = this.plugin.settings.AdnvOpend
      ? "block"
      : "none";

    toggleTransparencyButton.onclick = async () => {
      this.plugin.settings.AdnvOpend = !this.plugin.settings.AdnvOpend;
      transparencyOptionsContainer.style.display = this.plugin.settings.AdnvOpend ? "block" : "none";
      toggleTransparencyButton.setText(this.plugin.settings.AdnvOpend ? "Hide transparency options" : "Show transparency options");
      for (const win of this.plugin.windows) {
        await this.plugin.toggleModalStyles(win.document);
        this.plugin.applyWallpaper(false,win.document);
      }
      this.plugin.saveSettings();
      this.display();
    };

    const tableDescription = transparencyOptionsContainer.createEl("p", {
      cls: "transparency-options-description",
    });
    tableDescription.innerHTML =
      "Define UI elements and CSS attributes that should be made transparent. " +
      "This allows the wallpaper to appear behind the interface, improving readability and aesthetics. " +
      "Example attributes you can modify:<br>" +
      "• attribute: <code>--background-primary</code><br>" +
      "• attribute: <code>--background-secondary</code><br>" +
      "• attribute: <code>--background-secondary-alt</code><br>" +
      "• attribute: <code>--col-pr-background</code><br>" +
      "• attribute: <code>--col-bckg-mainpanels</code><br>" +
      "• attribute: <code>--col-txt-titlebars</code><br><br>" +
      "You can inspect elements and variables using browser dev tools (CTRL + SHIFT + I) to discover more attributes to adjust.";

    const tableContainer = transparencyOptionsContainer.createEl("div", {
      cls: "text-arena-table-container",
    });
    const table = tableContainer.createEl("table", { cls: "text-arena-table" });

    const thead = table.createEl("thead");
    const headerRow = thead.createEl("tr");
    headerRow.createEl("th", { text: "Attribute to modify" });

    this.plugin.settings.TextArenas.forEach((entry, index) => {
      const row = table.createEl("tr");
      new Setting(row).addText((text) => {
        text.setValue(entry.attribute).onChange(async (value) => {
          if (!SettingsUtils.AttributeValid(value)) {
            return;
          }
          for (const win of this.plugin.windows) {
            await this.plugin.RemoveChanges(index, win.document);
          }
          this.plugin.settings.TextArenas[index].attribute = value;
          for (const win of this.plugin.windows) {
            await this.plugin.LoadOrUnloadChanges(true, win.document);
            this.plugin.ApplyChanges(index, win.document);
          }
          await this.plugin.saveSettings(); 
        });
      });

      const actionCell = row.createEl("td");
      new Setting(actionCell).addExtraButton((btn) => {
        btn
          .setIcon("cross")
          .setTooltip("Remove this entry")
          .onClick(() => {
            for (const win of this.plugin.windows) {
              this.plugin.RemoveChanges(index,win.document);
            }
            this.plugin.settings.TextArenas.splice(index, 1);
            for (const win of this.plugin.windows) {
              this.plugin.LoadOrUnloadChanges(true,win.document);
            }
            this.plugin.saveSettings();
            this.display();
          });
      });
    });

    new Setting(transparencyOptionsContainer).addButton((btn) =>
      btn
        .setButtonText("Add new element")
        .setClass("text-arena-center-button")
        .setTooltip("Add a new row to the table")
        .onClick(() => {
          this.plugin.settings.TextArenas.push({ attribute: "" });
          this.display();
        })
    );

    let colorPickerRef: any = null;

    new Setting(transparencyOptionsContainer)
      .setName("Custom background color")
      .setDesc("Set a custom color for the plugin's styling logic")
      .addColorPicker((picker) => {
        colorPickerRef = picker;
        picker
          .setValue(this.plugin.settings.Color || "#000000")
          .onChange(async (value) => {
            this.plugin.settings.Color = value;
            await this.plugin.saveSettings();
            for (const win of this.plugin.windows) {
              this.plugin.applyBackgroundColor(win.document);
            }
          });
      })
      .addExtraButton((btn) =>
        btn
          .setIcon("reset")
          .setTooltip("Reset to default")
          .onClick(async () => {
            this.plugin.settings.Color = "";
            await this.plugin.saveSettings();
            for (const win of this.plugin.windows) {
              this.plugin.applyBackgroundColor(win.document);
            }
            if (colorPickerRef) {
              colorPickerRef.setValue("#000000");
            }
          })
      );

    if (Platform.isDesktop) {
      new Setting(transparencyOptionsContainer)
        .setName("Modal background effect")
        .setDesc("Choose how the modal background is styled when transparency options are enabled")
        .addDropdown((dropdown) => {
          const MODAL_EFFECTS: Record<string, string> = {
            none: "No effect",
            blur: "Apply blur effect",
            dim: "Dim the background",
            "blur+dim": "Apply both blur and dim effects",
          };

          dropdown
            .addOptions(MODAL_EFFECTS)
            .setValue(this.plugin.settings.modalStyle.effect)
            .onChange(async (value) => {
              this.plugin.settings.modalStyle.effect = value as ModalEffect;
              await this.plugin.saveSettings();
              for (const win of this.plugin.windows) {
                await this.plugin.toggleModalStyles(win.document);
              }
            });
        });

      new Setting(transparencyOptionsContainer)
        .setName("Modal blur radius")
        .setDesc("Adjust the blur intensity applied to the modal background")
        .addSlider((slider) => {
          slider
            .setValue(this.plugin.settings.modalStyle.blurRadius)
            .setLimits(0, 30, 1)
            .setInstant(true)
            .setDynamicTooltip()
            .onChange(async (value) => {
              this.plugin.settings.modalStyle.blurRadius = value;
              for (const win of this.plugin.windows) {
                await this.plugin.toggleModalStyles(win.document);
              }
              this.plugin.debouncedSave();
            });
        });

      new Setting(transparencyOptionsContainer)
        .setName("Modal dim opacity")
        .setDesc("Adjust the darkness level applied to the modal background")
        .addSlider((slider) => {
          slider
            .setValue(this.plugin.settings.modalStyle.dimOpacity * 100)
            .setLimits(0, 100, 5)
            .setInstant(true)
            .setDynamicTooltip()
            .onChange(async (value) => {
              this.plugin.settings.modalStyle.dimOpacity = value / 100;
              for (const win of this.plugin.windows) {
                await this.plugin.toggleModalStyles(win.document);
              }
              this.plugin.debouncedSave();
            });
        });

      new Setting(transparencyOptionsContainer)
        .setName("Modal dim color")
        .setDesc("Choose whether the modal background dim is black or white")
        .addDropdown((dropdown) => {
          dropdown
            .addOption("black", "Black")
            .addOption("white", "White")
            .setValue(this.plugin.settings.modalStyle.dimColor)
            .onChange(async (value) => {
              this.plugin.settings.modalStyle.dimColor = value as "black" | "white";
              for (const win of this.plugin.windows) {
                await this.plugin.toggleModalStyles(win.document);
              }
              this.plugin.debouncedSave();
            });
        });

      new Setting(transparencyOptionsContainer)
        .setName("Disable modal background")
        .setDesc("Turns off the default modal background dim")
        .addToggle((toggle) => {
          toggle
            .setValue(this.plugin.settings.modalStyle.disableModalBg)
            .onChange(async (value) => {
              this.plugin.settings.modalStyle.disableModalBg = value;
              for (const win of this.plugin.windows) {
                await this.plugin.toggleModalStyles(win.document);
              }
              this.plugin.debouncedSave();
            });
        });

      new Setting(transparencyOptionsContainer)
        .setName("Reset modal settings")
        .setDesc("Restore default blur and dim opacity for the modal background")
        .addButton((btn) =>
          btn
            .setIcon("reset")
            .setTooltip("Reset modal styles to default")
            .onClick(async () => {
              const defaults = DEFAULT_SETTINGS;
              this.plugin.settings.modalStyle = { ...defaults.modalStyle };
              for (const win of this.plugin.windows) {
                await this.plugin.toggleModalStyles(win.document);
              }
              this.plugin.debouncedSave();
              this.display();
            })
        );
    }
  }
}
