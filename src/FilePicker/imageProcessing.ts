import { Platform } from 'obsidian';
export async function resizeImageToBlob(file: File,options: {maxWidth: number;mobileBackgroundWidth: string;allowFullRes: boolean;}): Promise<Blob> {
    const img = await createImageBitmap(file);

    let MAX_WIDTH = options.maxWidth;
    if (Platform.isMobile) {
        const parsed = parseInt(options.mobileBackgroundWidth);
        if (!isNaN(parsed)) {
            MAX_WIDTH = parsed;
        }
    }
    if (options.allowFullRes || img.width <= MAX_WIDTH) {
        return new Blob([await file.arrayBuffer()], { type: file.type });
    }


    const newWidth = MAX_WIDTH;
    const newHeight = (img.height / img.width) * newWidth;

    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const bmp = await createImageBitmap(img, {
      resizeWidth: newWidth,
      resizeHeight: newHeight,
      resizeQuality: 'high'
    });
    ctx.drawImage(bmp, 0, 0, newWidth, newHeight);

    return canvas.convertToBlob({ quality: 0.8, type: 'image/jpeg' });
}