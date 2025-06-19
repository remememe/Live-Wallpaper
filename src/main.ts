import { Plugin, PluginSettingTab, Setting, App, ColorComponent,Platform} from 'obsidian';
import { serialize } from 'v8';
interface TextArenaEntry {
  target: string;
  attribute: string;
}
interface LiveWallpaperPluginSettings {
  wallpaperPath: string;
  wallpaperType: 'image' | 'video' | 'gif';
  playbackSpeed: number;
  opacity: number;
  zIndex: number;
  blurRadius: number;       
  brightness: number;     
  mobileBackgroundWidth: string;
  mobileBackgroundHeight: string;
  AdnvOpend: boolean;
  TextArenas: TextArenaEntry[];
  Color: string;
}

const DEFAULT_SETTINGS: LiveWallpaperPluginSettings = {
  wallpaperPath: '',
  wallpaperType: 'image',
  playbackSpeed: 1.0,
  opacity: 40,
  zIndex: 0,
  blurRadius: 8,            
  brightness: 100,    
  mobileBackgroundWidth: '100vw',
  mobileBackgroundHeight: '100vh',
  AdnvOpend: false,
  TextArenas: [
      { target: "", attribute: "" }
    ],
  Color: "#000000",
};
export default class LiveWallpaperPlugin extends Plugin {
  settings: LiveWallpaperPluginSettings = DEFAULT_SETTINGS;
  private lastPath: string | null = null;
  private lastType: 'image' | 'video' | 'gif' | null = null;
  async onload() {
      await this.loadSettings();
      await this.ensureWallpaperFolderExists();
      this.toggleModalStyles();
      this.addSettingTab(new LiveWallpaperSettingTab(this.app, this));
      this.applyWallpaper();
      this.registerEvent(
          this.app.workspace.on('css-change', () => this.applyWallpaper())
      );
      this.ChangeWallpaperContainer();
      await this.applyBackgroundColor();
  }
  async unload()
  {
    await this.clearBackgroundColor();
    this.removeExistingWallpaperElements();
    this.RemoveModalStyles();
    document.body.classList.remove('live-wallpaper-active');
    await this.LoadOrUnloadChanges(false);
    await super.unload(); 
  }
  async loadSettings() {
    try {
        const loaded = await this.loadData();
        this.settings = { ...DEFAULT_SETTINGS, ...loaded };
        await this.LoadOrUnloadChanges(true);
      } catch (e) {
        console.error("Live Wallpaper Plugin – loadSettings error:", e);
        this.settings = { ...DEFAULT_SETTINGS };
      }
  }

  async saveSettings() {
      await this.saveData(this.settings);
  }
  async applyWallpaper() {
    if (!this.settings.wallpaperPath) {
      this.removeExistingWallpaperElements();
      this.lastPath = this.lastType = null;
      return;
    }
  
    const container = document.getElementById('live-wallpaper-container') as HTMLDivElement;
    let media = document.getElementById('live-wallpaper-media') as
      | HTMLImageElement
      | HTMLVideoElement;
  
    const newPath = this.settings.wallpaperPath;
    const newType = this.settings.wallpaperType;
  
    if (container && media) {
      Object.assign(container.style, {
        opacity: `${this.settings.opacity/100}`,
        zIndex: `${this.settings.zIndex}`,
        filter: `blur(${this.settings.blurRadius}px) brightness(${this.settings.brightness}%)`
      });
      if (media instanceof HTMLVideoElement) {
        media.playbackRate = this.settings.playbackSpeed;
      }
  
      if (newPath !== this.lastPath || newType !== this.lastType) {
        const newMedia = this.createMediaElement();
        container.replaceChild(newMedia, media);
        media = newMedia;
        this.lastPath = newPath;
        this.lastType = newType;
      }
  
      return;
    }
  
    this.removeExistingWallpaperElements();
    const newContainer = this.createWallpaperContainer();
    const newMedia = this.createMediaElement();
    newMedia.id = 'live-wallpaper-media';
    newContainer.appendChild(newMedia);
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.insertAdjacentElement('beforebegin', newContainer);
    else document.body.appendChild(newContainer);
    document.body.classList.add('live-wallpaper-active');
  
    this.lastPath = newPath;
    this.lastType = newType;
  }
  
