import { describe, it, expect } from 'vitest';
import { getType, isUrl, isImageUrl, truncateUrl, getThumbnailUrl, getDataAtPath } from '../utils.js';

describe('getType', () => {
    it('returns "null" for null', () => {
        expect(getType(null)).toBe('null');
    });
    it('returns "array" for arrays', () => {
        expect(getType([])).toBe('array');
        expect(getType([1, 2])).toBe('array');
    });
    it('returns typeof for primitives', () => {
        expect(getType('hello')).toBe('string');
        expect(getType(42)).toBe('number');
        expect(getType(true)).toBe('boolean');
        expect(getType(undefined)).toBe('undefined');
    });
    it('returns "object" for plain objects', () => {
        expect(getType({})).toBe('object');
        expect(getType({ a: 1 })).toBe('object');
    });
});

describe('isUrl', () => {
    it('accepts http and https', () => {
        expect(isUrl('http://example.com')).toBe(true);
        expect(isUrl('https://example.com/a/b?x=1')).toBe(true);
    });
    it('rejects non-http schemes', () => {
        expect(isUrl('ftp://example.com')).toBe(false);
        expect(isUrl('javascript:alert(1)')).toBe(false);
        expect(isUrl('data:text/plain,hi')).toBe(false);
    });
    it('rejects malformed input', () => {
        expect(isUrl('not a url')).toBe(false);
        expect(isUrl('')).toBe(false);
        expect(isUrl('/relative/path')).toBe(false);
    });
});

describe('isImageUrl', () => {
    it('detects by extension', () => {
        expect(isImageUrl('https://example.com/pic.jpg')).toBe(true);
        expect(isImageUrl('https://example.com/pic.JPG')).toBe(true);
        expect(isImageUrl('https://example.com/a/b/pic.png')).toBe(true);
        expect(isImageUrl('https://example.com/avatar.svg')).toBe(true);
    });
    it('detects known image hosts', () => {
        expect(isImageUrl('https://images.unsplash.com/photo-1234?w=200')).toBe(true);
        expect(isImageUrl('https://picsum.photos/200/300')).toBe(true);
        expect(isImageUrl('https://randomuser.me/api/portraits/men/1.jpg')).toBe(true);
    });
    it('rejects non-image URLs', () => {
        expect(isImageUrl('https://example.com/page')).toBe(false);
        expect(isImageUrl('https://example.com/data.json')).toBe(false);
    });
    it('rejects non-http URLs', () => {
        expect(isImageUrl('ftp://example.com/pic.jpg')).toBe(false);
    });
});

describe('truncateUrl', () => {
    it('returns input unchanged under maxLength', () => {
        expect(truncateUrl('short', 60)).toBe('short');
    });
    it('truncates with ellipsis when over', () => {
        const long = 'https://example.com/' + 'a'.repeat(200);
        const out = truncateUrl(long, 60);
        expect(out.length).toBe(60);
        expect(out.endsWith('...')).toBe(true);
    });
});

describe('getThumbnailUrl', () => {
    it('rewrites unsplash with w=150 and q=60', () => {
        const out = getThumbnailUrl('https://images.unsplash.com/photo-abc?w=1080');
        const u = new URL(out);
        expect(u.searchParams.get('w')).toBe('150');
        expect(u.searchParams.get('q')).toBe('60');
    });
    it('rewrites picsum path dimensions', () => {
        expect(getThumbnailUrl('https://picsum.photos/800/600')).toBe('https://picsum.photos/150/100');
    });
    it('returns original for unknown hosts', () => {
        const url = 'https://example.com/foo.jpg';
        expect(getThumbnailUrl(url)).toBe(url);
    });
    it('returns original for non-URL inputs', () => {
        expect(getThumbnailUrl('not a url')).toBe('not a url');
    });
});

describe('getDataAtPath', () => {
    const data = {
        a: 1,
        b: { c: 2, d: [10, 20, { e: 'hit' }] },
        'weird.key': 'x',
    };

    it('returns the whole object for empty path', () => {
        expect(getDataAtPath(data, '')).toBe(data);
    });
    it('resolves dot paths', () => {
        expect(getDataAtPath(data, 'a')).toBe(1);
        expect(getDataAtPath(data, 'b.c')).toBe(2);
    });
    it('resolves bracket index paths', () => {
        expect(getDataAtPath(data, 'b.d[0]')).toBe(10);
        expect(getDataAtPath(data, 'b.d[2].e')).toBe('hit');
    });
    it('returns undefined for missing paths', () => {
        expect(getDataAtPath(data, 'x.y')).toBeUndefined();
        expect(getDataAtPath(data, 'b.d[99]')).toBeUndefined();
    });
});
