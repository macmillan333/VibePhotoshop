// Modal Drag — makes all <dialog class="modal"> elements draggable by their <h2> title bar.
// Self-contained: runs on DOMContentLoaded, no globals needed.

(function () {
    'use strict';

    function initModalDrag() {
        const modals = document.querySelectorAll('dialog.modal');

        modals.forEach(function (dialog) {
            const handle = dialog.querySelector('h2');
            if (!handle) return;

            // Style the handle to indicate draggability
            handle.style.cursor = 'move';
            handle.style.userSelect = 'none';

            let isDragging = false;
            let startX, startY;
            let dialogStartX, dialogStartY;

            // Reset position when the dialog opens so it always starts centered
            const observer = new MutationObserver(function () {
                if (dialog.open) {
                    dialog.style.inset = '';
                    dialog.style.left = '';
                    dialog.style.top = '';
                    dialog.style.transform = '';
                    dialog.style.margin = '';
                    dialog.style.position = '';
                }
            });
            observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });

            handle.addEventListener('pointerdown', function (e) {
                // Only drag on primary button, ignore inputs
                if (e.button !== 0) return;
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

                e.preventDefault();
                isDragging = true;
                handle.setPointerCapture(e.pointerId);

                // Get the dialog's current rendered position
                const rect = dialog.getBoundingClientRect();

                // Switch from default centering to explicit fixed positioning.
                // inset must be cleared first — it's shorthand for top/right/bottom/left
                // and would overwrite our explicit left/top if set after them.
                dialog.style.inset = 'unset';
                dialog.style.margin = '0';
                dialog.style.position = 'fixed';
                dialog.style.transform = 'none';
                dialog.style.left = rect.left + 'px';
                dialog.style.top = rect.top + 'px';

                startX = e.clientX;
                startY = e.clientY;
                dialogStartX = rect.left;
                dialogStartY = rect.top;
            });

            handle.addEventListener('pointermove', function (e) {
                if (!isDragging) return;
                e.preventDefault();

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                dialog.style.left = (dialogStartX + dx) + 'px';
                dialog.style.top = (dialogStartY + dy) + 'px';
            });

            handle.addEventListener('pointerup', function (e) {
                if (!isDragging) return;
                isDragging = false;
                handle.releasePointerCapture(e.pointerId);
            });

            // Safety: cancel drag if pointer is lost
            handle.addEventListener('lostpointercapture', function () {
                isDragging = false;
            });
        });
    }

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModalDrag);
    } else {
        initModalDrag();
    }
})();