  private async ensureWallpaperFolderExists(): Promise<boolean> {
    try {
      const dir = this.manifest.dir;
      if (!dir) throw new Error("manifest.dir is undefined");
      const wallpaperFolder = `${dir}/wallpaper`;
      return await this.app.vault.adapter.exists(wallpaperFolder);
    } catch (e) {
      console.error("Failed to check wallpaper folder:", e);
      return false;
    }
  }


  private removeExistingWallpaperElements() {
      const existingContainer = document.getElementById('live-wallpaper-container');
      const existingStyles = document.getElementById('live-wallpaper-overrides');
      const existingTitlebarStyles = document.getElementById('live-wallpaper-titlebar-styles');
      
      existingContainer?.remove();
      existingStyles?.remove();
      existingTitlebarStyles?.remove();
      document.body.classList.remove('live-wallpaper-active');
  }

  private createWallpaperContainer(): HTMLElement {
      const container = document.createElement('div');
      container.id = 'live-wallpaper-container';
      
      Object.assign(container.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          zIndex: `${this.settings.zIndex}`, 
          opacity: `${this.settings.opacity / 100}`,
          overflow: 'hidden',
          pointerEvents: 'none',
          filter: `blur(${this.settings.blurRadius}px) brightness(${this.settings.brightness}%)`
      });
      
