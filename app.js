(() => {
  // src/utils.js
  var IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif"];
  var IMAGE_PATTERNS = [
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
  function getType(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value;
  }
  function isUrl(str) {
    try {
      const url = new URL(str);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }
  function isImageUrl(str) {
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
  function truncateUrl(url, maxLength = 60) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + "...";
  }
  function getThumbnailUrl(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes("unsplash.com")) {
        u.searchParams.set("w", "150");
        u.searchParams.set("q", "60");
        return u.toString();
      }
      if (u.hostname.includes("picsum.photos")) {
        return url.replace(/\/\d+(\/\d+)?/, "/150/100");
      }
      if (u.hostname.includes("placehold.co") || u.hostname.includes("via.placeholder.com")) {
        return url.replace(/\/\d+x?\d*/, "/150x100");
      }
    } catch {
    }
    return url;
  }
  function span(className, text) {
    const el = document.createElement("span");
    el.className = className;
    el.textContent = text;
    return el;
  }
  function getDataAtPath(jsonData, path) {
    if (!path) return jsonData;
    const parts = path.match(/[^.\[\]]+/g);
    let current = jsonData;
    for (const part of parts) {
      if (current === null || current === void 0) return void 0;
      current = current[part];
    }
    return current;
  }

  // src/treeRender.js
  var LAZY_DEPTH = 4;
  var LAZY_SIBLING_COUNT = 100;
  function willBeLazy(data, depth) {
    if (depth > LAZY_DEPTH) return true;
    const type = getType(data);
    if (type === "object") return Object.keys(data).length > LAZY_SIBLING_COUNT;
    if (type === "array") return data.length > LAZY_SIBLING_COUNT;
    return false;
  }
  function createTreeNode(data, path, isLast, depth, ctx) {
    const fragment = document.createDocumentFragment();
    const type = getType(data);
    if (type === "object") {
      ctx.stats.objects++;
      const keys = Object.keys(data);
      const isEmpty = keys.length === 0;
      const isLazy = depth > LAZY_DEPTH || keys.length > LAZY_SIBLING_COUNT;
      fragment.appendChild(span("json-bracket", "{"));
      if (!isEmpty) {
        fragment.appendChild(span("json-count", `${keys.length} ${keys.length === 1 ? "key" : "keys"}`));
        const children = document.createElement("div");
        children.className = isLazy ? "json-children collapsed" : "json-children";
        children.setAttribute("data-path", path);
        if (isLazy) {
          children.setAttribute("data-lazy", "true");
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
      fragment.appendChild(span("json-bracket", "}"));
    } else if (type === "array") {
      ctx.stats.arrays++;
      const isEmpty = data.length === 0;
      const isLazy = depth > LAZY_DEPTH || data.length > LAZY_SIBLING_COUNT;
      fragment.appendChild(span("json-bracket", "["));
      if (!isEmpty) {
        fragment.appendChild(span("json-count", `${data.length} ${data.length === 1 ? "item" : "items"}`));
        const children = document.createElement("div");
        children.className = isLazy ? "json-children collapsed" : "json-children";
        children.setAttribute("data-path", path);
        if (isLazy) {
          children.setAttribute("data-lazy", "true");
        } else {
          data.forEach((item, index) => {
            const isLastItem = index === data.length - 1;
            const childPath = `${path}[${index}]`;
            children.appendChild(buildChildLine(item, childPath, `[${index}]`, isLastItem, depth + 1, ctx));
          });
        }
        fragment.appendChild(children);
      }
      fragment.appendChild(span("json-bracket", "]"));
    } else if (type === "string") {
      const hasUrl = isUrl(data);
      const hasImage = isImageUrl(data);
      if (hasUrl) {
        ctx.stats.urls++;
        if (hasImage) {
          ctx.stats.images++;
          ctx.imageData.push({ url: data, path });
        }
        const urlSpan = document.createElement("span");
        urlSpan.className = "json-string json-url";
        urlSpan.setAttribute("data-url", data);
        urlSpan.setAttribute("data-path", path);
        urlSpan.setAttribute("title", `Click to ${hasImage ? "preview" : "open"}`);
        if (hasImage && ctx.showImages) urlSpan.style.display = "none";
        urlSpan.textContent = `"${truncateUrl(data)}"`;
        fragment.appendChild(urlSpan);
        if (hasImage) {
          fragment.appendChild(createImagePreviewNode([{ url: data, path }], ctx));
        }
      } else {
        fragment.appendChild(span("json-string", `"${data}"`));
      }
    } else if (type === "number") {
      fragment.appendChild(span("json-number", String(data)));
    } else if (type === "boolean") {
      fragment.appendChild(span("json-boolean", String(data)));
    } else if (type === "null") {
      fragment.appendChild(span("json-null", "null"));
    }
    return fragment;
  }
  function buildChildLine(data, childPath, keyLabel, isLast, depth, ctx) {
    const line = document.createElement("div");
    line.className = "json-line";
    const childType = getType(data);
    if (childType === "object" || childType === "array") {
      const lazy = willBeLazy(data, depth);
      const toggle = document.createElement("button");
      toggle.className = "json-toggle";
      toggle.setAttribute("data-path", childPath);
      toggle.setAttribute("aria-expanded", lazy ? "false" : "true");
      toggle.setAttribute("aria-label", "Toggle children");
      toggle.textContent = lazy ? "+" : "\u2212";
      line.appendChild(toggle);
    } else {
      const spacer = document.createElement("span");
      spacer.className = "json-toggle-spacer";
      line.appendChild(spacer);
    }
    line.appendChild(span("json-key", keyLabel));
    line.appendChild(span("json-colon", ":"));
    line.appendChild(createTreeNode(data, childPath, isLast, depth, ctx));
    if (!isLast) line.appendChild(span("json-comma", ","));
    return line;
  }
  function renderLazyChildren(path, container2, ctx) {
    container2.removeAttribute("data-lazy");
    const nodeData = getDataAtPath(ctx.jsonData, path);
    if (nodeData === void 0) return;
    const depth = path.split(/[.\[\]]/).filter(Boolean).length;
    const type = getType(nodeData);
    const fragment = document.createDocumentFragment();
    if (type === "object") {
      const keys = Object.keys(nodeData);
      keys.forEach((key, index) => {
        const isLastItem = index === keys.length - 1;
        const childPath = path ? `${path}.${key}` : key;
        fragment.appendChild(buildChildLine(nodeData[key], childPath, `"${key}"`, isLastItem, depth + 1, ctx));
      });
    } else if (type === "array") {
      nodeData.forEach((item, index) => {
        const isLastItem = index === nodeData.length - 1;
        const childPath = `${path}[${index}]`;
        fragment.appendChild(buildChildLine(item, childPath, `[${index}]`, isLastItem, depth + 1, ctx));
      });
    }
    container2.replaceChildren(fragment);
  }
  function createImagePreviewNode(imageItems, ctx) {
    const fragment = document.createDocumentFragment();
    if (imageItems.length === 0) return fragment;
    const container2 = document.createElement("div");
    container2.className = "json-image-preview";
    imageItems.forEach((item) => {
      if (!item || !item.url) return;
      const index = ctx.imageData.findIndex((d) => d.url === item.url && d.path === item.path);
      const actualIndex = index >= 0 ? index : ctx.imageData.length - 1;
      const img = document.createElement("img");
      img.className = "image-thumb";
      img.src = getThumbnailUrl(item.url);
      img.setAttribute("data-index", String(actualIndex));
      img.setAttribute("data-full-url", item.url);
      img.alt = "Preview";
      img.referrerPolicy = "no-referrer";
      img.loading = "lazy";
      img.addEventListener("error", () => img.classList.add("hidden"));
      container2.appendChild(img);
    });
    fragment.appendChild(container2);
    return fragment;
  }

  // src/clipboard.js
  async function copyWithFeedback(text, button, { successHTML = null, className = "copied", duration = 1500 } = {}) {
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
      console.error("Failed to copy:", err);
      return false;
    }
  }

  // src/search.js
  var DEBOUNCE_MS = 250;
  var Search = class {
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
      this.searchInput.addEventListener("input", () => {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this.perform(), DEBOUNCE_MS);
      });
      this.searchPrev.addEventListener("click", () => this.navigate(-1));
      this.searchNext.addEventListener("click", () => this.navigate(1));
      this.searchClose.addEventListener("click", () => this.close());
      this.searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.navigate(e.shiftKey ? -1 : 1);
        } else if (e.key === "Escape") {
          this.close();
        }
      });
    }
    open() {
      this.isOpen = true;
      this.searchBar.classList.remove("hidden");
      this.searchInput.focus();
      this.searchInput.select();
    }
    close() {
      this.isOpen = false;
      this.searchBar.classList.add("hidden");
      this.searchInput.value = "";
      this.clearHighlights();
      this.matches = [];
      this.currentIndex = -1;
      this.searchCount.textContent = "";
    }
    perform() {
      const query = this.searchInput.value.trim().toLowerCase();
      this.clearHighlights();
      this.matches = [];
      this.currentIndex = -1;
      if (!query) {
        this.searchCount.textContent = "";
        return;
      }
      const walker = document.createTreeWalker(this.jsonOutput, NodeFilter.SHOW_TEXT, null, false);
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
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
          const mark = document.createElement("mark");
          mark.className = "search-match";
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
        this.searchCount.textContent = "No matches";
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
      this.matches.forEach((m) => m.classList.remove("search-current"));
      if (this.currentIndex < 0 || this.currentIndex >= this.matches.length) return;
      const current = this.matches[this.currentIndex];
      current.classList.add("search-current");
      let parent = current.parentElement;
      while (parent && parent !== this.jsonOutput) {
        if (parent.classList.contains("json-children") && parent.classList.contains("collapsed")) {
          parent.classList.remove("collapsed");
          const path = parent.getAttribute("data-path");
          const toggle = this.jsonOutput.querySelector(`.json-toggle[data-path="${path}"]`);
          if (toggle) {
            toggle.textContent = "\u2212";
            toggle.setAttribute("aria-expanded", "true");
          }
        }
        parent = parent.parentElement;
      }
      current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    clearHighlights() {
      const marks = this.jsonOutput.querySelectorAll("mark.search-match");
      if (marks.length === 0) return;
      const parents = /* @__PURE__ */ new Set();
      marks.forEach((mark) => {
        parents.add(mark.parentNode);
        mark.replaceWith(document.createTextNode(mark.textContent));
      });
      parents.forEach((parent) => parent.normalize());
    }
  };

  // src/gallery.js
  var FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var Gallery = class {
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
      this.closeGallery.addEventListener("click", () => this.close());
      this.prevImage.addEventListener("click", () => this.navigate(-1));
      this.nextImage.addEventListener("click", () => this.navigate(1));
      this.copyPathBtn.addEventListener("click", () => this._copyText("path"));
      this.copyUrlBtn.addEventListener("click", () => this._copyText("url"));
      this.galleryThumbs.addEventListener("click", (e) => {
        const thumb = e.target.closest("img");
        if (thumb && thumb.dataset.index !== void 0) {
          this.currentIndex = parseInt(thumb.dataset.index);
          this._updateImage();
        }
      });
    }
    isOpen() {
      return !this.imageGallery.classList.contains("hidden");
    }
    open(index) {
      const data = this.getImageData();
      if (data.length === 0) return;
      this.currentIndex = index;
      this._updateImage();
      this._renderThumbs();
      this.imageGallery.classList.remove("hidden");
      document.body.style.overflow = "hidden";
      this._lastFocused = document.activeElement;
      if (!this._keyTrap) {
        this._keyTrap = (e) => {
          if (e.key !== "Tab") return;
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
      this.imageGallery.addEventListener("keydown", this._keyTrap);
      requestAnimationFrame(() => this.closeGallery.focus());
    }
    close() {
      this.imageGallery.classList.add("hidden");
      document.body.style.overflow = "";
      if (this._keyTrap) this.imageGallery.removeEventListener("keydown", this._keyTrap);
      const target = this._lastFocused;
      this._lastFocused = null;
      if (target && typeof target.focus === "function" && document.contains(target)) {
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
      this.galleryImage.alt = info.path ? `Image at ${info.path}` : "Image preview";
      this.galleryImage.referrerPolicy = "no-referrer";
      this.galleryPath.textContent = info.path || "root";
      this.galleryUrl.textContent = info.url;
      this.prevImage.disabled = this.currentIndex === 0;
      this.nextImage.disabled = this.currentIndex === data.length - 1;
      const thumbs = this.galleryThumbs.querySelectorAll("img");
      thumbs.forEach((thumb, i) => thumb.classList.toggle("active", i === this.currentIndex));
    }
    _renderThumbs() {
      const data = this.getImageData();
      const fragment = document.createDocumentFragment();
      data.forEach((item, index) => {
        const img = document.createElement("img");
        img.src = item.url;
        if (index === this.currentIndex) img.className = "active";
        img.setAttribute("data-index", String(index));
        img.alt = "Thumbnail";
        fragment.appendChild(img);
      });
      this.galleryThumbs.replaceChildren(fragment);
    }
    async _copyText(type) {
      const data = this.getImageData();
      const info = data[this.currentIndex];
      const text = type === "path" ? info.path : info.url;
      const btn = type === "path" ? this.copyPathBtn : this.copyUrlBtn;
      await copyWithFeedback(text, btn);
    }
  };

  // src/history.js
  var HISTORY_STORAGE_KEY = "json-viewer-history";
  var MAX_HISTORY_ITEMS = 10;
  var MAX_HISTORY_BYTES = 4 * 1024 * 1024;
  function previewFor(type, data) {
    if (type === "json") {
      return {
        size: data.content.length,
        preview: data.content.substring(0, 100).replace(/\s+/g, " "),
        uniqueKey: data.content
      };
    }
    if (type === "compare") {
      return {
        size: data.original.length + data.modified.length,
        preview: `Compare: ${data.original.substring(0, 30)}... vs ${data.modified.substring(0, 30)}...`.replace(
          /\s+/g,
          " "
        ),
        uniqueKey: data.original + "|" + data.modified
      };
    }
    return { size: 0, preview: "", uniqueKey: "" };
  }
  function dedupeAndInsert(entries, entry, type, uniqueKey, max) {
    const existingIndex = entries.findIndex((h) => {
      if (h.type !== type) return false;
      if (type === "json") return h.data.content === uniqueKey;
      if (type === "compare") return h.data.original + "|" + h.data.modified === uniqueKey;
      return false;
    });
    if (existingIndex >= 0) entries.splice(existingIndex, 1);
    entries.unshift(entry);
    if (entries.length > max) entries.length = max;
    return entries;
  }
  var HistoryPanel = class {
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
      this.historyToggleBtn.addEventListener("click", () => this.toggle());
      this.closeHistoryBtn.addEventListener("click", () => this.toggle());
      this.clearHistoryBtn.addEventListener("click", () => this.clearAll());
      this.historyList.addEventListener("click", (e) => {
        const deleteBtn = e.target.closest(".history-delete");
        if (deleteBtn) {
          e.stopPropagation();
          const index = parseInt(deleteBtn.getAttribute("data-index"));
          this._deleteAt(index);
          return;
        }
        const item = e.target.closest(".history-item");
        if (item) {
          const index = parseInt(item.getAttribute("data-index"));
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
          }
        }
      }
    }
    add(data, type = "json") {
      const meta = previewFor(type, data);
      const entry = {
        id: Date.now(),
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        type,
        data,
        size: meta.size,
        preview: meta.preview
      };
      dedupeAndInsert(this.entries, entry, type, meta.uniqueKey, MAX_HISTORY_ITEMS);
      this._save();
      this._render();
    }
    _loadAt(index) {
      const entry = this.entries[index];
      if (!entry) return;
      const type = entry.type || "json";
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
      if (confirm("Clear all history?")) {
        this.entries = [];
        this._save();
        this._render();
      }
    }
    toggle() {
      this.historySidebar.classList.toggle("hidden");
    }
    _render() {
      if (this.entries.length === 0) {
        const empty = document.createElement("div");
        empty.className = "history-empty";
        empty.textContent = "No history yet";
        this.historyList.replaceChildren(empty);
        return;
      }
      const fragment = document.createDocumentFragment();
      this.entries.forEach((entry, index) => {
        const date = new Date(entry.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
        let size = entry.size;
        let preview = entry.preview;
        const type = entry.type || "json";
        if (!entry.data && entry.json) {
          size = entry.json.length;
          preview = entry.json.substring(0, 100).replace(/\s+/g, " ");
        }
        const sizeStr = size > 1e3 ? `${(size / 1e3).toFixed(1)}KB` : `${size}B`;
        const item = document.createElement("div");
        item.className = "history-item";
        item.setAttribute("data-index", String(index));
        const header = document.createElement("div");
        header.className = "history-item-header";
        header.appendChild(span("history-time", `${dateStr} ${timeStr}`));
        const typeLabel = document.createElement("span");
        typeLabel.className = type === "compare" ? "history-type type-compare" : "history-type type-json";
        typeLabel.textContent = type === "compare" ? "DIFF" : "JSON";
        header.appendChild(typeLabel);
        header.appendChild(span("history-size", sizeStr));
        item.appendChild(header);
        item.appendChild(span("history-preview", preview || ""));
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "history-delete";
        deleteBtn.setAttribute("data-index", String(index));
        deleteBtn.setAttribute("title", "Delete");
        deleteBtn.setAttribute("aria-label", "Delete history entry");
        deleteBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        item.appendChild(deleteBtn);
        fragment.appendChild(item);
      });
      this.historyList.replaceChildren(fragment);
    }
  };

  // src/toast.js
  var container = null;
  function ensureContainer() {
    if (container) return container;
    container = document.createElement("div");
    container.className = "toast-container";
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
    return container;
  }
  function showToast(message, kind = "error", duration = 3e3) {
    const c = ensureContainer();
    const toast = document.createElement("div");
    toast.className = `toast toast-${kind}`;
    toast.textContent = message;
    c.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("visible"));
    setTimeout(() => {
      toast.classList.remove("visible");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  // src/compare.js
  var Comparer = class {
    constructor(els, { onSave }) {
      this.originalInput = els.originalInput;
      this.modifiedInput = els.modifiedInput;
      this.compareBtn = els.compareBtn;
      this.clearCompareBtn = els.clearCompareBtn;
      this.diffResult = els.diffResult;
      this.compareOutput = els.compareOutput;
      this.pasteOriginalBtn = els.pasteOriginalBtn;
      this.pasteModifiedBtn = els.pasteModifiedBtn;
      this.onSave = onSave;
      if (typeof Diff === "undefined") {
        this.compareBtn.disabled = true;
        this.compareBtn.title = "Diff library failed to load";
        this.diffResult.textContent = "Diff library failed to load. The comparer is unavailable.";
        this.compareOutput.classList.remove("hidden");
      } else {
        this.compareBtn.addEventListener("click", () => this.compare());
      }
      this.clearCompareBtn.addEventListener("click", () => this.clear());
      this.pasteOriginalBtn.addEventListener("click", async () => {
        try {
          this.originalInput.value = await navigator.clipboard.readText();
        } catch {
          showToast("Failed to paste content");
        }
      });
      this.pasteModifiedBtn.addEventListener("click", async () => {
        try {
          this.modifiedInput.value = await navigator.clipboard.readText();
        } catch {
          showToast("Failed to paste content");
        }
      });
    }
    compare(saveToHistory = true) {
      const original = this.originalInput.value;
      const modified = this.modifiedInput.value;
      if (!original && !modified) return;
      try {
        if (typeof Diff === "undefined") throw new Error("Diff library not loaded");
        const diff = Diff.diffWordsWithSpace(original, modified);
        const fragment = document.createDocumentFragment();
        diff.forEach((part) => {
          const el = document.createElement(part.added ? "ins" : part.removed ? "del" : "span");
          el.textContent = part.value;
          fragment.appendChild(el);
        });
        this.diffResult.replaceChildren(fragment);
        this.compareOutput.classList.remove("hidden");
      } catch (err) {
        console.error(err);
        showToast("Comparison failed: " + err.message);
      }
      if (saveToHistory) this.onSave({ original, modified });
    }
    setInputs(original, modified) {
      this.originalInput.value = original;
      this.modifiedInput.value = modified;
      this.compare(false);
    }
    clear() {
      this.originalInput.value = "";
      this.modifiedInput.value = "";
      this.diffResult.replaceChildren();
      this.compareOutput.classList.add("hidden");
    }
  };

  // src/app.js
  var JSONViewer = class {
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
        jsonOutput: this.jsonOutput
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
          copyUrlBtn: this.copyUrlBtn
        },
        () => this.imageData
      );
      this.history = new HistoryPanel(
        {
          historySidebar: this.historySidebar,
          historyList: this.historyList,
          historyToggleBtn: this.historyToggleBtn,
          clearHistoryBtn: this.clearHistoryBtn,
          closeHistoryBtn: this.closeHistoryBtn
        },
        { onLoad: (type, data) => this._loadFromHistoryEntry(type, data) }
      );
      this.comparer = new Comparer(
        {
          originalInput: document.getElementById("originalInput"),
          modifiedInput: document.getElementById("modifiedInput"),
          compareBtn: document.getElementById("compareBtn"),
          clearCompareBtn: document.getElementById("clearCompareBtn"),
          diffResult: document.getElementById("diffResult"),
          compareOutput: document.getElementById("compareOutput"),
          pasteOriginalBtn: document.getElementById("pasteOriginalBtn"),
          pasteModifiedBtn: document.getElementById("pasteModifiedBtn")
        },
        { onSave: (data) => this.history.add(data, "compare") }
      );
      this._bindTabEvents();
      this._updateCharCount();
    }
    _bindElements() {
      this.jsonInput = document.getElementById("jsonInput");
      this.fileInput = document.getElementById("fileInput");
      this.formatBtn = document.getElementById("formatBtn");
      this.pasteBtn = document.getElementById("pasteBtn");
      this.copyInputBtn = document.getElementById("copyInputBtn");
      this.clearBtn = document.getElementById("clearBtn");
      this.charCount = document.getElementById("charCount");
      this.errorMessage = document.getElementById("errorMessage");
      this.outputSection = document.getElementById("outputSection");
      this.jsonOutput = document.getElementById("jsonOutput");
      this.rawOutput = document.getElementById("rawOutput");
      this.treeViewBtn = document.getElementById("treeViewBtn");
      this.rawViewBtn = document.getElementById("rawViewBtn");
      this.expandAllBtn = document.getElementById("expandAllBtn");
      this.collapseAllBtn = document.getElementById("collapseAllBtn");
      this.toggleImagesBtn = document.getElementById("toggleImagesBtn");
      this.copyBtn = document.getElementById("copyBtn");
      this.keyCountEl = document.getElementById("keyCount");
      this.arrayCountEl = document.getElementById("arrayCount");
      this.objectCountEl = document.getElementById("objectCount");
      this.urlCountEl = document.getElementById("urlCount");
      this.imageCountEl = document.getElementById("imageCount");
      this.imageGallery = document.getElementById("imageGallery");
      this.galleryImage = document.getElementById("galleryImage");
      this.galleryPath = document.getElementById("galleryPath");
      this.galleryUrl = document.getElementById("galleryUrl");
      this.copyPathBtn = document.getElementById("copyPathBtn");
      this.copyUrlBtn = document.getElementById("copyUrlBtn");
      this.galleryThumbs = document.getElementById("galleryThumbs");
      this.closeGallery = document.getElementById("closeGallery");
      this.prevImage = document.getElementById("prevImage");
      this.nextImage = document.getElementById("nextImage");
      this.searchBar = document.getElementById("searchBar");
      this.searchInput = document.getElementById("searchInput");
      this.searchCount = document.getElementById("searchCount");
      this.searchPrev = document.getElementById("searchPrev");
      this.searchNext = document.getElementById("searchNext");
      this.searchClose = document.getElementById("searchClose");
      this.historyToggleBtn = document.getElementById("historyToggleBtn");
      this.historySidebar = document.getElementById("historySidebar");
      this.historyList = document.getElementById("historyList");
      this.clearHistoryBtn = document.getElementById("clearHistoryBtn");
      this.closeHistoryBtn = document.getElementById("closeHistoryBtn");
    }
    _bindEvents() {
      this.jsonInput.addEventListener("input", () => this._updateCharCount());
      this.formatBtn.addEventListener("click", () => this.formatAndView());
      this.pasteBtn.addEventListener("click", () => this._pasteFromClipboard());
      this.copyInputBtn.addEventListener("click", () => this._copyInput());
      this.clearBtn.addEventListener("click", () => this.clearAll());
      this.fileInput.addEventListener("change", (e) => this._handleFileUpload(e));
      this.treeViewBtn.addEventListener("click", () => this._switchView("tree"));
      this.rawViewBtn.addEventListener("click", () => this._switchView("raw"));
      this.expandAllBtn.addEventListener("click", () => this.expandAll());
      this.collapseAllBtn.addEventListener("click", () => this.collapseAll());
      this.toggleImagesBtn.addEventListener("click", () => this._toggleImagePreviews());
      this.copyBtn.addEventListener("click", () => this._copyOutput());
      document.addEventListener("keydown", (e) => this._handleKeyboard(e));
      this.jsonOutput.addEventListener("click", (e) => {
        const toggle = e.target.closest(".json-toggle");
        if (toggle) {
          e.stopPropagation();
          this._toggleNode(toggle);
          return;
        }
        const thumb = e.target.closest(".image-thumb");
        if (thumb) {
          this.gallery.open(parseInt(thumb.getAttribute("data-index")));
          return;
        }
        const url = e.target.closest(".json-url");
        if (url) {
          const urlStr = url.getAttribute("data-url");
          if (isImageUrl(urlStr)) {
            const idx = this.imageData.findIndex((d) => d.url === urlStr);
            if (idx >= 0) {
              this.gallery.open(idx);
            } else {
              this.imageData.push({ url: urlStr, path: url.getAttribute("data-path") });
              this.gallery.open(this.imageData.length - 1);
            }
          } else {
            window.open(urlStr, "_blank");
          }
        }
      });
    }
    _bindTabEvents() {
      const tabs = document.querySelectorAll(".nav-tab");
      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          tabs.forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");
          const tabId = tab.getAttribute("data-tab");
          document.getElementById("jsonViewerTab").classList.add("hidden");
          document.getElementById("textComparerTab").classList.add("hidden");
          if (tabId === "jsonViewer") {
            document.getElementById("jsonViewerTab").classList.remove("hidden");
          } else {
            document.getElementById("textComparerTab").classList.remove("hidden");
          }
        });
      });
    }
    formatAndView() {
      const input = this.jsonInput.value.trim();
      if (!input) {
        this._showError("Please enter some JSON data.");
        return;
      }
      try {
        this.jsonData = JSON.parse(input);
        this.errorMessage.classList.add("hidden");
        this.history.add({ content: input }, "json");
        this._renderJSON();
      } catch (err) {
        this._showError(`Invalid JSON: ${err.message}`);
      }
    }
    _renderJSON() {
      this.stats = { keys: 0, arrays: 0, objects: 0, urls: 0, images: 0 };
      this.imageData = [];
      const ctx = this._treeCtx();
      this.jsonOutput.replaceChildren(createTreeNode(this.jsonData, "", true, 0, ctx));
      this.rawOutput.textContent = JSON.stringify(this.jsonData, null, 2);
      this._updateStats();
      this.outputSection.classList.remove("hidden");
      this.outputSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    _treeCtx() {
      return {
        jsonData: this.jsonData,
        stats: this.stats,
        imageData: this.imageData,
        showImages: this.showImages
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
      const path = button.getAttribute("data-path");
      const children = this.jsonOutput.querySelector(`.json-children[data-path="${path}"]`);
      if (!children) return;
      const isCollapsed = children.classList.toggle("collapsed");
      button.textContent = isCollapsed ? "+" : "\u2212";
      button.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      if (!isCollapsed && children.getAttribute("data-lazy") === "true") {
        renderLazyChildren(path, children, this._treeCtx());
      }
    }
    expandAll() {
      this._expandGen = (this._expandGen || 0) + 1;
      const gen = this._expandGen;
      const finish = () => {
        this.jsonOutput.querySelectorAll(".json-children.collapsed").forEach((el) => el.classList.remove("collapsed"));
        this.jsonOutput.querySelectorAll(".json-toggle").forEach((t) => {
          t.textContent = "\u2212";
          t.setAttribute("aria-expanded", "true");
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
          const path = child.getAttribute("data-path");
          child.classList.remove("collapsed");
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
      this.jsonOutput.querySelectorAll(".json-children").forEach((child) => child.classList.add("collapsed"));
      this.jsonOutput.querySelectorAll(".json-toggle").forEach((toggle) => {
        toggle.textContent = "+";
        toggle.setAttribute("aria-expanded", "false");
      });
    }
    _toggleImagePreviews() {
      this.showImages = !this.showImages;
      if (this.showImages) {
        this.toggleImagesBtn.classList.add("active");
        this.toggleImagesBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                </svg>
                Images On
            `;
      } else {
        this.toggleImagesBtn.classList.remove("active");
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
      this.jsonOutput.querySelectorAll(".json-image-preview").forEach((preview) => {
        preview.style.display = this.showImages ? "flex" : "none";
      });
      this.jsonOutput.querySelectorAll(".json-url").forEach((urlEl) => {
        const urlStr = urlEl.getAttribute("data-url");
        if (isImageUrl(urlStr)) {
          urlEl.style.display = this.showImages ? "none" : "inline";
        }
      });
    }
    _switchView(view) {
      if (view === "tree") {
        this.jsonOutput.classList.remove("hidden");
        this.rawOutput.classList.add("hidden");
        this.treeViewBtn.classList.add("active");
        this.rawViewBtn.classList.remove("active");
      } else {
        this.jsonOutput.classList.add("hidden");
        this.rawOutput.classList.remove("hidden");
        this.treeViewBtn.classList.remove("active");
        this.rawViewBtn.classList.add("active");
      }
    }
    clearAll() {
      this.jsonInput.value = "";
      this.jsonData = null;
      this.imageData = [];
      this.outputSection.classList.add("hidden");
      this.errorMessage.classList.add("hidden");
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
        this._showError("Failed to read file. Please try again.");
      };
      reader.readAsText(file);
    }
    async _pasteFromClipboard() {
      try {
        const text = await navigator.clipboard.readText();
        this.jsonInput.value = text;
        this._updateCharCount();
      } catch {
        this._showError("Unable to paste from clipboard. Please paste manually.");
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
            `
      });
      if (!ok) this._showError("Failed to copy to clipboard");
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
            `
      });
    }
    _showError(message) {
      this.errorMessage.textContent = message;
      this.errorMessage.classList.remove("hidden");
    }
    _updateCharCount() {
      const count = this.jsonInput.value.length;
      this.charCount.textContent = `${count.toLocaleString()} characters`;
    }
    _handleKeyboard(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        if (!this.outputSection.classList.contains("hidden")) {
          e.preventDefault();
          this.search.open();
        }
      }
      if (e.key === "Escape" && this.search.isOpen) {
        this.search.close();
        return;
      }
      if (e.key === "Escape" && this.gallery.isOpen()) {
        this.gallery.close();
      }
      if (this.gallery.isOpen()) {
        if (e.key === "ArrowLeft") this.gallery.navigate(-1);
        else if (e.key === "ArrowRight") this.gallery.navigate(1);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.formatAndView();
      }
    }
    _loadFromHistoryEntry(type, data) {
      if (type === "json") {
        document.querySelector('.nav-tab[data-tab="jsonViewer"]').click();
        this.jsonInput.value = data.content;
        this._updateCharCount();
        this.formatAndView();
      } else if (type === "compare") {
        document.querySelector('.nav-tab[data-tab="textComparer"]').click();
        this.comparer.setInputs(data.original, data.modified);
      }
    }
  };
  document.addEventListener("DOMContentLoaded", () => new JSONViewer());
})();
