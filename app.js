// JSON Viewer Application
class JSONViewer {
    constructor() {
        this.jsonData = null;
        this.imageData = []; // Stores {url, path} objects
        this.currentImageIndex = 0;
        this.showImages = true;
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

        // History state
        this.history = [];
        this.maxHistoryItems = 20;
        this.historyKey = 'json-viewer-history';

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
        this.sampleBtn = document.getElementById('sampleBtn');
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

        // Search events
        this.searchInput.addEventListener('input', () => this.performSearch());
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

        // Initial char count
        this.updateCharCount();
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

    loadSample() {
        const sampleData = {
            "product": {
                "id": "prod_12345",
                "name": "Premium Headphones",
                "description": "High-quality wireless headphones with noise cancellation",
                "price": 299.99,
                "inStock": true,
                "category": null,
                "images": [
                    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
                    "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400",
                    "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400"
                ],
                "thumbnail": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200"
            },
            "reviews": [
                {
                    "user": "John Doe",
                    "avatar": "https://randomuser.me/api/portraits/men/1.jpg",
                    "rating": 5,
                    "comment": "Amazing sound quality!"
                },
                {
                    "user": "Jane Smith",
                    "avatar": "https://randomuser.me/api/portraits/women/2.jpg",
                    "rating": 4,
                    "comment": "Great product, comfortable fit."
                }
            ],
            "relatedProducts": [
                {
                    "id": "prod_67890",
                    "name": "Headphone Stand",
                    "image": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300",
                    "price": 49.99
                },
                {
                    "id": "prod_11111",
                    "name": "Carrying Case",
                    "image": "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=300",
                    "price": 29.99
                }
            ],
            "specifications": {
                "brand": "AudioPro",
                "model": "WH-1000XM5",
                "connectivity": ["Bluetooth 5.2", "3.5mm Jack", "USB-C"],
                "batteryLife": "30 hours",
                "weight": "250g",
                "colors": ["Black", "Silver", "Midnight Blue"]
            },
            "metadata": {
                "createdAt": "2024-01-15T10:30:00Z",
                "updatedAt": "2024-01-20T15:45:00Z",
                "views": 12543,
                "salesCount": 847
            }
        };

        this.jsonInput.value = JSON.stringify(sampleData, null, 2);
        this.updateCharCount();
        this.formatAndView();
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
            this.addToHistory(input);
            this.renderJSON();
        } catch (err) {
            this.showError(`Invalid JSON: ${err.message}`);
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
    }

    renderJSON() {
        // Reset stats
        this.stats = { keys: 0, arrays: 0, objects: 0, urls: 0, images: 0 };
        this.imageData = [];

        // Render tree view
        this.jsonOutput.innerHTML = this.createTreeHTML(this.jsonData, '', true);

        // Render raw view
        this.rawOutput.textContent = JSON.stringify(this.jsonData, null, 2);

        // Update stats
        this.updateStats();

        // Show output section
        this.outputSection.classList.remove('hidden');

        // Scroll to output section
        this.outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Bind toggle events
        this.bindToggleEvents();

        // Bind image click events
        this.bindImageEvents();
    }

    createTreeHTML(data, path, isLast = true) {
        const type = this.getType(data);
        let html = '';

        if (type === 'object') {
            this.stats.objects++;
            const keys = Object.keys(data);
            const isEmpty = keys.length === 0;

            html += `<span class="json-bracket">{</span>`;

            if (!isEmpty) {
                html += `<span class="json-count">${keys.length} ${keys.length === 1 ? 'key' : 'keys'}</span>`;
                html += `<div class="json-children" data-path="${path}">`;

                keys.forEach((key, index) => {
                    const isLastItem = index === keys.length - 1;
                    const childPath = path ? `${path}.${key}` : key;
                    this.stats.keys++;

                    html += `<div class="json-line">`;

                    // Add toggle button for nested objects/arrays
                    const childType = this.getType(data[key]);
                    if (childType === 'object' || childType === 'array') {
                        html += `<button class="json-toggle" data-path="${childPath}">−</button>`;
                    } else {
                        html += `<span style="width: 22px; display: inline-block;"></span>`;
                    }

                    html += `<span class="json-key">"${this.escapeHTML(key)}"</span>`;
                    html += `<span class="json-colon">:</span>`;
                    html += this.createTreeHTML(data[key], childPath, isLastItem);

                    if (!isLastItem) {
                        html += `<span class="json-comma">,</span>`;
                    }

                    html += `</div>`;
                });

                html += `</div>`;
            }

            html += `<span class="json-bracket">}</span>`;

        } else if (type === 'array') {
            this.stats.arrays++;
            const isEmpty = data.length === 0;

            html += `<span class="json-bracket">[</span>`;

            if (!isEmpty) {
                html += `<span class="json-count">${data.length} ${data.length === 1 ? 'item' : 'items'}</span>`;

                // Check if array contains image URLs
                const imageUrls = this.extractImageUrls(data);
                if (imageUrls.length > 0) {
                    html += this.createImagePreview(imageUrls);
                }

                html += `<div class="json-children" data-path="${path}">`;

                data.forEach((item, index) => {
                    const isLastItem = index === data.length - 1;
                    const childPath = `${path}[${index}]`;

                    html += `<div class="json-line">`;

                    const childType = this.getType(item);
                    if (childType === 'object' || childType === 'array') {
                        html += `<button class="json-toggle" data-path="${childPath}">−</button>`;
                    } else {
                        html += `<span style="width: 22px; display: inline-block;"></span>`;
                    }

                    html += `<span class="json-key">[${index}]</span>`;
                    html += `<span class="json-colon">:</span>`;
                    html += this.createTreeHTML(item, childPath, isLastItem);

                    if (!isLastItem) {
                        html += `<span class="json-comma">,</span>`;
                    }

                    html += `</div>`;
                });

                html += `</div>`;
            }

            html += `<span class="json-bracket">]</span>`;

        } else if (type === 'string') {
            const isUrl = this.isUrl(data);
            const isImageUrl = this.isImageUrl(data);

            if (isUrl) {
                this.stats.urls++;
                if (isImageUrl) {
                    this.stats.images++;
                    this.imageData.push({ url: data, path: path });
                }

                // Hide image URL text when images are shown (default)
                const hideStyle = isImageUrl && this.showImages ? ' style="display: none"' : '';
                html += `<span class="json-string json-url" data-url="${this.escapeHTML(data)}" data-path="${this.escapeHTML(path)}" title="Click to ${isImageUrl ? 'preview' : 'open'}"${hideStyle}>"${this.escapeHTML(this.truncateUrl(data))}"</span>`;

                // Add inline image preview for single image URLs
                if (isImageUrl) {
                    html += this.createImagePreview([{ url: data, path: path }]);
                }
            } else {
                html += `<span class="json-string">"${this.escapeHTML(data)}"</span>`;
            }

        } else if (type === 'number') {
            html += `<span class="json-number">${data}</span>`;

        } else if (type === 'boolean') {
            html += `<span class="json-boolean">${data}</span>`;

        } else if (type === 'null') {
            html += `<span class="json-null">null</span>`;
        }

        return html;
    }

    createImagePreview(imageItems) {
        if (imageItems.length === 0) return '';

        let html = '<div class="json-image-preview">';
        imageItems.forEach(item => {
            const index = this.imageData.findIndex(d => d.url === item.url && d.path === item.path);
            const actualIndex = index >= 0 ? index : this.imageData.length - 1;
            html += `<img class="image-thumb" src="${this.escapeHTML(item.url)}" data-index="${actualIndex}" alt="Preview" onerror="this.classList.add('error'); this.alt='Failed to load';">`;
        });
        html += '</div>';
        return html;
    }

    extractImageUrls(arr) {
        return arr.filter(item => typeof item === 'string' && this.isImageUrl(item));
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

        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif'];
        const lowerStr = str.toLowerCase();

        // Check file extension
        if (imageExtensions.some(ext => lowerStr.includes(ext))) {
            return true;
        }

        // Check common image hosting patterns
        const imagePatterns = [
            /unsplash\.com/i,
            /pexels\.com/i,
            /imgur\.com/i,
            /cloudinary\.com/i,
            /githubusercontent\.com/i,
            /randomuser\.me.*\/portraits/i,
            /picsum\.photos/i,
            /placeholder\.com/i,
            /via\.placeholder/i,
            /images\..*\.com/i,
            /img\..*\.com/i,
            /cdn\..*\.(jpg|jpeg|png|gif|webp)/i,
            /s3\..*amazonaws\.com.*\.(jpg|jpeg|png|gif|webp)/i
        ];

        return imagePatterns.some(pattern => pattern.test(str));
    }

    truncateUrl(url, maxLength = 60) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength - 3) + '...';
    }

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    updateStats() {
        this.keyCountEl.textContent = this.stats.keys.toLocaleString();
        this.arrayCountEl.textContent = this.stats.arrays.toLocaleString();
        this.objectCountEl.textContent = this.stats.objects.toLocaleString();
        this.urlCountEl.textContent = this.stats.urls.toLocaleString();
        this.imageCountEl.textContent = this.stats.images.toLocaleString();
    }

    bindToggleEvents() {
        const toggles = this.jsonOutput.querySelectorAll('.json-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNode(toggle);
            });
        });
    }

    toggleNode(button) {
        const path = button.getAttribute('data-path');
        const children = this.jsonOutput.querySelector(`.json-children[data-path="${path}"]`);

        if (children) {
            const isCollapsed = children.classList.toggle('collapsed');
            button.textContent = isCollapsed ? '+' : '−';
        }
    }

    bindImageEvents() {
        // Bind thumbnail clicks
        const thumbs = this.jsonOutput.querySelectorAll('.image-thumb');
        thumbs.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const index = parseInt(thumb.getAttribute('data-index'));
                this.openImageGallery(index);
            });
        });

        // Bind URL clicks
        const urls = this.jsonOutput.querySelectorAll('.json-url');
        urls.forEach(url => {
            url.addEventListener('click', () => {
                const urlStr = url.getAttribute('data-url');
                const pathStr = url.getAttribute('data-path');
                if (this.isImageUrl(urlStr)) {
                    const index = this.imageData.findIndex(d => d.url === urlStr);
                    if (index >= 0) {
                        this.openImageGallery(index);
                    } else {
                        this.imageData.push({ url: urlStr, path: pathStr });
                        this.openImageGallery(this.imageData.length - 1);
                    }
                } else {
                    window.open(urlStr, '_blank');
                }
            });
        });
    }

    openImageGallery(index) {
        if (this.imageData.length === 0) return;

        this.currentImageIndex = index;
        this.updateGalleryImage();
        this.renderGalleryThumbs();
        this.imageGallery.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    closeImageGallery() {
        this.imageGallery.classList.add('hidden');
        document.body.style.overflow = '';
    }

    updateGalleryImage() {
        const imageInfo = this.imageData[this.currentImageIndex];
        this.galleryImage.src = imageInfo.url;
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
        this.galleryThumbs.innerHTML = this.imageData.map((item, index) =>
            `<img src="${this.escapeHTML(item.url)}" class="${index === this.currentImageIndex ? 'active' : ''}" data-index="${index}" alt="Thumbnail">`
        ).join('');

        // Bind thumb clicks
        const thumbs = this.galleryThumbs.querySelectorAll('img');
        thumbs.forEach(thumb => {
            thumb.addEventListener('click', () => {
                this.currentImageIndex = parseInt(thumb.getAttribute('data-index'));
                this.updateGalleryImage();
            });
        });
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

        try {
            await navigator.clipboard.writeText(text);

            // Visual feedback
            btn.classList.add('copied');
            setTimeout(() => {
                btn.classList.remove('copied');
            }, 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
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
        const children = this.jsonOutput.querySelectorAll('.json-children');
        const toggles = this.jsonOutput.querySelectorAll('.json-toggle');

        children.forEach(child => child.classList.remove('collapsed'));
        toggles.forEach(toggle => toggle.textContent = '−');
    }

    collapseAll() {
        const children = this.jsonOutput.querySelectorAll('.json-children');
        const toggles = this.jsonOutput.querySelectorAll('.json-toggle');

        children.forEach(child => child.classList.add('collapsed'));
        toggles.forEach(toggle => toggle.textContent = '+');
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
        try {
            const text = JSON.stringify(this.jsonData, null, 2);
            await navigator.clipboard.writeText(text);

            // Show feedback
            const originalText = this.copyBtn.innerHTML;
            this.copyBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copied!
            `;

            setTimeout(() => {
                this.copyBtn.innerHTML = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
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
                    if (toggle) toggle.textContent = '−';
                }
                parent = parent.parentElement;
            }

            // Scroll into view
            currentMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    clearSearchHighlights() {
        const marks = this.jsonOutput.querySelectorAll('mark.search-match');
        marks.forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
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
            localStorage.setItem(this.historyKey, JSON.stringify(this.history));
        } catch (err) {
            console.error('Failed to save history:', err);
        }
    }

    addToHistory(jsonString) {
        // Create history entry
        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            json: jsonString,
            size: jsonString.length,
            preview: jsonString.substring(0, 100).replace(/\s+/g, ' ')
        };

        // Check if same JSON already exists (avoid duplicates)
        const existingIndex = this.history.findIndex(h => h.json === jsonString);
        if (existingIndex >= 0) {
            // Move to top
            this.history.splice(existingIndex, 1);
        }

        // Add to beginning
        this.history.unshift(entry);

        // Limit to max items
        if (this.history.length > this.maxHistoryItems) {
            this.history = this.history.slice(0, this.maxHistoryItems);
        }

        this.saveHistory();
        this.renderHistory();
    }

    loadFromHistory(index) {
        const entry = this.history[index];
        if (entry) {
            this.jsonInput.value = entry.json;
            this.updateCharCount();
            this.formatAndView();
            this.toggleHistory(); // Close sidebar
        }
    }

    deleteFromHistory(index, event) {
        event.stopPropagation();
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
            this.historyList.innerHTML = '<div class="history-empty">No history yet</div>';
            return;
        }

        this.historyList.innerHTML = this.history.map((entry, index) => {
            const date = new Date(entry.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            const sizeStr = entry.size > 1000 ? `${(entry.size / 1000).toFixed(1)}KB` : `${entry.size}B`;

            return `
                <div class="history-item" data-index="${index}">
                    <div class="history-item-header">
                        <span class="history-time">${dateStr} ${timeStr}</span>
                        <span class="history-size">${sizeStr}</span>
                    </div>
                    <div class="history-preview">${this.escapeHTML(entry.preview)}</div>
                    <button class="history-delete" data-index="${index}" title="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');

        // Bind click events
        this.historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.getAttribute('data-index'));
                this.loadFromHistory(index);
            });
        });

        this.historyList.querySelectorAll('.history-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(btn.getAttribute('data-index'));
                this.deleteFromHistory(index, e);
            });
        });
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new JSONViewer();
});
