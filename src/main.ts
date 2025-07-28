import { Plugin, PluginSettingTab, Setting, App, ColorComponent,Platform, livePreviewState} from 'obsidian';
import { LiveWallpaperSettingManager } from './Settings/SettingsManager'
import Scheduler from './Scheduler';
export interface ScheduledWallpapersOptions {
  dayNightMode: boolean;
  weekly: boolean;
  shuffle: boolean;
  dayStartTime: string;   
  nightStartTime: string; 
}

export interface ScheduledWallpapers {
  wallpaperPaths: string[];
  wallpaperTypes: ('image' | 'video' | 'gif')[];
  options: ScheduledWallpapersOptions;
}
interface TextArenaEntry {
  target: string;
  attribute: string;
}
interface HistoryEntry {
  path: string;
  type: 'image' | 'video' | 'gif';
  fileName: string;
}
interface LiveWallpaperPluginSettings {
  wallpaperPath: string;
  wallpaperType: 'image' | 'video' | 'gif';
  playbackSpeed: number;
  opacity: number;
  zIndex: number;
  blurRadius: number;       
  brightness: number;
  HistoryPaths: HistoryEntry[];
  mobileBackgroundWidth: string;
  mobileBackgroundHeight: string;
  AdnvOpend: boolean;
  TextArenas: TextArenaEntry[];
  Color: string;
  INBUILD: boolean;
  scheduledWallpapers: ScheduledWallpapers;
}

export const DEFAULT_SETTINGS: LiveWallpaperPluginSettings = {
  wallpaperPath: '',
  wallpaperType: 'image',
  playbackSpeed: 1.0,
  opacity: 40,
  zIndex: 5,
  blurRadius: 8,            
  brightness: 100,    
  HistoryPaths: [],
  mobileBackgroundWidth: '100vw',
  mobileBackgroundHeight: '100vh',
  AdnvOpend: false,
  TextArenas: [
      { target: "", attribute: "" }
    ],
  Color: "#000000",
  INBUILD: false,
  scheduledWallpapers: {
    wallpaperPaths: [],
    options: {
      dayNightMode: false,
      weekly: false,
      shuffle: false,
      dayStartTime: "08:00",
      nightStartTime: "20:00"
    },
    wallpaperTypes: [],
  }
};
export default class LiveWallpaperPlugin extends Plugin {
  settings: LiveWallpaperPluginSettings = DEFAULT_SETTINGS;
  private lastPath: string | null = null;
  private lastType: 'image' | 'video' | 'gif' | null = null;
  private _dayNightInterval?: number;
  async onload() {
      await this.loadSettings();
      await this.ensureWallpaperFolderExists();
      const anyOptionEnabled = Object.values(this.settings.scheduledWallpapers.options).some(v => v === true);

      this.toggleModalStyles();
      this.addSettingTab(new LiveWallpaperSettingManager(this.app, this));

      this.ChangeWallpaperContainer();
      this.removeExistingWallpaperElements();
      const newContainer = this.createWallpaperContainer();
      const appContainer = document.querySelector('.app-container');
      if (appContainer) appContainer.insertAdjacentElement('beforebegin', newContainer);
      else document.body.appendChild(newContainer);
      document.body.classList.add('live-wallpaper-active');
      
      if(anyOptionEnabled)
      {
        this.startDayNightWatcher();
        this.applyWallpaper(true);
      }
      else
      {
        this.applyWallpaper(false);
      }
      this.registerEvent(
        this.app.workspace.on("css-change", () => {
          const el = document.getElementById("live-wallpaper-container");
          if (el) this.applyWallpaper(anyOptionEnabled);
        })
      );
      await this.applyBackgroundColor();
  }
  async unload()
  {
    await this.clearBackgroundColor();
    this.removeExistingWallpaperElements();
    this.RemoveModalStyles();
    this.stopDayNightWatcher();
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
  async applyWallpaper(anyOptionEnabled: boolean) {
    let newPath: string | null = null;
    let newType: 'image' | 'video' | 'gif' = this.settings.wallpaperType;
    if (anyOptionEnabled) {
      const index = Scheduler.applyScheduledWallpaper(
        this.settings.scheduledWallpapers.wallpaperPaths,
        this.settings.scheduledWallpapers.options
      );

      if (index !== null) {
        newPath = this.settings.scheduledWallpapers.wallpaperPaths[index];
        newType = this.settings.scheduledWallpapers.wallpaperTypes[index]; 
        this.settings.wallpaperPath = newPath;
        this.settings.wallpaperType = newType;
        this.startDayNightWatcher();
      } 
      else {
        this.lastPath = this.lastType = null;
        return;
      }
    } 
    else if (!this.settings.wallpaperPath) {
      this.lastPath = this.lastType = null;
      return;
    } 
    else {
      newPath = this.settings.wallpaperPath;
      newType = this.settings.wallpaperType;
    }
    const container = document.getElementById('live-wallpaper-container') as HTMLDivElement;
    let media = document.getElementById('live-wallpaper-media') as HTMLImageElement | HTMLVideoElement;

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
        const newMedia = await this.createMediaElement();
        if (newMedia) {
          if (media && media.parentElement) {
            media.remove();
          }
          container.appendChild(newMedia);
          media = newMedia;
          this.lastPath = newPath;
          this.lastType = newType;
        }
      }
      await this.saveSettings();
      return;
    }
  
