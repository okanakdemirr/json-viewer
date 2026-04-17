import { copyWithFeedback } from './clipboard.js';

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export class Gallery {
    constructor(els, getImageData) {
        this.imageGallery = els.imageGallery;
        this.galleryImage = els.galleryImage;
        this.galleryPath = els.galleryPath;
        this.galleryUrl = els.galleryUrl;
        this.galleryThumbs = els.galleryThumbs;
        this.closeGallery = els.closeGallery;
        this.prevImage = els.prevImage;
        this.nextImage = els.nextImage;
        this.copyPathBtn = els.copyPathBtn;
        this.copyUrlBtn = els.copyUrlBtn;
        this.getImageData = getImageData;

        this.currentIndex = 0;
        this._lastFocused = null;
        this._keyTrap = null;

        this._bindEvents();
    }

    _bindEvents() {
        this.closeGallery.addEventListener('click', () => this.close());
        this.prevImage.addEventListener('click', () => this.navigate(-1));
        this.nextImage.addEventListener('click', () => this.navigate(1));
        this.copyPathBtn.addEventListener('click', () => this._copyText('path'));
        this.copyUrlBtn.addEventListener('click', () => this._copyText('url'));
        this.galleryThumbs.addEventListener('click', (e) => {
            const thumb = e.target.closest('img');
            if (thumb && thumb.dataset.index !== undefined) {
                this.currentIndex = parseInt(thumb.dataset.index);
                this._updateImage();
            }
        });
    }

    isOpen() {
        return !this.imageGallery.classList.contains('hidden');
    }

    open(index) {
        const data = this.getImageData();
        if (data.length === 0) return;
        this.currentIndex = index;
        this._updateImage();
        this._renderThumbs();
        this.imageGallery.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        this._lastFocused = document.activeElement;
        if (!this._keyTrap) {
            this._keyTrap = (e) => {
                if (e.key !== 'Tab') return;
                const focusable = this.imageGallery.querySelectorAll(FOCUSABLE_SELECTOR);
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
        this.imageGallery.addEventListener('keydown', this._keyTrap);
        requestAnimationFrame(() => this.closeGallery.focus());
    }

    close() {
        this.imageGallery.classList.add('hidden');
        document.body.style.overflow = '';
        if (this._keyTrap) this.imageGallery.removeEventListener('keydown', this._keyTrap);
        const target = this._lastFocused;
        this._lastFocused = null;
        if (target && typeof target.focus === 'function' && document.contains(target)) {
            target.focus();
        }
    }

    navigate(direction) {
        const data = this.getImageData();
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < data.length) {
            this.currentIndex = newIndex;
            this._updateImage();
        }
    }

    _updateImage() {
        const data = this.getImageData();
        const info = data[this.currentIndex];
        this.galleryImage.src = info.url;
        this.galleryImage.alt = info.path ? `Image at ${info.path}` : 'Image preview';
        this.galleryImage.referrerPolicy = 'no-referrer';
        this.galleryPath.textContent = info.path || 'root';
        this.galleryUrl.textContent = info.url;
        this.prevImage.disabled = this.currentIndex === 0;
        this.nextImage.disabled = this.currentIndex === data.length - 1;
        const thumbs = this.galleryThumbs.querySelectorAll('img');
        thumbs.forEach((thumb, i) => thumb.classList.toggle('active', i === this.currentIndex));
    }

    _renderThumbs() {
        const data = this.getImageData();
        const fragment = document.createDocumentFragment();
        data.forEach((item, index) => {
            const img = document.createElement('img');
            img.src = item.url;
            if (index === this.currentIndex) img.className = 'active';
            img.setAttribute('data-index', String(index));
            img.alt = 'Thumbnail';
            fragment.appendChild(img);
        });
        this.galleryThumbs.replaceChildren(fragment);
    }

    async _copyText(type) {
        const data = this.getImageData();
        const info = data[this.currentIndex];
        const text = type === 'path' ? info.path : info.url;
        const btn = type === 'path' ? this.copyPathBtn : this.copyUrlBtn;
        await copyWithFeedback(text, btn);
    }
}
