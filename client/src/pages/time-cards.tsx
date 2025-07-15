import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, Filter, Plus, Check, X, Edit, ArrowRight, FileText, Users, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTimeCardSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { TimeCard, Employee } from "@shared/schema";
import { z } from "zod";

const timeCardFormSchema = insertTimeCardSchema.extend({
  date: z.string(),
  clockIn: z.string(),
  clockOut: z.string(),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
});

type TimeCardForm = z.infer<typeof timeCardFormSchema>;

const getStatusColor = (status: string) => {
  switch (status) {
    case "draft": return "bg-gray-100 text-gray-800";
    case "secretary_submitted": return "bg-blue-100 text-blue-800";
    case "employee_approved": return "bg-yellow-100 text-yellow-800";
    case "admin_approved": return "bg-green-100 text-green-800";
    case "payroll_processed": return "bg-purple-100 text-purple-800";
    case "rejected": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "draft": return "Draft";
    case "secretary_submitted": return "Secretary Submitted";
    case "employee_approved": return "Employee Approved";
    case "admin_approved": return "Admin Approved";
    case "payroll_processed": return "Payroll Processed";
    case "rejected": return "Rejected";
    default: return status;
  }
};

const getApprovalStageLabel = (stage: string) => {
  switch (stage) {
    case "secretary": return "Secretary Review";
    case "employee": return "Employee Approval";
    case "administrator": return "Admin Approval";
    case "payroll": return "Payroll Processing";
    case "completed": return "Completed";
    default: return stage;
  }
};

