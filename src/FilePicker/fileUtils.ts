import LiveWallpaperPlugin from "../main";

export async function removeFileIfUnused(Plugin: LiveWallpaperPlugin, newPath: string | undefined, oldPath: string | undefined, allPaths: string[]) {
  if (!oldPath) return;  
  if (newPath === oldPath) return; 
  const occurrences = allPaths.filter(path => path === oldPath).length;
  if (occurrences <= 1) {
    const fullPath = `${Plugin.app.vault.configDir}/${oldPath}`;
    await Plugin.app.vault.adapter.remove(fullPath).catch(() => {});
  }
}
export async function removeAllExcept(Plugin: LiveWallpaperPlugin, dirPath: string, keepFilePath: string): Promise<void> {
  const fullDirPath = `${Plugin.app.vault.configDir}/${dirPath}`;
  const files = await Plugin.app.vault.adapter.list(fullDirPath).catch(() => null);

  if (!files || !files.files) return;

  for (const file of files.files) {
    if (file !== `${Plugin.app.vault.configDir}/${keepFilePath}`) {
      await Plugin.app.vault.adapter.remove(file).catch(() => {});
    }
  }
}