import {defaultWallpaper} from "./main";
export default class Migrate {
    static async migrateOldSettings(Plugin: any) {
        const settings = Plugin.settings;
        const scheduled = Plugin.settings.scheduledWallpapers;

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

        const pluginDir = `${Plugin.app.vault.configDir}/plugins/${Plugin.manifest.id}`;
        const oldDir = `${pluginDir}/wallpaper`;

        const exists = await Plugin.app.vault.adapter.exists(oldDir);
        if (exists) {
            const oldFolder = `${Plugin.app.vault.configDir}/plugins/${Plugin.manifest.id}/wallpaper`;
            try {
            await Plugin.app.vault.adapter.rmdir(oldFolder, true);
            } 
            catch (err) {
            console.error("Could not remove old wallpaper folder:", err);
            }
        }

        if (!Array.isArray(settings.WallpaperConfigs)) {
            settings.WallpaperConfigs = Array.from({ length: 10 }, (_, i) => ({
            ...defaultWallpaper,
            Index: i,
            }));
        } 
        else if (settings.WallpaperConfigs.length < 10) {
            for (let i = settings.WallpaperConfigs.length; i < 10; i++) {
            settings.WallpaperConfigs.push({ ...defaultWallpaper, Index: i });
            }
        }
        if(settings.wallpaperPath)
        {
            const path = settings.wallpaperPath;
            const oldConfig = Plugin.settings.WallpaperConfigs[0] ?? {};
            settings.WallpaperConfigs[0] = {
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
            Plugin.settings.globalConfig.config = {
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
                if (slotIndex < settings.WallpaperConfigs.length) {
                const oldConfig = settings.WallpaperConfigs[slotIndex] ?? {};
                settings.WallpaperConfigs[slotIndex] = {
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
                if (slotIndex < settings.WallpaperConfigs.length) {
                const oldConfig = settings.WallpaperConfigs[slotIndex] ?? {};
                settings.WallpaperConfigs[slotIndex] = {
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
    static isValidWallpaperType(t: any): t is 'image' | 'video' | 'gif' {
        return ['image', 'video', 'gif'].includes(t);
    }
}
