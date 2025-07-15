import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, Filter, Plus, Check, X, Edit, ArrowRight, FileText, Users, AlertCircle, DollarSign, Download } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSubstituteTimeCardSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { SubstituteTimeCard, Employee } from "@shared/schema";
import { z } from "zod";



const substituteTimeCardFormSchema = insertSubstituteTimeCardSchema.extend({
  date: z.string(),
  clockIn: z.string(),
  clockOut: z.string(),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
  dailyRate: z.string().optional(),
});

type SubstituteTimeCardForm = z.infer<typeof substituteTimeCardFormSchema>;

const getStatusColor = (status: string) => {
  switch (status) {
    case "draft": return "bg-gray-100 text-gray-800";
    case "secretary_submitted": return "bg-blue-100 text-blue-800";
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
    case "admin_approved": return "Admin Approved";
    case "payroll_processed": return "Payroll Processed";
    case "rejected": return "Rejected";
    default: return status;
  }
};

const getApprovalStageLabel = (stage: string) => {
  switch (stage) {
    case "secretary": return "Secretary Review";
    case "administrator": return "Admin Approval";
    case "payroll": return "Payroll Processing";
    case "completed": return "Completed";
    default: return stage;
  }
};

// Helper function to convert JSON to CSV
const convertToCSV = (data: any[]) => {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    )
  ];
  
  return csvRows.join('\n');
};

