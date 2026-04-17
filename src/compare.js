import { showToast } from './toast.js';

export class Comparer {
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

        if (typeof Diff === 'undefined') {
            this.compareBtn.disabled = true;
            this.compareBtn.title = 'Diff library failed to load';
            this.diffResult.textContent = 'Diff library failed to load. The comparer is unavailable.';
            this.compareOutput.classList.remove('hidden');
        } else {
            this.compareBtn.addEventListener('click', () => this.compare());
        }
        this.clearCompareBtn.addEventListener('click', () => this.clear());

        this.pasteOriginalBtn.addEventListener('click', async () => {
            try {
                this.originalInput.value = await navigator.clipboard.readText();
            } catch {
                showToast('Failed to paste content');
            }
        });
        this.pasteModifiedBtn.addEventListener('click', async () => {
            try {
                this.modifiedInput.value = await navigator.clipboard.readText();
            } catch {
                showToast('Failed to paste content');
            }
        });
    }

    compare(saveToHistory = true) {
        const original = this.originalInput.value;
        const modified = this.modifiedInput.value;
        if (!original && !modified) return;

        try {
            if (typeof Diff === 'undefined') throw new Error('Diff library not loaded');
            const diff = Diff.diffWordsWithSpace(original, modified);
            const fragment = document.createDocumentFragment();
            diff.forEach((part) => {
                const el = document.createElement(part.added ? 'ins' : part.removed ? 'del' : 'span');
                el.textContent = part.value;
                fragment.appendChild(el);
            });
            this.diffResult.replaceChildren(fragment);
            this.compareOutput.classList.remove('hidden');
        } catch (err) {
            console.error(err);
            showToast('Comparison failed: ' + err.message);
        }

        if (saveToHistory) this.onSave({ original, modified });
    }

    setInputs(original, modified) {
        this.originalInput.value = original;
        this.modifiedInput.value = modified;
        this.compare(false);
    }

    clear() {
        this.originalInput.value = '';
        this.modifiedInput.value = '';
        this.diffResult.replaceChildren();
        this.compareOutput.classList.add('hidden');
    }
}
