import { motion } from "framer-motion";
import type React from "react";
import type { ReactNode } from "react";

import { useDragDrop } from "@/components/dnd-context";
import type { IEvent } from "@/components/interfaces";

interface DraggableEventProps {
  event: IEvent;
  children: ReactNode;
  className?: string;
}

export function DraggableEvent({ event, children, className }: DraggableEventProps) {
  const { startDrag, endDrag, isDragging, draggedEvent } = useDragDrop();

  const isCurrentlyDragged = isDragging && draggedEvent?.id === event.id;

  return (
    <motion.div
      className={`${className || ""} ${isCurrentlyDragged ? "opacity-50 cursor-grabbing" : "cursor-grab"}`}
      draggable
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
      }}
      onDragStart={(motionDragEvent) => {
        const dragEvent = motionDragEvent as unknown as DragEvent;
        dragEvent.dataTransfer?.setData("text/plain", event.id.toString());
        startDrag(event);
      }}
      onDragEnd={() => {
        endDrag();
      }}
    >
      {children}
    </motion.div>
  );
}