      return container;
  }
  public ChangeWallpaperContainer() {
    const container = document.getElementById('live-wallpaper-container');
    if (container == null) return;
    const width = this.settings.mobileBackgroundWidth || '100vw';
    const height = this.settings.mobileBackgroundHeight || '100vh';
    Object.assign(container.style, {
      width,
      height,
    });
  }
  private createMediaElement(): HTMLImageElement | HTMLVideoElement {
      const isVideo = this.settings.wallpaperType === 'video';
      const media = isVideo
        ? document.createElement('video')
        : document.createElement('img');
      media.id = 'live-wallpaper-media';
      if (media instanceof HTMLImageElement) {
          media.loading = "lazy"; 
      }
      media.src = this.app.vault.adapter.getResourcePath(
          `${this.app.vault.configDir}/${this.settings.wallpaperPath}`
        );
      Object.assign(media.style, {
          width: '100%', 
          height: '100%', 
          objectFit: 'cover'
      });

      if (isVideo) {
          (media as HTMLVideoElement).autoplay = true;
          (media as HTMLVideoElement).loop = true;
          (media as HTMLVideoElement).muted = true;
          (media as HTMLVideoElement).playbackRate = this.settings.playbackSpeed;
      }
      
      return media;
  }


  async openFilePicker() {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.jpg,.jpeg,.png,.gif,.mp4,.webm';
      fileInput.multiple = false;

      fileInput.addEventListener('change', async (event) => {
          const target = event.target as HTMLInputElement;
          if (!target.files || target.files.length === 0) return;

          const file = target.files[0];
          const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm'];
          const extension = file.name.split('.').pop()?.toLowerCase();

          if (!extension || !allowedExtensions.includes(extension)) {
              alert('Unsupported file type!');
              return;
          }

          if (file.size > 12 * 1024 * 1024) {
              alert('File is too large (max 12MB).');
              return;
          }

          try {
              if (this.settings.wallpaperPath) {
                  const oldFilename = this.settings.wallpaperPath.split('/').pop();
                  const oldPath = `${this.manifest.dir}/wallpaper/${oldFilename}`;
                  await this.app.vault.adapter.remove(oldPath).catch(() => {});
              }

              const pluginWallpaperDir = `${this.app.vault.configDir}/plugins/${this.manifest.id}/wallpaper`;
              await this.app.vault.adapter.mkdir(pluginWallpaperDir);
              const wallpaperPath = `${pluginWallpaperDir}/${file.name}`;
              let arrayBuffer: ArrayBuffer;
              if (file.type.startsWith('image/')) {
                  const resizedBlob = await this.resizeImageToBlob(file); 
                  arrayBuffer = await resizedBlob.arrayBuffer();
              } else {
                  arrayBuffer = await file.arrayBuffer();
              }
              await this.app.vault.adapter.writeBinary(wallpaperPath, arrayBuffer);

              this.settings.wallpaperPath = `plugins/${this.manifest.id}/wallpaper/${file.name}`;
              this.settings.wallpaperType = this.getWallpaperType(file.name);
              await this.saveSettings();
              this.applyWallpaper();

          } catch (error) {
              alert('Could not save the file. Check disk permissions.');
              console.error(error);
          }
      });

      fileInput.click();
  }

  private getWallpaperType(filename: string): 'image' | 'video' | 'gif' {
      const extension = filename.split('.').pop()?.toLowerCase();
      if (['mp4', 'webm'].includes(extension || '')) return 'video';
      if (extension === 'gif') return 'gif';
      return 'image';
  }
  private async resizeImageToBlob(file: File): Promise<Blob> 
  {
      const img = await createImageBitmap(file);
      const MAX_WIDTH = 1920;
      
      if (img.width <= MAX_WIDTH) return new Blob([await file.arrayBuffer()], {type: file.type});

      const canvas = new OffscreenCanvas(MAX_WIDTH, (img.height / img.width) * MAX_WIDTH);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      return canvas.convertToBlob({quality: 0.8, type: 'image/jpeg'});
  }

  public async LoadOrUnloadChanges(load: boolean): Promise<void> {
      for (const { target, attribute } of this.settings.TextArenas) {
          try {
              const attr = attribute?.trim();
              if (!attr) continue;

              const isVar = attr.startsWith("--");
              
              if (isVar) {
                  const el = document.body.classList.contains("theme-dark") 
                      ? document.body 
                      : document.documentElement;
                  
                  if (load) {
                      el.style.setProperty(attr, "transparent", "important");
                  } else {
                      el.style.removeProperty(attr);
                  }
                  continue;
              }

              const targetSelector = target?.trim();
              if (!targetSelector) continue; 

              const el = document.querySelector<HTMLElement>(targetSelector);
              if (!el) continue;

              if (load) {
                  el.style.setProperty(attr, "transparent", "important");
              } else {
                  el.style.removeProperty(attr);
                  if (!el.getAttribute("style")) {
                      el.removeAttribute("style");
                  }
              }
          } catch (error) {
              console.error("Error processing element:", { target, attribute }, error);
          }
      }
  }
  public ApplyChanges(id: number): void {
    const { target, attribute } = this.settings.TextArenas[id];
    const attr = attribute.trim();
    const isVar = attr.startsWith("--");
    const el = isVar
      ? (document.body.classList.contains("theme-dark") ? document.body : document.documentElement)
      : document.querySelector<HTMLElement>(target);

    if (!el) return;

    if (isVar) {
      el.style.setProperty(attr, "transparent", "important");
    } else {
      el.style.setProperty(attr, "transparent", "important");
    }
  }
  public async RemoveChanges(id: number, oldAttribute?: string): Promise<void> {
    if (id < 0 || id >= this.settings.TextArenas.length) {
      return;
    }

    const attribute = (oldAttribute ?? this.settings.TextArenas[id].attribute)?.trim();
    const target = this.settings.TextArenas[id].target?.trim();
    if (!attribute || !target) {
      return;
    }

    try {
      if (!attribute.startsWith("--")) {
        const el = document.querySelector<HTMLElement>(target);
        if (el) {
          el.style.removeProperty(attribute);
          if (!el.getAttribute("style")) {
            el.removeAttribute("style");
          }
        }
      } else {
        const el = document.body.classList.contains("theme-dark")
          ? document.body
          : document.documentElement;
        el.style.removeProperty(attribute);
        el.style.setProperty(attribute, "");
        el.removeAttribute("style");
      }
    } catch (error) {
      console.error(`Error removing '${attribute}' at index ${id}:`, error);
    }

    this.LoadOrUnloadChanges(true);
  }
  public toggleModalStyles() {
      const styleId = "extrastyles-dynamic-css";
      const existingStyle = document.getElementById(styleId);

      if (this.settings.AdnvOpend) {
          if (!existingStyle) {
              const style = document.createElement("style");
              style.id = styleId;
              style.textContent = `
                  .modal-container.mod-dim {
                      background: rgba(0, 0, 0, 0.7);
                      backdrop-filter: blur(10px);
                  }
                  .modal-container {
                      background: rgba(0, 0, 0, 0.7);
                      backdrop-filter: blur(10px);
                  }
              `;
              document.head.appendChild(style);
          }
          this.LoadOrUnloadChanges(true);
      } 
      else {
          this.LoadOrUnloadChanges(false);
          if (existingStyle) {
            existingStyle.remove();
          }
      }
  }
  private RemoveModalStyles()
  {
      const styleId = "extrastyles-dynamic-css";
      const existingStyle = document.getElementById(styleId);
      existingStyle != null ? existingStyle.remove() : "";
  }
  public async applyBackgroundColor() {
      const existingElement = document.getElementById('live-wallpaper-container');
      if (existingElement) {
          if (this.settings.AdnvOpend && this.settings.Color) {
              existingElement.parentElement?.style.setProperty('background-color', this.settings.Color, 'important');
          }
          return;
      }

      await new Promise<void>((resolve) => {
          const observer = new MutationObserver((mutations, obs) => {
              const element = document.getElementById('live-wallpaper-container');
              if (element) {
                  obs.disconnect();
                  resolve();
              }
          });

          observer.observe(document.body, {
              childList: true,
              subtree: true
          });
      });

      if (this.settings.AdnvOpend && this.settings.Color) {
          const Main = document.getElementById('live-wallpaper-container');
          Main?.parentElement?.style.setProperty('background-color', this.settings.Color, 'important');
      }
  }
  public async clearBackgroundColor() {
      const Main = document.getElementById('live-wallpaper-container');
      Main?.parentElement?.style.removeProperty('background-color');
  }
}  
class LiveWallpaperSettingTab extends PluginSettingTab {
  plugin: LiveWallpaperPlugin;
  constructor(app: App, plugin: LiveWallpaperPlugin) {
      super(app, plugin);
      this.plugin = plugin;
  }

