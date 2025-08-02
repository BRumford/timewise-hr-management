import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Edit, Trash2, Clock, AlertCircle, Bell, Users } from "lucide-react";
import { format, parseISO } from "date-fns";

interface PayrollCalendarProps {
  districtId: number;
}

export default function PayrollCalendar({ districtId }: PayrollCalendarProps) {
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    eventType: "payroll-submission",
    eventDate: "",
    eventTime: "",
    isRecurring: false,
    recurrenceType: "",
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
    queryFn: async () => {
      const response = await fetch(`/api/payroll-calendar-events/${districtId}`);
      return response.json();
    },
    enabled: !!districtId,
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch("/api/payroll-calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...eventData, districtId }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-calendar-events", districtId] });
      setShowEventForm(false);
      resetForm();
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...eventData }: any) => {
      const response = await fetch(`/api/payroll-calendar-events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-calendar-events", districtId] });
      setShowEventForm(false);
      setEditingEvent(null);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/payroll-calendar-events/${id}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-calendar-events", districtId] });
    },
  });

  const resetForm = () => {
    setEventForm({
      title: "",
      description: "",
      eventType: "payroll-submission",
      eventDate: "",
      eventTime: "",
      isRecurring: false,
      recurrenceType: "",
      recurrenceInterval: 1,
      endRecurrence: "",
      reminderEnabled: true,
      reminderDaysBefore: 3,
      departments: ["hr", "payroll"],
      priority: "medium"
    });
  };

  const handleSubmit = () => {
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, ...eventForm });
    } else {
      createEventMutation.mutate(eventForm);
    }
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || "",
      eventType: event.eventType,
      eventDate: event.eventDate,
      eventTime: event.eventTime || "",
      isRecurring: event.isRecurring || false,
      recurrenceType: event.recurrenceType || "",
      recurrenceInterval: event.recurrenceInterval || 1,
      endRecurrence: event.endRecurrence || "",
      reminderEnabled: event.reminderEnabled !== false,
      reminderDaysBefore: event.reminderDaysBefore || 3,
      departments: event.departments || ["hr", "payroll"],
      priority: event.priority || "medium"
    });
    setShowEventForm(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium": return "bg-blue-100 text-blue-800 border-blue-200";
      case "low": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case "payroll-submission": return "bg-green-100 text-green-800";
      case "pay-date": return "bg-blue-100 text-blue-800";
      case "deadline": return "bg-red-100 text-red-800";
      case "reminder": return "bg-yellow-100 text-yellow-800";
      case "meeting": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Payroll Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading calendar events...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Payroll Calendar
            </div>
            <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingEvent(null); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingEvent ? "Edit Payroll Event" : "Create New Payroll Event"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Event Title</Label>
                      <Input
                        id="title"
                        value={eventForm.title}
                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                        placeholder="e.g., Monthly Payroll Deadline"
                      />
                    </div>
                    <div>
                      <Label htmlFor="eventType">Event Type</Label>
                      <Select value={eventForm.eventType} onValueChange={(value) => setEventForm({ ...eventForm, eventType: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="payroll-submission">Payroll Submission</SelectItem>
                          <SelectItem value="pay-date">Pay Date</SelectItem>
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
                      placeholder="Additional details about this event..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eventDate">Date</Label>
                      <Input
                        id="eventDate"
                        type="date"
                        value={eventForm.eventDate}
                        onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                    <div>
                      <Label htmlFor="reminderDays">Reminder Days Before</Label>
                      <Input
                        id="reminderDays"
                        type="number"
                        min="1"
                        max="30"
                        value={eventForm.reminderDaysBefore}
                        onChange={(e) => setEventForm({ ...eventForm, reminderDaysBefore: parseInt(e.target.value) || 3 })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={eventForm.isRecurring}
                      onCheckedChange={(checked) => setEventForm({ ...eventForm, isRecurring: checked })}
                    />
                    <Label>Recurring Event</Label>
                  </div>

                  {eventForm.isRecurring && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="recurrenceType">Recurrence Type</Label>
                        <Select value={eventForm.recurrenceType} onValueChange={(value) => setEventForm({ ...eventForm, recurrenceType: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="endRecurrence">End Date (Optional)</Label>
                        <Input
                          id="endRecurrence"
                          type="date"
                          value={eventForm.endRecurrence}
                          onChange={(e) => setEventForm({ ...eventForm, endRecurrence: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowEventForm(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                      {editingEvent ? "Update Event" : "Create Event"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(events) && events.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No events scheduled</h3>
                <p className="text-sm">Create your first payroll calendar event to get started.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {Array.isArray(events) && events.map((event: any) => (
                  <Card key={event.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{event.title}</h4>
                            <Badge className={getPriorityColor(event.priority)}>
                              {event.priority}
                            </Badge>
                            <Badge className={getEventTypeColor(event.eventType)}>
                              {event.eventType.replace('-', ' ')}
                            </Badge>
                          </div>
                          
                          {event.description && (
                            <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(event.eventDate), 'MMM dd, yyyy')}
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
                        
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(event)}>
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}