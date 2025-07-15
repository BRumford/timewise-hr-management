import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLeaveRequestSchema, type InsertLeaveRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Clock, CheckCircle, XCircle, User, AlertCircle, Download, Upload, FileText } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { z } from "zod";
import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

const leaveRequestFormSchema = insertLeaveRequestSchema.extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => {
  return data.startDate <= data.endDate;
}, {
  message: "Start date must be before or equal to end date",
  path: ["endDate"],
});

type LeaveRequestFormData = z.infer<typeof leaveRequestFormSchema>;

export default function LeaveManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [importSuccess, setImportSuccess] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, canViewAllRecords } = useAuth();

  const { data: leaveRequests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ["/api/leave-requests"],
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ["/api/leave-types"],
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: fieldLabels } = useQuery({
    queryKey: ["/api/custom-field-labels"],
  });

  const getFieldLabel = (fieldName: string, defaultLabel: string) => {
    const label = fieldLabels?.find((fl: any) => fl.fieldName === fieldName);
    return label?.displayLabel || defaultLabel;
  };

  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestFormSchema),
    defaultValues: {
      employeeId: user?.employee?.id || 0,
      leaveTypeId: 0,
      startDate: new Date(),
      endDate: new Date(),
      reason: "",
      substituteRequired: false,
    },
  });

  const createLeaveRequestMutation = useMutation({
    mutationFn: async (data: LeaveRequestFormData) => {
      const formattedData = {
        ...data,
        startDate: data.startDate,
        endDate: data.endDate,
      };
      return apiRequest("/api/leave-requests", "POST", formattedData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Export functionality
  const exportLeaveRequests = async () => {
    try {
      const data = await apiRequest("/api/leave-requests/export", "GET");
      
      // Convert JSON to CSV
      const csvContent = convertToCSV(data);
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `leave-requests-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: "Leave requests exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export leave requests",
        variant: "destructive",
      });
    }
  };

  // Import functionality
  const importLeaveRequestsMutation = useMutation({
    mutationFn: async (data: any[]) => {
      return apiRequest("/api/leave-requests/import", "POST", { data });
    },
    onSuccess: (result) => {
      setImportSuccess(`Successfully imported ${result.created} new leave requests and updated ${result.updated} existing ones`);
      setImportErrors(result.errors || []);
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      setImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const convertToCSV = (data: any[]) => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      }).join(','))
    ];
    
    return csvRows.join('\n');
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportErrors([]);
    setImportSuccess('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const data = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            return row;
          });

        importLeaveRequestsMutation.mutate(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to parse CSV file",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const template = `id,employeeId,employeeName,leaveType,startDate,endDate,reason,status,substituteRequired
,6,John Doe,Sick Leave,2025-01-15,2025-01-16,Medical appointment,pending,false
,7,Jane Smith,Vacation,2025-02-01,2025-02-05,Family vacation,pending,true`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'leave-requests-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onSubmit = (data: LeaveRequestFormData) => {
    createLeaveRequestMutation.mutate(data);
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees?.find((emp: any) => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  const getLeaveTypeName = (leaveTypeId: number) => {
    const leaveType = leaveTypes?.find((type: any) => type.id === leaveTypeId);
    return leaveType ? leaveType.name : 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateLeaveDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return differenceInDays(end, start) + 1;
  };

  const openViewDialog = (request: any) => {
    setSelectedRequest(request);
    setIsViewDialogOpen(true);
  };

  if (isLoadingRequests) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
        <div className="flex gap-2">
          {canViewAllRecords && (
            <>
              <Button
                variant="outline"
                onClick={exportLeaveRequests}
                className="flex items-center gap-2"
              >
                <Download size={16} />
                Export
              </Button>
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Upload size={16} />
                    Import
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Import Leave Requests</DialogTitle>
                    <DialogDescription>
                      Upload a CSV file to import leave requests. 
                      <Button
                        variant="link"
                        className="h-auto p-0 ml-1"
                        onClick={downloadTemplate}
                      >
                        Download template
                      </Button>
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="csv-file">CSV File</Label>
                      <Input
                        id="csv-file"
                        type="file"
                        accept=".csv"
                        onChange={handleImportFile}
                        ref={fileInputRef}
                        className="mt-1"
                      />
                    </div>

                    {importSuccess && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>{importSuccess}</AlertDescription>
                      </Alert>
                    )}

                    {importErrors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <p>Import errors:</p>
                            {importErrors.slice(0, 5).map((error, index) => (
                              <p key={index} className="text-sm">
                                Row {error.row}: {error.error}
                              </p>
                            ))}
                            {importErrors.length > 5 && (
                              <p className="text-sm">
                                ...and {importErrors.length - 5} more errors
                              </p>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsImportDialogOpen(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-blue-700">
                <Plus className="mr-2" size={16} />
                New Leave Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Submit Leave Request</DialogTitle>
                <DialogDescription>
                  Request time off and have it automatically integrated with your timecard system
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {canViewAllRecords && (
                    <FormField
                      control={form.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{getFieldLabel("employeeId", "Employee")}</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${getFieldLabel("employeeId", "Employee").toLowerCase()}`} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employees?.map((employee: any) => (
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
                  )}

                  {!canViewAllRecords && user?.employee && (
                    <div className="space-y-2">
                      <FormLabel>{getFieldLabel("employeeId", "Employee")}</FormLabel>
                      <div className="p-3 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium">{user.employee.firstName} {user.employee.lastName}</p>
                        <p className="text-sm text-gray-600">{user.employee.department} - {user.employee.position}</p>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="leaveTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{getFieldLabel("leaveType", "Leave Type")}</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={`Select ${getFieldLabel("leaveType", "Leave Type").toLowerCase()}`} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {leaveTypes?.map((leaveType: any) => (
                              <SelectItem key={leaveType.id} value={leaveType.id.toString()}>
                                {leaveType.name}
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
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{getFieldLabel("startDate", "Start Date")}</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{getFieldLabel("endDate", "End Date")}</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{getFieldLabel("reason", "Reason")}</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter reason for leave..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="substituteRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{getFieldLabel("substituteRequired", "Substitute Required")}</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Check if a substitute teacher is needed for this leave
                          </p>
                        </div>
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
                    <Button 
                      type="submit" 
                      disabled={createLeaveRequestMutation.isPending}
                    >
                      {createLeaveRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{leaveRequests?.length || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {leaveRequests?.filter((req: any) => req.status === 'pending').length || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {leaveRequests?.filter((req: any) => req.status === 'approved').length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {leaveRequests?.filter((req: any) => req.status === 'rejected').length || 0}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaveRequests?.map((request: any) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getEmployeeName(request.employeeId)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getLeaveTypeName(request.leaveTypeId)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(request.startDate), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(request.endDate), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openViewDialog(request)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Employee</label>
                  <p className="text-sm text-gray-900">{getEmployeeName(selectedRequest.employeeId)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Leave Type</label>
                  <p className="text-sm text-gray-900">{getLeaveTypeName(selectedRequest.leaveTypeId)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Start Date</label>
                  <p className="text-sm text-gray-900">{format(new Date(selectedRequest.startDate), 'PPP')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">End Date</label>
                  <p className="text-sm text-gray-900">{format(new Date(selectedRequest.endDate), 'PPP')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Duration</label>
                  <p className="text-sm text-gray-900">{calculateLeaveDays(selectedRequest.startDate, selectedRequest.endDate)} days</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <Badge className={getStatusColor(selectedRequest.status)}>
                    {selectedRequest.status}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Reason</label>
                <p className="text-sm text-gray-900 mt-1">{selectedRequest.reason || 'No reason provided'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Substitute Required</label>
                <p className="text-sm text-gray-900">{selectedRequest.substituteRequired ? 'Yes' : 'No'}</p>
              </div>
              
              {selectedRequest.approvedBy && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Approved By</label>
                  <p className="text-sm text-gray-900">{getEmployeeName(selectedRequest.approvedBy)}</p>
                </div>
              )}
              
              {selectedRequest.approvedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Approved At</label>
                  <p className="text-sm text-gray-900">{format(new Date(selectedRequest.approvedAt), 'PPP p')}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}