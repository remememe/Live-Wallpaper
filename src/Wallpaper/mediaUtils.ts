import type LiveWallpaperPlugin from "../main";
import type { WallpaperConfig } from "../main";
import WallpaperConfigUtils from "../WallpaperConfigUtils";

export function UpdatePaths(plugin: LiveWallpaperPlugin,Args: {path: string, type: 'image' | 'video' | 'gif'})
{
    plugin.lastPath = Args.path;
    plugin.lastType = Args.type;
}
export async function GetConfig(plugin: LiveWallpaperPlugin,skipConfigReload: boolean): Promise<WallpaperConfig | undefined> {
    try {
        if (skipConfigReload) {
            return plugin.settings.currentWallpaper;
        }

        return await WallpaperConfigUtils.GetCurrentConfig(plugin);
    } 
    catch (err) {
        console.error("Error while accessing wallpaper config:", err);
        return undefined;
    }
}
export function GetFileName(FilePath: string): string {
    return FilePath.substring(FilePath.lastIndexOf('/') + 1);
}
export async function waitForMediaDimensions(element: HTMLImageElement | HTMLVideoElement,timeout = 2000): Promise<void> {
    if (element instanceof HTMLImageElement) {
        if (element.complete && element.naturalWidth > 0) return;
    } 
    else {
        if (element.videoWidth > 0) return;
    }

    return Promise.race([
    new Promise<void>((resolve) => {
        if (element instanceof HTMLImageElement) {
        element.addEventListener('load', () => resolve(), { once: true });
        element.addEventListener('error', () => resolve(), { once: true });
        } else {
        element.addEventListener('loadedmetadata', () => resolve(), { once: true });
        element.addEventListener('error', () => resolve(), { once: true });
        }
    }),

    new Promise<void>((resolve) =>
        setTimeout(() => resolve(), timeout)
    )
    ]);
}