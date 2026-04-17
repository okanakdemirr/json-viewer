// JSON Viewer Application
class JSONViewer {
    constructor() {
        this.jsonData = null;
        this.imageData = []; // Stores {url, path} objects
        this.currentImageIndex = 0;
        this.showImages = true;
        this.LAZY_DEPTH = 4;
        this.LAZY_SIBLING_COUNT = 100;
        this.stats = {
            keys: 0,
            arrays: 0,
            objects: 0,
            urls: 0,
            images: 0
        };

        // Search state
        this.searchMatches = [];
        this.currentMatchIndex = -1;
        this.searchOpen = false;
        this._searchDebounceTimer = null;

        // History state
        this.history = [];
        this.maxHistoryItems = 10;
        this.historyKey = 'json-viewer-history';
        this.MAX_HISTORY_BYTES = 4 * 1024 * 1024; // 4MB localStorage budget

        // Cached image detection patterns
        this._imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif'];
        this._imagePatterns = [
            /unsplash\.com\/photo-/i,
            /images\.unsplash\.com\/.+/i,
            /pexels\.com\/.*\/.*-\d+/i,
            /imgur\.com\/[a-zA-Z0-9]{7,}\.(jpg|png|gif)/i,
            /githubusercontent\.com\/.*\/.*\.(png|jpg|jpeg|gif|webp|svg)/i,
            /randomuser\.me\/api\/portraits\//i,
            /picsum\.photos\//i,
            /via\.placeholder\.com\//i,
            /placehold\.co\//i,
            /\.s3\..*amazonaws\.com\/.*\.(jpg|jpeg|png|gif|webp)/i
        ];

        this.init();
    }

    init() {
        this.bindElements();
        this.bindEvents();
        this.loadHistory();
    }

