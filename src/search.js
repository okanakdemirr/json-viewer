const DEBOUNCE_MS = 250;

export class Search {
    constructor({ searchBar, searchInput, searchCount, searchPrev, searchNext, searchClose, jsonOutput }) {
        this.searchBar = searchBar;
        this.searchInput = searchInput;
        this.searchCount = searchCount;
        this.searchPrev = searchPrev;
        this.searchNext = searchNext;
        this.searchClose = searchClose;
        this.jsonOutput = jsonOutput;

        this.matches = [];
        this.currentIndex = -1;
        this.isOpen = false;
        this._debounceTimer = null;

        this._bindEvents();
    }

    _bindEvents() {
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = setTimeout(() => this.perform(), DEBOUNCE_MS);
        });
        this.searchPrev.addEventListener('click', () => this.navigate(-1));
        this.searchNext.addEventListener('click', () => this.navigate(1));
        this.searchClose.addEventListener('click', () => this.close());
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.navigate(e.shiftKey ? -1 : 1);
            } else if (e.key === 'Escape') {
                this.close();
            }
        });
    }

    open() {
        this.isOpen = true;
        this.searchBar.classList.remove('hidden');
        this.searchInput.focus();
        this.searchInput.select();
    }

    close() {
        this.isOpen = false;
        this.searchBar.classList.add('hidden');
        this.searchInput.value = '';
        this.clearHighlights();
        this.matches = [];
        this.currentIndex = -1;
        this.searchCount.textContent = '';
    }

    perform() {
        const query = this.searchInput.value.trim().toLowerCase();
        this.clearHighlights();
        this.matches = [];
        this.currentIndex = -1;

        if (!query) {
            this.searchCount.textContent = '';
            return;
        }

        const walker = document.createTreeWalker(this.jsonOutput, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) {
            if (node.textContent.toLowerCase().includes(query)) textNodes.push(node);
        }

        textNodes.forEach((textNode) => {
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
                this.matches.push(mark);
                lastIndex = index + query.length;
            }

            if (lastIndex < text.length) {
                parts.push(document.createTextNode(text.substring(lastIndex)));
            }

            if (parts.length > 0) {
                const parent = textNode.parentNode;
                parts.forEach((part) => parent.insertBefore(part, textNode));
                parent.removeChild(textNode);
            }
        });

        if (this.matches.length > 0) {
            this.currentIndex = 0;
            this._updateHighlight();
            this.searchCount.textContent = `1 of ${this.matches.length}`;
        } else {
            this.searchCount.textContent = 'No matches';
        }
    }

    navigate(direction) {
        if (this.matches.length === 0) return;
        this.currentIndex += direction;
        if (this.currentIndex < 0) this.currentIndex = this.matches.length - 1;
        else if (this.currentIndex >= this.matches.length) this.currentIndex = 0;
        this._updateHighlight();
        this.searchCount.textContent = `${this.currentIndex + 1} of ${this.matches.length}`;
    }

    _updateHighlight() {
        this.matches.forEach((m) => m.classList.remove('search-current'));
        if (this.currentIndex < 0 || this.currentIndex >= this.matches.length) return;

        const current = this.matches[this.currentIndex];
        current.classList.add('search-current');

        let parent = current.parentElement;
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

        current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    clearHighlights() {
        const marks = this.jsonOutput.querySelectorAll('mark.search-match');
        if (marks.length === 0) return;
        const parents = new Set();
        marks.forEach((mark) => {
            parents.add(mark.parentNode);
            mark.replaceWith(document.createTextNode(mark.textContent));
        });
        parents.forEach((parent) => parent.normalize());
    }
}
