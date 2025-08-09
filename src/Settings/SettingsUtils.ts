import { Notice } from "obsidian";
import LiveWallpaperPlugin from "../main";
import Scheduler from "../Scheduler";

export async function getWallpaperPath(plugin: LiveWallpaperPlugin,anyOptionEnabled: boolean,): Promise<string> {
	const settings = plugin.settings;
	let path = "";
	if (!anyOptionEnabled) {
		path = `${plugin.app.vault.configDir}/${settings.wallpaperPath}`;
	} 
  	else {
		const isWeek = settings.scheduledWallpapers.options.weekly;
		const paths = isWeek
			? settings.scheduledWallpapers.wallpaperWeekPaths
			: settings.scheduledWallpapers.wallpaperDayPaths;

		const index = Scheduler.applyScheduledWallpaper(
			paths,
			settings.scheduledWallpapers.options,
		);

		if (index !== null) {
			const selectedPath = paths[index];
			path = `${plugin.app.vault.configDir}/${selectedPath}`;
			settings.wallpaperPath = selectedPath;
			await plugin.saveSettings();
		} 
    else {
			new Notice("No wallpaper path set.");
			settings.wallpaperPath = "";
			await plugin.saveSettings();
			return "";
		}
	}

	return path;
}
export async function getPathExists(plugin: LiveWallpaperPlugin, relativePath: string): Promise<boolean> {
  if (!relativePath || relativePath.trim() === "") {
    return false;
  }

  const fullPath = `${plugin.app.vault.configDir}/${relativePath}`;
  return await wallpaperExists(plugin, fullPath);
}

export async function wallpaperExists(
	plugin: LiveWallpaperPlugin,
	path: string,
): Promise<boolean> {
	return await plugin.app.vault.adapter.exists(path);
}
export function applyImagePosition(element: HTMLImageElement | HTMLVideoElement,posXPercent: number,posYPercent: number) {
  const container = element.parentElement!;
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  const naturalWidth = element instanceof HTMLImageElement
    ? element.naturalWidth
    : element.videoWidth;
  const naturalHeight = element instanceof HTMLImageElement
    ? element.naturalHeight
    : element.videoHeight;

  const scale = Math.max(containerWidth / naturalWidth, containerHeight / naturalHeight);

  const scaledWidth = naturalWidth * scale;
  const scaledHeight = naturalHeight * scale;

  const maxOffsetX = (scaledWidth - containerWidth) / 2;
  const maxOffsetY = (scaledHeight - containerHeight) / 2;

  const offsetX = (posXPercent - 50) / 50 * maxOffsetX;
  const offsetY = (posYPercent - 50) / 50 * maxOffsetY;

  element.style.width = `${scaledWidth}px`;
  element.style.height = `${scaledHeight}px`;
  element.style.objectFit = 'cover';
  element.style.position = 'absolute';
  element.style.left = `${containerWidth / 2 - scaledWidth / 2 + offsetX}px`;
  element.style.top = `${containerHeight / 2 - scaledHeight / 2 + offsetY}px`;
}