    bindElements() {
        // Input elements
        this.jsonInput = document.getElementById('jsonInput');
        this.fileInput = document.getElementById('fileInput');
        this.formatBtn = document.getElementById('formatBtn');
        this.pasteBtn = document.getElementById('pasteBtn');
        this.copyInputBtn = document.getElementById('copyInputBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.charCount = document.getElementById('charCount');
        this.errorMessage = document.getElementById('errorMessage');

        // Output elements
        this.outputSection = document.getElementById('outputSection');
        this.jsonOutput = document.getElementById('jsonOutput');
        this.rawOutput = document.getElementById('rawOutput');
        this.treeViewBtn = document.getElementById('treeViewBtn');
        this.rawViewBtn = document.getElementById('rawViewBtn');
        this.expandAllBtn = document.getElementById('expandAllBtn');
        this.collapseAllBtn = document.getElementById('collapseAllBtn');
        this.toggleImagesBtn = document.getElementById('toggleImagesBtn');
        this.copyBtn = document.getElementById('copyBtn');

        // Stats elements
        this.keyCountEl = document.getElementById('keyCount');
        this.arrayCountEl = document.getElementById('arrayCount');
        this.objectCountEl = document.getElementById('objectCount');
        this.urlCountEl = document.getElementById('urlCount');
        this.imageCountEl = document.getElementById('imageCount');

        // Gallery elements
        this.imageGallery = document.getElementById('imageGallery');
        this.galleryImage = document.getElementById('galleryImage');
        this.galleryPath = document.getElementById('galleryPath');
        this.galleryUrl = document.getElementById('galleryUrl');
        this.copyPathBtn = document.getElementById('copyPathBtn');
        this.copyUrlBtn = document.getElementById('copyUrlBtn');
        this.galleryThumbs = document.getElementById('galleryThumbs');
        this.closeGallery = document.getElementById('closeGallery');
        this.prevImage = document.getElementById('prevImage');
        this.nextImage = document.getElementById('nextImage');

        // Search elements
        this.searchBar = document.getElementById('searchBar');
        this.searchInput = document.getElementById('searchInput');
        this.searchCount = document.getElementById('searchCount');
        this.searchPrev = document.getElementById('searchPrev');
        this.searchNext = document.getElementById('searchNext');
        this.searchClose = document.getElementById('searchClose');

        // History elements
        this.historyToggleBtn = document.getElementById('historyToggleBtn');
        this.historySidebar = document.getElementById('historySidebar');
        this.historyList = document.getElementById('historyList');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.closeHistoryBtn = document.getElementById('closeHistoryBtn');
    }

    bindEvents() {
        // Input events
        this.jsonInput.addEventListener('input', () => this.updateCharCount());
        this.formatBtn.addEventListener('click', () => this.formatAndView());
        this.pasteBtn.addEventListener('click', () => this.pasteFromClipboard());
        this.copyInputBtn.addEventListener('click', () => this.copyInputToClipboard());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // View toggle events
        this.treeViewBtn.addEventListener('click', () => this.switchView('tree'));
        this.rawViewBtn.addEventListener('click', () => this.switchView('raw'));

        // Expand/Collapse events
        this.expandAllBtn.addEventListener('click', () => this.expandAll());
        this.collapseAllBtn.addEventListener('click', () => this.collapseAll());
        this.toggleImagesBtn.addEventListener('click', () => this.toggleImagePreviews());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());

        // Gallery events
        this.closeGallery.addEventListener('click', () => this.closeImageGallery());
        this.prevImage.addEventListener('click', () => this.navigateGallery(-1));
        this.nextImage.addEventListener('click', () => this.navigateGallery(1));
        this.copyPathBtn.addEventListener('click', () => this.copyGalleryText('path'));
        this.copyUrlBtn.addEventListener('click', () => this.copyGalleryText('url'));

        // Search events (debounced)
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this._searchDebounceTimer);
            this._searchDebounceTimer = setTimeout(() => this.performSearch(), 250);
        });
        this.searchPrev.addEventListener('click', () => this.navigateSearch(-1));
        this.searchNext.addEventListener('click', () => this.navigateSearch(1));
        this.searchClose.addEventListener('click', () => this.closeSearch());
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.navigateSearch(e.shiftKey ? -1 : 1);
            } else if (e.key === 'Escape') {
                this.closeSearch();
            }
        });

        // History events
        this.historyToggleBtn.addEventListener('click', () => this.toggleHistory());
        this.closeHistoryBtn.addEventListener('click', () => this.toggleHistory());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());

        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Delegated event listeners for JSON tree (handles all dynamic content)
        this.jsonOutput.addEventListener('click', (e) => {
            const toggle = e.target.closest('.json-toggle');
            if (toggle) {
                e.stopPropagation();
                this.toggleNode(toggle);
                return;
            }
            const thumb = e.target.closest('.image-thumb');
            if (thumb) {
                this.openImageGallery(parseInt(thumb.getAttribute('data-index')));
                return;
            }
            const url = e.target.closest('.json-url');
            if (url) {
                const urlStr = url.getAttribute('data-url');
                if (this.isImageUrl(urlStr)) {
                    const idx = this.imageData.findIndex(d => d.url === urlStr);
                    if (idx >= 0) {
                        this.openImageGallery(idx);
                    } else {
                        this.imageData.push({ url: urlStr, path: url.getAttribute('data-path') });
                        this.openImageGallery(this.imageData.length - 1);
                    }
                } else {
                    window.open(urlStr, '_blank');
                }
            }
        });

        // Delegated event listener for history sidebar
        this.historyList.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.history-delete');
            if (deleteBtn) {
                e.stopPropagation();
                const index = parseInt(deleteBtn.getAttribute('data-index'));
                this.deleteFromHistory(index);
                return;
            }
            const item = e.target.closest('.history-item');
            if (item) {
                const index = parseInt(item.getAttribute('data-index'));
                this.loadFromHistory(index);
            }
        });

        // Delegated event listener for gallery thumbs
        this.galleryThumbs.addEventListener('click', (e) => {
            const thumb = e.target.closest('img');
            if (thumb && thumb.dataset.index !== undefined) {
                this.currentImageIndex = parseInt(thumb.dataset.index);
                this.updateGalleryImage();
            }
        });

        // Initial char count
        this.updateCharCount();

        // ========== NEW FEATURES ==========
        this.bindTabEvents();
        this.bindComparerEvents();
    }

    bindTabEvents() {
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab button
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show/Hide content
                const tabId = tab.getAttribute('data-tab');
                document.getElementById('jsonViewerTab').classList.add('hidden');
                document.getElementById('textComparerTab').classList.add('hidden');

                if (tabId === 'jsonViewer') {
                    document.getElementById('jsonViewerTab').classList.remove('hidden');
                } else {
                    document.getElementById('textComparerTab').classList.remove('hidden');
                }
            });
        });
    }

    bindComparerEvents() {
        this.originalInput = document.getElementById('originalInput');
        this.modifiedInput = document.getElementById('modifiedInput');
        this.compareBtn = document.getElementById('compareBtn');
        this.clearCompareBtn = document.getElementById('clearCompareBtn');
        this.diffResult = document.getElementById('diffResult');
        this.compareOutput = document.getElementById('compareOutput');
        this.pasteOriginalBtn = document.getElementById('pasteOriginalBtn');
        this.pasteModifiedBtn = document.getElementById('pasteModifiedBtn');

        if (typeof Diff === 'undefined') {
            this.compareBtn.disabled = true;
            this.compareBtn.title = 'Diff library failed to load';
            this.diffResult.textContent = 'Diff library failed to load. The comparer is unavailable.';
            this.compareOutput.classList.remove('hidden');
        } else {
            this.compareBtn.addEventListener('click', () => this.compareText());
        }
        this.clearCompareBtn.addEventListener('click', () => this.clearComparer());

        this.pasteOriginalBtn.addEventListener('click', async () => {
            try {
                this.originalInput.value = await navigator.clipboard.readText();
            } catch (e) {
                this.showToast('Failed to paste content');
            }
        });

        this.pasteModifiedBtn.addEventListener('click', async () => {
            try {
                this.modifiedInput.value = await navigator.clipboard.readText();
            } catch (e) {
                this.showToast('Failed to paste content');
            }
        });
    }

    compareText(saveToHistory = true) {
        const original = this.originalInput.value;
        const modified = this.modifiedInput.value;

        if (!original && !modified) return;

        try {
            if (typeof Diff === 'undefined') {
                throw new Error('Diff library not loaded');
            }

            // Use global Diff object from cdn
            const diff = Diff.diffWordsWithSpace(original, modified);
            const fragment = document.createDocumentFragment();

            diff.forEach((part) => {
                // green for additions, red for deletions
                // grey for common parts
                const span = document.createElement(part.added ? 'ins' : part.removed ? 'del' : 'span');
                span.textContent = part.value;
                fragment.appendChild(span);
            });

            this.diffResult.innerHTML = '';
            this.diffResult.appendChild(fragment);
            this.compareOutput.classList.remove('hidden');
        } catch (err) {
            console.error(err);
            this.showToast('Comparison failed: ' + err.message);
        }

        if (saveToHistory) {
            this.addToHistory({ original, modified }, 'compare');
        }
    }

    clearComparer() {
        this.originalInput.value = '';
        this.modifiedInput.value = '';
        this.diffResult.innerHTML = '';
        this.compareOutput.classList.add('hidden');
    }

    updateCharCount() {
        const count = this.jsonInput.value.length;
        this.charCount.textContent = `${count.toLocaleString()} characters`;
    }

    async pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            this.jsonInput.value = text;
            this.updateCharCount();
        } catch (err) {
            this.showError('Unable to paste from clipboard. Please paste manually.');
        }
    }

    async _copyWithFeedback(text, button, { successHTML = null, className = 'copied', duration = 1500 } = {}) {
        try {
            await navigator.clipboard.writeText(text);
            const originalHTML = successHTML ? button.innerHTML : null;
            if (successHTML) button.innerHTML = successHTML;
            if (className) button.classList.add(className);
            setTimeout(() => {
                if (className) button.classList.remove(className);
                if (successHTML) button.innerHTML = originalHTML;
            }, duration);
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            return false;
        }
    }

    async copyInputToClipboard() {
        const text = this.jsonInput.value;
        if (!text) return;
        const ok = await this._copyWithFeedback(text, this.copyInputBtn, {
            successHTML: `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Copied!
            `
        });
        if (!ok) this.showError('Failed to copy to clipboard');
    }

    clearAll() {
        this.jsonInput.value = '';
        this.jsonData = null;
        this.imageData = [];
        this.outputSection.classList.add('hidden');
        this.errorMessage.classList.add('hidden');
        this.updateCharCount();
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.jsonInput.value = e.target.result;
            this.updateCharCount();
            this.formatAndView();
        };
        reader.onerror = () => {
            this.showError('Failed to read file. Please try again.');
        };
        reader.readAsText(file);
    }

    formatAndView() {
        const input = this.jsonInput.value.trim();

        if (!input) {
            this.showError('Please enter some JSON data.');
            return;
        }

        try {
            this.jsonData = JSON.parse(input);
            this.errorMessage.classList.add('hidden');
            this.addToHistory({ content: input }, 'json');
            this.renderJSON();
        } catch (err) {
            this.showError(`Invalid JSON: ${err.message}`);
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
    }

    showToast(message, kind = 'error', duration = 3000) {
        if (!this._toastContainer) {
            this._toastContainer = document.createElement('div');
            this._toastContainer.className = 'toast-container';
            this._toastContainer.setAttribute('role', 'status');
            this._toastContainer.setAttribute('aria-live', 'polite');
            document.body.appendChild(this._toastContainer);
        }
        const toast = document.createElement('div');
        toast.className = `toast toast-${kind}`;
        toast.textContent = message;
        this._toastContainer.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
            // Safety net if transitionend never fires (e.g., reduced motion).
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    renderJSON() {
        this.stats = { keys: 0, arrays: 0, objects: 0, urls: 0, images: 0 };
        this.imageData = [];

        this.jsonOutput.replaceChildren(this.createTreeNode(this.jsonData, '', true, 0));
        this.rawOutput.textContent = JSON.stringify(this.jsonData, null, 2);

        this.updateStats();
        this.outputSection.classList.remove('hidden');
        this.outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    _span(className, text) {
        const el = document.createElement('span');
        el.className = className;
        el.textContent = text;
        return el;
    }

    createTreeNode(data, path, isLast = true, depth = 0) {
        const fragment = document.createDocumentFragment();
        const type = this.getType(data);

        if (type === 'object') {
            this.stats.objects++;
            const keys = Object.keys(data);
            const isEmpty = keys.length === 0;
            const isLazy = depth > this.LAZY_DEPTH || keys.length > this.LAZY_SIBLING_COUNT;

            fragment.appendChild(this._span('json-bracket', '{'));

            if (!isEmpty) {
                fragment.appendChild(this._span('json-count', `${keys.length} ${keys.length === 1 ? 'key' : 'keys'}`));
                const children = document.createElement('div');
                children.className = isLazy ? 'json-children collapsed' : 'json-children';
                children.setAttribute('data-path', path);
                if (isLazy) {
                    children.setAttribute('data-lazy', 'true');
                } else {
                    keys.forEach((key, index) => {
                        const isLastItem = index === keys.length - 1;
                        const childPath = path ? `${path}.${key}` : key;
                        this.stats.keys++;
                        children.appendChild(this._buildChildLine(data[key], childPath, `"${key}"`, isLastItem, depth + 1));
                    });
                }
                fragment.appendChild(children);
            }

            fragment.appendChild(this._span('json-bracket', '}'));

        } else if (type === 'array') {
            this.stats.arrays++;
            const isEmpty = data.length === 0;
            const isLazy = depth > this.LAZY_DEPTH || data.length > this.LAZY_SIBLING_COUNT;

            fragment.appendChild(this._span('json-bracket', '['));

            if (!isEmpty) {
                fragment.appendChild(this._span('json-count', `${data.length} ${data.length === 1 ? 'item' : 'items'}`));
                const children = document.createElement('div');
                children.className = isLazy ? 'json-children collapsed' : 'json-children';
                children.setAttribute('data-path', path);
                if (isLazy) {
                    children.setAttribute('data-lazy', 'true');
                } else {
                    data.forEach((item, index) => {
                        const isLastItem = index === data.length - 1;
                        const childPath = `${path}[${index}]`;
                        children.appendChild(this._buildChildLine(item, childPath, `[${index}]`, isLastItem, depth + 1));
                    });
                }
                fragment.appendChild(children);
            }

            fragment.appendChild(this._span('json-bracket', ']'));

        } else if (type === 'string') {
            const isUrl = this.isUrl(data);
            const isImage = this.isImageUrl(data);

            if (isUrl) {
                this.stats.urls++;
                if (isImage) {
                    this.stats.images++;
                    this.imageData.push({ url: data, path: path });
                }

                const urlSpan = document.createElement('span');
                urlSpan.className = 'json-string json-url';
                urlSpan.setAttribute('data-url', data);
                urlSpan.setAttribute('data-path', path);
                urlSpan.setAttribute('title', `Click to ${isImage ? 'preview' : 'open'}`);
                if (isImage && this.showImages) urlSpan.style.display = 'none';
                urlSpan.textContent = `"${this.truncateUrl(data)}"`;
                fragment.appendChild(urlSpan);

                if (isImage) {
                    fragment.appendChild(this.createImagePreviewNode([{ url: data, path: path }]));
                }
            } else {
                fragment.appendChild(this._span('json-string', `"${data}"`));
            }

        } else if (type === 'number') {
            fragment.appendChild(this._span('json-number', String(data)));
        } else if (type === 'boolean') {
            fragment.appendChild(this._span('json-boolean', String(data)));
        } else if (type === 'null') {
            fragment.appendChild(this._span('json-null', 'null'));
        }

        return fragment;
    }

    createImagePreviewNode(imageItems) {
        const fragment = document.createDocumentFragment();
        if (imageItems.length === 0) return fragment;

        const container = document.createElement('div');
        container.className = 'json-image-preview';
        imageItems.forEach(item => {
            if (!item || !item.url) return;
            const index = this.imageData.findIndex(d => d.url === item.url && d.path === item.path);
            const actualIndex = index >= 0 ? index : this.imageData.length - 1;
            const img = document.createElement('img');
            img.className = 'image-thumb';
            img.src = this.getThumbnailUrl(item.url);
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

    getType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    isUrl(str) {
        try {
            const url = new URL(str);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }

    isImageUrl(str) {
        if (!this.isUrl(str)) return false;

        try {
            const url = new URL(str);
            const pathname = url.pathname.toLowerCase();

            if (this._imageExtensions.some(ext => pathname.endsWith(ext))) {
                return true;
            }

            return this._imagePatterns.some(pattern => pattern.test(str));
        } catch (e) {
            return false;
        }
    }

    truncateUrl(url, maxLength = 60) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength - 3) + '...';
    }

    // Return a smaller thumbnail URL for supported image hosts
    getThumbnailUrl(url) {
        try {
            const u = new URL(url);
            // Unsplash: append w=150 for small thumbnails
            if (u.hostname.includes('unsplash.com')) {
                u.searchParams.set('w', '150');
                u.searchParams.set('q', '60');
                return u.toString();
            }
            // Picsum: rewrite dimensions in path
            if (u.hostname.includes('picsum.photos')) {
                return url.replace(/\/\d+(\/\d+)?/, '/150/100');
            }
            // Placeholder services: rewrite dimensions
            if (u.hostname.includes('placehold.co') || u.hostname.includes('via.placeholder.com')) {
                return url.replace(/\/\d+x?\d*/, '/150x100');
            }
        } catch (e) {
            // Fall through
        }
        return url;
    }

    updateStats() {
        this.keyCountEl.textContent = this.stats.keys.toLocaleString();
        this.arrayCountEl.textContent = this.stats.arrays.toLocaleString();
        this.objectCountEl.textContent = this.stats.objects.toLocaleString();
        this.urlCountEl.textContent = this.stats.urls.toLocaleString();
        this.imageCountEl.textContent = this.stats.images.toLocaleString();
    }

    toggleNode(button) {
        const path = button.getAttribute('data-path');
        const children = this.jsonOutput.querySelector(`.json-children[data-path="${path}"]`);

        if (children) {
            const isCollapsed = children.classList.toggle('collapsed');
            button.textContent = isCollapsed ? '+' : '−';
            button.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');

            if (!isCollapsed && children.getAttribute('data-lazy') === 'true') {
                this.renderLazyChildren(path, children);
            }
        }
    }

    renderLazyChildren(path, container) {
        container.removeAttribute('data-lazy');
        const nodeData = this.getDataAtPath(path);
        if (nodeData === undefined) return;

        const depth = path.split(/[.\[\]]/).filter(Boolean).length;
        const type = this.getType(nodeData);
        const fragment = document.createDocumentFragment();

        if (type === 'object') {
            const keys = Object.keys(nodeData);
            keys.forEach((key, index) => {
                const isLastItem = index === keys.length - 1;
                const childPath = path ? `${path}.${key}` : key;
                fragment.appendChild(this._buildChildLine(nodeData[key], childPath, `"${key}"`, isLastItem, depth + 1));
            });
        } else if (type === 'array') {
            nodeData.forEach((item, index) => {
                const isLastItem = index === nodeData.length - 1;
                const childPath = `${path}[${index}]`;
                fragment.appendChild(this._buildChildLine(item, childPath, `[${index}]`, isLastItem, depth + 1));
            });
        }

        container.replaceChildren(fragment);
    }

    _buildChildLine(data, childPath, keyLabel, isLast, depth) {
        const line = document.createElement('div');
        line.className = 'json-line';
        const childType = this.getType(data);
        if (childType === 'object' || childType === 'array') {
            const willBeLazy = this._willBeLazy(data, depth);
            const toggle = document.createElement('button');
            toggle.className = 'json-toggle';
            toggle.setAttribute('data-path', childPath);
            toggle.setAttribute('aria-expanded', willBeLazy ? 'false' : 'true');
            toggle.setAttribute('aria-label', 'Toggle children');
            toggle.textContent = willBeLazy ? '+' : '−';
            line.appendChild(toggle);
        } else {
            const spacer = document.createElement('span');
            spacer.className = 'json-toggle-spacer';
            line.appendChild(spacer);
        }
        line.appendChild(this._span('json-key', keyLabel));
        line.appendChild(this._span('json-colon', ':'));
        line.appendChild(this.createTreeNode(data, childPath, isLast, depth));
        if (!isLast) line.appendChild(this._span('json-comma', ','));
        return line;
    }

    _willBeLazy(data, depth) {
        if (depth > this.LAZY_DEPTH) return true;
        const type = this.getType(data);
        if (type === 'object') return Object.keys(data).length > this.LAZY_SIBLING_COUNT;
        if (type === 'array') return data.length > this.LAZY_SIBLING_COUNT;
        return false;
    }

    // Navigate the parsed JSON data to find data at a dot/bracket path
    getDataAtPath(path) {
        if (!path) return this.jsonData;
        const parts = path.match(/[^.\[\]]+/g);
        let current = this.jsonData;
        for (const part of parts) {
            if (current === null || current === undefined) return undefined;
            current = current[part];
        }
        return current;
    }

    openImageGallery(index) {
        if (this.imageData.length === 0) return;

        this.currentImageIndex = index;
        this.updateGalleryImage();
        this.renderGalleryThumbs();
        this.imageGallery.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        this._galleryLastFocused = document.activeElement;
        if (!this._galleryKeyTrap) {
            this._galleryKeyTrap = (e) => {
                if (e.key !== 'Tab') return;
                const focusable = this.imageGallery.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            };
        }
        this.imageGallery.addEventListener('keydown', this._galleryKeyTrap);
        // Defer focus until after the browser paints the gallery visible.
        requestAnimationFrame(() => this.closeGallery.focus());
    }

    closeImageGallery() {
        this.imageGallery.classList.add('hidden');
        document.body.style.overflow = '';
        if (this._galleryKeyTrap) {
            this.imageGallery.removeEventListener('keydown', this._galleryKeyTrap);
        }
        const target = this._galleryLastFocused;
        this._galleryLastFocused = null;
        if (target && typeof target.focus === 'function' && document.contains(target)) {
            target.focus();
        }
    }

    updateGalleryImage() {
        const imageInfo = this.imageData[this.currentImageIndex];
        this.galleryImage.src = imageInfo.url;
        this.galleryImage.alt = imageInfo.path ? `Image at ${imageInfo.path}` : 'Image preview';
        this.galleryImage.referrerPolicy = "no-referrer";
        this.galleryPath.textContent = imageInfo.path || 'root';
        this.galleryUrl.textContent = imageInfo.url;

        // Update nav buttons
        this.prevImage.disabled = this.currentImageIndex === 0;
        this.nextImage.disabled = this.currentImageIndex === this.imageData.length - 1;

        // Update active thumb
        const thumbs = this.galleryThumbs.querySelectorAll('img');
        thumbs.forEach((thumb, i) => {
            thumb.classList.toggle('active', i === this.currentImageIndex);
        });
    }

    renderGalleryThumbs() {
        const fragment = document.createDocumentFragment();
        this.imageData.forEach((item, index) => {
            const img = document.createElement('img');
            img.src = item.url;
            if (index === this.currentImageIndex) img.className = 'active';
            img.setAttribute('data-index', String(index));
            img.alt = 'Thumbnail';
            fragment.appendChild(img);
        });
        this.galleryThumbs.replaceChildren(fragment);
    }

    navigateGallery(direction) {
        const newIndex = this.currentImageIndex + direction;
        if (newIndex >= 0 && newIndex < this.imageData.length) {
            this.currentImageIndex = newIndex;
            this.updateGalleryImage();
        }
    }

    async copyGalleryText(type) {
        const imageInfo = this.imageData[this.currentImageIndex];
        const text = type === 'path' ? imageInfo.path : imageInfo.url;
        const btn = type === 'path' ? this.copyPathBtn : this.copyUrlBtn;
        await this._copyWithFeedback(text, btn);
    }

    switchView(view) {
        if (view === 'tree') {
            this.jsonOutput.classList.remove('hidden');
            this.rawOutput.classList.add('hidden');
            this.treeViewBtn.classList.add('active');
            this.rawViewBtn.classList.remove('active');
        } else {
            this.jsonOutput.classList.add('hidden');
            this.rawOutput.classList.remove('hidden');
            this.treeViewBtn.classList.remove('active');
            this.rawViewBtn.classList.add('active');
        }
    }

    expandAll() {
        // Expand lazy nodes level-by-level. Yields to the browser between levels via rAF
        // so large trees don't block paint, and scopes the next-level search to newly
        // inserted descendants instead of re-querying the entire tree.
        this._expandGen = (this._expandGen || 0) + 1;
        const gen = this._expandGen;
        const finish = () => {
            this.jsonOutput.querySelectorAll('.json-children.collapsed').forEach(el => el.classList.remove('collapsed'));
            this.jsonOutput.querySelectorAll('.json-toggle').forEach(t => {
                t.textContent = '−';
                t.setAttribute('aria-expanded', 'true');
            });
        };
        const processLevel = (nodes) => {
            if (this._expandGen !== gen) return;
            if (nodes.length === 0) {
                finish();
                return;
            }
            const nextLevel = [];
            nodes.forEach(child => {
                const path = child.getAttribute('data-path');
                child.classList.remove('collapsed');
                this.renderLazyChildren(path, child);
                child.querySelectorAll('.json-children[data-lazy="true"]').forEach(d => nextLevel.push(d));
            });
            if (nextLevel.length > 0) {
                requestAnimationFrame(() => processLevel(nextLevel));
            } else {
                finish();
            }
        };
        processLevel(Array.from(this.jsonOutput.querySelectorAll('.json-children[data-lazy="true"]')));
    }

    collapseAll() {
        // Cancel any in-flight expandAll that may still be walking rAF callbacks.
        this._expandGen = (this._expandGen || 0) + 1;
        const children = this.jsonOutput.querySelectorAll('.json-children');
        const toggles = this.jsonOutput.querySelectorAll('.json-toggle');

        children.forEach(child => child.classList.add('collapsed'));
        toggles.forEach(toggle => {
            toggle.textContent = '+';
            toggle.setAttribute('aria-expanded', 'false');
        });
    }

    toggleImagePreviews() {
        this.showImages = !this.showImages;

        // Update button appearance and text
        if (this.showImages) {
            this.toggleImagesBtn.classList.add('active');
            this.toggleImagesBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                </svg>
                Images On
            `;
        } else {
            this.toggleImagesBtn.classList.remove('active');
            this.toggleImagesBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                    <line x1="2" y1="2" x2="22" y2="22"/>
                </svg>
                Images Off
            `;
        }

        // Toggle visibility of all image previews
        const imagePreviews = this.jsonOutput.querySelectorAll('.json-image-preview');
        imagePreviews.forEach(preview => {
            preview.style.display = this.showImages ? 'flex' : 'none';
        });

        // Toggle visibility of image URL text (hide when images shown, show when hidden)
        const imageUrls = this.jsonOutput.querySelectorAll('.json-url');
        imageUrls.forEach(urlEl => {
            const urlStr = urlEl.getAttribute('data-url');
            if (this.isImageUrl(urlStr)) {
                // Hide URL text when images are shown (user can click thumbnail to see URL)
                urlEl.style.display = this.showImages ? 'none' : 'inline';
            }
        });
    }

    async copyToClipboard() {
        const text = JSON.stringify(this.jsonData, null, 2);
        await this._copyWithFeedback(text, this.copyBtn, {
            className: null,
            successHTML: `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copied!
            `
        });
    }

    handleKeyboard(e) {
        // Ctrl/Cmd + F to open search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            if (!this.outputSection.classList.contains('hidden')) {
                e.preventDefault();
                this.openSearch();
            }
        }

        // Close search on Escape
        if (e.key === 'Escape' && this.searchOpen) {
            this.closeSearch();
            return;
        }

        // Close gallery on Escape
        if (e.key === 'Escape' && !this.imageGallery.classList.contains('hidden')) {
            this.closeImageGallery();
        }

        // Navigate gallery with arrow keys
        if (!this.imageGallery.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') {
                this.navigateGallery(-1);
            } else if (e.key === 'ArrowRight') {
                this.navigateGallery(1);
            }
        }

        // Ctrl/Cmd + Enter to format
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.formatAndView();
        }
    }

    // ==================== SEARCH METHODS ====================

    openSearch() {
        this.searchOpen = true;
        this.searchBar.classList.remove('hidden');
        this.searchInput.focus();
        this.searchInput.select();
    }

    closeSearch() {
        this.searchOpen = false;
        this.searchBar.classList.add('hidden');
        this.searchInput.value = '';
        this.clearSearchHighlights();
        this.searchMatches = [];
        this.currentMatchIndex = -1;
        this.searchCount.textContent = '';
    }

    performSearch() {
        const query = this.searchInput.value.trim().toLowerCase();
        this.clearSearchHighlights();
        this.searchMatches = [];
        this.currentMatchIndex = -1;

        if (!query) {
            this.searchCount.textContent = '';
            return;
        }

        // Find all text nodes in the JSON output that match
        const walker = document.createTreeWalker(
            this.jsonOutput,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.toLowerCase().includes(query)) {
                textNodes.push(node);
            }
        }

        // Highlight matches
        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const lowerText = text.toLowerCase();
            let lastIndex = 0;
            const parts = [];
            let index;

            while ((index = lowerText.indexOf(query, lastIndex)) !== -1) {
                if (index > lastIndex) {
                    parts.push(document.createTextNode(text.substring(lastIndex, index)));
                }
                const mark = document.createElement('mark');
                mark.className = 'search-match';
                mark.textContent = text.substring(index, index + query.length);
                parts.push(mark);
                this.searchMatches.push(mark);
                lastIndex = index + query.length;
            }

            if (lastIndex < text.length) {
                parts.push(document.createTextNode(text.substring(lastIndex)));
            }

            if (parts.length > 0) {
                const parent = textNode.parentNode;
                parts.forEach(part => parent.insertBefore(part, textNode));
                parent.removeChild(textNode);
            }
        });

        // Update count and navigate to first match
        if (this.searchMatches.length > 0) {
            this.currentMatchIndex = 0;
            this.updateSearchHighlight();
            this.searchCount.textContent = `1 of ${this.searchMatches.length}`;
        } else {
            this.searchCount.textContent = 'No matches';
        }
    }

    navigateSearch(direction) {
        if (this.searchMatches.length === 0) return;

        this.currentMatchIndex += direction;
        if (this.currentMatchIndex < 0) {
            this.currentMatchIndex = this.searchMatches.length - 1;
        } else if (this.currentMatchIndex >= this.searchMatches.length) {
            this.currentMatchIndex = 0;
        }

        this.updateSearchHighlight();
        this.searchCount.textContent = `${this.currentMatchIndex + 1} of ${this.searchMatches.length}`;
    }

    updateSearchHighlight() {
        // Remove current highlight from all
        this.searchMatches.forEach(match => match.classList.remove('search-current'));

        // Add current highlight to current match
        if (this.currentMatchIndex >= 0 && this.currentMatchIndex < this.searchMatches.length) {
            const currentMatch = this.searchMatches[this.currentMatchIndex];
            currentMatch.classList.add('search-current');

            // Expand any collapsed parents
            let parent = currentMatch.parentElement;
            while (parent && parent !== this.jsonOutput) {
                if (parent.classList.contains('json-children') && parent.classList.contains('collapsed')) {
                    parent.classList.remove('collapsed');
                    const path = parent.getAttribute('data-path');
                    const toggle = this.jsonOutput.querySelector(`.json-toggle[data-path="${path}"]`);
                    if (toggle) {
                        toggle.textContent = '−';
                        toggle.setAttribute('aria-expanded', 'true');
                    }
                }
                parent = parent.parentElement;
            }

            // Scroll into view
            currentMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    clearSearchHighlights() {
        const marks = this.jsonOutput.querySelectorAll('mark.search-match');
        if (marks.length === 0) return;
        const parents = new Set();
        marks.forEach(mark => {
            parents.add(mark.parentNode);
            mark.replaceWith(document.createTextNode(mark.textContent));
        });
        parents.forEach(parent => parent.normalize());
    }

    // ==================== HISTORY METHODS ====================

    loadHistory() {
        try {
            const saved = localStorage.getItem(this.historyKey);
            this.history = saved ? JSON.parse(saved) : [];
        } catch (err) {
            this.history = [];
        }
        this.renderHistory();
    }

    saveHistory() {
        try {
            let serialized = JSON.stringify(this.history);
            // Trim oldest entries until under budget
            while (serialized.length > this.MAX_HISTORY_BYTES && this.history.length > 1) {
                this.history.pop();
                serialized = JSON.stringify(this.history);
            }
            localStorage.setItem(this.historyKey, serialized);
        } catch (err) {
            // QuotaExceededError: drop oldest entry and retry once
            if (this.history.length > 1) {
                this.history.pop();
                try {
                    localStorage.setItem(this.historyKey, JSON.stringify(this.history));
                } catch (_) { /* give up */ }
            }
        }
    }

    addToHistory(data, type = 'json') {
        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type: type,
            data: data
        };

        // Determine uniqueness and preview based on type
        let uniqueKey;
        if (type === 'json') {
            uniqueKey = data.content;
            entry.size = data.content.length;
            entry.preview = data.content.substring(0, 100).replace(/\s+/g, ' ');
        } else if (type === 'compare') {
            uniqueKey = data.original + '|' + data.modified;
            entry.size = data.original.length + data.modified.length;
            entry.preview = `Compare: ${data.original.substring(0, 30)}... vs ${data.modified.substring(0, 30)}...`.replace(/\s+/g, ' ');
        }

        // Check duplicates
        const existingIndex = this.history.findIndex(h => {
            if (h.type !== type) return false;
            if (type === 'json') return h.data.content === uniqueKey;
            if (type === 'compare') return (h.data.original + '|' + h.data.modified) === uniqueKey;
            return false;
        });

        if (existingIndex >= 0) {
            this.history.splice(existingIndex, 1);
        }

        this.history.unshift(entry);

        if (this.history.length > this.maxHistoryItems) {
            this.history = this.history.slice(0, this.maxHistoryItems);
        }

        this.saveHistory();
        this.renderHistory();
    }

    loadFromHistory(index) {
        const entry = this.history[index];
        if (!entry) return;

        // Migrate old format if necessary
        const type = entry.type || 'json';
        const data = entry.data || { content: entry.json }; // Handle legacy

        if (type === 'json') {
            // Switch to JSON tab
            document.querySelector('.nav-tab[data-tab="jsonViewer"]').click();

            this.jsonInput.value = data.content;
            this.updateCharCount();
            this.formatAndView();
        } else if (type === 'compare') {
            // Switch to Compare tab
            document.querySelector('.nav-tab[data-tab="textComparer"]').click();

            this.originalInput.value = data.original;
            this.modifiedInput.value = data.modified;
            this.compareText(false); // Pass false to avoid saving to history again
        }

        this.toggleHistory();
    }

    deleteFromHistory(index) {
        this.history.splice(index, 1);
        this.saveHistory();
        this.renderHistory();
    }

    clearHistory() {
        if (confirm('Clear all history?')) {
            this.history = [];
            this.saveHistory();
            this.renderHistory();
        }
    }

    toggleHistory() {
        this.historySidebar.classList.toggle('hidden');
    }

    renderHistory() {
        if (this.history.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'history-empty';
            empty.textContent = 'No history yet';
            this.historyList.replaceChildren(empty);
            return;
        }

        const fragment = document.createDocumentFragment();
        this.history.forEach((entry, index) => {
            const date = new Date(entry.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

            let size = entry.size;
            let preview = entry.preview;
            const type = entry.type || 'json';

            if (!entry.data && entry.json) {
                size = entry.json.length;
                preview = entry.json.substring(0, 100).replace(/\s+/g, ' ');
            }

            const sizeStr = size > 1000 ? `${(size / 1000).toFixed(1)}KB` : `${size}B`;

            const item = document.createElement('div');
            item.className = 'history-item';
            item.setAttribute('data-index', String(index));

            const header = document.createElement('div');
            header.className = 'history-item-header';
            header.appendChild(this._span('history-time', `${dateStr} ${timeStr}`));
            const typeLabel = document.createElement('span');
            typeLabel.className = type === 'compare' ? 'history-type type-compare' : 'history-type type-json';
            typeLabel.textContent = type === 'compare' ? 'DIFF' : 'JSON';
            header.appendChild(typeLabel);
            header.appendChild(this._span('history-size', sizeStr));
            item.appendChild(header);

            item.appendChild(this._span('history-preview', preview || ''));

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'history-delete';
            deleteBtn.setAttribute('data-index', String(index));
            deleteBtn.setAttribute('title', 'Delete');
            deleteBtn.setAttribute('aria-label', 'Delete history entry');
            deleteBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
            item.appendChild(deleteBtn);

            fragment.appendChild(item);
        });
        this.historyList.replaceChildren(fragment);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new JSONViewer();
});
