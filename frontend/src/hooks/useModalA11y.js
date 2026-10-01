import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Stack of open dialogs so that only the top-most one reacts to Esc / Tab
// (e.g. a confirm dialog opened on top of a drawer).
const openDialogs = [];

/**
 * Accessibility helper for modals/drawers:
 * - Esc closes the dialog
 * - Tab / Shift+Tab stay trapped inside the dialog
 * - focus moves into the dialog on open and returns to the previous element on close
 * Attach the returned ref to the dialog element.
 */
export function useModalA11y(active, onClose) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return undefined;
    const previouslyFocused = document.activeElement;
    const node = ref.current;
    const token = Symbol("dialog");
    openDialogs.push(token);

    const getFocusable = () =>
      node ? Array.from(node.querySelectorAll(FOCUSABLE)).filter((el) => el.getClientRects().length > 0) : [];

    if (node && !node.contains(document.activeElement)) {
      (getFocusable()[0] || node).focus();
    }

    const onKeyDown = (e) => {
      if (openDialogs[openDialogs.length - 1] !== token) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !node) return;

      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!node.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const idx = openDialogs.indexOf(token);
      if (idx !== -1) openDialogs.splice(idx, 1);
      previouslyFocused?.focus?.();
    };
  }, [active]);

  return ref;
}