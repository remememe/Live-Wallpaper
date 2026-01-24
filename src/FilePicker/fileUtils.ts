import type LiveWallpaperPlugin from "../main";
import WallpaperConfigUtils from "../WallpaperConfigUtils";
export async function removeFileIfUnused(plugin: LiveWallpaperPlugin,index: number,filetoRemoveName: string) {
  const matches = WallpaperConfigUtils.getPaths(index,plugin.settings.WallpaperConfigs).filter(
    file => file.split("/").pop() === filetoRemoveName.split("/").pop()
  );
  if (matches.length !== 1) return;
  await plugin.app.vault.adapter.remove(`.obsidian/${filetoRemoveName}`).catch(() => {});
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