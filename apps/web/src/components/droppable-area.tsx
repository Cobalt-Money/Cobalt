import type { ReactNode } from "react";

import { useDragDrop } from "@/components/dnd-context";

interface DroppableAreaProps {
  date: Date;
  hour?: number;
  minute?: number;
  children: ReactNode;
  className?: string;
}

export function DroppableArea({ date, hour, minute, children, className }: DroppableAreaProps) {
  const { handleEventDrop, isDragging } = useDragDrop();

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: Using gridcell role for CSS grid layout where td is not applicable
      role="gridcell"
      aria-label="Droppable area"
      tabIndex={-1}
      className={`${className || ""} ${isDragging ? "drop-target" : ""}`}
      onDragOver={(e) => {
        // Prevent default to allow drop
        e.preventDefault();
        e.currentTarget.classList.add("bg-primary/10");
      }}
      onDragLeave={(e) => {
        e.currentTarget.classList.remove("bg-primary/10");
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove("bg-primary/10");
        handleEventDrop(date, hour, minute);
      }}
    >
      {children}
    </div>
  );
}
