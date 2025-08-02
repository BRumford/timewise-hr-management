import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, CalendarDays, Clock, Plus, Edit, Trash2, Bell, Users, AlertTriangle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { PayrollCalendarEvent } from "@shared/schema";

interface PayrollCalendarProps {
  districtId: number;
}

export default function PayrollCalendar({ districtId }: PayrollCalendarProps) {
  const { toast } = useToast();
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PayrollCalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    eventType: "payroll_submission",
    eventDate: "",
    eventTime: "",
    isRecurring: false,
    recurrenceType: "monthly",
    recurrenceInterval: 1,
    endRecurrence: "",
    reminderEnabled: true,
    reminderDaysBefore: 3,
    departments: ["hr", "payroll"],
    priority: "medium"
  });

  // Fetch payroll calendar events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/payroll-calendar-events", districtId],
    queryFn: () => apiRequest(`/api/payroll-calendar-events/${districtId}`),
    enabled: !!districtId,
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      return apiRequest(`/api/payroll-calendar-events`, {
        method: "POST",
        body: JSON.stringify({ ...eventData, districtId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-calendar-events"] });
      setShowEventDialog(false);
      resetForm();
      toast({
        title: "Event Created",
        description: "Payroll calendar event has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...eventData }: any) => {
      return apiRequest(`/api/payroll-calendar-events/${id}`, {
        method: "PUT",
        body: JSON.stringify(eventData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-calendar-events"] });
      setShowEventDialog(false);
      setEditingEvent(null);
      resetForm();
      toast({
        title: "Event Updated",
        description: "Payroll calendar event has been updated successfully",
      });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return apiRequest(`/api/payroll-calendar-events/${eventId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-calendar-events"] });
      toast({
        title: "Event Deleted",
        description: "Payroll calendar event has been deleted successfully",
      });
    },
  });

  const resetForm = () => {
    setEventForm({
      title: "",
      description: "",
      eventType: "payroll_submission",
      eventDate: "",
      eventTime: "",
      isRecurring: false,
      recurrenceType: "monthly",
      recurrenceInterval: 1,
      endRecurrence: "",
      reminderEnabled: true,
      reminderDaysBefore: 3,
      departments: ["hr", "payroll"],
      priority: "medium"
    });
  };

  const handleEditEvent = (event: PayrollCalendarEvent) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || "",
      eventType: event.eventType,
      eventDate: event.eventDate,
      eventTime: event.eventTime || "",
      isRecurring: event.isRecurring || false,
      recurrenceType: event.recurrenceType || "monthly",
      recurrenceInterval: event.recurrenceInterval || 1,
      endRecurrence: event.endRecurrence || "",
      reminderEnabled: event.reminderEnabled ?? true,
      reminderDaysBefore: event.reminderDaysBefore || 3,
      departments: (event.departments as string[]) || ["hr", "payroll"],
      priority: event.priority || "medium"
    });
    setShowEventDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, ...eventForm });
    } else {
      createEventMutation.mutate(eventForm);
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "payroll_submission": return <CalendarDays className="h-4 w-4" />;
      case "pay_date": return <Calendar className="h-4 w-4" />;
      case "deadline": return <AlertTriangle className="h-4 w-4" />;
      case "reminder": return <Bell className="h-4 w-4" />;
      case "meeting": return <Users className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "critical": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payroll Calendar</h2>
          <p className="text-gray-600">Manage payroll dates, deadlines, and automated reminders</p>
        </div>
        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingEvent(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? "Edit Payroll Event" : "Create Payroll Event"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="e.g., Payroll Submission Deadline"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select value={eventForm.eventType} onValueChange={(value) => setEventForm({ ...eventForm, eventType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payroll_submission">Payroll Submission</SelectItem>
                      <SelectItem value="pay_date">Pay Date</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Additional details about this event"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="eventDate">Date</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventForm.eventDate}
                    onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="eventTime">Time (Optional)</Label>
                  <Input
                    id="eventTime"
                    type="time"
                    value={eventForm.eventTime}
                    onChange={(e) => setEventForm({ ...eventForm, eventTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={eventForm.priority} onValueChange={(value) => setEventForm({ ...eventForm, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={eventForm.isRecurring}
                    onCheckedChange={(checked) => setEventForm({ ...eventForm, isRecurring: checked })}
                  />
                  <Label>Recurring Event</Label>
                </div>

                {eventForm.isRecurring && (
                  <div className="grid grid-cols-3 gap-4 pl-6">
                    <div>
                      <Label>Recurrence Type</Label>
                      <Select value={eventForm.recurrenceType} onValueChange={(value) => setEventForm({ ...eventForm, recurrenceType: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {eventForm.recurrenceType === "custom" && (
                      <div>
                        <Label>Interval (days)</Label>
                        <Input
                          type="number"
                          value={eventForm.recurrenceInterval}
                          onChange={(e) => setEventForm({ ...eventForm, recurrenceInterval: parseInt(e.target.value) })}
                          min="1"
                        />
                      </div>
                    )}
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={eventForm.endRecurrence}
                        onChange={(e) => setEventForm({ ...eventForm, endRecurrence: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={eventForm.reminderEnabled}
                    onCheckedChange={(checked) => setEventForm({ ...eventForm, reminderEnabled: checked })}
                  />
                  <Label>Enable Reminders</Label>
                </div>

                {eventForm.reminderEnabled && (
                  <div className="pl-6">
                    <Label>Remind (days before)</Label>
                    <Input
                      type="number"
                      value={eventForm.reminderDaysBefore}
                      onChange={(e) => setEventForm({ ...eventForm, reminderDaysBefore: parseInt(e.target.value) })}
                      min="1"
                      max="30"
                      className="w-32"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowEventDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createEventMutation.isPending || updateEventMutation.isPending}>
                  {editingEvent ? "Update Event" : "Create Event"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No payroll events scheduled. Create your first event to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event: PayrollCalendarEvent) => (
                <div key={event.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getEventTypeIcon(event.eventType)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{event.title}</h3>
                        {event.description && (
                          <p className="text-gray-600 text-sm mt-1">{event.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(event.eventDate).toLocaleDateString()}
                          </span>
                          {event.eventTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.eventTime}
                            </span>
                          )}
                          {event.isRecurring && (
                            <Badge variant="secondary" className="text-xs">
                              Recurring ({event.recurrenceType || 'monthly'})
                            </Badge>
                          )}
                          {event.reminderEnabled && (
                            <span className="flex items-center gap-1">
                              <Bell className="h-3 w-3" />
                              {event.reminderDaysBefore}d reminder
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(event.priority || "medium")}>
                        {event.priority || "medium"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEvent(event)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEventMutation.mutate(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Reminder Days</Label>
              <Input type="number" min="1" max="30" defaultValue="3" />
            </div>
            <div className="space-y-2">
              <Label>Notification Method</Label>
              <Select defaultValue="both">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="dashboard">Dashboard Only</SelectItem>
                  <SelectItem value="both">Email + Dashboard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-3">
            <Label>Department Notifications</Label>
            <div className="grid grid-cols-2 gap-2">
              {["HR", "Payroll", "Finance", "Administration"].map((dept) => (
                <div key={dept} className="flex items-center space-x-2">
                  <Switch defaultChecked />
                  <Label>{dept}</Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}