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
