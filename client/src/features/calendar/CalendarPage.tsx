import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Plus, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EventModal } from "./components/EventModal";
import { calendarApi } from "@/services/api";
import { toast } from "sonner";
import "./calendar.css";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<any>(Views.MONTH);

  const { data: response, isLoading } = useQuery({
    queryKey: ["events", currentDate.getMonth() + 1, currentDate.getFullYear()],
    queryFn: () => calendarApi.getEvents(currentDate.getMonth() + 1, currentDate.getFullYear()),
  });

  const events = useMemo(() => {
    if (!response?.data) return [];
    return response.data.map((e: any) => ({
      ...e,
      start: new Date(e.date),
      end: e.endDate ? new Date(e.endDate) : new Date(new Date(e.date).getTime() + 60 * 60 * 1000), // Default 1 hr duration
      title: e.title,
    }));
  }, [response]);

  const handleSelectSlot = (slotInfo: any) => {
    setSelectedEvent(null);
    setSelectedDate(slotInfo.start);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setSelectedDate(null);
    setIsModalOpen(true);
  };

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleView = (newView: any) => {
    setCurrentView(newView);
  };

  const customDayPropGetter = (date: Date) => {
    const day = getDay(date);
    if (day === 0 || day === 6) {
      return {
        className: 'rbc-weekend-day',
      };
    }
    return {};
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">Manage your schedule, reminders, and important dates</p>
        </div>
        <Button onClick={() => { setSelectedEvent(null); setSelectedDate(new Date()); setIsModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Event
        </Button>
      </div>

      <Card className="shadow-lg border-primary/10 overflow-hidden">
        <CardContent className="p-0 sm:p-4">
          <div className="h-[75vh] w-full min-h-[500px]">
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              views={['month', 'week', 'day', 'agenda']}
              view={currentView}
              onView={handleView}
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              onNavigate={handleNavigate}
              date={currentDate}
              dayPropGetter={customDayPropGetter}
              eventPropGetter={(event: any) => ({
                style: {
                  backgroundColor: event.color || '#6366f1',
                  borderRadius: '4px',
                  opacity: 0.9,
                  color: 'white',
                  border: '0px',
                  display: 'block'
                }
              })}
              components={{
                event: (props: any) => (
                  <div className="flex items-center gap-1 text-xs truncate px-1">
                    {props.event.type === "MEETING" ? <Clock className="h-3 w-3 flex-shrink-0" /> : <CalendarIcon className="h-3 w-3 flex-shrink-0" />}
                    <span>{props.title}</span>
                  </div>
                )
              }}
            />
          </div>
        </CardContent>
      </Card>

      {isModalOpen && (
        <EventModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          selectedEvent={selectedEvent}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}
