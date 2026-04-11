"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { useCalendar } from "@/components/calendar-context";
import type { IEvent } from "@/components/interfaces";

interface DragDropContextType {
  draggedEvent: IEvent | null;
  isDragging: boolean;
  startDrag: (event: IEvent) => void;
  endDrag: () => void;
  handleEventDrop: (date: Date, hour?: number, minute?: number) => void;
}

interface DndProviderProps {
  children: ReactNode;
}

const DragDropContext = createContext<DragDropContextType | undefined>(
  undefined
);

export function DndProvider({ children }: DndProviderProps) {
  const { updateEvent } = useCalendar();
  const [dragState, setDragState] = useState<{
    draggedEvent: IEvent | null;
    isDragging: boolean;
  }>({ draggedEvent: null, isDragging: false });

  const onEventDroppedRef = useRef<
    ((event: IEvent, newStartDate: Date, newEndDate: Date) => void) | null
  >(null);

  const startDrag = useCallback((event: IEvent) => {
    setDragState({ draggedEvent: event, isDragging: true });
  }, []);

  const endDrag = useCallback(() => {
    setDragState({ draggedEvent: null, isDragging: false });
  }, []);

  const calculateNewDates = useCallback(
    (event: IEvent, targetDate: Date, hour?: number, minute?: number) => {
      const originalStart = new Date(event.startDate);
      const originalEnd = new Date(event.endDate);
      const duration = originalEnd.getTime() - originalStart.getTime();

      const newStart = new Date(targetDate);
      if (hour === undefined) {
        newStart.setHours(
          originalStart.getHours(),
          originalStart.getMinutes(),
          0,
          0
        );
      } else {
        newStart.setHours(hour, minute || 0, 0, 0);
      }

      return {
        newEnd: new Date(newStart.getTime() + duration),
        newStart,
      };
    },
    []
  );

  const isSamePosition = useCallback(
    (date1: Date, date2: Date) => date1.getTime() === date2.getTime(),
    []
  );

  const handleEventDrop = useCallback(
    (targetDate: Date, hour?: number, minute?: number) => {
      const { draggedEvent } = dragState;
      if (!draggedEvent) {
        return;
      }

      const { newStart, newEnd } = calculateNewDates(
        draggedEvent,
        targetDate,
        hour,
        minute
      );
      const originalStart = new Date(draggedEvent.startDate);

      // Check if dropped in same position
      if (isSamePosition(originalStart, newStart)) {
        endDrag();
        return;
      }

      // Instantly update event
      const onDropped = onEventDroppedRef.current;
      if (onDropped) {
        // eslint-disable-next-line promise/prefer-await-to-callbacks -- sync handler from ref
        onDropped(draggedEvent, newStart, newEnd);
      }
      endDrag();
    },
    [dragState, calculateNewDates, isSamePosition, endDrag]
  );

  // Default event update handler
  const handleEventUpdate = useCallback(
    (event: IEvent, newStartDate: Date, newEndDate: Date) => {
      try {
        const updatedEvent = {
          ...event,
          endDate: newEndDate.toISOString(),
          startDate: newStartDate.toISOString(),
        };
        updateEvent(updatedEvent);
        toast.success("Event updated successfully");
      } catch {
        toast.error("Failed to update event");
      }
    },
    [updateEvent]
  );

  // Set default callback
  React.useEffect(() => {
    onEventDroppedRef.current = handleEventUpdate;
  }, [handleEventUpdate]);

  const contextValue = useMemo(
    () => ({
      draggedEvent: dragState.draggedEvent,
      endDrag,
      handleEventDrop,
      isDragging: dragState.isDragging,
      startDrag,
    }),
    [dragState, startDrag, endDrag, handleEventDrop]
  );

  return (
    <DragDropContext.Provider value={contextValue}>
      {children}
    </DragDropContext.Provider>
  );
}

export function useDragDrop() {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error("useDragDrop must be used within a DragDropProvider");
  }
  return context;
}
