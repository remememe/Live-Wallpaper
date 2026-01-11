import { TextArenaEntry } from "../main";

export function LoadOrUnloadChanges(doc: Document,TextArenas: TextArenaEntry[],load: boolean) {
    const el = doc.body.classList.contains("theme-dark") || doc.body.classList.contains("theme-light") ? doc.body : doc.documentElement;
    if(!el) return;
    for (const { attribute } of TextArenas) 
    {
        try 
        {
        const attr = attribute?.trim();
        if (!attr) continue;

        const isVar = attr.startsWith("--");
        
        if (isVar) {
            if (load) {
            el.style.setProperty(attr, "transparent", "important");
            } 
            else {
            el.style.removeProperty(attr);
            }
            continue;
        }
        if (load) {
            el.style.setProperty(attr, "transparent", "important");
        } 
        else {
            el.style.removeProperty(attr);
            if (!el.getAttribute("style")) {
                el.removeAttribute("style");
            }
        }
        } 
        catch (error) {
        console.error("Error processing element:", { attribute }, error);
        }
    }
}
export function ApplyChanges(doc: Document,TextArenas: TextArenaEntry[],id: number): void {
    const { attribute } = TextArenas[id];
    const attr = attribute.trim();
    const isVar = attr.startsWith("--");
    let el: HTMLElement | null = null;

    if (isVar) {
      el = doc.body.classList.contains("theme-dark") || doc.body.classList.contains("theme-light")
        ? doc.body
        : doc.documentElement;
    } 
    else {
      el = doc.body; 
    }
    if (!el) return;
    el.style.setProperty(attr, "transparent", "important");
}
export function RemoveChanges(doc: Document,TextArenas: TextArenaEntry[],id: number,oldAttribute?: string) {
    if (id < 0 || id >= TextArenas.length) return;

    const attribute = (oldAttribute ?? TextArenas[id].attribute)?.trim();
    const el = doc.body.classList.contains("theme-dark") || doc.body.classList.contains("theme-light")
      ? doc.body
      : doc.documentElement;
    if (!attribute || !el) return;

    try {
      el.style.removeProperty(attribute);
      if (!el.getAttribute("style")) {
        el.removeAttribute("style");
      }
    } 
    catch (error) {
      console.error(`Error removing '${attribute}' at index ${id}:`, error);
    }
}