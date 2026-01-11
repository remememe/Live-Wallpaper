import LiveWallpaperPlugin from '../main';
import { waitForMediaDimensions, GetConfig } from './mediaUtils';
import { applyContainerEffects } from './wallpaperDom';
import { createMediaElement } from './wallpaperMedia';
import { Notice } from 'obsidian';
import SettingsUtils from "../Settings/SettingsUtils";
export default class WallpaperApplier {
	public static async applyWallpaper(Plugin: LiveWallpaperPlugin,skipConfigReload = false,doc: Document): Promise<boolean> {
        const config = await GetConfig(Plugin, skipConfigReload);

        if (!config) {
            return false;
        }

        Plugin.settings.currentWallpaper = config;
		if (Plugin.settings.ScheduledOptions.dayNightMode || Plugin.settings.ScheduledOptions.autoSwitch) {
			Plugin.startDayNightWatcher();
		} 
		else {
			Plugin.stopDayNightWatcher();
		}
		if (!Plugin.settings.currentWallpaper || !Plugin.settings.currentWallpaper.path) 
		{
			new Notice("No wallpaper path defined, skipping applyWallpaper.");
			return false;
		}

		const newPath: string | null = Plugin.settings.currentWallpaper.path;
		const newType: "image" | "video" | "gif" = Plugin.settings.currentWallpaper.type;
		const container = doc.getElementById("live-wallpaper-container") as HTMLDivElement;
		let media = doc.getElementById("live-wallpaper-media") as | HTMLImageElement | HTMLVideoElement;
		if (container && media) {
			applyContainerEffects(container,Plugin.settings.currentWallpaper,Plugin.settings.AdnvOpend);

			if (media.tagName === "VIDEO") {
				const video = media as HTMLVideoElement;
				video.playbackRate = Plugin.settings.currentWallpaper.playbackSpeed;
			}
			
			if (newPath !== Plugin.lastPath || newType !== Plugin.lastType) {
				const newMedia = await createMediaElement(doc,Plugin);
				if (newMedia) {
					newMedia.style.opacity = "0";
					newMedia.style.transition = "opacity 1s ease-in-out";
					container.appendChild(newMedia);

					await new Promise<void>((resolve) =>
						requestAnimationFrame(() => resolve()),
					);

					await new Promise((resolve) => setTimeout(resolve, 20));

					const medias = container.querySelectorAll(
						'[id^="live-wallpaper-media"]',
					);
					await waitForMediaDimensions(newMedia);
					medias.forEach((el, i) => {
						if (i < medias.length - 1) {
							const htmlEl = el as HTMLElement;

							htmlEl.style.transition = "opacity 1s ease-in-out";
							htmlEl.style.opacity = "0";
							newMedia.style.opacity = "1";

							setTimeout(() => {
								if (htmlEl.parentElement) {
									htmlEl.remove();
								}
							}, 3000);
						}
					});

					media = newMedia;
				}
			}
			if (Plugin.settings.currentWallpaper.Reposition) {
				await waitForMediaDimensions(media);
				SettingsUtils.applyImagePosition(
					media,
					Plugin.settings.currentWallpaper.positionX,
					Plugin.settings.currentWallpaper.positionY,
					Plugin.settings.currentWallpaper.Scale,
				);
			}
			return true;
		}
		await Plugin.CreateMedia(doc);
		return true;
	}
}
