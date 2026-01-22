import { LoadOrUnloadChanges } from './Styles/TextArenaStyles';
import { toggleModalStyles, RemoveModalStyles } from './Styles/ModalStyles';
import { applyBackgroundColor, clearBackgroundColor } from './Styles/BackgroundColor';
import { removeAllExcept, removeUnusedFilesInFolder,  } from './FilePicker/fileUtils';
import { prependHistory, trimHistory } from './FilePicker/historyManager';
import { getFileArrayBuffer } from './FilePicker/fileManager';
import { saveUnder } from './FilePicker/fileManager';
import { validateWallpaperFile, getWallpaperType, pickFolderFiles} from './FilePicker/filePicker';
import { waitForMediaDimensions, UpdatePaths } from './Wallpaper/mediaUtils';
import { removeExistingWallpaperElements, createWallpaperContainer, ChangeWallpaperContainer } from './Wallpaper/wallpaperDom';
import { createMediaElement } from './Wallpaper/wallpaperMedia';
import ApplyManager from './Wallpaper/WallpaperApplier';
import { Plugin } from 'obsidian';
import { LiveWallpaperSettingManager } from './Settings/SettingsManager'
import SettingsUtils from './Settings/SettingsUtils'
import Scheduler from './Scheduler';
import WallpaperConfigUtils from './WallpaperConfigUtils';
import Migrate from './MigrationManager';
export type ModalEffect = 'none' | 'blur' | 'dim' | 'blur+dim';

