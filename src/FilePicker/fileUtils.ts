import type LiveWallpaperPlugin from "../main";
import WallpaperConfigUtils from "../WallpaperConfigUtils";
export async function removeFileIfUnused(plugin: LiveWallpaperPlugin, folderPath: string,fileRemovedName: string) {
  const filesInFolder = await plugin.app.vault.adapter.list(folderPath);

  const matches = filesInFolder.files.filter(
    file => file.split("/").pop() === fileRemovedName.split("/").pop()
  );

  if (matches.length > 1) {
    return;
  }
  if (matches.length === 1) {
    await plugin.app.vault.adapter.remove(matches[0]).catch(() => {});
  }
}
export async function removeUnusedFilesInFolder(plugin: LiveWallpaperPlugin,folderPath: string,index: number,currentPath: string) {
  const filesInFolder = await plugin.app.vault.adapter.list(folderPath);

  const validFileNames = new Set(
    WallpaperConfigUtils
      .getPathAndType(index, plugin.settings.WallpaperConfigs)
      .map(cfg => cfg.path?.split("/").pop())
      .filter((p): p is string => !!p)
  );

  const currentFileName = currentPath?.split("/").pop();

  for (const file of filesInFolder.files) {
    const fileName = file.split("/").pop();
    if (!fileName) continue;
    
    if (fileName === currentFileName) continue;
    
    if (!validFileNames.has(fileName)) {
      await plugin.app.vault.adapter.remove(file).catch(() => {});
    }
  }
}

export async function removeAllExcept(plugin: LiveWallpaperPlugin, dirPath: string, keepFilePath: string): Promise<void> {
  const fullDirPath = `${plugin.app.vault.configDir}/${dirPath}`;
  const files = await plugin.app.vault.adapter.list(fullDirPath).catch(() => null);

  if (!files || !files.files) return;

  for (const file of files.files) {
    if (file !== `${plugin.app.vault.configDir}/${keepFilePath}`) {
      await plugin.app.vault.adapter.remove(file).catch(() => {});
    }
  }
}