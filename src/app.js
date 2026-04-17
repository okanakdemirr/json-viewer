import { createTreeNode, renderLazyChildren } from './treeRender.js';
import { isImageUrl } from './utils.js';
import { copyWithFeedback } from './clipboard.js';
import { Search } from './search.js';
import { Gallery } from './gallery.js';
import { HistoryPanel } from './history.js';
import { Comparer } from './compare.js';

class JSONViewer {
    constructor() {
        this.jsonData = null;
        this.imageData = [];
        this.showImages = true;
        this.stats = { keys: 0, arrays: 0, objects: 0, urls: 0, images: 0 };

        this._bindElements();
        this._bindEvents();

        this.search = new Search({
            searchBar: this.searchBar,
            searchInput: this.searchInput,
            searchCount: this.searchCount,
            searchPrev: this.searchPrev,
            searchNext: this.searchNext,
            searchClose: this.searchClose,
            jsonOutput: this.jsonOutput,
        });

        this.gallery = new Gallery(
            {
                imageGallery: this.imageGallery,
                galleryImage: this.galleryImage,
                galleryPath: this.galleryPath,
                galleryUrl: this.galleryUrl,
                galleryThumbs: this.galleryThumbs,
                closeGallery: this.closeGallery,
                prevImage: this.prevImage,
                nextImage: this.nextImage,
                copyPathBtn: this.copyPathBtn,
                copyUrlBtn: this.copyUrlBtn,
            },
            () => this.imageData
        );

        this.history = new HistoryPanel(
            {
                historySidebar: this.historySidebar,
                historyList: this.historyList,
                historyToggleBtn: this.historyToggleBtn,
                clearHistoryBtn: this.clearHistoryBtn,
                closeHistoryBtn: this.closeHistoryBtn,
            },
            { onLoad: (type, data) => this._loadFromHistoryEntry(type, data) }
        );

        this.comparer = new Comparer(
            {
                originalInput: document.getElementById('originalInput'),
                modifiedInput: document.getElementById('modifiedInput'),
                compareBtn: document.getElementById('compareBtn'),
                clearCompareBtn: document.getElementById('clearCompareBtn'),
                diffResult: document.getElementById('diffResult'),
                compareOutput: document.getElementById('compareOutput'),
                pasteOriginalBtn: document.getElementById('pasteOriginalBtn'),
                pasteModifiedBtn: document.getElementById('pasteModifiedBtn'),
            },
            { onSave: (data) => this.history.add(data, 'compare') }
        );

        this._bindTabEvents();
        this._updateCharCount();
    }

