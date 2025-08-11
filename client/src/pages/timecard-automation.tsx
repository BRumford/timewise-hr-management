import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Users, FileText, Settings, Play, History, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const payDateConfigSchema = z.object({
  configurationName: z.string().min(1, "Configuration name is required"),
  payScheduleType: z.string().min(1, "Pay schedule type is required"),
  employeeTypes: z.array(z.string()).min(1, "At least one employee type is required"),
  fiscalYearStart: z.string().min(1, "Monthly start date is required"),
  fiscalYearEnd: z.string().min(1, "Monthly end date is required"),
  payDates: z.array(z.object({
    date: z.string(),
    payPeriodStart: z.string(),
    payPeriodEnd: z.string(),
    timecardDueDate: z.string()
  })).min(1, "At least one pay date is required")
});

const timecardGenerationSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2024),
  employeeTypes: z.array(z.string()).optional()
});

const bulkGenerationSchema = z.object({
  startMonth: z.number().min(1).max(12),
  startYear: z.number().min(2024),
  endMonth: z.number().min(1).max(12),
  endYear: z.number().min(2024),
  employeeTypes: z.array(z.string()).optional()
});

export default function TimecardAutomation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isGenerationDialogOpen, setIsGenerationDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

  // Fetch pay date configurations
  const { data: payConfigurations = [], isLoading: configsLoading } = useQuery({
    queryKey: ["/api/pay-date-configurations"],
  });

  // Fetch generation templates
  const { data: generationTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/timecard-generation-templates"],
  });

  // Fetch generation job history
  const { data: generationJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/timecard-generation-jobs"],
  });

  // Fetch timecard templates for dropdowns
  const { data: timecardTemplates } = useQuery({
    queryKey: ["/api/timecard-templates"],
  });

  // Pay date configuration form
  const configForm = useForm({
    resolver: zodResolver(payDateConfigSchema),
    defaultValues: {
      configurationName: "",
      payScheduleType: "monthly",
      employeeTypes: [],
      fiscalYearStart: "",
      fiscalYearEnd: "",
      payDates: []
    }
  });

  // Monthly generation form
  const generationForm = useForm({
    resolver: zodResolver(timecardGenerationSchema),
    defaultValues: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      employeeTypes: []
    }
  });

  // Bulk generation form
  const bulkForm = useForm({
    resolver: zodResolver(bulkGenerationSchema),
    defaultValues: {
      startMonth: new Date().getMonth() + 1,
      startYear: new Date().getFullYear(),
      endMonth: new Date().getMonth() + 1,
      endYear: new Date().getFullYear(),
      employeeTypes: []
    }
  });

  // Create pay date configuration mutation
  const createConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/pay-date-configurations", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pay-date-configurations"] });
      setIsConfigDialogOpen(false);
      configForm.reset();
      toast({
        title: "Configuration Created",
        description: "Pay date configuration created successfully",
        duration: 4000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create pay date configuration",
        variant: "destructive",
      });
    },
  });

  // Generate monthly timecards mutation
  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/generate-monthly-timecards", "POST", data);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecard-generation-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-timecards"] });
      setIsGenerationDialogOpen(false);
      generationForm.reset();
      toast({
        title: "✅ Timecards Generated",
        description: `Successfully generated ${result.timecardsGenerated} timecards for ${result.employeeCount} employees`,
        duration: 5000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate timecards",
        variant: "destructive",
      });
    },
  });

  // Bulk generation mutation
  const bulkGenerateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/generate-bulk-timecards", "POST", data);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecard-generation-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-timecards"] });
      setIsBulkDialogOpen(false);
      bulkForm.reset();
      toast({
        title: "✅ Bulk Generation Complete",
        description: `Generated ${result.totalGenerated} total timecards across multiple months`,
        duration: 5000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Generation Failed",
        description: error.message || "Failed to generate bulk timecards",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (configsLoading || templatesLoading || jobsLoading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center space-x-2">
          <Clock className="h-6 w-6 animate-spin" />
          <span>Loading timecard automation...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timecard Automation</h1>
          <p className="text-gray-600 mt-2">Streamline monthly timecard generation with automated workflows</p>
        </div>
        <div className="flex space-x-3">
          <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configure Pay Dates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Pay Date Configuration</DialogTitle>
                <DialogDescription>
                  Set up pay schedules and dates for automated timecard generation
                </DialogDescription>
              </DialogHeader>
              <Form {...configForm}>
                <form onSubmit={configForm.handleSubmit((data) => createConfigMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={configForm.control}
                    name="configurationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Configuration Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., FY 2025 Monthly Schedule" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={configForm.control}
                      name="payScheduleType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pay Schedule Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                              <SelectItem value="semi-monthly">Semi-Monthly</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={configForm.control}
                      name="employeeTypes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee Types</FormLabel>
                          <FormDescription>Hold Ctrl/Cmd to select multiple</FormDescription>
                          <Select onValueChange={(value) => field.onChange([value])}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select employee types" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="certificated">Certificated</SelectItem>
                              <SelectItem value="classified">Classified</SelectItem>
                              <SelectItem value="substitute">Substitute</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={configForm.control}
                      name="fiscalYearStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={configForm.control}
                      name="fiscalYearEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createConfigMutation.isPending}>
                      {createConfigMutation.isPending ? "Creating..." : "Create Configuration"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isGenerationDialogOpen} onOpenChange={setIsGenerationDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Play className="h-4 w-4 mr-2" />
                Generate Timecards
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Monthly Timecards</DialogTitle>
                <DialogDescription>
                  Create timecards for all active employees for a specific month
                </DialogDescription>
              </DialogHeader>
              <Form {...generationForm}>
                <form onSubmit={generationForm.handleSubmit((data) => generateMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={generationForm.control}
                      name="month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Month</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {format(new Date(2024, i, 1), 'MMMM')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={generationForm.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="2024" 
                              max="2030" 
                              value={field.value} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={generationForm.control}
                    name="employeeTypes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee Types (Optional)</FormLabel>
                        <FormDescription>Leave empty to generate for all employee types</FormDescription>
                        <Select onValueChange={(value) => field.onChange([value])}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select specific types or leave empty for all" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="certificated">Certificated Only</SelectItem>
                            <SelectItem value="classified">Classified Only</SelectItem>
                            <SelectItem value="substitute">Substitute Only</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={() => setIsGenerationDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={generateMutation.isPending}>
                      {generateMutation.isPending ? "Generating..." : "Generate Timecards"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configurations">Pay Dates</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Configurations</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{payConfigurations?.filter((c: any) => c.isActive).length || 0}</div>
                <p className="text-xs text-muted-foreground">Pay date configurations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Generation Templates</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{generationTemplates?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Automation templates</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Jobs</CardTitle>
                <History className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{generationJobs?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Generation runs</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common timecard automation tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col justify-center"
                  onClick={() => setIsGenerationDialogOpen(true)}
                >
                  <Play className="h-6 w-6 mb-2" />
                  Generate This Month's Timecards
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col justify-center"
                  onClick={() => setIsBulkDialogOpen(true)}
                >
                  <Calendar className="h-6 w-6 mb-2" />
                  Bulk Generate Multiple Months
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Job Status */}
          {generationJobs && generationJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Generation Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {generationJobs.slice(0, 5).map((job: any) => (
                    <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <p className="font-medium">
                            {format(new Date(job.targetYear, job.targetMonth - 1), 'MMMM yyyy')} Generation
                          </p>
                          <p className="text-sm text-gray-600">
                            {job.timecardsGenerated} timecards created
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {format(new Date(job.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pay Date Configurations Tab */}
        <TabsContent value="configurations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pay Date Configurations</CardTitle>
              <CardDescription>Manage pay schedules and timecard generation timing</CardDescription>
            </CardHeader>
            <CardContent>
              {payConfigurations && payConfigurations.length > 0 ? (
                <div className="space-y-4">
                  {payConfigurations.map((config: any) => (
                    <div key={config.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{config.configurationName}</h3>
                          <p className="text-sm text-gray-600">{config.payScheduleType} schedule</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {config.isActive && (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          )}
                          {config.isDefault && (
                            <Badge className="bg-blue-100 text-blue-800">Default</Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Period:</span> {config.fiscalYearStart} to {config.fiscalYearEnd}
                        </div>
                        <div>
                          <span className="font-medium">Employee Types:</span> {config.employeeTypes?.join(', ') || 'All'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No pay date configurations found</p>
                  <p className="text-sm text-gray-500 mb-4">Create a configuration to start automated timecard generation</p>
                  <Button onClick={() => setIsConfigDialogOpen(true)}>
                    Create First Configuration
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generation Templates</CardTitle>
              <CardDescription>Templates that define how timecards are automatically generated</CardDescription>
            </CardHeader>
            <CardContent>
              {generationTemplates && generationTemplates.length > 0 ? (
                <div className="space-y-4">
                  {generationTemplates.map((template: any) => (
                    <div key={template.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{template.templateName}</h3>
                          <p className="text-sm text-gray-600">Employee Type: {template.employeeType}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {template.isActive && (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          )}
                          {template.autoGenerationEnabled && (
                            <Badge className="bg-blue-100 text-blue-800">Auto-Generation</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Generate:</span> {template.generateDaysInAdvance} days in advance
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No generation templates found</p>
                  <p className="text-sm text-gray-500">Templates will be created automatically based on your timecard templates</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generation History</CardTitle>
              <CardDescription>Complete history of automated timecard generation jobs</CardDescription>
            </CardHeader>
            <CardContent>
              {generationJobs && generationJobs.length > 0 ? (
                <div className="space-y-4">
                  {generationJobs.map((job: any) => (
                    <div key={job.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(job.status)}
                          <div>
                            <h3 className="font-semibold">
                              {format(new Date(job.targetYear, job.targetMonth - 1), 'MMMM yyyy')} Generation
                            </h3>
                            <p className="text-sm text-gray-600">
                              Job Type: {job.jobType} • Triggered by: {job.triggeredBy}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Employees:</span> {job.employeeCount}
                        </div>
                        <div>
                          <span className="font-medium">Generated:</span> {job.timecardsGenerated}
                        </div>
                        <div>
                          <span className="font-medium">Errors:</span> {job.errorCount}
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Started: {format(new Date(job.createdAt), 'MMM d, yyyy h:mm a')}</span>
                          {job.completedAt && (
                            <span>Completed: {format(new Date(job.completedAt), 'MMM d, yyyy h:mm a')}</span>
                          )}
                        </div>
                      </div>

                      {job.errorDetails && (
                        <Alert className="mt-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {job.errorDetails}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No generation history found</p>
                  <p className="text-sm text-gray-500">Generate your first batch of timecards to see history here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Generation Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Generate Timecards</DialogTitle>
            <DialogDescription>
              Generate timecards for multiple months at once
            </DialogDescription>
          </DialogHeader>
          <Form {...bulkForm}>
            <form onSubmit={bulkForm.handleSubmit((data) => bulkGenerateMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={bulkForm.control}
                  name="startMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Month</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {format(new Date(2024, i, 1), 'MMMM')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={bulkForm.control}
                  name="startYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Year</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="2024" 
                          max="2030" 
                          value={field.value} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={bulkForm.control}
                  name="endMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Month</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {format(new Date(2024, i, 1), 'MMMM')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={bulkForm.control}
                  name="endYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Year</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="2024" 
                          max="2030" 
                          value={field.value} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={bulkForm.control}
                name="employeeTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Types (Optional)</FormLabel>
                    <FormDescription>Leave empty to generate for all employee types</FormDescription>
                    <Select onValueChange={(value) => field.onChange([value])}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select specific types or leave empty for all" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="certificated">Certificated Only</SelectItem>
                        <SelectItem value="classified">Classified Only</SelectItem>
                        <SelectItem value="substitute">Substitute Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={bulkGenerateMutation.isPending}>
                  {bulkGenerateMutation.isPending ? "Generating..." : "Generate Bulk Timecards"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}