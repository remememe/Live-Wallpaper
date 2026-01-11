import LiveWallpaperPlugin, { WallpaperConfig } from "../main";
import WallpaperConfigUtils from "../WallpaperConfigUtils";

export function UpdatePaths(Plugin: LiveWallpaperPlugin,Args: {path: string,type: 'image' | 'video' | 'gif'})
{
    Plugin.lastPath = Args.path;
    Plugin.lastType = Args.type;
}
export async function GetConfig(Plugin: LiveWallpaperPlugin,skipConfigReload: boolean): Promise<WallpaperConfig | undefined> {
    try {
        if (skipConfigReload) {
            return Plugin.settings.currentWallpaper;
        }

        return await WallpaperConfigUtils.GetCurrentConfig(Plugin);
    } 
    catch (err) {
        console.error("Error while accessing wallpaper config:", err);
        return undefined;
    }
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