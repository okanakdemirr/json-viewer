import { getType, isUrl, isImageUrl, truncateUrl, getThumbnailUrl, span, getDataAtPath } from './utils.js';

export const LAZY_DEPTH = 4;
export const LAZY_SIBLING_COUNT = 100;

export function willBeLazy(data, depth) {
    if (depth > LAZY_DEPTH) return true;
    const type = getType(data);
    if (type === 'object') return Object.keys(data).length > LAZY_SIBLING_COUNT;
    if (type === 'array') return data.length > LAZY_SIBLING_COUNT;
    return false;
}

/**
 * Build a DOM fragment for a JSON value.
 * ctx: { stats, imageData, showImages } — stats and imageData are mutated in place
 * as a side effect of traversal; this matches the single-pass rendering model.
 */
export function createTreeNode(data, path, isLast, depth, ctx) {
    const fragment = document.createDocumentFragment();
    const type = getType(data);

    if (type === 'object') {
        ctx.stats.objects++;
        const keys = Object.keys(data);
        const isEmpty = keys.length === 0;
        const isLazy = depth > LAZY_DEPTH || keys.length > LAZY_SIBLING_COUNT;

        fragment.appendChild(span('json-bracket', '{'));
        if (!isEmpty) {
            fragment.appendChild(span('json-count', `${keys.length} ${keys.length === 1 ? 'key' : 'keys'}`));
            const children = document.createElement('div');
            children.className = isLazy ? 'json-children collapsed' : 'json-children';
            children.setAttribute('data-path', path);
            if (isLazy) {
                children.setAttribute('data-lazy', 'true');
            } else {
                keys.forEach((key, index) => {
                    const isLastItem = index === keys.length - 1;
                    const childPath = path ? `${path}.${key}` : key;
                    ctx.stats.keys++;
                    children.appendChild(buildChildLine(data[key], childPath, `"${key}"`, isLastItem, depth + 1, ctx));
                });
            }
            fragment.appendChild(children);
        }
        fragment.appendChild(span('json-bracket', '}'));
    } else if (type === 'array') {
        ctx.stats.arrays++;
        const isEmpty = data.length === 0;
        const isLazy = depth > LAZY_DEPTH || data.length > LAZY_SIBLING_COUNT;

        fragment.appendChild(span('json-bracket', '['));
        if (!isEmpty) {
            fragment.appendChild(span('json-count', `${data.length} ${data.length === 1 ? 'item' : 'items'}`));
            const children = document.createElement('div');
            children.className = isLazy ? 'json-children collapsed' : 'json-children';
            children.setAttribute('data-path', path);
            if (isLazy) {
                children.setAttribute('data-lazy', 'true');
            } else {
                data.forEach((item, index) => {
                    const isLastItem = index === data.length - 1;
                    const childPath = `${path}[${index}]`;
                    children.appendChild(buildChildLine(item, childPath, `[${index}]`, isLastItem, depth + 1, ctx));
                });
            }
            fragment.appendChild(children);
        }
        fragment.appendChild(span('json-bracket', ']'));
    } else if (type === 'string') {
        const hasUrl = isUrl(data);
        const hasImage = isImageUrl(data);

        if (hasUrl) {
            ctx.stats.urls++;
            if (hasImage) {
                ctx.stats.images++;
                ctx.imageData.push({ url: data, path });
            }
            const urlSpan = document.createElement('span');
            urlSpan.className = 'json-string json-url';
            urlSpan.setAttribute('data-url', data);
            urlSpan.setAttribute('data-path', path);
            urlSpan.setAttribute('title', `Click to ${hasImage ? 'preview' : 'open'}`);
            if (hasImage && ctx.showImages) urlSpan.style.display = 'none';
            urlSpan.textContent = `"${truncateUrl(data)}"`;
            fragment.appendChild(urlSpan);
            if (hasImage) {
                fragment.appendChild(createImagePreviewNode([{ url: data, path }], ctx));
            }
        } else {
            fragment.appendChild(span('json-string', `"${data}"`));
        }
    } else if (type === 'number') {
        fragment.appendChild(span('json-number', String(data)));
    } else if (type === 'boolean') {
        fragment.appendChild(span('json-boolean', String(data)));
    } else if (type === 'null') {
        fragment.appendChild(span('json-null', 'null'));
    }

    return fragment;
}

export function buildChildLine(data, childPath, keyLabel, isLast, depth, ctx) {
    const line = document.createElement('div');
    line.className = 'json-line';
    const childType = getType(data);
    if (childType === 'object' || childType === 'array') {
        const lazy = willBeLazy(data, depth);
        const toggle = document.createElement('button');
        toggle.className = 'json-toggle';
        toggle.setAttribute('data-path', childPath);
        toggle.setAttribute('aria-expanded', lazy ? 'false' : 'true');
        toggle.setAttribute('aria-label', 'Toggle children');
        toggle.textContent = lazy ? '+' : '−';
        line.appendChild(toggle);
    } else {
        const spacer = document.createElement('span');
        spacer.className = 'json-toggle-spacer';
        line.appendChild(spacer);
    }
    line.appendChild(span('json-key', keyLabel));
    line.appendChild(span('json-colon', ':'));
    line.appendChild(createTreeNode(data, childPath, isLast, depth, ctx));
    if (!isLast) line.appendChild(span('json-comma', ','));
    return line;
}

export function renderLazyChildren(path, container, ctx) {
    container.removeAttribute('data-lazy');
    const nodeData = getDataAtPath(ctx.jsonData, path);
    if (nodeData === undefined) return;

    const depth = path.split(/[.\[\]]/).filter(Boolean).length;
    const type = getType(nodeData);
    const fragment = document.createDocumentFragment();

    if (type === 'object') {
        const keys = Object.keys(nodeData);
        keys.forEach((key, index) => {
            const isLastItem = index === keys.length - 1;
            const childPath = path ? `${path}.${key}` : key;
            fragment.appendChild(buildChildLine(nodeData[key], childPath, `"${key}"`, isLastItem, depth + 1, ctx));
        });
    } else if (type === 'array') {
        nodeData.forEach((item, index) => {
            const isLastItem = index === nodeData.length - 1;
            const childPath = `${path}[${index}]`;
            fragment.appendChild(buildChildLine(item, childPath, `[${index}]`, isLastItem, depth + 1, ctx));
        });
    }

    container.replaceChildren(fragment);
}

export function createImagePreviewNode(imageItems, ctx) {
    const fragment = document.createDocumentFragment();
    if (imageItems.length === 0) return fragment;

    const container = document.createElement('div');
    container.className = 'json-image-preview';
    imageItems.forEach((item) => {
        if (!item || !item.url) return;
        const index = ctx.imageData.findIndex((d) => d.url === item.url && d.path === item.path);
        const actualIndex = index >= 0 ? index : ctx.imageData.length - 1;
        const img = document.createElement('img');
        img.className = 'image-thumb';
        img.src = getThumbnailUrl(item.url);
        img.setAttribute('data-index', String(actualIndex));
        img.setAttribute('data-full-url', item.url);
        img.alt = 'Preview';
        img.referrerPolicy = 'no-referrer';
        img.loading = 'lazy';
        img.addEventListener('error', () => img.classList.add('hidden'));
        container.appendChild(img);
    });
    fragment.appendChild(container);
    return fragment;
}
