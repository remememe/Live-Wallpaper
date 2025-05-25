import { Plugin, PluginSettingTab, Setting, App } from 'obsidian';
interface LiveWallpaperPluginSettings {
  wallpaperPath: string;
  wallpaperType: 'image' | 'video' | 'gif';
  playbackSpeed: number;
  opacity: number;
  zIndex: number;
  blurRadius: number;       
  brightness: number;     
}

const DEFAULT_SETTINGS: LiveWallpaperPluginSettings = {
  wallpaperPath: '',
  wallpaperType: 'image',
  playbackSpeed: 1.0,
  opacity: 40,
  zIndex: 0,
  blurRadius: 8,            
  brightness: 100,         
};
export default class LiveWallpaperPlugin extends Plugin {
  settings: LiveWallpaperPluginSettings = DEFAULT_SETTINGS;
  private lastPath: string | null = null;
  private lastType: 'image' | 'video' | 'gif' | null = null;
  async onload() {
      await this.loadSettings();
      await this.ensureWallpaperFolderExists();
      this.addSettingTab(new LiveWallpaperSettingTab(this.app, this));
      this.applyWallpaper();

      this.registerEvent(
          this.app.workspace.on('css-change', () => this.applyWallpaper())
      );
  }
  async unload()
  {
    this.removeExistingWallpaperElements();
  }
  async loadSettings() {
    this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() };
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
  
private async ensureWallpaperFolderExists(): Promise<void> {
    const wallpaperFolder = `${this.manifest.dir}/wallpaper`;
    await this.app.vault.adapter.mkdir(wallpaperFolder).catch(() => {});
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
        slider
          .setInstant(true)
          .setLimits(0, 80, 1)
          .setValue(this.plugin.settings.opacity)
          .onChange(async v => {
            this.plugin.settings.opacity = v;
            valueEl.textContent = ` ${v}%`;
            await this.plugin.saveSettings();
            this.plugin.applyWallpaper();
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
        slider
          .setInstant(true)
          .setLimits(-10, 100, 1)
          .setValue(this.plugin.settings.zIndex)
          .onChange(async v => {
            this.plugin.settings.zIndex = v;
            valueEl.textContent = ` ${v}`;
            await this.plugin.saveSettings();
            this.plugin.applyWallpaper();
          });
      });
      new Setting(containerEl)
      .setName('Reset options')
      .setDesc('Resets all settings')
      .addButton(Button =>
        Button.setButtonText('Reset').onClick(async () => {
          this.plugin.settings = {...DEFAULT_SETTINGS};
          await this.plugin.saveSettings(); 
          this.plugin.applyWallpaper(); 
          this.display();
        })
      );
  }
}