export const defaultWallpaper: WallpaperConfig = {
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
  autoSwitch: boolean;
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
export interface TextArenaEntry {
  attribute: string;
}
export interface HistoryEntry {
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
export interface LiveWallpaperPluginSettings {
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
  LatestVersion: '1.5.8',

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
    autoSwitch: false,
    dayStartTime: "08:00",
    nightStartTime: "20:00",
    intervalCheckTime: "00:10",
    isCustomInterval: false
  },
  migrated: false
};
export default class LiveWallpaperPlugin extends Plugin {
  settings: LiveWallpaperPluginSettings = DEFAULT_SETTINGS;
  private _dayNightInterval?: number;
  public lastPath: string | null = null;
  public lastType: 'image' | 'video' | 'gif' | null = null;
  public windows = new Set<Window>();
  public resizeRegistered = false;
  public debouncedSave = SettingsUtils.SaveSettingsDebounced(this);  
  public debouncedApplyWallpaper = SettingsUtils.ApplyWallpaperDebounced(this);

  async onload() {
    await this.loadSettings();
    await this.ensureWallpaperFolderExists();
    if (this.isVersionLess(this.settings.LatestVersion, '1.5.1')) {
      await Migrate.migrateOldSettings(this as any);
      this.settings.LatestVersion = '1.5.8';
      await this.saveSettings();
    }

    const anyOptionEnabled = Scheduler.Check(this.settings.ScheduledOptions);
    this.settings.currentWallpaper = await WallpaperConfigUtils.GetCurrentConfig(this);

    this.addSettingTab(new LiveWallpaperSettingManager(this.app, this));
    
    this.windows.add(window);
    this.app.workspace.iterateAllLeaves((leaf) => {
      const view = leaf.view;
      const container = view?.containerEl;
      if (!container) return;

      const doc = container.ownerDocument;
      const win = doc.defaultView;

      if (win) {
        this.windows.add(win);
      }
    });
    this.registerEvent(
      this.app.workspace.on('window-open', (win, winWindow) => {
        this.windows.add(winWindow);
        this.initWallpaperForWindow(winWindow.document);
      })
    );

    this.registerEvent(
      this.app.workspace.on('window-close', (win, winWindow) => {
        this.windows.delete(winWindow);
      })
    );
    this.registerEvent(
      this.app.workspace.on('css-change', () => {
        ApplyManager.applyWallpaper(this,anyOptionEnabled, window.document);
      })
    );
    for (const win of this.windows) {
      await this.initWallpaperForWindow(win.document);
    }
    const firstWin = this.windows.values().next().value;
    if (Scheduler.Check(this.settings.ScheduledOptions) && firstWin === window) {
      this.startDayNightWatcher();
    }
  }

  async initWallpaperForWindow(doc: Document) {
    if (!this.settings.currentWallpaper) {
      this.settings.currentWallpaper=this.settings.WallpaperConfigs[0];
    }
    ChangeWallpaperContainer(doc,{width: this.settings.mobileBackgroundWidth,height: this.settings.mobileBackgroundHeight});
    removeExistingWallpaperElements(doc);
    toggleModalStyles(doc,this);

    const newContainer = createWallpaperContainer(doc,this.settings.currentWallpaper,this.settings.AdnvOpend);
    const appContainer = doc.querySelector('.app-container');
    if (appContainer) appContainer.insertAdjacentElement('beforebegin', newContainer);
    else doc.body.appendChild(newContainer);

    doc.body.classList.add('live-wallpaper-active');

    ApplyManager.applyWallpaper(this,false, doc);
    UpdatePaths(this,{path: this.settings.currentWallpaper.path,type: this.settings.currentWallpaper.type});
    await applyBackgroundColor(doc,this.settings.AdnvOpend,this.settings.Color);

    if (this.settings.currentWallpaper.Reposition) {
      SettingsUtils.enableReposition(this,doc);
      const media = doc.getElementById('live-wallpaper-media') as HTMLImageElement | HTMLVideoElement;
      if (media && media.parentElement) {
        const reposition = () => {
          SettingsUtils.applyImagePosition(
            media,
            this.settings.currentWallpaper.positionX,
            this.settings.currentWallpaper.positionY,
            this.settings.currentWallpaper.Scale
          );
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
    for (const win of this.windows) {
      removeExistingWallpaperElements(win.document);
      win.document.body.classList.remove('live-wallpaper-active');
      await clearBackgroundColor(win.document);
      RemoveModalStyles(win.document);
      LoadOrUnloadChanges(win.document,this.settings.TextArenas,false);
      SettingsUtils.disableReposition(win);
    }
    this.windows.clear();
    this.stopDayNightWatcher();
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
  public async ensureWallpaperFolderExists(): Promise<boolean> {
    try {
      const dir = this.manifest.dir;
      if (!dir) throw new Error("manifest.dir is undefined");
      const wallpaperFolder = `${dir}/wallpaper`;
      return await this.app.vault.adapter.exists(wallpaperFolder);
    } 
    catch (e) {
      console.error("Failed to check wallpaper folder:", e);
      return false;
    }
  }
  public async CreateMedia(doc: Document)
  {
    removeExistingWallpaperElements(doc);
    const newContainer = createWallpaperContainer(doc,this.settings.currentWallpaper,this.settings.AdnvOpend);
    const newMedia = await createMediaElement(doc,this);
    if (newMedia) {
      newMedia.id = 'live-wallpaper-media';
      newContainer.appendChild(newMedia);
    }
    const appContainer = doc.querySelector('.app-container');
    if (appContainer) appContainer.insertAdjacentElement('beforebegin', newContainer);
    else doc.body.appendChild(newContainer);
    doc.body.classList.add('live-wallpaper-active');
    if (this.settings.currentWallpaper.Reposition) {
      await waitForMediaDimensions(newMedia!);
      SettingsUtils.applyImagePosition(
        newMedia!,
        this.settings.currentWallpaper.positionX,
        this.settings.currentWallpaper.positionY,
        this.settings.currentWallpaper.Scale
      );
    }
  }
  public async applyWallpaperFile(file: File,slotIndex: number,doc: Document,isScheduledPicker = false): Promise<void> {
    if (!validateWallpaperFile(file, this.settings.SizeLimited)) {
      return;
    }

    const baseDir = `${this.app.vault.configDir}/plugins/${this.manifest.id}/wallpapers`;
    const arrayBuffer = await getFileArrayBuffer(file,{
      maxWidth: doc.win.innerWidth,
      mobileBackgroundWidth: this.settings.mobileBackgroundWidth,
      allowFullRes: this.settings.currentWallpaper.Quality
    });

    const targetSubfolder = WallpaperConfigUtils.computeActiveSubfolder(slotIndex);

    let fileName = file.name;
    if (file.type.startsWith('image/') && this.settings.currentWallpaper.Quality) {
      const dotIndex = fileName.lastIndexOf('.');
      fileName =
        dotIndex !== -1
          ? fileName.slice(0, dotIndex) + '_quality' + fileName.slice(dotIndex)
          : fileName + '_quality';
    }

    const activeRelPath = await saveUnder(
      this,
      baseDir,
      `active/${targetSubfolder}`,
      fileName,
      arrayBuffer
    );

    const historyRelPath = await saveUnder(
      this,
      baseDir,
      `history`,
      fileName,
      arrayBuffer
    );

    this.settings.HistoryPaths = prependHistory(this.settings.HistoryPaths,{ path: historyRelPath, type: getWallpaperType(fileName), fileName });

    await trimHistory(this,5,`${baseDir}/history`);

    if (this.settings.Preview && !isScheduledPicker) {
      this.settings.currentWallpaper.path = activeRelPath;
      this.settings.currentWallpaper.type = getWallpaperType(fileName);
    }

    if (this.settings.globalConfig.enabled) {
      this.settings.globalConfig.config.path = activeRelPath;
      this.settings.globalConfig.config.type = getWallpaperType(fileName);
    }
    this.settings.WallpaperConfigs[slotIndex].path = activeRelPath;
    this.settings.WallpaperConfigs[slotIndex].type = getWallpaperType(fileName);
    for (const win of this.windows) {
      await ApplyManager.applyWallpaper(this,false,win.document);
    }

    if (slotIndex === 0) {
      const folder = activeRelPath.substring(0, activeRelPath.lastIndexOf('/'));
      await removeAllExcept(this, folder, activeRelPath);
    } 
    else {
      const folder = `${baseDir}/active/${targetSubfolder}`;
      await removeUnusedFilesInFolder(this,folder,slotIndex,activeRelPath);
    }
    UpdatePaths(this, {path: activeRelPath, type: getWallpaperType(fileName)});
  }
  public async openFolderPicker(doc: Document): Promise<void> {
    const files = await pickFolderFiles(doc);
    this.settings.WallpaperConfigs = WallpaperConfigUtils.ClearConfigsFromIndex(this.settings.WallpaperConfigs,10);
    if (files === null) return;

    const validFiles = files.filter(f =>
      validateWallpaperFile(f, this.settings.SizeLimited)
    );

    if (validFiles.length === 0) return;

    try {

      const START_INDEX = 10;
      for (let i = 0; i < validFiles.length; i++) {
        const slotIndex = START_INDEX + i;
        this.settings.WallpaperConfigs = WallpaperConfigUtils.NewConfig(this.settings.WallpaperConfigs);
        await this.applyWallpaperFile(validFiles[i], slotIndex, doc, false);
      }

      for (const win of this.windows) {
        await ApplyManager.applyWallpaper(this, false, win.document);
      }

      this.debouncedSave();
    } 
    catch (error) {
      alert("Could not import wallpaper folder.");
      console.error(error);
    }
  }

  public startDayNightWatcher() {
    this.stopDayNightWatcher();
    this._dayNightInterval = window.setInterval(async () => {
      if(this.settings.Preview) return;
      const index = WallpaperConfigUtils.getWallpaperIndex(this);
      if (index !== undefined) {
        if(this.settings.globalConfig.enabled)
        {
          this.settings.currentWallpaper = WallpaperConfigUtils.applyGlobalConfig(this.settings.WallpaperConfigs[index],this.settings.globalConfig.config);
        }
        else
        {
          this.settings.currentWallpaper = this.settings.WallpaperConfigs[index];
        }
        for (const win of this.windows) {
          await ApplyManager.applyWallpaper(this, true, win.document);
        }
        UpdatePaths(this,{path: this.settings.currentWallpaper.path,type: this.settings.currentWallpaper.type});
      }
    },Scheduler.getIntervalInMs(this.settings.ScheduledOptions));
  }

  public stopDayNightWatcher() {
    if (this._dayNightInterval) {
      clearInterval(this._dayNightInterval);
      this._dayNightInterval = -1;
    }
  }
}