  display(): void {
    
    const { containerEl } = this;
    containerEl.empty();
  
    new Setting(containerEl)
      .setName('Wallpaper source')
      .setDesc('Select an image, GIF, or video file to use as your wallpaper')
      .addButton(btn => btn
        .setButtonText('Browse')
        .setIcon('folder-open')             
        .setClass('mod-cta')               
        .onClick(() => this.plugin.openFilePicker())
      );
  
    new Setting(containerEl)
      .setName('Wallpaper opacity')
      .setDesc('Controls the transparency level of the wallpaper (0% = fully transparent, 100% = fully visible)')
      .addSlider(slider => {
        const valueEl = containerEl.createEl('span', {
          text: ` ${this.plugin.settings.opacity}%`,
          cls: 'setting-item-description',
        });

        const initialValue = this.plugin.settings.AdnvOpend ? 100 : this.plugin.settings.opacity;

        if (this.plugin.settings.AdnvOpend) {
          this.plugin.settings.opacity = 100;
          valueEl.textContent = ` 100%`;
          this.plugin.saveSettings();
          this.plugin.applyWallpaper();          
        }

        slider
          .setLimits(0, 80, 1)
          .setValue(initialValue)
          .setDisabled(this.plugin.settings.AdnvOpend)
          .setDynamicTooltip()
          .setInstant(true)
          .onChange(async v => {
            if (!this.plugin.settings.AdnvOpend) {
              this.plugin.settings.opacity = v;
              valueEl.textContent = ` ${v}%`;
              await this.plugin.saveSettings();
              this.plugin.applyWallpaper();
            }
          });
      });
  
    new Setting(containerEl)
        .setName('Blur radius')
        .setDesc('Applies a blur effect to the wallpaper in pixels')
        .addSlider(slider => {
            const valueEl = containerEl.createEl('span', {
                text: ` ${this.plugin.settings.blurRadius}px`,
                cls: 'setting-item-description',
            });
            slider
                .setInstant(true)
                .setLimits(0, 20, 1)
                .setValue(this.plugin.settings.blurRadius)
                .onChange(async v => {
                    this.plugin.settings.blurRadius = v;
                    valueEl.textContent = ` ${v}px`;
                    await this.plugin.saveSettings();
                    this.plugin.applyWallpaper();
                });
        });

    new Setting(containerEl)
        .setName('Brightness')
        .setDesc('Adjusts the wallpaper brightness (100% = normal)')
        .addSlider(slider => {
            const valueEl = containerEl.createEl('span', {
                text: ` ${this.plugin.settings.brightness}%`,
                cls: 'setting-item-description',
            });
            slider
                .setInstant(true)
                .setLimits(20, 130, 1)
                .setValue(this.plugin.settings.brightness)
                .onChange(async v => {
                    this.plugin.settings.brightness = v;
                    valueEl.textContent = ` ${v}%`;
                    await this.plugin.saveSettings();
                    this.plugin.applyWallpaper();
                });
        });

    new Setting(containerEl)
      .setName('Layer position (z‑index)')
      .setDesc('Determines the stacking order: higher values bring the wallpaper closer to the front')
      .addSlider(slider => {
        const valueEl = containerEl.createEl('span', {
          text: ` ${this.plugin.settings.zIndex}`,
          cls: 'setting-item-description',
        });
        if (this.plugin.settings.AdnvOpend) {
            this.plugin.settings.zIndex = 0;
            valueEl.textContent = ` 0`;
            this.plugin.saveSettings();
            this.plugin.applyWallpaper();
        }
        slider
          .setInstant(true)
          .setLimits(-10, 100, 1)
          .setValue(this.plugin.settings.zIndex)
          .setDisabled(this.plugin.settings.AdnvOpend)
          .onChange(async v => {
            if (!this.plugin.settings.AdnvOpend) {
              this.plugin.settings.zIndex = v;
              valueEl.textContent = ` ${v}`;
              await this.plugin.saveSettings();
              this.plugin.applyWallpaper();
            }
          });
      });
      if (Platform.isMobileApp) {
        const desc = document.createElement("div");
        desc.textContent = "On mobile devices, zooming can affect background size. You can manually set the height and width to maintain consistency.";

        containerEl.appendChild(desc);

        new Setting(containerEl)
          .setName("Background width")
          .setDesc("Set a custom width for the background on mobile (e.g., 100vw or 500px).")
          .addText(text => text
            .setPlaceholder("e.g., 100vw")
            .setValue(this.plugin.settings.mobileBackgroundWidth || "")
            .onChange(async (value) => {
              this.plugin.settings.mobileBackgroundWidth = value;
              await this.plugin.saveSettings();
              this.plugin.ChangeWallpaperContainer(); 
            }));

        new Setting(containerEl)
          .setName("Background height")
          .setDesc("Set a custom height for the background on mobile (e.g., 100vh or 800px).")
          .addText(text => text
            .setPlaceholder("e.g., 100vh")
            .setValue(this.plugin.settings.mobileBackgroundHeight || "")
            .onChange(async (value) => {
              this.plugin.settings.mobileBackgroundHeight = value;
              await this.plugin.saveSettings();
              this.plugin.ChangeWallpaperContainer();
            }));
        new Setting(containerEl)
          .setName("Match screen size")
          .setDesc("Automatically set the background size to match your device's screen dimensions.")
          .addButton(button => button
            .setButtonText("Resize to screen")
            .onClick(async () => {
              this.plugin.settings.mobileBackgroundHeight = window.innerHeight.toString() + "px";
              this.plugin.settings.mobileBackgroundWidth = window.innerWidth.toString() + "px";
              this.plugin.ChangeWallpaperContainer();
              await this.plugin.saveSettings();
              this.display();
            }));
      }
      new Setting(containerEl)
      .setName('Reset options')
      .setDesc('Resets all settings')
      .addButton(Button =>
        Button.setButtonText('Reset').onClick(async () => {
          const defaults = DEFAULT_SETTINGS;

          this.plugin.settings.wallpaperPath = defaults.wallpaperPath;
          this.plugin.settings.wallpaperType = defaults.wallpaperType;
          this.plugin.settings.playbackSpeed = defaults.playbackSpeed;
          this.plugin.settings.opacity = defaults.opacity;
          this.plugin.settings.zIndex = defaults.zIndex;
          this.plugin.settings.blurRadius = defaults.blurRadius;
          this.plugin.settings.brightness = defaults.brightness;
          this.plugin.settings.mobileBackgroundHeight = defaults.mobileBackgroundHeight;
          this.plugin.settings.mobileBackgroundWidth = defaults.mobileBackgroundWidth;

          await this.plugin.saveSettings();
          this.plugin.applyWallpaper();
          this.display();
        })
      );
      const advancedSection = containerEl.createDiv();

      new Setting(advancedSection)
        .setName('Experimental options')
        .setHeading();

      new Setting(advancedSection)
        .setName('fine-tune advanced transparency settings to seamlessly integrate your wallpaper. these experimental features allow for deeper customization but may require css knowledge.');

      const toggleAdvancedButton = advancedSection.createEl("button", {
        text: this.plugin.settings.AdnvOpend ? "Disable experimental settings" : "Enable experimental settings",
      });

      const advancedOptionsContainer = advancedSection.createDiv();
      advancedOptionsContainer.style.display = this.plugin.settings.AdnvOpend ? 'block' : 'none';

      toggleAdvancedButton.onclick = () => {
        this.plugin.settings.AdnvOpend = !this.plugin.settings.AdnvOpend;
        advancedOptionsContainer.style.display = this.plugin.settings.AdnvOpend ? "block" : "none";
        toggleAdvancedButton.setText(this.plugin.settings.AdnvOpend ? "Hide advanced options" : "Show advanced options");
        this.plugin.toggleModalStyles();
        this.plugin.settings.opacity = 80;
        this.plugin.applyWallpaper();
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


      const tableContainer = advancedOptionsContainer.createEl("div", { cls: "text-arena-table-container" });
      const table = tableContainer.createEl("table", { cls: "text-arena-table" });

      const thead = table.createEl("thead");
      const headerRow = thead.createEl("tr");
      headerRow.createEl("th", { text: "Target element (CSS selector)" });
      headerRow.createEl("th", { text: "Attribute to modify" });

      const tbody = table.createEl("tbody");

      this.plugin.settings.TextArenas.forEach((entry, index) => {
        const row = tbody.createEl("tr");

        const targetCell = row.createEl("td");
        new Setting(targetCell).addText(text => {
          text.setValue(entry.target).onChange(value => {
            this.plugin.settings.TextArenas[index].target = value;
            this.plugin.saveSettings();
          });
        });

        const attrCell = row.createEl("td");
        new Setting(attrCell).addText(text => {
          text.setValue(entry.attribute).onChange(value => {
              this.plugin.RemoveChanges(index);
              this.plugin.settings.TextArenas[index].attribute = value;
              this.plugin.saveSettings();
              this.plugin.ApplyChanges(index);
          });
        });

        const actionCell = row.createEl("td");
        new Setting(actionCell).addExtraButton(btn => {
          btn.setIcon("cross")
            .setTooltip("Remove this entry")
            .onClick(() => {
              this.plugin.RemoveChanges(index);
              this.plugin.settings.TextArenas.splice(index, 1);
              this.plugin.saveSettings();
              this.display();
            });
        });
      });

      new Setting(advancedOptionsContainer).addButton(btn =>
        btn.setButtonText("Add new element")
          .setClass('text-arena-center-button')
          .setTooltip("Add a new row to the table")
          .onClick(() => {
            this.plugin.settings.TextArenas.push({ target: "", attribute: "" });
            this.display();
          })
      ); 
      let colorPickerRef: any = null;

      const colorSetting = new Setting(advancedOptionsContainer)
        .setName('Custom background color')
        .setDesc('Set a custom color for the plugin\'s styling logic')
        .addColorPicker(picker => {
          colorPickerRef = picker; 
          picker
            .setValue(this.plugin.settings.Color || '#000000')
            .onChange(async value => {
              this.plugin.settings.Color = value;
              await this.plugin.saveSettings();
              this.plugin.applyBackgroundColor();
            });
        })
        .addExtraButton(btn => 
          btn
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
              this.plugin.settings.Color = '';
              await this.plugin.saveSettings();
              this.plugin.applyBackgroundColor();
              if (colorPickerRef) {
                colorPickerRef.setValue('#000000'); 
              }
            })
        );  
    }
}