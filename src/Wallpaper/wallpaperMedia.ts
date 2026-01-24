import type LiveWallpaperPlugin from "../main";
import type { WallpaperConfig } from "../main";
export async function createMediaElement(doc: Document, plugin: LiveWallpaperPlugin): Promise<HTMLImageElement | HTMLVideoElement | null> 
{
    const { currentWallpaper } = plugin.settings;
    const isVideo = currentWallpaper.type === 'video';

    const media = isVideo
    ? doc.createElement('video')
    : doc.createElement('img');

    media.id = 'live-wallpaper-media';

    if (media instanceof HTMLImageElement) {
    media.loading = "lazy";
    }

    const path = `${plugin.app.vault.configDir}/${currentWallpaper.path}`;
    const exists = await plugin.app.vault.adapter.exists(path);

    if (!exists) {
        currentWallpaper.path = '';
        return null;
    }
    media.src = plugin.app.vault.adapter.getResourcePath(path);

    applyMediaStyles(media, currentWallpaper);

    if (isVideo) {
        const video = media as HTMLVideoElement;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playbackRate = currentWallpaper.playbackSpeed;
    }

    return media;
}
export function applyMediaStyles(media: HTMLImageElement | HTMLVideoElement,config: WallpaperConfig) {
    media.removeAttribute("style");
    Object.assign(media.style, {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: config.useObjectFit ? 'unset' : 'cover',
            ...(config.Reposition && {
                objectPosition: config.position,
            })
    });

    if (config.Quality) {
        Object.assign(media.style, {
            imageRendering: 'auto',
            willChange: 'transform',
            overflowClipMargin: 'unset',
            overflow: 'clip',
        });
    }
}