    this.removeExistingWallpaperElements();
    const newContainer = this.createWallpaperContainer();
    const newMedia = await this.createMediaElement();
    if (newMedia) {
      newMedia.id = 'live-wallpaper-media';
      newContainer.appendChild(newMedia);
    }
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.insertAdjacentElement('beforebegin', newContainer);
    else document.body.appendChild(newContainer);
    document.body.classList.add('live-wallpaper-active');
    this.lastPath = newPath;
    this.lastType = newType;
  }
  
  private  async ensureWallpaperFolderExists(): Promise<boolean> {
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
  async createMediaElement(): Promise<HTMLImageElement | HTMLVideoElement | null> {
      const isVideo = this.settings.wallpaperType === 'video';
      const media = isVideo
        ? document.createElement('video')
        : document.createElement('img');
      media.id = 'live-wallpaper-media';
      if (media instanceof HTMLImageElement) {
          media.loading = "lazy"; 
      }
      const path = `${this.app.vault.configDir}/${this.settings.wallpaperPath}`;
      const exists = await this.app.vault.adapter.exists(path);

      if (exists) {
        media.src = this.app.vault.adapter.getResourcePath(path);
      } else {
        this.settings.wallpaperPath = '';
        return null;
      }
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
    async openFilePicker(slotIndex?: number) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.jpg,.jpeg,.png,.gif,.mp4,.webm,.avif';
      fileInput.multiple = false;

      fileInput.addEventListener('change', async (event) => {
          const target = event.target as HTMLInputElement;
          if (!target.files || target.files.length === 0) return;

          const file = target.files[0];
          const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm','avif'];
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
              const wallpaperPathRelativeForObsidian = `plugins/${this.manifest.id}/wallpaper/${file.name}`;
              const historyEntry: HistoryEntry = {
                path: wallpaperPathRelativeForObsidian,
                type: this.getWallpaperType(file.name),
                fileName: file.name,
              };
              this.settings.HistoryPaths = this.settings.HistoryPaths.filter(entry => entry.path !== historyEntry.path);
              this.settings.HistoryPaths.unshift(historyEntry);
              if (this.settings.HistoryPaths.length > 5) {
                const toRemove = this.settings.HistoryPaths.slice(5);
                this.settings.HistoryPaths = this.settings.HistoryPaths.slice(0, 5);

                for (const entry of toRemove) {
                  const fileName = entry.fileName;
                  const fullPath = `${this.manifest.dir}/wallpaper/${fileName}`;
                  await this.app.vault.adapter.remove(fullPath).catch(() => {});
                }
              }
              const anyOptionEnabled = Object.values(this.settings.scheduledWallpapers.options).some(v => v === true);
              if (anyOptionEnabled && typeof slotIndex === 'number') {
                  const paths = this.settings.scheduledWallpapers.wallpaperPaths;
                  while (paths.length < 2) paths.push('');

                  const types = this.settings.scheduledWallpapers.wallpaperTypes;
                  while (types.length < 2) types.push('image');

                  paths[slotIndex] = wallpaperPathRelativeForObsidian;
                  types[slotIndex] = this.getWallpaperType(file.name);
              }
              else{
                this.settings.wallpaperPath = wallpaperPathRelativeForObsidian;
                this.settings.wallpaperType = this.getWallpaperType(file.name);
              }
              this.applyWallpaper(anyOptionEnabled);
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
  private startDayNightWatcher() {
    this.stopDayNightWatcher(); 

    this._dayNightInterval = window.setInterval(() => {
      const { wallpaperPaths, options, wallpaperTypes } = this.settings.scheduledWallpapers;
      const index = Scheduler.applyScheduledWallpaper(wallpaperPaths, options);
      if (index !== null && wallpaperPaths[index]) {
        this.settings.wallpaperPath = wallpaperPaths[index];
        this.settings.wallpaperType = wallpaperTypes[index];
        this.applyWallpaper(true);
      }
    }, 10 * 60 * 1000);
  }

  private stopDayNightWatcher() {
    if (this._dayNightInterval) {
      clearInterval(this._dayNightInterval);
      this._dayNightInterval = -1;
    }
  }
  public async cleanInvalidWallpaperHistory() {
    const validPaths = [];

    for (const entry of this.settings.HistoryPaths) {
      const fullPath = `${this.app.vault.configDir}/${entry.path}`;
      const exists = await this.app.vault.adapter.exists(fullPath);

      if (exists) {
        validPaths.push(entry);
      }
    }

    this.settings.HistoryPaths = validPaths;
    await this.saveSettings(); 
  }
}