import { resizeImageToBlob } from "./imageProcessing";
import type LiveWallpaperPlugin from "../main";
export async function saveUnder(plugin: LiveWallpaperPlugin, baseDir: string, subfolder: string, fileName: string, arrayBuffer: ArrayBuffer): Promise<string> {
    const dir = `${baseDir}/${subfolder}`;
    await plugin.app.vault.adapter.mkdir(dir);
    const fullPath = `${dir}/${fileName}`;
    await plugin.app.vault.adapter.writeBinary(fullPath, arrayBuffer);
    return `plugins/${plugin.manifest.id}/wallpapers/${subfolder}/${fileName}`;
  }
export async function getFileArrayBuffer(file: File,options: {maxWidth: number;mobileBackgroundWidth: string; allowFullRes: boolean;}): Promise<ArrayBuffer> {
    if (file.type.startsWith('image/')) {
        const blob = await resizeImageToBlob(file, options);
        return blob.arrayBuffer();
    }
    return file.arrayBuffer();
}