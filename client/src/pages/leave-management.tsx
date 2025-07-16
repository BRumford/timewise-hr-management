import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DropdownEdit } from "@/components/ui/dropdown-edit";
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
import { Plus, Calendar, Clock, CheckCircle, XCircle, User, AlertCircle, Download, Upload, FileText, Shield, Heart, Stethoscope } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { z } from "zod";
import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

const leaveRequestFormSchema = insertLeaveRequestSchema.extend({
  startDate: z.union([z.coerce.date(), z.null()]).refine((val) => val !== null, {
    message: "Start date is required",
  }),
  endDate: z.union([z.coerce.date(), z.null()]).refine((val) => val !== null, {
    message: "End date is required",
  }),
}).refine((data) => {
  if (!data.startDate || !data.endDate) return true;
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
      startDate: null,
      endDate: null,
      reason: "",
      substituteRequired: false,
      isWorkersComp: false,
      isMedicalLeave: false,
      isFmla: false,
      intermittentLeave: false,
      reducedSchedule: false,
      supportingDocuments: [],
      medicalDocuments: [],
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

  // Update leave request field mutation
  const updateLeaveRequestFieldMutation = useMutation({
    mutationFn: async ({ requestId, field, value }: { requestId: number; field: string; value: string }) => {
      const request = leaveRequests?.find((lr: any) => lr.id === requestId);
      if (!request) throw new Error('Leave request not found');
      
      const updatedRequest = { ...request, [field]: value };
      return await apiRequest(`/api/leave-requests/${requestId}`, 'PUT', updatedRequest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({
        title: "Success",
        description: "Leave request updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update leave request",
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
                            value={field.value ? (() => {
                              try {
                                return format(new Date(field.value), 'yyyy-MM-dd');
                              } catch {
                                return '';
                              }
                            })() : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                field.onChange(new Date(e.target.value + 'T00:00:00'));
                              } else {
                                field.onChange(null);
                              }
                            }}
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
                            value={field.value ? (() => {
                              try {
                                return format(new Date(field.value), 'yyyy-MM-dd');
                              } catch {
                                return '';
                              }
                            })() : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                field.onChange(new Date(e.target.value + 'T00:00:00'));
                              } else {
                                field.onChange(null);
                              }
                            }}
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

                  {/* Workers Compensation Section */}
                  <FormField
                    control={form.control}
                    name="isWorkersComp"
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
                          <FormLabel className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            This is a Workers' Compensation claim
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Check if this leave is related to a workplace injury
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch("isWorkersComp") && (
                    <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <h4 className="font-medium text-orange-800 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Workers' Compensation Details
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="injuryDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Injury Date</FormLabel>
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
                          name="incidentLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Incident Location</FormLabel>
                              <FormControl>
                                <Input placeholder="Where did the injury occur?" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="injuryDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Injury Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the injury and how it occurred..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="witnessName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Witness Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Name of witness (if any)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="witnessContact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Witness Contact</FormLabel>
                              <FormControl>
                                <Input placeholder="Witness phone/email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="claimNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Claim Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Workers' comp claim number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="insuranceProvider"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Insurance Provider</FormLabel>
                              <FormControl>
                                <Input placeholder="Workers' comp insurance company" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="doctorName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Doctor Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Treating physician" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="doctorContact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Doctor Contact</FormLabel>
                              <FormControl>
                                <Input placeholder="Doctor phone/fax" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="expectedReturnDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expected Return Date</FormLabel>
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
                          name="workRestrictions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Work Restrictions</FormLabel>
                              <FormControl>
                                <Input placeholder="Any work restrictions" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Medical Leave Section */}
                  <FormField
                    control={form.control}
                    name="isMedicalLeave"
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
                          <FormLabel className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4" />
                            This is a Medical Leave
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Check if this leave is for medical reasons
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch("isMedicalLeave") && (
                    <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-800 flex items-center gap-2">
                        <Stethoscope className="h-4 w-4" />
                        Medical Leave Details
                      </h4>
                      
                      <FormField
                        control={form.control}
                        name="isFmla"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="flex items-center gap-2">
                                <Heart className="h-4 w-4" />
                                FMLA (Family Medical Leave Act)
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Check if this qualifies for FMLA protection
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="medicalProvider"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Medical Provider</FormLabel>
                              <FormControl>
                                <Input placeholder="Doctor/hospital name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="medicalProviderContact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Provider Contact</FormLabel>
                              <FormControl>
                                <Input placeholder="Provider phone/fax" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="diagnosisCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Diagnosis Code</FormLabel>
                              <FormControl>
                                <Input placeholder="ICD-10 code (if available)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="medicalCertificationDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Medical Certification Date</FormLabel>
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
                      </div>

                      <FormField
                        control={form.control}
                        name="medicalCertificationExpiry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Medical Certification Expiry</FormLabel>
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

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="intermittentLeave"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Intermittent Leave</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Leave taken in separate blocks of time
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="reducedSchedule"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Reduced Schedule</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Reduce usual weekly/daily work schedule
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="accommodationsNeeded"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Accommodations Needed</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe any workplace accommodations needed upon return..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

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
                      <DropdownEdit
                        value={request.status}
                        onSave={(value) => updateLeaveRequestFieldMutation.mutate({ requestId: request.id, field: 'status', value })}
                        type="status"
                        options={[
                          { value: 'pending', label: 'Pending' },
                          { value: 'approved', label: 'Approved' },
                          { value: 'rejected', label: 'Rejected' },
                          { value: 'cancelled', label: 'Cancelled' }
                        ]}
                        className="min-w-24"
                      />
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
                  <label className="text-sm font-medium text-gray-600">Days Requested</label>
                  <p className="text-sm text-gray-900">{differenceInDays(new Date(selectedRequest.endDate), new Date(selectedRequest.startDate)) + 1}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <Badge className={getStatusColor(selectedRequest.status)}>
                    {selectedRequest.status}
                  </Badge>
                </div>
              </div>

              {/* Special Leave Type Indicators */}
              <div className="flex gap-2">
                {selectedRequest.isWorkersComp && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Workers' Compensation
                  </Badge>
                )}
                {selectedRequest.isMedicalLeave && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <Stethoscope className="h-3 w-3 mr-1" />
                    Medical Leave
                  </Badge>
                )}
                {selectedRequest.isFmla && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Heart className="h-3 w-3 mr-1" />
                    FMLA
                  </Badge>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Reason</label>
                <p className="text-sm text-gray-900 mt-1">{selectedRequest.reason || 'No reason provided'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Substitute Required</label>
                <p className="text-sm text-gray-900">{selectedRequest.substituteRequired ? 'Yes' : 'No'}</p>
              </div>

              {/* Workers Compensation Details */}
              {selectedRequest.isWorkersComp && (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-medium text-orange-800 mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Workers' Compensation Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedRequest.injuryDate && (
                      <div>
                        <label className="font-medium text-gray-600">Injury Date</label>
                        <p className="text-gray-900">{format(new Date(selectedRequest.injuryDate), 'PPP')}</p>
                      </div>
                    )}
                    {selectedRequest.incidentLocation && (
                      <div>
                        <label className="font-medium text-gray-600">Incident Location</label>
                        <p className="text-gray-900">{selectedRequest.incidentLocation}</p>
                      </div>
                    )}
                    {selectedRequest.injuryDescription && (
                      <div className="col-span-2">
                        <label className="font-medium text-gray-600">Injury Description</label>
                        <p className="text-gray-900">{selectedRequest.injuryDescription}</p>
                      </div>
                    )}
                    {selectedRequest.witnessName && (
                      <div>
                        <label className="font-medium text-gray-600">Witness Name</label>
                        <p className="text-gray-900">{selectedRequest.witnessName}</p>
                      </div>
                    )}
                    {selectedRequest.witnessContact && (
                      <div>
                        <label className="font-medium text-gray-600">Witness Contact</label>
                        <p className="text-gray-900">{selectedRequest.witnessContact}</p>
                      </div>
                    )}
                    {selectedRequest.claimNumber && (
                      <div>
                        <label className="font-medium text-gray-600">Claim Number</label>
                        <p className="text-gray-900">{selectedRequest.claimNumber}</p>
                      </div>
                    )}
                    {selectedRequest.insuranceProvider && (
                      <div>
                        <label className="font-medium text-gray-600">Insurance Provider</label>
                        <p className="text-gray-900">{selectedRequest.insuranceProvider}</p>
                      </div>
                    )}
                    {selectedRequest.doctorName && (
                      <div>
                        <label className="font-medium text-gray-600">Doctor Name</label>
                        <p className="text-gray-900">{selectedRequest.doctorName}</p>
                      </div>
                    )}
                    {selectedRequest.doctorContact && (
                      <div>
                        <label className="font-medium text-gray-600">Doctor Contact</label>
                        <p className="text-gray-900">{selectedRequest.doctorContact}</p>
                      </div>
                    )}
                    {selectedRequest.expectedReturnDate && (
                      <div>
                        <label className="font-medium text-gray-600">Expected Return Date</label>
                        <p className="text-gray-900">{format(new Date(selectedRequest.expectedReturnDate), 'PPP')}</p>
                      </div>
                    )}
                    {selectedRequest.workRestrictions && (
                      <div>
                        <label className="font-medium text-gray-600">Work Restrictions</label>
                        <p className="text-gray-900">{selectedRequest.workRestrictions}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Medical Leave Details */}
              {selectedRequest.isMedicalLeave && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Medical Leave Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedRequest.medicalProvider && (
                      <div>
                        <label className="font-medium text-gray-600">Medical Provider</label>
                        <p className="text-gray-900">{selectedRequest.medicalProvider}</p>
                      </div>
                    )}
                    {selectedRequest.medicalProviderContact && (
                      <div>
                        <label className="font-medium text-gray-600">Provider Contact</label>
                        <p className="text-gray-900">{selectedRequest.medicalProviderContact}</p>
                      </div>
                    )}
                    {selectedRequest.diagnosisCode && (
                      <div>
                        <label className="font-medium text-gray-600">Diagnosis Code</label>
                        <p className="text-gray-900">{selectedRequest.diagnosisCode}</p>
                      </div>
                    )}
                    {selectedRequest.medicalCertificationDate && (
                      <div>
                        <label className="font-medium text-gray-600">Medical Certification Date</label>
                        <p className="text-gray-900">{format(new Date(selectedRequest.medicalCertificationDate), 'PPP')}</p>
                      </div>
                    )}
                    {selectedRequest.medicalCertificationExpiry && (
                      <div>
                        <label className="font-medium text-gray-600">Medical Certification Expiry</label>
                        <p className="text-gray-900">{format(new Date(selectedRequest.medicalCertificationExpiry), 'PPP')}</p>
                      </div>
                    )}
                    <div>
                      <label className="font-medium text-gray-600">Leave Type</label>
                      <div className="flex gap-2 mt-1">
                        {selectedRequest.intermittentLeave && (
                          <Badge variant="outline" className="text-xs">Intermittent</Badge>
                        )}
                        {selectedRequest.reducedSchedule && (
                          <Badge variant="outline" className="text-xs">Reduced Schedule</Badge>
                        )}
                        {!selectedRequest.intermittentLeave && !selectedRequest.reducedSchedule && (
                          <Badge variant="outline" className="text-xs">Continuous</Badge>
                        )}
                      </div>
                    </div>
                    {selectedRequest.accommodationsNeeded && (
                      <div className="col-span-2">
                        <label className="font-medium text-gray-600">Accommodations Needed</label>
                        <p className="text-gray-900">{selectedRequest.accommodationsNeeded}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
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