import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownEdit } from "@/components/ui/dropdown-edit";
import { Calendar, Clock, User, Filter, Plus, Check, X, Edit, ArrowRight, FileText, Users, AlertCircle, Download, GraduationCap, Briefcase } from "lucide-react";
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
import { useLocation } from "wouter";

const timeCardFormSchema = insertTimeCardSchema.extend({
  date: z.string(),
  clockIn: z.string(),
  clockOut: z.string(),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
});

type TimeCardForm = z.infer<typeof timeCardFormSchema>;

// Payroll Processing Section Component
function PayrollProcessingSection({ timeCard, onUpdate }: { timeCard: any; onUpdate: (data: any) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    payrollAddon: timeCard.payrollAddon || '',
    payrollUnits: timeCard.payrollUnits || 0,
    payrollRate: timeCard.payrollRate || 0,
    payrollTotal: timeCard.payrollTotal || 0,
    payrollProcessingNotes: timeCard.payrollProcessingNotes || ''
  });
  const { toast } = useToast();

  // Calculate total when units or rate changes
  const calculateTotal = (units: number, rate: number) => {
    return (units * rate).toFixed(2);
  };

  // Handle form field changes
  const handleFieldChange = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    
    // Auto-calculate total when units or rate changes
    if (field === 'payrollUnits' || field === 'payrollRate') {
      const units = field === 'payrollUnits' ? parseFloat(value) || 0 : parseFloat(newFormData.payrollUnits) || 0;
      const rate = field === 'payrollRate' ? parseFloat(value) || 0 : parseFloat(newFormData.payrollRate) || 0;
      newFormData.payrollTotal = parseFloat(calculateTotal(units, rate));
    }
    
    setFormData(newFormData);
  };

  // Save payroll processing data
  const handleSave = async () => {
    try {
      const response = await apiRequest(`/api/time-cards/${timeCard.id}/payroll-processing`, 'PUT', formData);
      onUpdate(response);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Payroll processing updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payroll processing",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-purple-800 flex items-center">
          <Users className="h-4 w-4 mr-2" />
          Payroll Processing
        </h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Edit className="h-4 w-4 mr-1" />
          {isEditing ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payrollAddon" className="text-sm font-medium text-purple-700">Addon</Label>
              <Input
                id="payrollAddon"
                value={formData.payrollAddon}
                onChange={(e) => handleFieldChange('payrollAddon', e.target.value)}
                placeholder="Enter addon description"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="payrollUnits" className="text-sm font-medium text-purple-700">Units</Label>
              <Input
                id="payrollUnits"
                type="number"
                step="0.01"
                value={formData.payrollUnits}
                onChange={(e) => handleFieldChange('payrollUnits', e.target.value)}
                placeholder="Enter units"
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payrollRate" className="text-sm font-medium text-purple-700">Rate</Label>
              <Input
                id="payrollRate"
                type="number"
                step="0.01"
                value={formData.payrollRate}
                onChange={(e) => handleFieldChange('payrollRate', e.target.value)}
                placeholder="Enter rate"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="payrollTotal" className="text-sm font-medium text-purple-700">Total (Auto-calculated)</Label>
              <Input
                id="payrollTotal"
                type="number"
                step="0.01"
                value={formData.payrollTotal}
                readOnly
                className="mt-1 bg-gray-50"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="payrollProcessingNotes" className="text-sm font-medium text-purple-700">Notes</Label>
            <Textarea
              id="payrollProcessingNotes"
              value={formData.payrollProcessingNotes}
              onChange={(e) => handleFieldChange('payrollProcessingNotes', e.target.value)}
              placeholder="Enter processing notes"
              className="mt-1"
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-purple-700">Addon:</span>
              <div className="text-purple-600 mt-1">
                {formData.payrollAddon || 'Not specified'}
              </div>
            </div>
            <div>
              <span className="font-medium text-purple-700">Units:</span>
              <div className="text-purple-600 mt-1">
                {formData.payrollUnits || 0}
              </div>
            </div>
            <div>
              <span className="font-medium text-purple-700">Rate:</span>
              <div className="text-purple-600 mt-1">
                ${formData.payrollRate || 0}
              </div>
            </div>
            <div>
              <span className="font-medium text-purple-700">Total:</span>
              <div className="text-purple-600 mt-1 font-semibold">
                ${formData.payrollTotal || 0}
              </div>
            </div>
          </div>
          
          {formData.payrollProcessingNotes && (
            <div className="text-sm">
              <span className="font-medium text-purple-700">Notes:</span>
              <div className="text-purple-600 mt-1">
                {formData.payrollProcessingNotes}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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

// Helper function to categorize employees
const getCertificatedEmployees = (employees: Employee[]) => {
  return employees.filter(emp => 
    emp.employeeType === 'teacher' || 
    emp.employeeType === 'administrator' || 
    emp.employeeType === 'counselor' || 
    emp.employeeType === 'librarian' ||
    emp.employeeType === 'principal' ||
    emp.employeeType === 'vice_principal'
  );
};

const getClassifiedEmployees = (employees: Employee[]) => {
  return employees.filter(emp => 
    emp.employeeType === 'support_staff' || 
    emp.employeeType === 'secretary' || 
    emp.employeeType === 'custodian' ||
    emp.employeeType === 'food_service' ||
    emp.employeeType === 'maintenance' ||
    emp.employeeType === 'paraprofessional' ||
    emp.employeeType === 'bus_driver' ||
    emp.employeeType === 'security'
  );
};

export default function TimeCards() {
  const [filter, setFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [selectedTimeCard, setSelectedTimeCard] = useState<TimeCard | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<string>("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"certificated" | "classified">("certificated");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: timeCards = [], isLoading } = useQuery({
    queryKey: ["/api/time-cards"],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  // Fetch custom field labels
  const { data: fieldLabels } = useQuery({
    queryKey: ["/api/custom-field-labels"],
  });

  // Helper function to get field label
  const getFieldLabel = (fieldName: string, defaultLabel: string) => {
    const label = fieldLabels?.find((l: any) => l.fieldName === fieldName);
    return label ? label.displayLabel : defaultLabel;
  };

  const { data: pendingTimeCards = [] } = useQuery({
    queryKey: ["/api/time-cards/pending"],
  });

  // Create employee lookup for time cards
  const employeeMap = new Map(employees.map((emp: Employee) => [emp.id, emp]));
  
  // Get time cards with employee information
  const timeCardsWithEmployees = timeCards.map((timeCard: TimeCard) => ({
    ...timeCard,
    employee: employeeMap.get(timeCard.employeeId)
  })).filter((timeCard: any) => timeCard.employee);

  // Separate time cards by employee type
  const certificatedEmployees = getCertificatedEmployees(employees);
  const classifiedEmployees = getClassifiedEmployees(employees);
  
  const certificatedTimeCards = timeCardsWithEmployees.filter((timeCard: any) => 
    certificatedEmployees.some(emp => emp.id === timeCard.employeeId)
  );
  
  const classifiedTimeCards = timeCardsWithEmployees.filter((timeCard: any) => 
    classifiedEmployees.some(emp => emp.id === timeCard.employeeId)
  );

  // Get current data based on active tab
  const currentTimeCards = activeTab === "certificated" ? certificatedTimeCards : classifiedTimeCards;
  const currentEmployees = activeTab === "certificated" ? certificatedEmployees : classifiedEmployees;

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

  // Update time card field mutation
  const updateTimeCardFieldMutation = useMutation({
    mutationFn: async ({ timeCardId, field, value }: { timeCardId: number; field: string; value: string }) => {
      const timeCard = timeCards.find((tc: TimeCard) => tc.id === timeCardId);
      if (!timeCard) throw new Error('Time card not found');
      
      let updatedValue = value;
      
      // Handle time fields
      if (field === 'clockIn' || field === 'clockOut') {
        const dateStr = format(new Date(timeCard.date), 'yyyy-MM-dd');
        updatedValue = new Date(`${dateStr}T${value}:00`).toISOString();
      }
      
      const updatedTimeCard = { ...timeCard, [field]: updatedValue };
      return await apiRequest(`/api/time-cards/${timeCardId}`, 'PUT', updatedTimeCard);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards"] });
      toast({
        title: "Success",
        description: "Time card updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update time card",
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

  const exportTimeCards = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (filter !== 'all') params.append('status', filter);
      
      const response = await fetch(`/api/time-cards/export?${params}`);
      if (!response.ok) {
        throw new Error('Failed to export time cards');
      }
      return response.json();
    },
    onSuccess: (data) => {
      const filename = `time-cards-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      downloadCSV(data.data, filename);
      toast({
        title: "Success",
        description: `Exported ${data.totalRecords} time card records`,
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

  const filteredTimeCards = currentTimeCards.filter((timeCard: any) => {
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

  // Statistics for current tab
  const totalTimeCards = currentTimeCards.length;
  const pendingCount = currentTimeCards.filter((tc: any) => tc.status === "secretary_submitted").length;
  const approvedCount = currentTimeCards.filter((tc: any) => tc.status === "admin_approved").length;
  const processedCount = currentTimeCards.filter((tc: any) => tc.status === "payroll_processed").length;

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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportTimeCards.mutate()}
            disabled={exportTimeCards.isPending}
          >
            <Download className="mr-2 h-4 w-4" />
            {exportTimeCards.isPending ? "Exporting..." : "Export for Accounting"}
          </Button>
          <Button onClick={() => navigate("/monthly-timecard")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Time Card
          </Button>
        </div>
      </div>

      {/* Dialog for creating individual time cards (keeping for reference) */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                        <FormLabel>{getFieldLabel("employeeId", "Employee")}</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {currentEmployees.map((employee: Employee) => (
                              <SelectItem key={employee.id} value={employee.id.toString()}>
                                {employee.firstName} {employee.lastName} ({employee.employeeType})
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
                        <FormLabel>{getFieldLabel("date", "Date")}</FormLabel>
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
                        <FormLabel>{getFieldLabel("clockIn", "Clock In")}</FormLabel>
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
                        <FormLabel>{getFieldLabel("clockOut", "Clock Out")}</FormLabel>
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
                        <FormLabel>{getFieldLabel("breakStart", "Break Start")} (Optional)</FormLabel>
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
                        <FormLabel>{getFieldLabel("breakEnd", "Break End")} (Optional)</FormLabel>
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
                      <FormLabel>{getFieldLabel("notes", "Notes")}</FormLabel>
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

      {/* Employee Type Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === "certificated" ? "default" : "ghost"}
          onClick={() => {
            setActiveTab("certificated");
            setEmployeeFilter("all");
          }}
          className="flex-1"
        >
          <GraduationCap className="mr-2 h-4 w-4" />
          Certificated Employees ({certificatedTimeCards.length})
        </Button>
        <Button
          variant={activeTab === "classified" ? "default" : "ghost"}
          onClick={() => {
            setActiveTab("classified");
            setEmployeeFilter("all");
          }}
          className="flex-1"
        >
          <Briefcase className="mr-2 h-4 w-4" />
          Classified Employees ({classifiedTimeCards.length})
        </Button>
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
              {currentEmployees.map((employee: Employee) => (
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
                    <div className="flex items-center space-x-1">
                      <DropdownEdit
                        value={timeCard.clockIn ? format(new Date(timeCard.clockIn), "HH:mm") : ""}
                        onSave={(value) => updateTimeCardFieldMutation.mutate({ timeCardId: timeCard.id, field: 'clockIn', value })}
                        type="text"
                        placeholder="HH:mm"
                        className="w-16"
                        disabled={timeCard.status === "payroll_processed"}
                      />
                      <span>-</span>
                      <DropdownEdit
                        value={timeCard.clockOut ? format(new Date(timeCard.clockOut), "HH:mm") : ""}
                        onSave={(value) => updateTimeCardFieldMutation.mutate({ timeCardId: timeCard.id, field: 'clockOut', value })}
                        type="text"
                        placeholder="HH:mm"
                        className="w-16"
                        disabled={timeCard.status === "payroll_processed"}
                      />
                    </div>
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

              {/* Payroll Processing Section */}
              {timeCard.status === "admin_approved" || timeCard.status === "payroll_processed" ? (
                <PayrollProcessingSection 
                  timeCard={timeCard} 
                  onUpdate={(updatedData) => {
                    queryClient.invalidateQueries({ queryKey: ["/api/time-cards"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/time-cards-admin"] });
                  }}
                />
              ) : null}
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