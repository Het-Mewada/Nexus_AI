import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { calendarApi } from "@/services/api";
import { toast } from "sonner";
import { Trash2, Bell, Plus, X } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Start date is required"),
  time: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  isAllDay: z.boolean().default(false),
  type: z.string().default("CUSTOM").optional(),
  recurrence: z.string().default("NONE").optional(),
  color: z.string().optional(),
});

type EventForm = z.infer<typeof eventSchema>;

interface EventModalProps {
  isOpen: boolean;
  onClose: () => any;
  selectedEvent: any;
  selectedDate: Date | null;
}

export function EventModal({ isOpen, onClose, selectedEvent, selectedDate }: EventModalProps) {
  const queryClient = useQueryClient();
  const [reminders, setReminders] = useState<number[]>([]);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<EventForm>({
    resolver: zodResolver(eventSchema) as any,
  });

  const isAllDay = watch("isAllDay");

  useEffect(() => {
    if (isOpen) {
      if (selectedEvent) {
        const start = new Date(selectedEvent.date);
        const end = selectedEvent.endDate ? new Date(selectedEvent.endDate) : null;
        
        reset({
          title: selectedEvent.title,
          description: selectedEvent.description || "",
          date: format(start, "yyyy-MM-dd"),
          time: format(start, "HH:mm"),
          endDate: end ? format(end, "yyyy-MM-dd") : "",
          endTime: end ? format(end, "HH:mm") : "",
          isAllDay: selectedEvent.isAllDay,
          type: selectedEvent.type,
          recurrence: selectedEvent.recurrence,
          color: selectedEvent.color || "#6366f1",
        });
        
        if (selectedEvent.reminders) {
          setReminders(selectedEvent.reminders.map((r: any) => r.minutesBefore));
        } else {
          setReminders([]);
        }
      } else if (selectedDate) {
        reset({
          title: "",
          description: "",
          date: format(selectedDate, "yyyy-MM-dd"),
          time: "09:00",
          endDate: format(selectedDate, "yyyy-MM-dd"),
          endTime: "10:00",
          isAllDay: false,
          type: "CUSTOM",
          recurrence: "NONE",
          color: "#6366f1",
        });
        setReminders([]);
      }
    }
  }, [isOpen, selectedEvent, selectedDate, reset]);

  const createMutation = useMutation({
    mutationFn: (data: any) => calendarApi.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event created successfully");
      onClose();
    },
    onError: () => toast.error("Failed to create event"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: any }) => calendarApi.updateEvent(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event updated successfully");
      onClose();
    },
    onError: () => toast.error("Failed to update event"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => calendarApi.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event deleted");
      onClose();
    },
  });

  const onSubmit = (data: EventForm) => {
    // Combine date and time
    const startDateTime = new Date(data.isAllDay ? data.date : `${data.date}T${data.time || "00:00"}`);
    
    let endDateTime = undefined;
    if (data.endDate && (!data.isAllDay || data.endDate !== data.date)) {
      endDateTime = new Date(data.isAllDay ? data.endDate : `${data.endDate}T${data.endTime || "23:59"}`);
    }

    const payload = {
      ...data,
      date: startDateTime.toISOString(),
      endDate: endDateTime ? endDateTime.toISOString() : undefined,
      reminders,
    };

    if (selectedEvent) {
      updateMutation.mutate({ id: selectedEvent.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const addReminder = () => {
    if (!reminders.includes(10)) {
      setReminders([...reminders, 10].sort((a, b) => a - b));
    } else if (!reminders.includes(60)) {
      setReminders([...reminders, 60].sort((a, b) => a - b));
    }
  };

  const removeReminder = (val: number) => {
    setReminders(reminders.filter(r => r !== val));
  };

  const updateReminder = (oldVal: number, newVal: number) => {
    if (!reminders.includes(newVal)) {
      setReminders(reminders.map(r => r === oldVal ? newVal : r).sort((a, b) => a - b));
    }
  };

  const presetColors = [
    { name: "Indigo", value: "#6366f1" },
    { name: "Rose", value: "#f43f5e" },
    { name: "Emerald", value: "#10b981" },
    { name: "Amber", value: "#f59e0b" },
    { name: "Sky", value: "#0ea5e9" },
    { name: "Violet", value: "#8b5cf6" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedEvent ? "Edit Event" : "Add Event"}</DialogTitle>
          <DialogDescription>Schedule meetings, birthdays, or reminders.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input id="title" placeholder="Meeting with Client..." {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
            <div className="space-y-0.5">
              <Label htmlFor="isAllDay">All-day Event</Label>
              <p className="text-xs text-muted-foreground">Toggle if event lasts the whole day</p>
            </div>
            <Switch
              id="isAllDay"
              checked={isAllDay}
              onCheckedChange={(checked) => setValue("isAllDay", checked)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" {...register("date")} />
            </div>
            {!isAllDay && (
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" {...register("time")} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>End Date (Optional)</Label>
              <Input type="date" {...register("endDate")} />
            </div>
            {!isAllDay && (
              <div className="space-y-2">
                <Label>End Time (Optional)</Label>
                <Input type="time" {...register("endTime")} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={watch("type")} onValueChange={(val) => setValue("type", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEETING">Meeting</SelectItem>
                  <SelectItem value="BIRTHDAY">Birthday</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Select value={watch("recurrence")} onValueChange={(val) => setValue("recurrence", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recurrence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {presetColors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setValue("color", c.value)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${watch("color") === c.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-2"><Bell className="w-4 h-4" /> Email Reminders</Label>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addReminder}>
                <Plus className="w-3 h-3 mr-1" /> Add Reminder
              </Button>
            </div>
            
            <div className="space-y-2 mt-2">
              {reminders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 text-center border border-dashed rounded-md">No reminders set</p>
              ) : (
                reminders.map((mins, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={mins.toString()} onValueChange={(val) => updateReminder(mins, Number(val))}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 minutes before</SelectItem>
                        <SelectItem value="30">30 minutes before</SelectItem>
                        <SelectItem value="60">1 hour before</SelectItem>
                        <SelectItem value="120">2 hours before</SelectItem>
                        <SelectItem value="300">5 hours before</SelectItem>
                        <SelectItem value="600">10 hours before</SelectItem>
                        <SelectItem value="1440">24 hours before</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeReminder(mins)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes / Description</Label>
            <Textarea id="description" placeholder="Add some notes..." {...register("description")} />
          </div>

          <DialogFooter className="pt-4 flex items-center justify-between w-full">
            <div>
              {selectedEvent && (
                <ConfirmDeleteDialog
                  title="Delete Event"
                  description="Are you sure? This action cannot be undone."
                  onConfirm={() => deleteMutation.mutate(selectedEvent.id)}
                >
                  <Button type="button" variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </ConfirmDeleteDialog>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {selectedEvent ? "Update Event" : "Create Event"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
