import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DollarSign, Settings, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const districtSettingsSchema = z.object({
  districtName: z.string().min(1, "District name is required"),
  districtCode: z.string().min(1, "District code is required"),
  payrollFrequency: z.enum(["weekly", "bi-weekly", "monthly", "semi-monthly"]),
  payrollCutoffDay: z.number().min(1).max(31),
  payrollPayDay: z.number().min(1).max(31),
  timecardCutoffDay: z.number().min(1).max(31),
  timecardSubmissionDeadline: z.number().min(1).max(10),
  timecardApprovalDeadline: z.number().min(1).max(10),
  fiscalYearStart: z.string(),
  requireManagerApproval: z.boolean(),
  requirePayrollApproval: z.boolean(),
  autoApprovalThreshold: z.number().min(0),
  enableEmailNotifications: z.boolean(),
  enableSmsNotifications: z.boolean(),
  reminderDaysBefore: z.number().min(1).max(7),
});

const payPeriodGenerationSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  frequency: z.enum(["weekly", "bi-weekly", "monthly", "semi-monthly"]),
});

type DistrictSettings = z.infer<typeof districtSettingsSchema>;
type PayPeriodGeneration = z.infer<typeof payPeriodGenerationSchema>;

interface PayPeriod {
  id: number;
  periodName: string;
  periodType: string;
  startDate: string;
  endDate: string;
  timecardCutoffDate: string;
  timecardSubmissionDeadline: string;
  timecardApprovalDeadline: string;
  payrollProcessingDate: string;
  payDate: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PayrollSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Fetch district settings
  const { data: districtSettings, isLoading: settingsLoading } = useQuery<DistrictSettings>({
    queryKey: ['/api/district-settings'],
  });

  // Fetch pay periods
  const { data: payPeriods, isLoading: periodsLoading } = useQuery<PayPeriod[]>({
    queryKey: ['/api/pay-periods'],
  });

  // District settings form
  const settingsForm = useForm<DistrictSettings>({
    resolver: zodResolver(districtSettingsSchema),
    defaultValues: {
      districtName: "",
      districtCode: "",
      payrollFrequency: "bi-weekly",
      payrollCutoffDay: 25,
      payrollPayDay: 10,
      timecardCutoffDay: 25,
      timecardSubmissionDeadline: 2,
      timecardApprovalDeadline: 5,
      fiscalYearStart: "2024-07-01",
      requireManagerApproval: true,
      requirePayrollApproval: true,
      autoApprovalThreshold: 0,
      enableEmailNotifications: true,
      enableSmsNotifications: false,
      reminderDaysBefore: 3,
    },
  });

  // Reset form when district settings data is loaded
  useEffect(() => {
    if (districtSettings) {
      settingsForm.reset(districtSettings);
    }
  }, [districtSettings, settingsForm]);

  // Pay period generation form
  const generationForm = useForm<PayPeriodGeneration>({
    resolver: zodResolver(payPeriodGenerationSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      frequency: "bi-weekly",
    },
  });

