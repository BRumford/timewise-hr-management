import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Clock, Check, X, Edit, Trash2, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTimeCardSchema, type TimeCard, type Employee } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function TimeCards() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTimeCard, setEditingTimeCard] = useState<TimeCard | null>(null);
  const [viewFilter, setViewFilter] = useState<"all" | "pending" | "approved">("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: timeCards = [], isLoading: isLoadingTimeCards } = useQuery({
    queryKey: ["/api/time-cards"],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: pendingTimeCards = [] } = useQuery({
    queryKey: ["/api/time-cards/pending"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("/api/time-cards", { method: "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards/pending"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Time card created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create time card",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest(`/api/time-cards/${id}`, { method: "PUT", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards/pending"] });
      setEditingTimeCard(null);
      toast({
        title: "Success",
        description: "Time card updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update time card",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/time-cards/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards/pending"] });
      toast({
        title: "Success",
        description: "Time card deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete time card",
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertTimeCardSchema),
    defaultValues: {
      employeeId: 0,
      date: new Date().toISOString().split('T')[0],
      clockIn: "",
      clockOut: "",
      breakStart: "",
      breakEnd: "",
      totalHours: "",
      overtimeHours: "0",
      status: "draft",
      notes: "",
    },
  });

  const editForm = useForm({
    resolver: zodResolver(insertTimeCardSchema.partial()),
    defaultValues: {
      employeeId: 0,
      date: "",
      clockIn: "",
      clockOut: "",
      breakStart: "",
      breakEnd: "",
      totalHours: "",
      overtimeHours: "0",
      status: "draft",
      notes: "",
    },
  });

  const onSubmit = (data: any) => {
    const timeCardData = {
      ...data,
      employeeId: parseInt(data.employeeId),
      date: new Date(data.date),
      clockIn: data.clockIn ? new Date(`${data.date}T${data.clockIn}`) : null,
      clockOut: data.clockOut ? new Date(`${data.date}T${data.clockOut}`) : null,
      breakStart: data.breakStart ? new Date(`${data.date}T${data.breakStart}`) : null,
      breakEnd: data.breakEnd ? new Date(`${data.date}T${data.breakEnd}`) : null,
      totalHours: data.totalHours ? parseFloat(data.totalHours) : null,
      overtimeHours: data.overtimeHours ? parseFloat(data.overtimeHours) : 0,
    };

    createMutation.mutate(timeCardData);
  };

  const onEditSubmit = (data: any) => {
    if (!editingTimeCard) return;

    const timeCardData = {
      ...data,
      employeeId: data.employeeId ? parseInt(data.employeeId) : undefined,
      date: data.date ? new Date(data.date) : undefined,
      clockIn: data.clockIn ? new Date(`${data.date}T${data.clockIn}`) : undefined,
      clockOut: data.clockOut ? new Date(`${data.date}T${data.clockOut}`) : undefined,
      breakStart: data.breakStart ? new Date(`${data.date}T${data.breakStart}`) : undefined,
      breakEnd: data.breakEnd ? new Date(`${data.date}T${data.breakEnd}`) : undefined,
      totalHours: data.totalHours ? parseFloat(data.totalHours) : undefined,
      overtimeHours: data.overtimeHours ? parseFloat(data.overtimeHours) : undefined,
    };

    updateMutation.mutate({ id: editingTimeCard.id, data: timeCardData });
  };

  const handleEdit = (timeCard: TimeCard) => {
    setEditingTimeCard(timeCard);
    editForm.reset({
      employeeId: timeCard.employeeId,
      date: timeCard.date ? format(new Date(timeCard.date), 'yyyy-MM-dd') : "",
      clockIn: timeCard.clockIn ? format(new Date(timeCard.clockIn), 'HH:mm') : "",
      clockOut: timeCard.clockOut ? format(new Date(timeCard.clockOut), 'HH:mm') : "",
      breakStart: timeCard.breakStart ? format(new Date(timeCard.breakStart), 'HH:mm') : "",
      breakEnd: timeCard.breakEnd ? format(new Date(timeCard.breakEnd), 'HH:mm') : "",
      totalHours: timeCard.totalHours || "",
      overtimeHours: timeCard.overtimeHours || "0",
      status: timeCard.status,
      notes: timeCard.notes || "",
    });
  };

  const handleApprove = (timeCard: TimeCard) => {
    updateMutation.mutate({
      id: timeCard.id,
      data: { status: "approved", approvedAt: new Date() }
    });
  };

  const handleReject = (timeCard: TimeCard) => {
    updateMutation.mutate({
      id: timeCard.id,
      data: { status: "rejected" }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "submitted":
        return <Badge variant="outline">Submitted</Badge>;
      case "approved":
        return <Badge variant="default">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find((e: Employee) => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown";
  };

  const filteredTimeCards = timeCards.filter((timeCard: TimeCard) => {
    if (viewFilter === "all") return true;
    if (viewFilter === "pending") return timeCard.status === "submitted";
    if (viewFilter === "approved") return timeCard.status === "approved";
    return true;
  });

  const calculateTotalHours = (clockIn: string, clockOut: string, breakStart?: string, breakEnd?: string) => {
    if (!clockIn || !clockOut) return 0;

    const start = new Date(`1970-01-01T${clockIn}:00`);
    const end = new Date(`1970-01-01T${clockOut}:00`);
    let totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

    if (breakStart && breakEnd) {
      const breakStartTime = new Date(`1970-01-01T${breakStart}:00`);
      const breakEndTime = new Date(`1970-01-01T${breakEnd}:00`);
      const breakMinutes = (breakEndTime.getTime() - breakStartTime.getTime()) / (1000 * 60);
      totalMinutes -= breakMinutes;
    }

    return Math.max(0, totalMinutes / 60);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Time Cards</h1>
          <p className="text-muted-foreground mt-1">
            Track employee hours and manage time card approvals
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Time Card
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Time Card</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employees.map((employee: Employee) => (
                              <SelectItem key={employee.id} value={employee.id.toString()}>
                                {employee.firstName} {employee.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clockIn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clock In</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clockOut"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clock Out</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="breakStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Break Start</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="breakEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Break End</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="totalHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Hours</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.25" min="0" placeholder="8.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="overtimeHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overtime Hours</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.25" min="0" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Time Card"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time Cards</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeCards.length}</div>
            <p className="text-xs text-muted-foreground">
              All time cards in the system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTimeCards.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting supervisor approval
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeCards.filter((tc: TimeCard) => {
                const cardDate = new Date(tc.date);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return cardDate >= weekAgo;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Time cards from last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex space-x-2">
        <Button 
          variant={viewFilter === "all" ? "default" : "outline"}
          onClick={() => setViewFilter("all")}
        >
          All
        </Button>
        <Button 
          variant={viewFilter === "pending" ? "default" : "outline"}
          onClick={() => setViewFilter("pending")}
        >
          Pending ({pendingTimeCards.length})
        </Button>
        <Button 
          variant={viewFilter === "approved" ? "default" : "outline"}
          onClick={() => setViewFilter("approved")}
        >
          Approved
        </Button>
      </div>

      {/* Time Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Cards</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTimeCards ? (
            <div className="text-center py-8">Loading time cards...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimeCards.map((timeCard: TimeCard) => (
                  <TableRow key={timeCard.id}>
                    <TableCell className="font-medium">
                      {getEmployeeName(timeCard.employeeId)}
                    </TableCell>
                    <TableCell>
                      {timeCard.date ? format(new Date(timeCard.date), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {timeCard.clockIn ? format(new Date(timeCard.clockIn), 'HH:mm') : '-'}
                    </TableCell>
                    <TableCell>
                      {timeCard.clockOut ? format(new Date(timeCard.clockOut), 'HH:mm') : '-'}
                    </TableCell>
                    <TableCell>{timeCard.totalHours || '-'}</TableCell>
                    <TableCell>{timeCard.overtimeHours || '0'}</TableCell>
                    <TableCell>{getStatusBadge(timeCard.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {timeCard.status === "submitted" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(timeCard)}
                              disabled={updateMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(timeCard)}
                              disabled={updateMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(timeCard)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteMutation.mutate(timeCard.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingTimeCard} onOpenChange={() => setEditingTimeCard(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Time Card</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.map((employee: Employee) => (
                            <SelectItem key={employee.id} value={employee.id.toString()}>
                              {employee.firstName} {employee.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="clockIn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clock In</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="clockOut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clock Out</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="totalHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Hours</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.25" min="0" placeholder="8.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="overtimeHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overtime Hours</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.25" min="0" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingTimeCard(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update Time Card"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}