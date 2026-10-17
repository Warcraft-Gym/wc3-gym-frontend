"use client";
import { useRef } from "react";

// Past this many pixels a press is a drag, no longer a click
const SLOP = 5;

type Drag = { el: HTMLElement; id: number; x: number; left: number; y: number; moved: boolean };

/** Lets a mouse pan a wide drawing: press anywhere in it and drag. Sideways moves the drawing's own
 *  scroll, up and down moves the page. A press that does not move stays a click on what it pressed,
 *  and the click that ends a drag is swallowed. Touch keeps its own scrolling.
 *
 *  The handlers read the element they sit on, so one hook serves every drawing of a page. */
export function useDragScroll() {
  const drag = useRef<Drag | null>(null);
  const swallow = useRef(false);

  const end = (event: React.PointerEvent<HTMLElement>) => {
    const state = drag.current;
    drag.current = null;
    if (!state || event.pointerId !== state.id) return;
    if (state.el.hasPointerCapture(state.id)) state.el.releasePointerCapture(state.id);
    if (!state.moved) return;
    delete state.el.dataset.dragging;
    swallow.current = true;
    // a release outside the drawing fires no click, so the flag must not wait for one
    setTimeout(() => (swallow.current = false), 0);
  };

  return {
    onPointerDown(event: React.PointerEvent<HTMLElement>) {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      const el = event.currentTarget;
      drag.current = { el, id: event.pointerId, x: event.clientX, left: el.scrollLeft, y: event.clientY, moved: false };
    },
    onPointerMove(event: React.PointerEvent<HTMLElement>) {
      const state = drag.current;
      if (!state || event.pointerId !== state.id) return;
      const dx = event.clientX - state.x;
      if (!state.moved) {
        if (Math.hypot(dx, event.clientY - state.y) < SLOP) return;
        state.moved = true;
        state.el.setPointerCapture(state.id);
        state.el.dataset.dragging = "";
        window.getSelection()?.removeAllRanges();
      }
      state.el.scrollLeft = state.left - dx;
      // the page scroll does not move the pointer in the viewport, so each step scrolls by its own move
      window.scrollBy(0, state.y - event.clientY);
      state.y = event.clientY;
    },
    onPointerUp: end,
    onPointerCancel: end,
    onClickCapture(event: React.MouseEvent<HTMLElement>) {
      if (!swallow.current) return;
      swallow.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    // a flag or an icon would otherwise start the browser's own image drag
    onDragStart(event: React.DragEvent<HTMLElement>) {
      event.preventDefault();
    },
  };
}

/** The cursor a draggable drawing shows, and no text selection while it is dragged. */
export const DRAG_SCROLL = "cursor-grab data-[dragging]:cursor-grabbing data-[dragging]:select-none";
