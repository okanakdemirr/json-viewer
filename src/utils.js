export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif'];

export const IMAGE_PATTERNS = [
    /unsplash\.com\/photo-/i,
    /images\.unsplash\.com\/.+/i,
    /pexels\.com\/.*\/.*-\d+/i,
    /imgur\.com\/[a-zA-Z0-9]{7,}\.(jpg|png|gif)/i,
    /githubusercontent\.com\/.*\/.*\.(png|jpg|jpeg|gif|webp|svg)/i,
    /randomuser\.me\/api\/portraits\//i,
    /picsum\.photos\//i,
    /via\.placeholder\.com\//i,
    /placehold\.co\//i,
    /\.s3\..*amazonaws\.com\/.*\.(jpg|jpeg|png|gif|webp)/i,
];

export function getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

export function isUrl(str) {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

export function isImageUrl(str) {
    if (!isUrl(str)) return false;
    try {
        const url = new URL(str);
        const pathname = url.pathname.toLowerCase();
        if (IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return true;
        return IMAGE_PATTERNS.some((pattern) => pattern.test(str));
    } catch {
        return false;
    }
}

export function truncateUrl(url, maxLength = 60) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
}

export function getThumbnailUrl(url) {
    try {
        const u = new URL(url);
        if (u.hostname.includes('unsplash.com')) {
            u.searchParams.set('w', '150');
            u.searchParams.set('q', '60');
            return u.toString();
        }
        if (u.hostname.includes('picsum.photos')) {
            return url.replace(/\/\d+(\/\d+)?/, '/150/100');
        }
        if (u.hostname.includes('placehold.co') || u.hostname.includes('via.placeholder.com')) {
            return url.replace(/\/\d+x?\d*/, '/150x100');
        }
    } catch {
        // Fall through to original URL
    }
    return url;
}

export function span(className, text) {
    const el = document.createElement('span');
    el.className = className;
    el.textContent = text;
    return el;
}

export function getDataAtPath(jsonData, path) {
    if (!path) return jsonData;
    const parts = path.match(/[^.\[\]]+/g);
    let current = jsonData;
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
    }
    return current;
}
