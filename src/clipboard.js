export async function copyWithFeedback(
    text,
    button,
    { successHTML = null, className = 'copied', duration = 1500 } = {}
) {
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
