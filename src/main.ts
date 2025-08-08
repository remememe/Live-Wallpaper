import { Plugin, PluginSettingTab, Setting, App, ColorComponent,Platform, livePreviewState} from 'obsidian';
import { LiveWallpaperSettingManager } from './Settings/SettingsManager'
import Scheduler from './Scheduler';
export interface ScheduledWallpapersOptions {
  dayNightMode: boolean;
  weekly: boolean;
  shuffle: boolean;
  dayStartTime: string;   
  nightStartTime: string;
  intervalCheckTime: string; 
  isCustomInterval: boolean;
}

export interface ScheduledWallpapers {
  wallpaperDayPaths: string[];
  wallpaperWeekPaths: string[];
  wallpaperDayTypes: ('image' | 'video' | 'gif')[];
  wallpaperWeekTypes: ('image' | 'video' | 'gif')[];
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
  Quality: boolean;
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
  Position: string;
  useObjectFit: boolean;
  INBUILD: boolean;
  scheduledWallpapers: ScheduledWallpapers;
  migrated?: boolean; 
}
export const DEFAULT_SETTINGS: LiveWallpaperPluginSettings = {
  wallpaperPath: '',
  wallpaperType: 'image',
  playbackSpeed: 1.0,
  Quality: false,
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
  Position: "Center",
  useObjectFit: true,
  INBUILD: false,
  scheduledWallpapers: {
    wallpaperDayPaths: [],
    wallpaperWeekPaths: [],
    options: {
      dayNightMode: false,
      weekly: false,
      shuffle: false,
      dayStartTime: "08:00",
      nightStartTime: "20:00",
      intervalCheckTime: "00:10",
      isCustomInterval: false
    },
    wallpaperDayTypes: [],
    wallpaperWeekTypes: []
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
      if (!this.settings.migrated) {
        await this.migrateOldSettings();
        this.settings.migrated = true;
        await this.saveSettings();
      }
      const anyOptionEnabled = Scheduler.Check(this.settings.scheduledWallpapers.options);

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
  private async migrateOldSettings() {
    const scheduled = this.settings.scheduledWallpapers;

    if (Array.isArray((scheduled as any).wallpaperPaths)) {
      const oldPaths = (scheduled as any).wallpaperPaths;

      scheduled.wallpaperDayPaths = [oldPaths[0] ?? "", oldPaths[1] ?? ""];
      scheduled.wallpaperWeekPaths = oldPaths.slice(2, 9);

      delete (scheduled as any).wallpaperPaths;
    }
    
    if (Array.isArray((scheduled as any).wallpaperTypes)) {
      const oldTypes = (scheduled as any).wallpaperTypes as ('image' | 'video' | 'gif')[];

      scheduled.wallpaperDayTypes = [
        this.isValidWallpaperType(oldTypes[0]) ? oldTypes[0] : 'image',
        this.isValidWallpaperType(oldTypes[1]) ? oldTypes[1] : 'image'
      ];
      scheduled.wallpaperWeekTypes = oldTypes.slice(2, 9).map(t => t ?? "image");

      delete (scheduled as any).wallpaperTypes;
    }

    const pluginDir = `${this.app.vault.configDir}/plugins/${this.manifest.id}`;
    const oldDir = `${pluginDir}/wallpaper`;

    const exists = await this.app.vault.adapter.exists(oldDir);
    if (exists) {
      const oldFolder = `${this.app.vault.configDir}/plugins/${this.manifest.id}/wallpaper`;
      try {
        await this.app.vault.adapter.rmdir(oldFolder, true);
      } catch (err) {
        console.error("Could not remove old wallpaper folder:", err);
      }
    }
  }
  private isValidWallpaperType(t: any): t is 'image' | 'video' | 'gif' {
    return ['image', 'video', 'gif'].includes(t);
  }
  async applyWallpaper(anyOptionEnabled: boolean) {
    let newPath: string | null = null;
    let newType: 'image' | 'video' | 'gif' = this.settings.wallpaperType;
    if (anyOptionEnabled) {
      const {paths,types} = this.getCurrentWallpaperSet();
      
      const index = Scheduler.applyScheduledWallpaper(paths, this.settings.scheduledWallpapers.options);
      if (index !== null) {
        newPath = paths[index];
        newType = types[index];
        this.settings.wallpaperPath = newPath;
        this.settings.wallpaperType = newType;
        this.startDayNightWatcher();
      } else {
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
          newMedia.style.opacity = '0';
          newMedia.style.transition = 'opacity 1s ease-in-out';
          container.appendChild(newMedia);

          requestAnimationFrame(() => {
            newMedia.style.opacity = '1';
          });

          const medias = container.querySelectorAll('[id^="live-wallpaper-media"]');

          medias.forEach((el, i) => {
            if (i < medias.length - 1) {
              const htmlEl = el as HTMLElement; 

              htmlEl.style.transition = 'opacity 1s ease-in-out';
              htmlEl.style.opacity = '0';

              setTimeout(() => {
                if (htmlEl.parentElement) {
                  htmlEl.remove();
                }
              }, 1000);
            }
          });
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
      this.applyMediaStyles(media);
      if (isVideo) {
          (media as HTMLVideoElement).autoplay = true;
          (media as HTMLVideoElement).loop = true;
          (media as HTMLVideoElement).muted = true;
          (media as HTMLVideoElement).playbackRate = this.settings.playbackSpeed;
      }
      return media;
  }
  public applyMediaStyles(media: HTMLImageElement | HTMLVideoElement) {
    if(this.settings.INBUILD)
    {
      Object.assign(media.style, {
        width: '100%', 
        height: '100%', 
        objectFit: this.settings.useObjectFit ? 'cover' : 'unset',
        objectPosition: this.settings.Position,
        position: 'absolute',
      });
    }
    else
    {
      Object.assign(media.style, {
        width: '100%', 
        height: '100%', 
        objectFit: 'cover',
        position: 'absolute'
      });
    }
    if (this.settings.Quality) {
      Object.assign(media.style, {
        imageRendering: 'auto',
        willChange: 'transform',
        overflowClipMargin: 'unset',
        overflow: 'clip',
      });
    }
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
              const baseDir = `${this.app.vault.configDir}/plugins/${this.manifest.id}/wallpapers`;
              const anyOptionEnabled = Scheduler.Check(this.settings.scheduledWallpapers.options);

              const arrayBuffer = await this.getFileArrayBuffer(file);
              const targetSubfolder = this.computeActiveSubfolder(anyOptionEnabled, slotIndex);
              let fileName = file.name;
              if (file.type.startsWith('image/') && this.settings.Quality) {
                const dotIndex = fileName.lastIndexOf('.');
                if (dotIndex !== -1) {
                  fileName = fileName.slice(0, dotIndex) + '_quality' + fileName.slice(dotIndex);
                } else {
                  fileName = fileName + '_quality';
                }
              }

              const activeRelPath = await this.saveUnder(baseDir, `active/${targetSubfolder}`, fileName, arrayBuffer);

              const historyRelPath = await this.saveUnder(baseDir, `history`, fileName, arrayBuffer);
              
              this.prependHistory({ path: historyRelPath, type: this.getWallpaperType(fileName), fileName });

              await this.trimHistory(5);

              if (anyOptionEnabled && typeof slotIndex === 'number') {
                const { paths, types } = this.getCurrentWallpaperSet();
                await this.removeFileIfUnused(activeRelPath, paths[slotIndex], paths);
                paths[slotIndex] = activeRelPath;
                types[slotIndex] = this.getWallpaperType(fileName);
              } else {
                const folder = activeRelPath.substring(0, activeRelPath.lastIndexOf('/'));
                await this.removeAllExcept(folder, activeRelPath);
                this.settings.wallpaperPath = activeRelPath;
                this.settings.wallpaperType = this.getWallpaperType(fileName);
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
  private async getFileArrayBuffer(file: File): Promise<ArrayBuffer> {
    if (file.type.startsWith('image/')) {
      const blob = await this.resizeImageToBlob(file,this.settings.Quality);
      return blob.arrayBuffer();
    }
    return file.arrayBuffer();
  }

  private computeActiveSubfolder(anyOption: boolean, slotIndex?: number): string {
    if (anyOption && typeof slotIndex === 'number') {
      return this.isWeeklySchedulerEnabled() ? 'weekly' : 'daily';
    }
    return 'normal';
  }
  public async saveUnder(baseDir: string, subfolder: string, fileName: string, arrayBuffer: ArrayBuffer): Promise<string> {
    const dir = `${baseDir}/${subfolder}`;
    await this.app.vault.adapter.mkdir(dir);
    const fullPath = `${dir}/${fileName}`;
    await this.app.vault.adapter.writeBinary(fullPath, arrayBuffer);
    return `plugins/${this.manifest.id}/wallpapers/${subfolder}/${fileName}`;
  }
  private prependHistory(entry: HistoryEntry) {
    this.settings.HistoryPaths = [
      entry,
      ...this.settings.HistoryPaths.filter(e => e.path !== entry.path)
    ];
  }

  private async trimHistory(max: number) {
    const over = this.settings.HistoryPaths.length - max;
    if (over > 0) {
      const toRemove = this.settings.HistoryPaths.slice(max);
      this.settings.HistoryPaths = this.settings.HistoryPaths.slice(0, max);
      for (const e of toRemove) {
        const full = `${this.app.vault.configDir}/${e.path}`;
        await this.app.vault.adapter.remove(full).catch(() => {});
      }
    }
  }
  private async removeFileIfUnused(newPath: string | undefined, oldPath: string | undefined, allPaths: string[]) {
    if (!oldPath) return;  
    if (newPath === oldPath) return; 

    const occurrences = allPaths.filter(path => path === oldPath).length;

    if (occurrences <= 1) {
      const fullPath = `${this.app.vault.configDir}/${oldPath}`;
      await this.app.vault.adapter.remove(fullPath).catch(() => {});
    }
  }
  public async removeAllExcept(dirPath: string, keepFilePath: string): Promise<void> {
    const fullDirPath = `${this.app.vault.configDir}/${dirPath}`;
    const files = await this.app.vault.adapter.list(fullDirPath).catch(() => null);

    if (!files || !files.files) return;

    for (const file of files.files) {
      if (file !== `${this.app.vault.configDir}/${keepFilePath}`) {
        await this.app.vault.adapter.remove(file).catch(() => {});
      }
    }
  }
  private isWeeklySchedulerEnabled(): boolean {
    return this.settings.scheduledWallpapers.options.weekly ? true : false;
  }
  private getCurrentWallpaperSet() {
    const isWeek = this.settings.scheduledWallpapers.options.weekly === true;
    return {
      paths: isWeek
        ? this.settings.scheduledWallpapers.wallpaperWeekPaths
        : this.settings.scheduledWallpapers.wallpaperDayPaths,
      types: isWeek
        ? this.settings.scheduledWallpapers.wallpaperWeekTypes
        : this.settings.scheduledWallpapers.wallpaperDayTypes,
    };
  }
  private async resizeImageToBlob(file: File, allowFullRes = false): Promise<Blob> 
  {
      const img = await createImageBitmap(file);

      let MAX_WIDTH = window.innerWidth;
      if (Platform.isMobile) {
        const parsed = parseInt(this.settings.mobileBackgroundWidth);
        if (!isNaN(parsed)) {
          MAX_WIDTH = parsed;
        }
      }
      if (allowFullRes || img.width <= MAX_WIDTH) {
          return new Blob([await file.arrayBuffer()], { type: file.type });
      }

      const newWidth = MAX_WIDTH;
      const newHeight = (img.height / img.width) * newWidth;

      const canvas = new OffscreenCanvas(newWidth, newHeight);
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const bmp = await createImageBitmap(img, {
        resizeWidth: newWidth,
        resizeHeight: newHeight,
        resizeQuality: 'high'
      });
      ctx.drawImage(bmp, 0, 0, newWidth, newHeight);

      return canvas.convertToBlob({ quality: 0.8, type: 'image/jpeg' });
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
  public startDayNightWatcher() {
    this.stopDayNightWatcher();

    this._dayNightInterval = window.setInterval(() => {
      const {paths,types} = this.getCurrentWallpaperSet();

      const index = Scheduler.applyScheduledWallpaper(paths, this.settings.scheduledWallpapers.options);

      if (index !== null && paths[index]) {
        this.settings.wallpaperPath = paths[index];
        this.settings.wallpaperType = types[index];
        this.applyWallpaper(true);
      }
    },Scheduler.getIntervalInMs(this.settings.scheduledWallpapers.options));
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