import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ActionTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function ActionTooltip({ content, children, className, side = "top" }: ActionTooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    if (side === "top") {
      // For top tooltips near the right edge of the screen, align from the right
      const isNearRightEdge = viewportWidth - rect.right < 160;
      if (isNearRightEdge) {
        setStyle({
          position: "fixed",
          top: `${rect.top - 8}px`,
          right: `${Math.max(12, viewportWidth - rect.right)}px`,
          transform: "translateY(-100%)",
        });
      } else {
        setStyle({
          position: "fixed",
          top: `${rect.top - 8}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: "translate(-50%, -100%)",
        });
      }
    } else if (side === "bottom") {
      setStyle({
        position: "fixed",
        top: `${rect.bottom + 8}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: "translateX(-50%)",
      });
    } else if (side === "left") {
      setStyle({
        position: "fixed",
        top: `${rect.top + rect.height / 2}px`,
        right: `${viewportWidth - rect.left + 8}px`,
        transform: "translateY(-50%)",
      });
    } else {
      setStyle({
        position: "fixed",
        top: `${rect.top + rect.height / 2}px`,
        left: `${rect.right + 8}px`,
        transform: "translateY(-50%)",
      });
    }
  }, [side]);

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  React.useEffect(() => {
    if (!isVisible) return;
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isVisible, updatePosition]);

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={handleMouseEnter}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible &&
        createPortal(
          <div
            role="tooltip"
            style={style}
            className={cn(
              "pointer-events-none z-[9999] whitespace-nowrap rounded-lg bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-xl border border-border animate-in fade-in-0 zoom-in-95",
              className
            )}
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}
