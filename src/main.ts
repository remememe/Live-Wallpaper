import { Plugin,Platform, Notice } from 'obsidian';
import { LiveWallpaperSettingManager} from './Settings/SettingsManager'
import SettingsUtils from './Settings/SettingsUtils'
import Scheduler from './Scheduler';
import WallpaperConfigUtils from './WallpaperConfigUtils';
export type ModalEffect = 'none' | 'blur' | 'dim' | 'blur+dim';

const defaultWallpaper: WallpaperConfig = {
  path: '',
  type: 'image',
  zIndex: 5,
  opacity: 40,
  brightness: 100,
  blurRadius: 8,
  contrast: 100,
  playbackSpeed: 1.0,
  Reposition: false,
  Quality: false,
  useObjectFit: true,
  position: "Center",
  positionX: 50,
  positionY: 50,
  Scale: 1,
  Index: 0,
};
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
interface ModalStyleSettings {
  effect: ModalEffect;   
  blurRadius: number;    
  dimOpacity: number;    
  dimColor: "black" | "white";
  disableModalBg: boolean;
}
interface TextArenaEntry {
  attribute: string;
}
interface HistoryEntry {
  path: string;
  type: 'image' | 'video' | 'gif';
  fileName: string;
}
export interface WallpaperConfig {
  path: string;
  type: 'image' | 'video' | 'gif';
  zIndex: number;
  opacity: number;
  brightness: number;
  blurRadius: number;
  contrast: number; 
  playbackSpeed: number;
  Reposition: boolean;
  Quality: boolean; 
  useObjectFit: boolean;
  position: string;
  positionX: number;
  positionY: number;
  Scale: number;
  Index: number;
}
interface LiveWallpaperPluginSettings {
  LatestVersion: string;
  currentWallpaper: WallpaperConfig; 
  globalConfig: {
    config: WallpaperConfig;
    enabled: boolean;
  };
  Preview: boolean;
  WallpaperConfigs: WallpaperConfig[];
  HistoryPaths: HistoryEntry[]; 
  mobileBackgroundWidth: string;
  mobileBackgroundHeight: string; 
  AdnvOpend: boolean;
  modalStyle: ModalStyleSettings; 
  TextArenas: TextArenaEntry[]; 
  Color: string;
  INBUILD: boolean;
  SizeLimited: boolean;
  ScheduledOptions: ScheduledWallpapersOptions;
  migrated?: boolean; 
}
export const DEFAULT_SETTINGS: LiveWallpaperPluginSettings = {
  LatestVersion: '1.5.3',

  currentWallpaper: defaultWallpaper,
  globalConfig: {
    config: defaultWallpaper,
    enabled: true,
  },
  Preview: false,
  WallpaperConfigs: Array.from({ length: 10 }, (_, i) => ({...defaultWallpaper,Index: i,})),
  HistoryPaths: [],
  mobileBackgroundWidth: '100vw',
  mobileBackgroundHeight: '100vh',
  AdnvOpend: false,

  modalStyle: {
    effect: 'blur+dim',
    blurRadius: 10,
    dimOpacity: 0.7,
    dimColor: "black",
    disableModalBg: false
  },

  TextArenas: [
    { attribute: "" }
  ],

  Color: "#000000",
  INBUILD: false,
  SizeLimited: true,
  ScheduledOptions:
  {
    dayNightMode: false,
    weekly: false,
    shuffle: false,
    dayStartTime: "08:00",
    nightStartTime: "20:00",
    intervalCheckTime: "00:10",
    isCustomInterval: false
  },
  migrated: false
};
export default class LiveWallpaperPlugin extends Plugin {
  settings: LiveWallpaperPluginSettings = DEFAULT_SETTINGS;
  private lastPath: string | null = null;
  private lastType: 'image' | 'video' | 'gif' | null = null;
  private _dayNightInterval?: number;
  public resizeRegistered = false;
  public debouncedSave = SettingsUtils.SaveSettingsDebounced(this);  
  public debouncedApplyWallpaper = SettingsUtils.ApplyWallpaperDebounced(this);
  async onload() 
  {
    await this.loadSettings();
    await this.ensureWallpaperFolderExists();
    if (this.isVersionLess(this.settings.LatestVersion, '1.5.1')) {
      await this.migrateOldSettings();
      this.settings.LatestVersion = '1.5.3';
      await this.saveSettings();
    }
    
    const anyOptionEnabled = Scheduler.Check(this.settings.ScheduledOptions);
    this.settings.currentWallpaper = await WallpaperConfigUtils.GetCurrentConfig(this);

    this.addSettingTab(new LiveWallpaperSettingManager(this.app, this));
    this.ChangeWallpaperContainer();
    this.removeExistingWallpaperElements();
    this.toggleModalStyles();

    const newContainer = this.createWallpaperContainer();
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.insertAdjacentElement('beforebegin', newContainer);
    else document.body.appendChild(newContainer);
    document.body.classList.add('live-wallpaper-active');
    if(anyOptionEnabled)
    {
      this.startDayNightWatcher();
    }
    this.applyWallpaper(false);
  
    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        const el = document.getElementById("live-wallpaper-container");
        if (el) this.applyWallpaper(anyOptionEnabled);
      })
    );
    await this.applyBackgroundColor();
    if (this.settings.currentWallpaper.Reposition) {
      SettingsUtils.enableReposition(this);
      const media = document.getElementById('live-wallpaper-media') as HTMLImageElement | HTMLVideoElement;
      if (media && media.parentElement) {
          const reposition = () => {
              SettingsUtils.applyImagePosition(media,this.settings.currentWallpaper.positionX,this.settings.currentWallpaper.positionY,this.settings.currentWallpaper.Scale);
          };
          const imageLoadHandler = () => {
              reposition();
              media.removeEventListener('load', imageLoadHandler);
          };
          media.addEventListener('load', imageLoadHandler);
      }
    }
  }
  async unload()
  {
    await this.clearBackgroundColor();
    this.removeExistingWallpaperElements();
    this.RemoveModalStyles();
    this.stopDayNightWatcher();
    SettingsUtils.disableReposition();
    document.body.classList.remove('live-wallpaper-active');
    await this.LoadOrUnloadChanges(false);
    super.unload(); 
  }
  async loadSettings() {
    try 
    {
      const loaded = await this.loadData();
      this.settings = { ...DEFAULT_SETTINGS, ...loaded };
    } 
    catch (e) 
    {
      console.error("Live Wallpaper Plugin – loadSettings error:", e);
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
  private isVersionLess(current:string, target:string) {
    const c = current.split('.').map(Number);
    const t = target.split('.').map(Number);

    for (let i = 0; i < t.length; i++) {
      if ((c[i] || 0) < t[i]) return true;
      if ((c[i] || 0) > t[i]) return false;
    }
    return false;
  }
  private async migrateOldSettings() {
    const settings = this.settings as any;
    const scheduled = settings.scheduledWallpapers;

    if (!scheduled || typeof scheduled !== "object") {
      return;
    }
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
      } 
      catch (err) {
        console.error("Could not remove old wallpaper folder:", err);
      }
    }

    if (!Array.isArray(this.settings.WallpaperConfigs)) {
      this.settings.WallpaperConfigs = Array.from({ length: 10 }, (_, i) => ({
        ...defaultWallpaper,
        Index: i,
      }));
    } 
    else if (this.settings.WallpaperConfigs.length < 10) {
      for (let i = this.settings.WallpaperConfigs.length; i < 10; i++) {
        this.settings.WallpaperConfigs.push({ ...defaultWallpaper, Index: i });
      }
    }
    if(settings.wallpaperPath)
    {
      const path = settings.wallpaperPath;
      const oldConfig = this.settings.WallpaperConfigs[0] ?? {};
      this.settings.WallpaperConfigs[0] = {
        ...defaultWallpaper,
        ...oldConfig,
        path,
        type: settings.wallpaperType ?? "image",
        zIndex: settings.zIndex ?? defaultWallpaper.zIndex,
        opacity: settings.opacity ?? defaultWallpaper.opacity,
        playbackSpeed: settings.playbackSpeed ?? defaultWallpaper.playbackSpeed,
        Quality: settings.Quality ?? defaultWallpaper.Quality,
        blurRadius: settings.blurRadius ?? defaultWallpaper.blurRadius,
        Reposition: settings.Reposition ?? defaultWallpaper.Reposition,
        positionX: settings.PositionX ?? defaultWallpaper.positionX,
        positionY: settings.PositionY ?? defaultWallpaper.positionY,
        position: settings.Position ?? defaultWallpaper.position,
        Scale: settings.Scale ?? defaultWallpaper.Scale,
        useObjectFit: settings.useObjectFit ?? defaultWallpaper.useObjectFit,
        Index: 0,
      }
      this.settings.globalConfig.config = {
        ...defaultWallpaper,
        ...oldConfig,
        path,
        type: settings.wallpaperType ?? "image",
        zIndex: settings.zIndex ?? defaultWallpaper.zIndex,
        opacity: settings.opacity ?? defaultWallpaper.opacity,
        playbackSpeed: settings.playbackSpeed ?? defaultWallpaper.playbackSpeed,
        Quality: settings.Quality ?? defaultWallpaper.Quality,
        blurRadius: settings.blurRadius ?? defaultWallpaper.blurRadius,
        Reposition: settings.Reposition ?? defaultWallpaper.Reposition,
        positionX: settings.PositionX ?? defaultWallpaper.positionX,
        positionY: settings.PositionY ?? defaultWallpaper.positionY,
        position: settings.Position ?? defaultWallpaper.position,
        Scale: settings.Scale ?? defaultWallpaper.Scale,
        useObjectFit: settings.useObjectFit ?? defaultWallpaper.useObjectFit,
        Index: 0,
      }
  
    }
    if (scheduled) {

      if (Array.isArray(scheduled.wallpaperDayPaths)) {
        scheduled.wallpaperDayPaths.forEach((path: string, i: number) => {
          const slotIndex = 1 + i;
          if (slotIndex < this.settings.WallpaperConfigs.length) {
            const oldConfig = this.settings.WallpaperConfigs[slotIndex] ?? {};
            this.settings.WallpaperConfigs[slotIndex] = {
              ...defaultWallpaper,
              ...oldConfig,
              path,
              type: scheduled.wallpaperDayTypes?.[i] ?? "image",
              zIndex: settings.zIndex ?? defaultWallpaper.zIndex,
              opacity: settings.opacity ?? defaultWallpaper.opacity,
              playbackSpeed: settings.playbackSpeed ?? defaultWallpaper.playbackSpeed,
              Quality: settings.Quality ?? defaultWallpaper.Quality,
              blurRadius: settings.blurRadius ?? defaultWallpaper.blurRadius,
              Reposition: settings.Reposition ?? defaultWallpaper.Reposition,
              positionX: settings.PositionX ?? defaultWallpaper.positionX,
              positionY: settings.PositionY ?? defaultWallpaper.positionY,
              position: settings.Position ?? defaultWallpaper.position,
              Scale: settings.Scale ?? defaultWallpaper.Scale,
              useObjectFit: settings.useObjectFit ?? defaultWallpaper.useObjectFit,
              Index: slotIndex,
            };
          }
        });
      }

      if (Array.isArray(scheduled.wallpaperWeekPaths)) {
        scheduled.wallpaperWeekPaths.forEach((path: string, i: number) => {
          const slotIndex = 3 + i;
          if (slotIndex < this.settings.WallpaperConfigs.length) {
            const oldConfig = this.settings.WallpaperConfigs[slotIndex] ?? {};
            this.settings.WallpaperConfigs[slotIndex] = {
              ...defaultWallpaper,
              ...oldConfig,
              path,
              type: scheduled.wallpaperWeekTypes?.[i] ?? "image",
              zIndex: settings.zIndex ?? defaultWallpaper.zIndex,
              opacity: settings.opacity ?? defaultWallpaper.opacity,
              playbackSpeed: settings.playbackSpeed ?? defaultWallpaper.playbackSpeed,
              Quality: settings.Quality ?? defaultWallpaper.Quality,
              blurRadius: settings.blurRadius ?? defaultWallpaper.blurRadius,
              Reposition: settings.Reposition ?? defaultWallpaper.Reposition,
              positionX: settings.PositionX ?? defaultWallpaper.positionX,
              positionY: settings.PositionY ?? defaultWallpaper.positionY,
              position: settings.Position ?? defaultWallpaper.position,
              Scale: settings.Scale ?? defaultWallpaper.Scale,
              useObjectFit: settings.useObjectFit ?? defaultWallpaper.useObjectFit,
              Index: slotIndex,
            };
          }
        });
      }

    }

    delete settings.scheduledWallpapers;
    delete settings.scheduled;

    const obsoleteKeys = [
      "wallpaperPath",
      "wallpaperType",
      "playbackSpeed",
      "Quality",
      "Reposition",
      "opacity",
      "zIndex",
      "blurRadius",
      "brightness",
      "PositionX",
      "PositionY",
      "Position",
      "Scale",
      "useObjectFit",
    ];

    for (const key of obsoleteKeys) {
      if (key in settings) {
        delete settings[key];
      }
    }
  }
  private isValidWallpaperType(t: any): t is 'image' | 'video' | 'gif' {
    return ['image', 'video', 'gif'].includes(t);
  }
  public async applyWallpaper(skipConfigReload = false) {
    try {
      if (!skipConfigReload) {
        this.settings.currentWallpaper = await WallpaperConfigUtils.GetCurrentConfig(this);
      }
    } 
    catch (err) {
      console.error("Error while accessing wallpaper config:", err);
      return;
    }
    if(this.settings.ScheduledOptions.dayNightMode)
    {
      this.startDayNightWatcher();
    }
    else {
      this.stopDayNightWatcher();
    }
    if (!this.settings.currentWallpaper || !this.settings.currentWallpaper.path) {
      new Notice("No wallpaper path defined, skipping applyWallpaper.");
      return;
    }
    const newPath: string | null = this.settings.currentWallpaper.path;
    const newType: 'image' | 'video' | 'gif' = this.settings.currentWallpaper.type;

    const container = document.getElementById('live-wallpaper-container') as HTMLDivElement;
    let media = document.getElementById('live-wallpaper-media') as HTMLImageElement | HTMLVideoElement;
    if (container && media) {
      if(this.settings.AdnvOpend)
      {
        Object.assign(container.style, {
          opacity: `1`,
          zIndex: `0`
        });
      }
      else
      {
        Object.assign(container.style, {
          opacity: `${Math.min(this.settings.currentWallpaper.opacity / 100, 0.8)}`,
          zIndex: `${this.settings.currentWallpaper.zIndex}`
        });
      }
      Object.assign(container.style, {
        filter: `blur(${this.settings.currentWallpaper.blurRadius}px) brightness(${this.settings.currentWallpaper.brightness}%) contrast(${this.settings.currentWallpaper.contrast}%)`
      });
      if (media instanceof HTMLVideoElement) {
        media.playbackRate = this.settings.currentWallpaper.playbackSpeed;
      }
      if (newPath !== this.lastPath || newType !== this.lastType) {
        const newMedia = await this.createMediaElement();
        if (newMedia) {
          newMedia.style.opacity = '0';
          newMedia.style.transition = 'opacity 1s ease-in-out';
          container.appendChild(newMedia);

          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

          await new Promise((resolve) => setTimeout(resolve, 20));

          const medias = container.querySelectorAll('[id^="live-wallpaper-media"]');
          await this.waitForMediaDimensions(newMedia);

          medias.forEach((el, i) => {
            if (i < medias.length - 1) {
              const htmlEl = el as HTMLElement;

              htmlEl.style.transition = 'opacity 1s ease-in-out';
              htmlEl.style.opacity = '0';
              newMedia.style.opacity = '1';

              setTimeout(() => {
                if (htmlEl.parentElement) {
                  htmlEl.remove();
                }
              }, 3000);
            }
          });

          media = newMedia;
          this.lastPath = newPath;
          this.lastType = newType;
        }
      }
      if (this.settings.currentWallpaper.Reposition) {
        await this.waitForMediaDimensions(media);
        SettingsUtils.applyImagePosition(
          media,
          this.settings.currentWallpaper.positionX,
          this.settings.currentWallpaper.positionY,
          this.settings.currentWallpaper.Scale
        );
      }
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
    if (this.settings.currentWallpaper.Reposition) {
      await this.waitForMediaDimensions(newMedia!);
      SettingsUtils.applyImagePosition(
        newMedia!,
        this.settings.currentWallpaper.positionX,
        this.settings.currentWallpaper.positionY,
        this.settings.currentWallpaper.Scale
      );
    }
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

  async waitForMediaDimensions(element: HTMLImageElement | HTMLVideoElement): Promise<void> {
    return new Promise((resolve) => {
      if (element instanceof HTMLImageElement) {
        if (element.complete && element.naturalWidth !== 0) {
          resolve();
        } 
        else {
          element.addEventListener("load", () => resolve(), { once: true });
        }
      } 
      else {
        if (element.readyState >= 1 && element.videoWidth !== 0) {
          resolve();
        } 
        else {
          element.addEventListener("loadedmetadata", () => resolve(), { once: true });
        }
      }
    });
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
        overflow: 'hidden',
        pointerEvents: 'none',
        filter: `blur(${this.settings.currentWallpaper.blurRadius}px) brightness(${this.settings.currentWallpaper.brightness}%) contrast(${this.settings.currentWallpaper.contrast}%)`
      });
      if(this.settings.AdnvOpend)
      {
        Object.assign(container.style, {
          opacity: `1`,
          zIndex: `0`
        });
      }
      else
      {
        Object.assign(container.style, {
          opacity: `${Math.min(this.settings.currentWallpaper.opacity / 100, 0.8)}`,
          zIndex: `${this.settings.currentWallpaper.zIndex}`
        });
      }
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
  async createMediaElement(): Promise<HTMLImageElement | HTMLVideoElement | null> 
  {
    const isVideo = this.settings.currentWallpaper.type === 'video';
    const media = isVideo
      ? document.createElement('video')
      : document.createElement('img');
    media.id = 'live-wallpaper-media';
    if (media instanceof HTMLImageElement) {
        media.loading = "lazy"; 
    }
    const path = `${this.app.vault.configDir}/${this.settings.currentWallpaper.path}`;
    const exists = await this.app.vault.adapter.exists(path);
    if (exists) {
      media.src = this.app.vault.adapter.getResourcePath(path);
    } else {
      this.settings.currentWallpaper.path = '';
      return null;
    }
    this.applyMediaStyles(media);
    if (isVideo) {
        (media as HTMLVideoElement).autoplay = true;
        (media as HTMLVideoElement).loop = true;
        (media as HTMLVideoElement).muted = true;
        (media as HTMLVideoElement).playbackRate = this.settings.currentWallpaper.playbackSpeed;
    }
    return media;
  }
  public applyMediaStyles(media: HTMLImageElement | HTMLVideoElement) 
  {
    media.removeAttribute("style");
    if(this.settings.currentWallpaper.Reposition)
    {
      Object.assign(media.style, {
        width: '100%', 
        height: '100%', 
        objectFit: this.settings.currentWallpaper.useObjectFit ? 'unset' : 'cover',
        objectPosition: this.settings.currentWallpaper.position,
        position: 'absolute',
      });
    }
    else
    {
      Object.assign(media.style, {
        width: '100%', 
        height: '100%', 
        objectFit: this.settings.currentWallpaper.useObjectFit ? 'unset' : 'cover',
        position: 'absolute'
      });
    }
    if (this.settings.currentWallpaper.Quality) {
      Object.assign(media.style, {
        imageRendering: 'auto',
        willChange: 'transform',
        overflowClipMargin: 'unset',
        overflow: 'clip',
      });
    }
  }
  async openFilePicker(slotIndex: number, isScheduledPicker = false): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.jpg,.jpeg,.png,.gif,.mp4,.webm,.avif';
      fileInput.multiple = false;
      fileInput.addEventListener("cancel", (event) => {
        resolve();
      });
      fileInput.addEventListener('change', async (event) => {
        const target = event.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) return;

        const file = target.files[0];
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm', 'avif'];
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (!extension || !allowedExtensions.includes(extension)) {
          alert('Unsupported file type!');
          resolve();
          return;
        }

        if (this.settings.SizeLimited && file.size > 12 * 1024 * 1024) {
          alert('File is too large (max 12MB).');
          resolve();
          return;
        }

        try {
          const baseDir = `${this.app.vault.configDir}/plugins/${this.manifest.id}/wallpapers`;
          const arrayBuffer = await this.getFileArrayBuffer(file);
          const targetSubfolder = WallpaperConfigUtils.computeActiveSubfolder(slotIndex);

          let fileName = file.name;
          if (file.type.startsWith('image/') && this.settings.currentWallpaper.Quality) {
            const dotIndex = fileName.lastIndexOf('.');
            fileName =
              dotIndex !== -1
                ? fileName.slice(0, dotIndex) + '_quality' + fileName.slice(dotIndex)
                : fileName + '_quality';
          }

          const activeRelPath = await this.saveUnder(baseDir, `active/${targetSubfolder}`, fileName, arrayBuffer);
          const historyRelPath = await this.saveUnder(baseDir, `history`, fileName, arrayBuffer);

          this.prependHistory({ path: historyRelPath, type: this.getWallpaperType(fileName), fileName });
          await this.trimHistory(5);
          if (slotIndex === 0) {
            const folder = activeRelPath.substring(0, activeRelPath.lastIndexOf('/'));
            await this.removeAllExcept(folder, activeRelPath);
          } 
          else {
            await this.removeFileIfUnused(activeRelPath, this.settings.WallpaperConfigs[slotIndex].path, WallpaperConfigUtils.getPaths(slotIndex,this.settings.WallpaperConfigs));
          }
          if(this.settings.Preview && !isScheduledPicker)
          {
            this.settings.currentWallpaper.path = activeRelPath;
            this.settings.currentWallpaper.type = this.getWallpaperType(fileName);
          }
          if(this.settings.globalConfig.enabled)
          {
            this.settings.globalConfig.config.path = activeRelPath;
            this.settings.globalConfig.config.type = this.getWallpaperType(fileName);
          }
          this.settings.WallpaperConfigs[slotIndex].path = activeRelPath;
          this.settings.WallpaperConfigs[slotIndex].type = this.getWallpaperType(fileName);
          
          await this.applyWallpaper();
          this.debouncedSave();

          resolve();
        } 
        catch (error) {
          alert('Could not save the file. Check disk permissions.');
          console.error(error);
          reject(error);
        }
      });

      fileInput.click();

    });
  }
  private getWallpaperType(filename: string): 'image' | 'video' | 'gif' {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (['mp4', 'webm'].includes(extension || '')) return 'video';
    if (extension === 'gif') return 'gif';
    return 'image';
  }
  private async getFileArrayBuffer(file: File): Promise<ArrayBuffer> {
    if (file.type.startsWith('image/')) {
      const blob = await this.resizeImageToBlob(file,this.settings.currentWallpaper.Quality);
      return blob.arrayBuffer();
    }
    return file.arrayBuffer();
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
  public async removeFileIfUnused(newPath: string | undefined, oldPath: string | undefined, allPaths: string[]) {
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
    const el = document.body.classList.contains("theme-dark") || document.body.classList.contains("theme-light") ? document.body : document.documentElement;
    if(!el) return;
    for (const { attribute } of this.settings.TextArenas) 
    {
      try 
      {
        const attr = attribute?.trim();
        if (!attr) continue;

        const isVar = attr.startsWith("--");
        
        if (isVar) {
          if (load) {
            el.style.setProperty(attr, "transparent", "important");
          } 
          else {
            el.style.removeProperty(attr);
          }
          continue;
        }
        if (load) {
          el.style.setProperty(attr, "transparent", "important");
        } 
        else {
          el.style.removeProperty(attr);
          if (!el.getAttribute("style")) {
            el.removeAttribute("style");
          }
        }
      } 
      catch (error) {
        console.error("Error processing element:", { attribute }, error);
      }
    }
  }
  public ApplyChanges(id: number): void {
    const { attribute } = this.settings.TextArenas[id];
    const attr = attribute.trim();
    const isVar = attr.startsWith("--");
    let el: HTMLElement | null = null;

    if (isVar) {
      el = document.body.classList.contains("theme-dark") || document.body.classList.contains("theme-light")
        ? document.body
        : document.documentElement;
    } 
    else {
      el = document.body; 
    }
    if (!el) return;
    el.style.setProperty(attr, "transparent", "important");
  }
  public async RemoveChanges(id: number, oldAttribute?: string): Promise<void> {
    if (id < 0 || id >= this.settings.TextArenas.length) return;

    const attribute = (oldAttribute ?? this.settings.TextArenas[id].attribute)?.trim();
    const el = document.body.classList.contains("theme-dark") || document.body.classList.contains("theme-light")
      ? document.body
      : document.documentElement;
    if (!attribute || !el) return;

    try {
      el.style.removeProperty(attribute);
      if (!el.getAttribute("style")) {
        el.removeAttribute("style");
      }
    } 
    catch (error) {
      console.error(`Error removing '${attribute}' at index ${id}:`, error);
    }
  }
  public async toggleModalStyles() {
    const styleId = "extrastyles-dynamic-css";
    let style = document.getElementById(styleId) as HTMLStyleElement;

    if (this.settings.AdnvOpend) {
      if (!style) {
        style = document.createElement("style");
        style.id = styleId;
        document.head.appendChild(style);
      }

      const { effect, blurRadius, dimOpacity, dimColor, disableModalBg } = this.settings.modalStyle;

      let background = "transparent";
      let backdrop = "none";
      let extraCss = "";

      if (effect.includes("dim")) {
        const color = dimColor === "white" ? "255, 255, 255" : "0, 0, 0";
        background = `rgba(${color}, ${dimOpacity})`;
      }

      if (effect.includes("blur")) {
        backdrop = `blur(${blurRadius}px)`;
      }

      if (disableModalBg) {
        extraCss += `.modal-bg { opacity: 0 !important; }`;
      }

      style.textContent = `
        .modal-container.mod-dim,
        .modal-container {
          background: ${background};
          backdrop-filter: ${backdrop};
        }
        ${extraCss}
      `;
    } 
    else {
      style?.remove();
    }
    const wallpaperExists = await SettingsUtils.getPathExists(this, this.settings.currentWallpaper.path);
    if (!wallpaperExists) {
      this.LoadOrUnloadChanges(false);
      return;
    }
    else{
      this.LoadOrUnloadChanges(this.settings.AdnvOpend)
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
      if(this.settings.Preview) return;
      const index = WallpaperConfigUtils.getWallpaperIndex(this);
      if (index !== null) {
        if(this.settings.globalConfig.enabled)
        {
          this.settings.currentWallpaper = WallpaperConfigUtils.applyGlobalConfig(this.settings.WallpaperConfigs[index],this.settings.globalConfig.config);
        }
        else
        {
          this.settings.currentWallpaper = this.settings.WallpaperConfigs[index];
        }
        this.applyWallpaper(true);
      }
    },Scheduler.getIntervalInMs(this.settings.ScheduledOptions));
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