export function pickSingleFile(doc: Document,accept = '.jpg,.jpeg,.png,.gif,.mp4,.webm,.avif'): Promise<File | null> {
    return new Promise((resolve) => {
        const input = doc.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.multiple = false;

        input.addEventListener('change', () => {
            resolve(input.files?.[0] ?? null);
        });

        input.addEventListener('cancel', () => {
            resolve(null);
        });

        input.click();
    });
}
export function validateWallpaperFile(file: File,SizeLimited: boolean) : boolean
{
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm', 'avif'];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!extension || !allowedExtensions.includes(extension)) {
        alert('Unsupported file type!');
        return false;
    }

    if (SizeLimited && file.size > 12 * 1024 * 1024) {
        alert('File is too large (max 12MB).');
        return false;
    }
    return true;
}
export function getWallpaperType(filename: string): 'image' | 'video' | 'gif' {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (['mp4', 'webm'].includes(extension || '')) return 'video';
    if (extension === 'gif') return 'gif';
    return 'image';
}