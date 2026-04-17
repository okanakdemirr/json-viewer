import { span } from './utils.js';

export const HISTORY_STORAGE_KEY = 'json-viewer-history';
export const MAX_HISTORY_ITEMS = 10;
export const MAX_HISTORY_BYTES = 4 * 1024 * 1024;

export function previewFor(type, data) {
    if (type === 'json') {
        return {
            size: data.content.length,
            preview: data.content.substring(0, 100).replace(/\s+/g, ' '),
            uniqueKey: data.content,
        };
    }
    if (type === 'compare') {
        return {
            size: data.original.length + data.modified.length,
            preview: `Compare: ${data.original.substring(0, 30)}... vs ${data.modified.substring(0, 30)}...`.replace(
                /\s+/g,
                ' '
            ),
            uniqueKey: data.original + '|' + data.modified,
        };
    }
    return { size: 0, preview: '', uniqueKey: '' };
}

export function dedupeAndInsert(entries, entry, type, uniqueKey, max) {
    const existingIndex = entries.findIndex((h) => {
        if (h.type !== type) return false;
        if (type === 'json') return h.data.content === uniqueKey;
        if (type === 'compare') return h.data.original + '|' + h.data.modified === uniqueKey;
        return false;
    });
    if (existingIndex >= 0) entries.splice(existingIndex, 1);
    entries.unshift(entry);
    if (entries.length > max) entries.length = max;
    return entries;
}

export class HistoryPanel {
    constructor(els, { onLoad }) {
        this.historySidebar = els.historySidebar;
        this.historyList = els.historyList;
        this.historyToggleBtn = els.historyToggleBtn;
        this.clearHistoryBtn = els.clearHistoryBtn;
        this.closeHistoryBtn = els.closeHistoryBtn;
        this.onLoad = onLoad;

        this.entries = [];
        this._bindEvents();
        this._load();
    }

    _bindEvents() {
        this.historyToggleBtn.addEventListener('click', () => this.toggle());
        this.closeHistoryBtn.addEventListener('click', () => this.toggle());
        this.clearHistoryBtn.addEventListener('click', () => this.clearAll());
        this.historyList.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.history-delete');
            if (deleteBtn) {
                e.stopPropagation();
                const index = parseInt(deleteBtn.getAttribute('data-index'));
                this._deleteAt(index);
                return;
            }
            const item = e.target.closest('.history-item');
            if (item) {
                const index = parseInt(item.getAttribute('data-index'));
                this._loadAt(index);
            }
        });
    }

    _load() {
        try {
            const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
            this.entries = saved ? JSON.parse(saved) : [];
        } catch {
            this.entries = [];
        }
        this._render();
    }

    _save() {
        try {
            let serialized = JSON.stringify(this.entries);
            while (serialized.length > MAX_HISTORY_BYTES && this.entries.length > 1) {
                this.entries.pop();
                serialized = JSON.stringify(this.entries);
            }
            localStorage.setItem(HISTORY_STORAGE_KEY, serialized);
        } catch {
            if (this.entries.length > 1) {
                this.entries.pop();
                try {
                    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this.entries));
                } catch {
                    /* give up */
                }
            }
        }
    }

    add(data, type = 'json') {
        const meta = previewFor(type, data);
        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type,
            data,
            size: meta.size,
            preview: meta.preview,
        };
        dedupeAndInsert(this.entries, entry, type, meta.uniqueKey, MAX_HISTORY_ITEMS);
        this._save();
        this._render();
    }

    _loadAt(index) {
        const entry = this.entries[index];
        if (!entry) return;
        const type = entry.type || 'json';
        const data = entry.data || { content: entry.json };
        this.onLoad(type, data);
        this.toggle();
    }

    _deleteAt(index) {
        this.entries.splice(index, 1);
        this._save();
        this._render();
    }

    clearAll() {
        if (confirm('Clear all history?')) {
            this.entries = [];
            this._save();
            this._render();
        }
    }

    toggle() {
        this.historySidebar.classList.toggle('hidden');
    }

    _render() {
        if (this.entries.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'history-empty';
            empty.textContent = 'No history yet';
            this.historyList.replaceChildren(empty);
            return;
        }

        const fragment = document.createDocumentFragment();
        this.entries.forEach((entry, index) => {
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
            header.appendChild(span('history-time', `${dateStr} ${timeStr}`));
            const typeLabel = document.createElement('span');
            typeLabel.className = type === 'compare' ? 'history-type type-compare' : 'history-type type-json';
            typeLabel.textContent = type === 'compare' ? 'DIFF' : 'JSON';
            header.appendChild(typeLabel);
            header.appendChild(span('history-size', sizeStr));
            item.appendChild(header);

            item.appendChild(span('history-preview', preview || ''));

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'history-delete';
            deleteBtn.setAttribute('data-index', String(index));
            deleteBtn.setAttribute('title', 'Delete');
            deleteBtn.setAttribute('aria-label', 'Delete history entry');
            deleteBtn.innerHTML =
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
            item.appendChild(deleteBtn);

            fragment.appendChild(item);
        });
        this.historyList.replaceChildren(fragment);
    }
}
