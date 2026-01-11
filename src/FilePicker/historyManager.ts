import LiveWallpaperPlugin from "../main";
import { HistoryEntry } from "../main";
export function prependHistory(history: HistoryEntry[],entry: HistoryEntry): HistoryEntry[] {
    return [
        entry,
        ...history.filter(e => e.path !== entry.path)
    ];
}   

export async function trimHistory(plugin: LiveWallpaperPlugin,max: number) {
    const over = plugin.settings.HistoryPaths.length - max;
    if (over <= 0) return;

    const toRemove = plugin.settings.HistoryPaths.slice(max);
    plugin.settings.HistoryPaths =
    plugin.settings.HistoryPaths.slice(0, max);

    for (const e of toRemove) {
        const full = `${plugin.app.vault.configDir}/${e.path}`;
        await plugin.app.vault.adapter.remove(full).catch(() => {});
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