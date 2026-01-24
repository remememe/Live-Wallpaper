import type LiveWallpaperPlugin from '../main';
import { waitForMediaDimensions, GetConfig } from './mediaUtils';
import { applyContainerEffects } from './wallpaperDom';
import { createMediaElement } from './wallpaperMedia';
import { Notice } from 'obsidian';
import SettingsUtils from "../Settings/SettingsUtils";
export default class WallpaperApplier {
	public static async applyWallpaper(plugin: LiveWallpaperPlugin,skipConfigReload = false,doc: Document): Promise<boolean> {
        const config = await GetConfig(plugin, skipConfigReload);
        if (!config) {
            return false;
        }

        plugin.settings.currentWallpaper = config;
		if (plugin.settings.ScheduledOptions.dayNightMode || plugin.settings.ScheduledOptions.autoSwitch) {
			plugin.startDayNightWatcher();
		} 
		else {
			plugin.stopDayNightWatcher();
		}
		if (!plugin.settings.currentWallpaper || !plugin.settings.currentWallpaper.path) 
		{
			new Notice("No wallpaper path defined, skipping applyWallpaper.");
			return false;
		}

		const newPath: string | null = plugin.settings.currentWallpaper.path;
		const newType: "image" | "video" | "gif" = plugin.settings.currentWallpaper.type;
		const container = doc.getElementById("live-wallpaper-container") as HTMLDivElement;
		let media = doc.getElementById("live-wallpaper-media") as | HTMLImageElement | HTMLVideoElement;
		if (container && media) {
			applyContainerEffects(container,plugin.settings.currentWallpaper,plugin.settings.AdnvOpend);
			if (media.tagName === "VIDEO") {
				const video = media as HTMLVideoElement;
				video.playbackRate = plugin.settings.currentWallpaper.playbackSpeed;
			}
			if (newPath !== plugin.lastPath || newType !== plugin.lastType) {
				const newMedia = await createMediaElement(doc,plugin);
				if (newMedia) {
					WallpaperApplier.applyNewMedia(newMedia, container);
					media = newMedia;
				}
			}
			if (plugin.settings.currentWallpaper.Reposition) {
				await SettingsUtils.applyImagePosition(
					media,
					plugin.settings.currentWallpaper.positionX,
					plugin.settings.currentWallpaper.positionY,
					plugin.settings.currentWallpaper.Scale,
				);
			}
			return true;
		}
		await plugin.CreateMedia(doc);
		return true;
	}
	public static async applyNewMedia(newMedia: HTMLImageElement | HTMLVideoElement,container: HTMLDivElement)
	{
		await waitForMediaDimensions(newMedia);
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
	}
}
