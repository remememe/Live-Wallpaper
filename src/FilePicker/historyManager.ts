import type LiveWallpaperPlugin from "../main";
import { HistoryEntry } from "../main";
export function prependHistory(history: HistoryEntry[],entry: HistoryEntry): HistoryEntry[] {
  return [
      entry,
      ...history.filter(e => e.path !== entry.path)
  ];
}   
export async function trimHistory(plugin: LiveWallpaperPlugin,max: number,folderPath: string) {
  const filesInFolder = await plugin.app.vault.adapter.list(folderPath);
  if (filesInFolder.files.length <= max) return;

  const allowed = new Set(
    plugin.settings.HistoryPaths
      .slice(0, max)
      .map(e => e.path.split("/").pop())
      .filter((p): p is string => !!p)
  );

  const toRemove = filesInFolder.files.filter(file => {
    const fileName = file.split("/").pop();
    return fileName && !allowed.has(fileName);
  });

  plugin.settings.HistoryPaths =
    plugin.settings.HistoryPaths.slice(0, max);

  for (const file of toRemove) {
    await plugin.app.vault.adapter.remove(file).catch(() => {});
  }
}
export async function cleanInvalidWallpaperHistory(plugin: LiveWallpaperPlugin) {
  const validPaths = [];

  for (const entry of plugin.settings.HistoryPaths) {
    const fullPath = `${plugin.app.vault.configDir}/${entry.path}`;
    const exists = await plugin.app.vault.adapter.exists(fullPath);

    if (exists) {
      validPaths.push(entry);
    }
  }

  plugin.settings.HistoryPaths = validPaths;
  await plugin.saveSettings(); 
}