  // Update district settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: DistrictSettings) => {
      return await apiRequest('/api/district-settings', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "District settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/district-settings'] });
      setShowSettingsDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update district settings",
        variant: "destructive",
      });
    },
  });

  // Generate pay periods mutation
  const generatePeriodsMutation = useMutation({
    mutationFn: async (data: PayPeriodGeneration) => {
      return await apiRequest('/api/pay-periods/generate', 'POST', data);
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Generated ${data.length} pay periods successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pay-periods'] });
      setShowGenerateDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate pay periods",
        variant: "destructive",
      });
    },
  });

  // Delete pay period mutation
  const deletePeriodMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/pay-periods/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Pay period deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pay-periods'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete pay period",
        variant: "destructive",
      });
    },
  });

  const handleSettingsSubmit = (data: DistrictSettings) => {
    updateSettingsMutation.mutate(data);
  };

  const handleGeneratePeriods = (data: PayPeriodGeneration) => {
    generatePeriodsMutation.mutate(data);
  };

  const handleDeletePeriod = (id: number) => {
    if (confirm("Are you sure you want to delete this pay period?")) {
      deletePeriodMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'processed':
        return 'bg-gray-100 text-gray-800';
      case 'paid':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (settingsLoading || periodsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Payroll Settings</h1>
          <p className="text-gray-600">Configure district payroll and timecard settings</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button>
                <Settings className="w-4 h-4 mr-2" />
                District Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>District Settings</DialogTitle>
                <DialogDescription>
                  Configure district-wide payroll and timecard settings
                </DialogDescription>
              </DialogHeader>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={settingsForm.control}
                      name="districtName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>District Name</FormLabel>
                          <FormControl>
                            <Input placeholder="School District Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settingsForm.control}
                      name="districtCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>District Code</FormLabel>
                          <FormControl>
                            <Input placeholder="SD001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={settingsForm.control}
                      name="payrollFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payroll Frequency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="semi-monthly">Semi-monthly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settingsForm.control}
                      name="fiscalYearStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fiscal Year Start</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={settingsForm.control}
                      name="payrollCutoffDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payroll Cutoff Day</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="31" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value ? parseInt(value) : undefined);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settingsForm.control}
                      name="payrollPayDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pay Day</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="31" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value ? parseInt(value) : undefined);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settingsForm.control}
                      name="timecardCutoffDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timecard Cutoff Day</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="31" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value ? parseInt(value) : undefined);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateSettingsMutation.isPending}>
                      {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="periods">Pay Periods</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">District Name</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{districtSettings?.districtName || "Not Set"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payroll Frequency</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{districtSettings?.payrollFrequency || "Not Set"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cutoff Day</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{districtSettings?.timecardCutoffDay || "Not Set"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pay Day</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{districtSettings?.payrollPayDay || "Not Set"}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Settings</CardTitle>
                <CardDescription>District payroll configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="font-medium">Payroll Frequency:</span>
                  <span className="capitalize">{districtSettings?.payrollFrequency || "Not configured"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Timecard Cutoff:</span>
                  <span>{districtSettings?.timecardCutoffDay || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Submission Deadline:</span>
                  <span>{districtSettings?.timecardSubmissionDeadline || "Not set"} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Approval Deadline:</span>
                  <span>{districtSettings?.timecardApprovalDeadline || "Not set"} days</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pay Periods Summary</CardTitle>
                <CardDescription>Overview of configured pay periods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Total Periods:</span>
                    <span>{payPeriods?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Active Periods:</span>
                    <span>{payPeriods?.filter(p => p.isActive).length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Current Period:</span>
                    <span>{payPeriods?.find(p => p.status === 'current')?.periodName || "None"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="periods" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Pay Periods</h2>
            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Periods
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Pay Periods</DialogTitle>
                  <DialogDescription>
                    Generate pay periods for a specific date range and frequency
                  </DialogDescription>
                </DialogHeader>
                <Form {...generationForm}>
                  <form onSubmit={generationForm.handleSubmit(handleGeneratePeriods)} className="space-y-4">
                    <FormField
                      control={generationForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={generationForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={generationForm.control}
                      name="frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="semi-monthly">Semi-monthly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={generatePeriodsMutation.isPending}>
                        {generatePeriodsMutation.isPending ? "Generating..." : "Generate Periods"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {payPeriods?.map((period) => (
              <Card key={period.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{period.periodName}</CardTitle>
                      <CardDescription>
                        {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(period.status)}>
                        {period.status.charAt(0).toUpperCase() + period.status.slice(1)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePeriod(period.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Timecard Cutoff:</span>
                      <br />
                      {new Date(period.timecardCutoffDate).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Submission Deadline:</span>
                      <br />
                      {new Date(period.timecardSubmissionDeadline).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Approval Deadline:</span>
                      <br />
                      {new Date(period.timecardApprovalDeadline).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Pay Date:</span>
                      <br />
                      {new Date(period.payDate).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>District Configuration</CardTitle>
              <CardDescription>
                Manage district-wide settings for payroll and timecard processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">District Name</Label>
                    <p className="text-sm text-gray-600">{districtSettings?.districtName || "Not configured"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">District Code</Label>
                    <p className="text-sm text-gray-600">{districtSettings?.districtCode || "Not configured"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Payroll Frequency</Label>
                    <p className="text-sm text-gray-600 capitalize">{districtSettings?.payrollFrequency || "Not configured"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Payroll Cutoff Day</Label>
                    <p className="text-sm text-gray-600">{districtSettings?.payrollCutoffDay || "Not configured"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Pay Day</Label>
                    <p className="text-sm text-gray-600">{districtSettings?.payrollPayDay || "Not configured"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Timecard Cutoff Day</Label>
                    <p className="text-sm text-gray-600">{districtSettings?.timecardCutoffDay || "Not configured"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Submission Deadline</Label>
                    <p className="text-sm text-gray-600">{districtSettings?.timecardSubmissionDeadline || "Not configured"} days</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Approval Deadline</Label>
                    <p className="text-sm text-gray-600">{districtSettings?.timecardApprovalDeadline || "Not configured"} days</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setShowSettingsDialog(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}