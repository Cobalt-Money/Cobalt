"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { useLocalStorage } from "@/components/hooks";
import type { IEvent, IUser } from "@/components/interfaces";
import type { TCalendarView, TEventColor } from "@/components/types";

interface ICalendarContext {
  selectedDate: Date;
  view: TCalendarView;
  setView: (view: TCalendarView) => void;
  agendaModeGroupBy: "date" | "color";
  setAgendaModeGroupBy: (groupBy: "date" | "color") => void;
  use24HourFormat: boolean;
  toggleTimeFormat: () => void;
  setSelectedDate: (date: Date | undefined) => void;
  selectedUserId: IUser["id"] | "all";
  setSelectedUserId: (userId: IUser["id"] | "all") => void;
  badgeVariant: "dot" | "colored";
  setBadgeVariant: (variant: "dot" | "colored") => void;
  selectedColors: TEventColor[];
  filterEventsBySelectedColors: (colors: TEventColor) => void;
  filterEventsBySelectedUser: (userId: IUser["id"] | "all") => void;
  users: IUser[];
  events: IEvent[];
  addEvent: (event: IEvent) => void;
  updateEvent: (event: IEvent) => void;
  removeEvent: (eventId: number) => void;
  clearFilter: () => void;
}

interface CalendarSettings {
  badgeVariant: "dot" | "colored";
  view: TCalendarView;
  use24HourFormat: boolean;
  agendaModeGroupBy: "date" | "color";
}

const DEFAULT_SETTINGS: CalendarSettings = {
  agendaModeGroupBy: "date",
  badgeVariant: "colored",
  use24HourFormat: true,
  view: "day",
};

const CalendarContext = createContext({} as ICalendarContext);

export function CalendarProvider({
  children,
  users,
  events,
  badge = "colored",
  view = "day",
}: {
  children: ReactNode;
  users: IUser[];
  events: IEvent[];
  view?: TCalendarView;
  badge?: "dot" | "colored";
}) {
  const [settings, setSettings] = useLocalStorage<CalendarSettings>(
    "calendar-settings",
    {
      ...DEFAULT_SETTINGS,
      badgeVariant: badge,
      view: view,
    }
  );

  const [badgeVariant, setBadgeVariantState] = useState<"dot" | "colored">(
    settings.badgeVariant
  );
  const [currentView, setCurrentViewState] = useState<TCalendarView>(
    settings.view
  );
  const [use24HourFormat, setUse24HourFormatState] = useState<boolean>(
    settings.use24HourFormat
  );
  const [agendaModeGroupBy, setAgendaModeGroupByState] = useState<
    "date" | "color"
  >(settings.agendaModeGroupBy);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<IUser["id"] | "all">(
    "all"
  );
  const [selectedColors, setSelectedColors] = useState<TEventColor[]>([]);

  const [allEvents, setAllEvents] = useState<IEvent[]>(events || []);
  const [filteredEvents, setFilteredEvents] = useState<IEvent[]>(events || []);

  const updateSettings = useCallback(
    (newPartialSettings: Partial<CalendarSettings>) => {
      setSettings((prev) => ({ ...prev, ...newPartialSettings }));
    },
    [setSettings]
  );

  const setBadgeVariant = useCallback(
    (variant: "dot" | "colored") => {
      setBadgeVariantState(variant);
      updateSettings({ badgeVariant: variant });
    },
    [updateSettings]
  );

  const setView = useCallback(
    (newView: TCalendarView) => {
      setCurrentViewState(newView);
      updateSettings({ view: newView });
    },
    [updateSettings]
  );

  const toggleTimeFormat = useCallback(() => {
    const newValue = !use24HourFormat;
    setUse24HourFormatState(newValue);
    updateSettings({ use24HourFormat: newValue });
  }, [use24HourFormat, updateSettings]);

  const setAgendaModeGroupBy = useCallback(
    (groupBy: "date" | "color") => {
      setAgendaModeGroupByState(groupBy);
      updateSettings({ agendaModeGroupBy: groupBy });
    },
    [updateSettings]
  );

  const filterEventsBySelectedColors = useCallback(
    (color: TEventColor) => {
      const isColorSelected = selectedColors.includes(color);
      const newColors = isColorSelected
        ? selectedColors.filter((c) => c !== color)
        : [...selectedColors, color];

      if (newColors.length > 0) {
        const filtered = allEvents.filter((event) => {
          const eventColor = event.color || "blue";
          return newColors.includes(eventColor);
        });
        setFilteredEvents(filtered);
      } else {
        setFilteredEvents(allEvents);
      }

      setSelectedColors(newColors);
    },
    [allEvents, selectedColors]
  );

  const filterEventsBySelectedUser = useCallback(
    (userId: IUser["id"] | "all") => {
      setSelectedUserId(userId);
      if (userId === "all") {
        setFilteredEvents(allEvents);
      } else {
        const filtered = allEvents.filter((event) => event.user.id === userId);
        setFilteredEvents(filtered);
      }
    },
    [allEvents]
  );

  const handleSelectDate = useCallback((date: Date | undefined) => {
    if (!date) {
      return;
    }
    setSelectedDate(date);
  }, []);

  const addEvent = useCallback((event: IEvent) => {
    setAllEvents((prev) => [...prev, event]);
    setFilteredEvents((prev) => [...prev, event]);
  }, []);

  const updateEvent = useCallback((event: IEvent) => {
    const updated = {
      ...event,
      endDate: new Date(event.endDate).toISOString(),
      startDate: new Date(event.startDate).toISOString(),
    };

    setAllEvents((prev) => prev.map((e) => (e.id === event.id ? updated : e)));
    setFilteredEvents((prev) =>
      prev.map((e) => (e.id === event.id ? updated : e))
    );
  }, []);

  const removeEvent = useCallback((eventId: number) => {
    setAllEvents((prev) => prev.filter((e) => e.id !== eventId));
    setFilteredEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  const clearFilter = useCallback(() => {
    setFilteredEvents(allEvents);
    setSelectedColors([]);
    setSelectedUserId("all");
  }, [allEvents]);

  const value = useMemo(
    () => ({
      addEvent,
      agendaModeGroupBy,
      badgeVariant,
      clearFilter,
      events: filteredEvents,
      filterEventsBySelectedColors,
      filterEventsBySelectedUser,
      removeEvent,
      selectedColors,
      selectedDate,
      selectedUserId,
      setAgendaModeGroupBy,
      setBadgeVariant,
      setSelectedDate: handleSelectDate,
      setSelectedUserId,
      setView,
      toggleTimeFormat,
      updateEvent,
      use24HourFormat,
      users,
      view: currentView,
    }),
    [
      addEvent,
      agendaModeGroupBy,
      badgeVariant,
      clearFilter,
      currentView,
      filteredEvents,
      filterEventsBySelectedColors,
      filterEventsBySelectedUser,
      handleSelectDate,
      removeEvent,
      selectedColors,
      selectedDate,
      selectedUserId,
      setAgendaModeGroupBy,
      setBadgeVariant,
      setView,
      toggleTimeFormat,
      updateEvent,
      use24HourFormat,
      users,
    ]
  );

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar(): ICalendarContext {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendar must be used within a CalendarProvider.");
  }
  return context;
}
