import { debounce } from "obsidian";
import LiveWallpaperPlugin from "../main";
export default class SettingsUtils {
	static resizeHandler: (() => void) | null = null;
	static AttributeValid(attribute: string): boolean {
		const attr = attribute.trim();
		if (attr === "") return false;
		if (attr.startsWith("--")) return true;
		return false;
	}

	static TargetValid(target: string): boolean {
		const trimmed = target.trim();
		if (trimmed === "") return false;

		try {
			document.createDocumentFragment().querySelector(trimmed);
			return true;
		} catch {
			return false;
		}
	}
	static async getWallpaperPath(plugin: LiveWallpaperPlugin,Index: number): Promise<string> {
		const settings = plugin.settings;
		const baseDir = plugin.app.vault.configDir;
		let path = "";
		const config = settings.WallpaperConfigs[Index];
		path = `${baseDir}/${config.path}`;
		return path;
	}

	static async getPathExists(plugin: LiveWallpaperPlugin,relativePath: string): Promise<boolean> {
		if (!relativePath || relativePath.trim() === "") {
			return false;
		}

		const fullPath = `${plugin.app.vault.configDir}/${relativePath}`;
		return await this.wallpaperExists(plugin, fullPath);
	}

	static async wallpaperExists(plugin: LiveWallpaperPlugin,path: string): Promise<boolean> {
		return await plugin.app.vault.adapter.exists(path);
	}
	static async applyImagePosition(element: HTMLImageElement | HTMLVideoElement,posXPercent: number,posYPercent: number,scaleFactor: number) {
		if (element.parentElement === null) return;
		const container = element.parentElement!;
		const containerWidth = container.clientWidth;
		const containerHeight = container.clientHeight;
		const isImage = element.tagName === "IMG";

		const naturalWidth = isImage
			? (element as HTMLImageElement).naturalWidth
			: (element as HTMLVideoElement).videoWidth;

		const naturalHeight = isImage
			? (element as HTMLImageElement).naturalHeight
			: (element as HTMLVideoElement).videoHeight;

		const minScale = Math.max(
			containerWidth / naturalWidth,
			containerHeight / naturalHeight,
		);

		const scale = Math.max(minScale, minScale * scaleFactor);

		const scaledWidth = naturalWidth * scale;
		const scaledHeight = naturalHeight * scale;

		const maxOffsetX = (scaledWidth - containerWidth) / 2;
		const maxOffsetY = (scaledHeight - containerHeight) / 2;

		const offsetX = ((posXPercent - 50) / 50) * maxOffsetX;
		const offsetY = ((posYPercent - 50) / 50) * maxOffsetY;
		element.style.width = `${scaledWidth}px`;
		element.style.height = `${scaledHeight}px`;
		element.style.objectFit = "cover";
		element.style.position = "absolute";
		element.style.left = `${containerWidth / 2 - scaledWidth / 2 + offsetX}px`;
		element.style.top = `${containerHeight / 2 - scaledHeight / 2 + offsetY}px`;
	}
	static enableReposition(plugin: LiveWallpaperPlugin,doc: Document) {
		if (this.resizeHandler) return;
		this.resizeHandler = () => {
			const media = doc.getElementById("live-wallpaper-media") as
				| HTMLImageElement
				| HTMLVideoElement;
			if (!media) return;
			if (!plugin.settings.currentWallpaper.Reposition) {
				plugin.applyMediaStyles(media);
				return;
			}
			this.applyImagePosition(
				media,
				plugin.settings.currentWallpaper.positionX ?? 50,
				plugin.settings.currentWallpaper.positionY ?? 50,
				plugin.settings.currentWallpaper.Scale ?? 1,
			);
		};
		doc.win.addEventListener("resize", this.resizeHandler);
	}

	static disableReposition(window: Window) {
		if (!this.resizeHandler) return;
		window.removeEventListener("resize", this.resizeHandler);
		this.resizeHandler = null;
	}
	static SaveSettingsDebounced(plugin: LiveWallpaperPlugin) {
		return debounce(async () => {
			await plugin.saveSettings();
		}, 300);
	}
	static ApplyWallpaperDebounced(plugin: LiveWallpaperPlugin) {
		return debounce(async (skipConfigReload: boolean = false) => {
			for (const win of plugin.windows) {
				await plugin.applyWallpaper(skipConfigReload,win.document);
            }
			plugin.apply(plugin.settings.currentWallpaper.path,plugin.settings.currentWallpaper.type);
		}, 300);
	}
}