// Helper function to download CSV
const downloadCSV = (data: any[], filename: string) => {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function SubstituteTimeCards() {
  const [filter, setFilter] = useState<string>("all");
  const [substituteFilter, setSubstituteFilter] = useState<string>("all");
  const [selectedTimeCard, setSelectedTimeCard] = useState<SubstituteTimeCard | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<string>("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const { toast } = useToast();

  const { data: substituteTimeCards = [], isLoading } = useQuery({
    queryKey: ["/api/substitute-time-cards"],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: pendingSubstituteTimeCards = [] } = useQuery({
    queryKey: ["/api/substitute-time-cards/pending"],
  });

  const form = useForm<SubstituteTimeCardForm>({
    resolver: zodResolver(substituteTimeCardFormSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      clockIn: "09:00",
      clockOut: "17:00",
      breakStart: "12:00",
      breakEnd: "13:00",
      dailyRate: "150.00",
      notes: "",
    },
  });

  const createSubstituteTimeCard = useMutation({
    mutationFn: async (data: SubstituteTimeCardForm) => {
      const timeCardData = {
        ...data,
        date: new Date(data.date),
        clockIn: new Date(`${data.date}T${data.clockIn}:00`),
        clockOut: new Date(`${data.date}T${data.clockOut}:00`),
        breakStart: data.breakStart ? new Date(`${data.date}T${data.breakStart}:00`) : undefined,
        breakEnd: data.breakEnd ? new Date(`${data.date}T${data.breakEnd}:00`) : undefined,
        dailyRate: data.dailyRate ? parseFloat(data.dailyRate) : undefined,
      };
      return await apiRequest("/api/substitute-time-cards", "POST", timeCardData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/substitute-time-cards"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Substitute time card created successfully",
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
      return await apiRequest(`/api/substitute-time-cards/${id}/submit`, "POST", { submittedBy: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/substitute-time-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/substitute-time-cards/pending"] });
      toast({
        title: "Success",
        description: "Substitute time card submitted for approval",
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

  const approveSubstituteTimeCard = useMutation({
    mutationFn: async ({ id, action, notes }: { id: number; action: string; notes: string }) => {
      const endpoint = `/api/substitute-time-cards/${id}/${action}`;
      const payload = { notes };
      
      if (action === "approve-admin") {
        payload.adminId = 1;
      } else if (action === "process-payroll") {
        payload.payrollId = 1;
      } else if (action === "reject") {
        payload.rejectedBy = 1;
      }
      
      return await apiRequest(endpoint, "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/substitute-time-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/substitute-time-cards/pending"] });
      setIsApprovalDialogOpen(false);
      setApprovalNotes("");
      toast({
        title: "Success",
        description: "Substitute time card processed successfully",
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

  const exportSubstituteTimeCards = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (filter !== 'all') params.append('status', filter);
      
      const response = await fetch(`/api/substitute-time-cards/export?${params}`);
      if (!response.ok) {
        throw new Error('Failed to export substitute time cards');
      }
      return response.json();
    },
    onSuccess: (data) => {
      const filename = `substitute-time-cards-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      downloadCSV(data.data, filename);
      toast({
        title: "Success",
        description: `Exported ${data.totalRecords} substitute time card records`,
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

  const handleApproval = (timeCard: SubstituteTimeCard, action: string) => {
    setSelectedTimeCard(timeCard);
    setApprovalAction(action);
    setIsApprovalDialogOpen(true);
  };

  const handleSubmitApproval = () => {
    if (selectedTimeCard) {
      approveSubstituteTimeCard.mutate({
        id: selectedTimeCard.id,
        action: approvalAction,
        notes: approvalNotes,
      });
    }
  };

  const filteredSubstituteTimeCards = substituteTimeCards.filter((timeCard: SubstituteTimeCard) => {
    const statusMatch = filter === "all" || timeCard.status === filter;
    const substituteMatch = substituteFilter === "all" || timeCard.substituteId.toString() === substituteFilter;
    return statusMatch && substituteMatch;
  });

  const getSubstitute = (substituteId: number) => {
    return employees.find((e: Employee) => e.id === substituteId);
  };

  const onSubmit = (data: SubstituteTimeCardForm) => {
    createSubstituteTimeCard.mutate(data);
  };

  // Get substitute employees (those with type "substitute")
  const substitutes = employees.filter((e: Employee) => e.type === "substitute");

  // Statistics
  const totalSubstituteTimeCards = substituteTimeCards.length;
  const pendingCount = pendingSubstituteTimeCards.length;
  const approvedCount = substituteTimeCards.filter((tc: SubstituteTimeCard) => tc.status === "admin_approved").length;
  const processedCount = substituteTimeCards.filter((tc: SubstituteTimeCard) => tc.status === "payroll_processed").length;

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
        <h1 className="text-3xl font-bold">Substitute Time Cards</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportSubstituteTimeCards.mutate()}
            disabled={exportSubstituteTimeCards.isPending}
          >
            <Download className="mr-2 h-4 w-4" />
            {exportSubstituteTimeCards.isPending ? "Exporting..." : "Export for Accounting"}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Substitute Time Card
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Substitute Time Card</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="substituteId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Substitute</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select substitute" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {substitutes.map((substitute: Employee) => (
                              <SelectItem key={substitute.id} value={substitute.id.toString()}>
                                {substitute.firstName} {substitute.lastName}
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
                  name="dailyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Rate ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
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
                  <Button type="submit" disabled={createSubstituteTimeCard.isPending}>
                    {createSubstituteTimeCard.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Substitute Time Cards</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubstituteTimeCards}</div>
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
            <DollarSign className="h-4 w-4 text-purple-500" />
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
              <SelectItem value="admin_approved">Admin Approved</SelectItem>
              <SelectItem value="payroll_processed">Payroll Processed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4" />
          <Label>Substitute:</Label>
          <Select value={substituteFilter} onValueChange={setSubstituteFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {substitutes.map((substitute: Employee) => (
                <SelectItem key={substitute.id} value={substitute.id.toString()}>
                  {substitute.firstName} {substitute.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Substitute Time Cards List */}
      <div className="space-y-4">
        {filteredSubstituteTimeCards.map((timeCard: SubstituteTimeCard) => {
          const substitute = getSubstitute(timeCard.substituteId);
          
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
                    <span>{substitute?.firstName} {substitute?.lastName}</span>
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
                  {timeCard.totalPay && (
                    <Badge variant="outline">
                      ${timeCard.totalPay}
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
                      <DollarSign className="h-4 w-4 mr-1" />
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
              {(timeCard.notes || timeCard.secretaryNotes || timeCard.adminNotes || timeCard.payrollNotes) && (
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
                  {timeCard.adminNotes && (
                    <div className="text-sm text-green-600">
                      <strong>Admin Notes:</strong> {timeCard.adminNotes}
                    </div>
                  )}
                  {timeCard.payrollNotes && (
                    <div className="text-sm text-purple-600">
                      <strong>Payroll Notes:</strong> {timeCard.payrollNotes}
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
              {approvalAction === "reject" ? "Reject Substitute Time Card" : "Approve Substitute Time Card"}
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
                disabled={approveSubstituteTimeCard.isPending}
                variant={approvalAction === "reject" ? "destructive" : "default"}
              >
                {approveSubstituteTimeCard.isPending ? "Processing..." : 
                 approvalAction === "reject" ? "Reject" : "Approve"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}