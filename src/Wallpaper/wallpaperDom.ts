import { WallpaperConfig } from '../main';
export function removeExistingWallpaperElements(doc: Document) {
    const existingContainer = doc.getElementById('live-wallpaper-container');
    const existingStyles = doc.getElementById('live-wallpaper-overrides');
    const existingTitlebarStyles = doc.getElementById('live-wallpaper-titlebar-styles');
    
    existingContainer?.remove();
    existingStyles?.remove();
    existingTitlebarStyles?.remove();
    doc.body.classList.remove('live-wallpaper-active');
}
export function createWallpaperContainer(doc: Document,currentConfig: WallpaperConfig,adnvOpened: boolean): HTMLElement {
    const container = doc.createElement('div');
    container.id = 'live-wallpaper-container';
    Object.assign(container.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        pointerEvents: 'none',
        filter: `blur(${currentConfig.blurRadius}px) brightness(${currentConfig.brightness}%) contrast(${currentConfig.contrast}%)`});
    if(adnvOpened)
    {
        Object.assign(container.style, {
        opacity: `1`,
        zIndex: `0`
        });
    }
    else
    {
        Object.assign(container.style, {
        opacity: `${Math.min(currentConfig.opacity / 100, 0.8)}`,
        zIndex: `${currentConfig.zIndex}`
        });
    }
    return container;
}
export function ChangeWallpaperContainer(doc: Document,size: { width?: string; height?: string })
{
    const container = doc.getElementById('live-wallpaper-container');
    if (container == null) return;
    const width = size.width || '100vw';
    const height = size.height || '100vh';
    Object.assign(container.style, {
      width,
      height,
    });
}
export function applyContainerEffects(container: HTMLDivElement,currentConfig: WallpaperConfig,adnvOpened: boolean)
{
    if (adnvOpened) {
        Object.assign(container.style, {
            opacity: `1`,
            zIndex: `0`,
    });
    } 
    else {
        Object.assign(container.style, {
            opacity: `${Math.min(currentConfig.opacity / 100, 0.8)}`,
            zIndex: `${currentConfig.zIndex}`,
        });
    }
    Object.assign(container.style, {
        filter: `blur(${currentConfig.blurRadius}px) brightness(${currentConfig.brightness}%) contrast(${currentConfig.contrast}%)`,
    });
}