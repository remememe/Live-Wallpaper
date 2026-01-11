export async function applyBackgroundColor(doc: Document,AdnvOpend: boolean,Color: string) {
    const existingElement = doc.getElementById('live-wallpaper-container');
    if (existingElement) {
        if (AdnvOpend && Color) {
            existingElement.parentElement?.style.setProperty('background-color', Color, 'important');
        }
        return;
    }

    await new Promise<void>((resolve) => {
        const observer = new MutationObserver((mutations, obs) => {
        const element = doc.getElementById('live-wallpaper-container');
        if (element) {
            obs.disconnect();
            resolve();
        }
        });

        observer.observe(doc.body, {
        childList: true,
        subtree: true
        });
    });

    if (AdnvOpend && Color) {
        const Main = doc.getElementById('live-wallpaper-container');
        Main?.parentElement?.style.setProperty('background-color', Color, 'important');
    }
}
export async function clearBackgroundColor(doc: Document) {
    const Main = doc.getElementById('live-wallpaper-container');
    Main?.parentElement?.style.removeProperty('background-color');
}