import LiveWallpaperPlugin from "../main";
import { LoadOrUnloadChanges } from "./TextArenaStyles";
import SettingsUtils from "../Settings/SettingsUtils";
export async function toggleModalStyles(doc: Document,Plugin: LiveWallpaperPlugin) {
    const styleId = "extrastyles-dynamic-css";
    let style = doc.getElementById(styleId) as HTMLStyleElement;

    if (Plugin.settings.AdnvOpend) {
        if (!style) {
        style = doc.createElement("style");
        style.id = styleId;
        doc.head.appendChild(style);
        }

        const { effect, blurRadius, dimOpacity, dimColor, disableModalBg } = Plugin.settings.modalStyle;

        let background = "transparent";
        let backdrop = "none";
        let extraCss = "";

        if (effect.includes("dim")) {
        const color = dimColor === "white" ? "255, 255, 255" : "0, 0, 0";
        background = `rgba(${color}, ${dimOpacity})`;
        }

        if (effect.includes("blur")) {
        backdrop = `blur(${blurRadius}px)`;
        }

        if (disableModalBg) {
        extraCss += `.modal-bg { opacity: 0 !important; }`;
        }

        style.textContent = `
        .modal-container.mod-dim,
        .modal-container {
            background: ${background};
            backdrop-filter: ${backdrop};
        }
        ${extraCss}
        `;
    } 
    else {
        style?.remove();
    }
    const wallpaperExists = await SettingsUtils.getPathExists(Plugin, Plugin.settings.currentWallpaper.path);
    if (!wallpaperExists) {
        for (const win of Plugin.windows) {
            LoadOrUnloadChanges(win.document,Plugin.settings.TextArenas,false);
        }
        return;
    }
    else{
        for (const win of Plugin.windows) {
            LoadOrUnloadChanges(win.document,Plugin.settings.TextArenas,Plugin.settings.AdnvOpend);
        }    
    }
}
export function RemoveModalStyles(doc: Document)
{
    const styleId = "extrastyles-dynamic-css";
    const existingStyle = doc.getElementById(styleId);
    existingStyle != null ? existingStyle.remove() : "";
}