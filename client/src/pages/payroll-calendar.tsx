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
import { Calendar as CalendarIcon, Plus, Edit, Trash2, Clock, Bell, ChevronLeft, ChevronRight, Grid3X3, List, Filter } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";

export default function PayrollCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
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

  const districtId = 1; // Current district context

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
      eventDate: selectedDate || "",
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

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    setEventForm(prev => ({ ...prev, eventDate: dateStr }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-500 border-red-600";
      case "high": return "bg-orange-500 border-orange-600";
      case "medium": return "bg-blue-500 border-blue-600";
      case "low": return "bg-gray-500 border-gray-600";
      default: return "bg-blue-500 border-blue-600";
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case "payroll-submission": return "bg-green-500 text-white";
      case "pay-date": return "bg-blue-500 text-white";
      case "deadline": return "bg-red-500 text-white";
      case "reminder": return "bg-yellow-500 text-black";
      case "meeting": return "bg-purple-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return Array.isArray(events) ? events.filter((event: any) => 
      event.eventDate === dateStr && 
      (filterType === "all" || event.eventType === filterType)
    ) : [];
  };

  const filteredEvents = Array.isArray(events) ? events.filter((event: any) => 
    filterType === "all" || event.eventType === filterType
  ) : [];

  const renderCalendarGrid = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Header */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center font-semibold text-gray-600 border-b">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {days.map((day) => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelected = selectedDate === format(day, 'yyyy-MM-dd');
          
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[120px] p-2 border cursor-pointer hover:bg-gray-50 ${
                isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => handleDayClick(day)}
            >
              <div className={`text-sm font-medium mb-1 ${
                isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event: any) => (
                  <div
                    key={event.id}
                    className={`text-xs p-1 rounded truncate cursor-pointer ${getEventTypeColor(event.eventType)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(event);
                    }}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 font-medium">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => (
    <div className="space-y-4">
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No events scheduled</h3>
          <p className="text-sm">Create your first payroll calendar event to get started.</p>
        </div>
      ) : (
        filteredEvents.map((event: any) => (
          <Card key={event.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{event.title}</h4>
                    <Badge className={`${getPriorityColor(event.priority)} text-white`}>
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
                      <CalendarIcon className="h-3 w-3" />
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
        ))
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Payroll Calendar</h1>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="text-center py-8">Loading calendar events...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Payroll Calendar</h1>
        <div className="flex items-center gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="payroll-submission">Payroll Submission</SelectItem>
              <SelectItem value="pay-date">Pay Date</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
              <SelectItem value="reminder">Reminder</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
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
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'month' ? renderCalendarGrid() : renderListView()}
        </CardContent>
      </Card>
    </div>
  );
}