export default function TimeCards() {
  const [filter, setFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [selectedTimeCard, setSelectedTimeCard] = useState<TimeCard | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<string>("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const { toast } = useToast();

  const { data: timeCards = [], isLoading } = useQuery({
    queryKey: ["/api/time-cards"],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: pendingTimeCards = [] } = useQuery({
    queryKey: ["/api/time-cards/pending"],
  });

  const form = useForm<TimeCardForm>({
    resolver: zodResolver(timeCardFormSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      clockIn: "09:00",
      clockOut: "17:00",
      breakStart: "12:00",
      breakEnd: "13:00",
      notes: "",
    },
  });

  const createTimeCard = useMutation({
    mutationFn: async (data: TimeCardForm) => {
      const timeCardData = {
        ...data,
        date: new Date(data.date),
        clockIn: new Date(`${data.date}T${data.clockIn}:00`),
        clockOut: new Date(`${data.date}T${data.clockOut}:00`),
        breakStart: data.breakStart ? new Date(`${data.date}T${data.breakStart}:00`) : undefined,
        breakEnd: data.breakEnd ? new Date(`${data.date}T${data.breakEnd}:00`) : undefined,
      };
      return await apiRequest("/api/time-cards", "POST", timeCardData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Time card created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitForApproval = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/time-cards/${id}/submit`, "POST", { submittedBy: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards/pending"] });
      toast({
        title: "Success",
        description: "Time card submitted for approval",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveTimeCard = useMutation({
    mutationFn: async ({ id, action, notes }: { id: number; action: string; notes: string }) => {
      const endpoint = `/api/time-cards/${id}/${action}`;
      const payload = { notes };
      
      if (action === "approve-employee") {
        payload.employeeId = 1;
      } else if (action === "approve-admin") {
        payload.adminId = 1;
      } else if (action === "process-payroll") {
        payload.payrollId = 1;
      } else if (action === "reject") {
        payload.rejectedBy = 1;
      }
      
      return await apiRequest(endpoint, "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards/pending"] });
      setIsApprovalDialogOpen(false);
      setApprovalNotes("");
      toast({
        title: "Success",
        description: "Time card processed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApproval = (timeCard: TimeCard, action: string) => {
    setSelectedTimeCard(timeCard);
    setApprovalAction(action);
    setIsApprovalDialogOpen(true);
  };

  const handleSubmitApproval = () => {
    if (selectedTimeCard) {
      approveTimeCard.mutate({
        id: selectedTimeCard.id,
        action: approvalAction,
        notes: approvalNotes,
      });
    }
  };

  const filteredTimeCards = timeCards.filter((timeCard: TimeCard) => {
    const statusMatch = filter === "all" || timeCard.status === filter;
    const employeeMatch = employeeFilter === "all" || timeCard.employeeId.toString() === employeeFilter;
    return statusMatch && employeeMatch;
  });

  const getEmployee = (employeeId: number) => {
    return employees.find((e: Employee) => e.id === employeeId);
  };

  const onSubmit = (data: TimeCardForm) => {
    createTimeCard.mutate(data);
  };

  // Statistics
  const totalTimeCards = timeCards.length;
  const pendingCount = pendingTimeCards.length;
  const approvedCount = timeCards.filter((tc: TimeCard) => tc.status === "admin_approved").length;
  const processedCount = timeCards.filter((tc: TimeCard) => tc.status === "payroll_processed").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Time Cards Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Time Card
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
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
                        <Select onValueChange={(value) => field.onChange(parseInt(value))}>
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
                        <FormLabel>Break Start (Optional)</FormLabel>
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
                        <FormLabel>Break End (Optional)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTimeCard.isPending}>
                    {createTimeCard.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time Cards</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTimeCards}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Approved</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payroll Processed</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4" />
          <Label>Status:</Label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="secretary_submitted">Secretary Submitted</SelectItem>
              <SelectItem value="employee_approved">Employee Approved</SelectItem>
              <SelectItem value="admin_approved">Admin Approved</SelectItem>
              <SelectItem value="payroll_processed">Payroll Processed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4" />
          <Label>Employee:</Label>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {employees.map((employee: Employee) => (
                <SelectItem key={employee.id} value={employee.id.toString()}>
                  {employee.firstName} {employee.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Time Cards List */}
      <div className="space-y-4">
        {filteredTimeCards.map((timeCard: TimeCard) => {
          const employee = getEmployee(timeCard.employeeId);
          
          return (
            <Card key={timeCard.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {format(new Date(timeCard.date), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{employee?.firstName} {employee?.lastName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>
                      {timeCard.clockIn && format(new Date(timeCard.clockIn), "HH:mm")} - 
                      {timeCard.clockOut && format(new Date(timeCard.clockOut), "HH:mm")}
                    </span>
                  </div>
                  {timeCard.totalHours && (
                    <Badge variant="secondary">
                      {timeCard.totalHours}h
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(timeCard.status)}>
                    {getStatusLabel(timeCard.status)}
                  </Badge>
                  
                  {timeCard.currentApprovalStage && timeCard.status !== "payroll_processed" && (
                    <Badge variant="outline">
                      {getApprovalStageLabel(timeCard.currentApprovalStage)}
                    </Badge>
                  )}
                  
                  {/* Action buttons based on status */}
                  {timeCard.status === "draft" && (
                    <Button 
                      size="sm" 
                      onClick={() => submitForApproval.mutate(timeCard.id)}
                      disabled={submitForApproval.isPending}
                    >
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Submit for Approval
                    </Button>
                  )}
                  
                  {timeCard.status === "secretary_submitted" && (
                    <Button 
                      size="sm" 
                      onClick={() => handleApproval(timeCard, "approve-employee")}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Employee Approve
                    </Button>
                  )}
                  
                  {timeCard.status === "employee_approved" && (
                    <Button 
                      size="sm" 
                      onClick={() => handleApproval(timeCard, "approve-admin")}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Admin Approve
                    </Button>
                  )}
                  
                  {timeCard.status === "admin_approved" && (
                    <Button 
                      size="sm" 
                      onClick={() => handleApproval(timeCard, "process-payroll")}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Process Payroll
                    </Button>
                  )}
                  
                  {timeCard.status !== "payroll_processed" && timeCard.status !== "rejected" && (
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleApproval(timeCard, "reject")}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Notes section */}
              {(timeCard.notes || timeCard.secretaryNotes || timeCard.employeeNotes || timeCard.adminNotes) && (
                <div className="mt-4 space-y-2">
                  {timeCard.notes && (
                    <div className="text-sm text-gray-600">
                      <strong>Notes:</strong> {timeCard.notes}
                    </div>
                  )}
                  {timeCard.secretaryNotes && (
                    <div className="text-sm text-blue-600">
                      <strong>Secretary Notes:</strong> {timeCard.secretaryNotes}
                    </div>
                  )}
                  {timeCard.employeeNotes && (
                    <div className="text-sm text-yellow-600">
                      <strong>Employee Notes:</strong> {timeCard.employeeNotes}
                    </div>
                  )}
                  {timeCard.adminNotes && (
                    <div className="text-sm text-green-600">
                      <strong>Admin Notes:</strong> {timeCard.adminNotes}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "reject" ? "Reject Time Card" : "Approve Time Card"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes for this approval..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsApprovalDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitApproval}
                disabled={approveTimeCard.isPending}
                variant={approvalAction === "reject" ? "destructive" : "default"}
              >
                {approveTimeCard.isPending ? "Processing..." : 
                 approvalAction === "reject" ? "Reject" : "Approve"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}