    _bindElements() {
        this.jsonInput = document.getElementById('jsonInput');
        this.fileInput = document.getElementById('fileInput');
        this.formatBtn = document.getElementById('formatBtn');
        this.pasteBtn = document.getElementById('pasteBtn');
        this.copyInputBtn = document.getElementById('copyInputBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.charCount = document.getElementById('charCount');
        this.errorMessage = document.getElementById('errorMessage');

        this.outputSection = document.getElementById('outputSection');
        this.jsonOutput = document.getElementById('jsonOutput');
        this.rawOutput = document.getElementById('rawOutput');
        this.treeViewBtn = document.getElementById('treeViewBtn');
        this.rawViewBtn = document.getElementById('rawViewBtn');
        this.expandAllBtn = document.getElementById('expandAllBtn');
        this.collapseAllBtn = document.getElementById('collapseAllBtn');
        this.toggleImagesBtn = document.getElementById('toggleImagesBtn');
        this.copyBtn = document.getElementById('copyBtn');

        this.keyCountEl = document.getElementById('keyCount');
        this.arrayCountEl = document.getElementById('arrayCount');
        this.objectCountEl = document.getElementById('objectCount');
        this.urlCountEl = document.getElementById('urlCount');
        this.imageCountEl = document.getElementById('imageCount');

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

        this.searchBar = document.getElementById('searchBar');
        this.searchInput = document.getElementById('searchInput');
        this.searchCount = document.getElementById('searchCount');
        this.searchPrev = document.getElementById('searchPrev');
        this.searchNext = document.getElementById('searchNext');
        this.searchClose = document.getElementById('searchClose');

        this.historyToggleBtn = document.getElementById('historyToggleBtn');
        this.historySidebar = document.getElementById('historySidebar');
        this.historyList = document.getElementById('historyList');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.closeHistoryBtn = document.getElementById('closeHistoryBtn');
    }

    _bindEvents() {
        this.jsonInput.addEventListener('input', () => this._updateCharCount());
        this.formatBtn.addEventListener('click', () => this.formatAndView());
        this.pasteBtn.addEventListener('click', () => this._pasteFromClipboard());
        this.copyInputBtn.addEventListener('click', () => this._copyInput());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.fileInput.addEventListener('change', (e) => this._handleFileUpload(e));

        this.treeViewBtn.addEventListener('click', () => this._switchView('tree'));
        this.rawViewBtn.addEventListener('click', () => this._switchView('raw'));

        this.expandAllBtn.addEventListener('click', () => this.expandAll());
        this.collapseAllBtn.addEventListener('click', () => this.collapseAll());
        this.toggleImagesBtn.addEventListener('click', () => this._toggleImagePreviews());
        this.copyBtn.addEventListener('click', () => this._copyOutput());

        document.addEventListener('keydown', (e) => this._handleKeyboard(e));

        this.jsonOutput.addEventListener('click', (e) => {
            const toggle = e.target.closest('.json-toggle');
            if (toggle) {
                e.stopPropagation();
                this._toggleNode(toggle);
                return;
            }
            const thumb = e.target.closest('.image-thumb');
            if (thumb) {
                this.gallery.open(parseInt(thumb.getAttribute('data-index')));
                return;
            }
            const url = e.target.closest('.json-url');
            if (url) {
                const urlStr = url.getAttribute('data-url');
                if (isImageUrl(urlStr)) {
                    const idx = this.imageData.findIndex((d) => d.url === urlStr);
                    if (idx >= 0) {
                        this.gallery.open(idx);
                    } else {
                        this.imageData.push({ url: urlStr, path: url.getAttribute('data-path') });
                        this.gallery.open(this.imageData.length - 1);
                    }
                } else {
                    window.open(urlStr, '_blank');
                }
            }
        });
    }

    _bindTabEvents() {
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                tabs.forEach((t) => t.classList.remove('active'));
                tab.classList.add('active');

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

    formatAndView() {
        const input = this.jsonInput.value.trim();
        if (!input) {
            this._showError('Please enter some JSON data.');
            return;
        }
        try {
            this.jsonData = JSON.parse(input);
            this.errorMessage.classList.add('hidden');
            this.history.add({ content: input }, 'json');
            this._renderJSON();
        } catch (err) {
            this._showError(`Invalid JSON: ${err.message}`);
        }
    }

    _renderJSON() {
        this.stats = { keys: 0, arrays: 0, objects: 0, urls: 0, images: 0 };
        this.imageData = [];
        const ctx = this._treeCtx();
        this.jsonOutput.replaceChildren(createTreeNode(this.jsonData, '', true, 0, ctx));
        this.rawOutput.textContent = JSON.stringify(this.jsonData, null, 2);
        this._updateStats();
        this.outputSection.classList.remove('hidden');
        this.outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    _treeCtx() {
        return {
            jsonData: this.jsonData,
            stats: this.stats,
            imageData: this.imageData,
            showImages: this.showImages,
        };
    }

    _updateStats() {
        this.keyCountEl.textContent = this.stats.keys.toLocaleString();
        this.arrayCountEl.textContent = this.stats.arrays.toLocaleString();
        this.objectCountEl.textContent = this.stats.objects.toLocaleString();
        this.urlCountEl.textContent = this.stats.urls.toLocaleString();
        this.imageCountEl.textContent = this.stats.images.toLocaleString();
    }

    _toggleNode(button) {
        const path = button.getAttribute('data-path');
        const children = this.jsonOutput.querySelector(`.json-children[data-path="${path}"]`);
        if (!children) return;
        const isCollapsed = children.classList.toggle('collapsed');
        button.textContent = isCollapsed ? '+' : '−';
        button.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
        if (!isCollapsed && children.getAttribute('data-lazy') === 'true') {
            renderLazyChildren(path, children, this._treeCtx());
        }
    }

    expandAll() {
        this._expandGen = (this._expandGen || 0) + 1;
        const gen = this._expandGen;
        const finish = () => {
            this.jsonOutput
                .querySelectorAll('.json-children.collapsed')
                .forEach((el) => el.classList.remove('collapsed'));
            this.jsonOutput.querySelectorAll('.json-toggle').forEach((t) => {
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
            const ctx = this._treeCtx();
            const nextLevel = [];
            nodes.forEach((child) => {
                const path = child.getAttribute('data-path');
                child.classList.remove('collapsed');
                renderLazyChildren(path, child, ctx);
                child.querySelectorAll('.json-children[data-lazy="true"]').forEach((d) => nextLevel.push(d));
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
        this._expandGen = (this._expandGen || 0) + 1;
        this.jsonOutput.querySelectorAll('.json-children').forEach((child) => child.classList.add('collapsed'));
        this.jsonOutput.querySelectorAll('.json-toggle').forEach((toggle) => {
            toggle.textContent = '+';
            toggle.setAttribute('aria-expanded', 'false');
        });
    }

    _toggleImagePreviews() {
        this.showImages = !this.showImages;
        if (this.showImages) {
            this.toggleImagesBtn.classList.add('active');
            this.toggleImagesBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                </svg>
                Images On
            `;
        } else {
            this.toggleImagesBtn.classList.remove('active');
            this.toggleImagesBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                    <line x1="2" y1="2" x2="22" y2="22"/>
                </svg>
                Images Off
            `;
        }

        this.jsonOutput.querySelectorAll('.json-image-preview').forEach((preview) => {
            preview.style.display = this.showImages ? 'flex' : 'none';
        });
        this.jsonOutput.querySelectorAll('.json-url').forEach((urlEl) => {
            const urlStr = urlEl.getAttribute('data-url');
            if (isImageUrl(urlStr)) {
                urlEl.style.display = this.showImages ? 'none' : 'inline';
            }
        });
    }

    _switchView(view) {
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

    clearAll() {
        this.jsonInput.value = '';
        this.jsonData = null;
        this.imageData = [];
        this.outputSection.classList.add('hidden');
        this.errorMessage.classList.add('hidden');
        this._updateCharCount();
    }

    _handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.jsonInput.value = e.target.result;
            this._updateCharCount();
            this.formatAndView();
        };
        reader.onerror = () => {
            this._showError('Failed to read file. Please try again.');
        };
        reader.readAsText(file);
    }

    async _pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            this.jsonInput.value = text;
            this._updateCharCount();
        } catch {
            this._showError('Unable to paste from clipboard. Please paste manually.');
        }
    }

    async _copyInput() {
        const text = this.jsonInput.value;
        if (!text) return;
        const ok = await copyWithFeedback(text, this.copyInputBtn, {
            successHTML: `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Copied!
            `,
        });
        if (!ok) this._showError('Failed to copy to clipboard');
    }

    async _copyOutput() {
        const text = JSON.stringify(this.jsonData, null, 2);
        await copyWithFeedback(text, this.copyBtn, {
            className: null,
            successHTML: `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copied!
            `,
        });
    }

    _showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
    }

    _updateCharCount() {
        const count = this.jsonInput.value.length;
        this.charCount.textContent = `${count.toLocaleString()} characters`;
    }

    _handleKeyboard(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            if (!this.outputSection.classList.contains('hidden')) {
                e.preventDefault();
                this.search.open();
            }
        }
        if (e.key === 'Escape' && this.search.isOpen) {
            this.search.close();
            return;
        }
        if (e.key === 'Escape' && this.gallery.isOpen()) {
            this.gallery.close();
        }
        if (this.gallery.isOpen()) {
            if (e.key === 'ArrowLeft') this.gallery.navigate(-1);
            else if (e.key === 'ArrowRight') this.gallery.navigate(1);
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.formatAndView();
        }
    }

    _loadFromHistoryEntry(type, data) {
        if (type === 'json') {
            document.querySelector('.nav-tab[data-tab="jsonViewer"]').click();
            this.jsonInput.value = data.content;
            this._updateCharCount();
            this.formatAndView();
        } else if (type === 'compare') {
            document.querySelector('.nav-tab[data-tab="textComparer"]').click();
            this.comparer.setInputs(data.original, data.modified);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new JSONViewer());
