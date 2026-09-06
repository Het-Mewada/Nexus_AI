import { useEffect, useState } from "react";

export type CursorType = "regular" | "text" | "disabled" | "loading";

export function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [cursorType, setCursorType] = useState<CursorType>("regular");
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Disable custom cursor on touch screens (smartphones/tablets)
    if (window.matchMedia("(pointer: coarse)").matches) {
      setIsTouchDevice(true);
      return;
    }

    const updateCursorState = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (!target) {
        setCursorType("regular");
        return;
      }

      // 1. Loading / Wait element check
      const isLoading = Boolean(
        target.closest(".cursor-wait, [aria-busy='true'], .loading, .is-loading")
      );

      if (isLoading) {
        setCursorType("loading");
        return;
      }

      // 2. Disabled element check
      const isDisabled = Boolean(
        target.closest(":disabled, [disabled], [aria-disabled='true'], .disabled, .cursor-not-allowed")
      );

      if (isDisabled) {
        setCursorType("disabled");
        return;
      }

      // 3. Interactive controls (buttons, links, selects, submit inputs) stay regular arrow cursor
      const isInteractiveControl = Boolean(
        target.closest(
          "a, button, select, input[type='submit'], input[type='button'], input[type='checkbox'], input[type='radio'], [role='button']"
        )
      );

      // 4. Text element check (headings, paragraphs, spans, labels, text inputs, textareas, text nodes)
      const isTextContainer =
        Boolean(
          target.closest(
            "input:not([type='submit']):not([type='button']):not([type='checkbox']):not([type='radio']), textarea, [contenteditable='true'], p, span, h1, h2, h3, h4, h5, h6, b, strong, i, em, small, mark, code, pre, li, td, th, dt, dd, blockquote, figcaption, label"
          )
        ) ||
        (target.childNodes &&
          Array.from(target.childNodes).some(
            (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
          ));

      if (isTextContainer && !isInteractiveControl) {
        setCursorType("text");
        return;
      }

      // 5. Clickable interactive elements
      const isClickable = isInteractiveControl || Boolean(target.closest(".cursor-pointer, summary, [tabindex='0']"));

      if (isClickable) {
        setCursorType("regular");
        return;
      }

      // 6. Default fallback to regular arrow cursor
      setCursorType("regular");
    };

    const handleMouseDown = () => setIsMouseDown(true);
    const handleMouseUp = () => setIsMouseDown(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", updateCursorState, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", updateCursorState);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [isVisible]);

  if (isTouchDevice || !isVisible) return null;

  // Hotspot alignment per cursor type (compact dimensions)
  const getOffset = () => {
    switch (cursorType) {
      case "text":
        return { x: 6, y: 9 }; // Center hotspot for compact I-beam (12x18)
      case "loading":
        return { x: 10, y: 10 }; // Center hotspot for compact reticle (20x20)
      case "disabled":
        return { x: 10, y: 10 }; // Center hotspot for compact disabled icon (20x20)
      case "regular":
      default:
        return { x: 2, y: 2 }; // Arrow tip hotspot (16x20)
    }
  };

  const offset = getOffset();

  return (
    <div
      className="pointer-events-none fixed top-0 left-0 z-[999999] select-none"
      style={{
        transform: `translate3d(${position.x - offset.x}px, ${position.y - offset.y}px, 0) scale(${
          isMouseDown ? 0.92 : 1
        })`,
        willChange: "transform",
      }}
    >
      <div>
        {/* REGULAR ARROW CURSOR (Compact 16x20 height) */}
        {cursorType === "regular" && (
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="cursorGradient" x1="0" y1="0" x2="16" y2="20" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#EA580C" />
              </linearGradient>
            </defs>
            <path
              d="M2 2V16.5L6.5 12.5H12.5L2 2Z"
              fill="url(#cursorGradient)"
              stroke="#0F172A"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M3.2 4V13.8L6.4 11H11L3.2 4Z"
              fill="#FFFFFF"
              fillOpacity="0.25"
            />
          </svg>
        )}

        {/* TEXT I-BEAM CURSOR (Compact 12x18 height) */}
        {cursorType === "text" && (
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M2 2H10M6 2V16M2 16H10"
              stroke="#F97316"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 2H10M6 2V16M2 16H10"
              stroke="#FFFFFF"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* LOADING / WAIT SPINNING RETICLE CURSOR (Compact 20x20 height) */}
        {cursorType === "loading" && (
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="animate-spin"
          >
            <circle cx="10" cy="10" r="7" stroke="rgba(249, 115, 22, 0.3)" strokeWidth="2" />
            <path
              d="M10 3C13.866 3 17 6.13401 17 10"
              stroke="#F97316"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="10" cy="10" r="2" fill="#F97316" />
          </svg>
        )}

        {/* DISABLED / NOT-ALLOWED CURSOR (Compact 20x20 height) */}
        {cursorType === "disabled" && (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle
              cx="10"
              cy="10"
              r="7.5"
              fill="rgba(239, 68, 68, 0.2)"
              stroke="#EF4444"
              strokeWidth="1.8"
            />
            <line
              x1="5"
              y1="5"
              x2="15"
              y2="15"
              stroke="#EF4444"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}

