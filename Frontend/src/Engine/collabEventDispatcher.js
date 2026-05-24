export function dispatchCollabEvent(type, payload) {
    window.dispatchEvent(
        new CustomEvent('collab:event', {
            detail: { type, payload },
        })
    );
}
