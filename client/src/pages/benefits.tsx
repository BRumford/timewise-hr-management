import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Upload, Download, Search, Filter, Plus, Edit, Trash2, Calendar, DollarSign, Users, FileSpreadsheet, Mail, Send, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form schemas
const documentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  documentType: z.string().min(1, "Document type is required"),
  classification: z.string().min(1, "Classification is required"),
  planYear: z.string().min(1, "Plan year is required"),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
});

const planSchema = z.object({
  planName: z.string().min(1, "Plan name is required"),
  planType: z.string().min(1, "Plan type is required"),
  classification: z.string().min(1, "Classification is required"),
  planYear: z.string().min(1, "Plan year is required"),
  provider: z.string().optional(),
  monthlyCost: z.string().optional(),
  employeeContribution: z.string().optional(),
  employerContribution: z.string().optional(),
  deductible: z.string().optional(),
  outOfPocketMax: z.string().optional(),
  planDetails: z.string().optional(),
  coverageLevel: z.string().optional(),
  enrollmentPeriod: z.string().optional(),
  eligibilityRequirements: z.string().optional(),
});

const campaignSchema = z.object({
  campaignName: z.string().min(1, "Campaign name is required"),
  planYear: z.string().min(1, "Plan year is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  emailSubject: z.string().optional(),
  emailTemplate: z.string().optional(),
  senderEmail: z.string().email("Valid email required").optional(),
  senderName: z.string().optional(),
});

type DocumentForm = z.infer<typeof documentSchema>;
type PlanForm = z.infer<typeof planSchema>;
type CampaignForm = z.infer<typeof campaignSchema>;

function Benefits() {
  const [selectedClassification, setSelectedClassification] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Classification options
  const classifications = [
    { value: "certificated", label: "Certificated" },
    { value: "management", label: "Management" },
    { value: "classified", label: "Classified" },
  ];

  // Document type options
  const documentTypes = [
    { value: "cost_sheet", label: "Cost Sheet" },
    { value: "plan_documentation", label: "Plan Documentation" },
    { value: "enrollment_form", label: "Enrollment Form" },
    { value: "benefit_summary", label: "Benefit Summary" },
    { value: "provider_directory", label: "Provider Directory" },
    { value: "claims_form", label: "Claims Form" },
  ];

  // Plan type options
  const planTypes = [
    { value: "health", label: "Health Insurance" },
    { value: "dental", label: "Dental Insurance" },
    { value: "vision", label: "Vision Insurance" },
    { value: "retirement", label: "Retirement/401k" },
    { value: "life_insurance", label: "Life Insurance" },
    { value: "disability", label: "Disability Insurance" },
  ];

  // Category options
  const categories = [
    { value: "health", label: "Health" },
    { value: "dental", label: "Dental" },
    { value: "vision", label: "Vision" },
    { value: "retirement", label: "Retirement" },
    { value: "life_insurance", label: "Life Insurance" },
    { value: "disability", label: "Disability" },
  ];

  // Generate plan years (current year - 2 to current year + 2)
  const currentYear = new Date().getFullYear();
  const planYears = [];
  for (let i = currentYear - 2; i <= currentYear + 2; i++) {
    planYears.push({ value: `${i}-${i + 1}`, label: `${i}-${i + 1}` });
  }

  // Fetch benefits documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/benefits/documents', selectedClassification, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedClassification !== "all") {
        params.append('classification', selectedClassification);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const result = await apiRequest(`/api/benefits/documents?${params.toString()}`, "GET");
      console.log('Documents API result:', result);
      return Array.isArray(result) ? result : [];
    },
  });

  // Fetch benefits plans
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['/api/benefits/plans', selectedClassification],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedClassification !== "all") {
        params.append('classification', selectedClassification);
      }
      const result = await apiRequest(`/api/benefits/plans?${params.toString()}`, "GET");
      console.log('Plans API result:', result);
      return Array.isArray(result) ? result : [];
    },
  });

  // Document upload mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async (data: { formData: FormData }) => {
      const response = await fetch('/api/benefits/documents', {
        method: 'POST',
        body: data.formData,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/benefits/documents'] });
      setIsDocumentDialogOpen(false);
      setSelectedFile(null);
      toast({ title: "Success", description: "Document uploaded successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to upload document", variant: "destructive" });
    },
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: (data: PlanForm) => apiRequest('/api/benefits/plans', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/benefits/plans'] });
      setIsPlanDialogOpen(false);
      toast({ title: "Success", description: "Benefits plan created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create benefits plan", variant: "destructive" });
    },
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PlanForm> }) => 
      apiRequest(`/api/benefits/plans/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/benefits/plans'] });
      setIsPlanDialogOpen(false);
      setEditingPlan(null);
      toast({ title: "Success", description: "Benefits plan updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update benefits plan", variant: "destructive" });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/benefits/documents/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/benefits/documents'] });
      toast({ title: "Success", description: "Document deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    },
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/benefits/plans/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/benefits/plans'] });
      toast({ title: "Success", description: "Benefits plan deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete benefits plan", variant: "destructive" });
    },
  });

  // Form handlers
  const documentForm = useForm<DocumentForm>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: "",
      description: "",
      documentType: "",
      classification: "",
      planYear: `${currentYear}-${currentYear + 1}`,
      category: "",
      tags: [],
    },
  });

  const planForm = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      planName: "",
      planType: "",
      classification: "",
      planYear: `${currentYear}-${currentYear + 1}`,
      provider: "",
      monthlyCost: "",
      employeeContribution: "",
      employerContribution: "",
      deductible: "",
      outOfPocketMax: "",
      planDetails: "",
      coverageLevel: "",
      enrollmentPeriod: "",
      eligibilityRequirements: "",
    },
  });

  const handleDocumentSubmit = (data: DocumentForm) => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please select a file to upload", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'tags' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    uploadDocumentMutation.mutate({ formData });
  };

  const handlePlanSubmit = (data: PlanForm) => {
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data });
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan);
    planForm.reset({
      planName: plan.planName || "",
      planType: plan.planType || "",
      classification: plan.classification || "",
      planYear: plan.planYear || "",
      provider: plan.provider || "",
      monthlyCost: plan.monthlyCost?.toString() || "",
      employeeContribution: plan.employeeContribution?.toString() || "",
      employerContribution: plan.employerContribution?.toString() || "",
      deductible: plan.deductible?.toString() || "",
      outOfPocketMax: plan.outOfPocketMax?.toString() || "",
      planDetails: plan.planDetails || "",
      coverageLevel: plan.coverageLevel || "",
      enrollmentPeriod: plan.enrollmentPeriod || "",
      eligibilityRequirements: plan.eligibilityRequirements || "",
    });
    setIsPlanDialogOpen(true);
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return "N/A";
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Benefits Management</h1>
          <p className="text-muted-foreground">
            Manage cost sheets, plan documentation, and benefits information for different employee classifications
          </p>
        </div>
      </div>

      {/* Classification Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter by Employee Classification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedClassification} onValueChange={setSelectedClassification}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classifications</SelectItem>
                {classifications.map((classification) => (
                  <SelectItem key={classification.value} value={classification.value}>
                    {classification.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents & Cost Sheets
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Benefits Plans
          </TabsTrigger>
          <TabsTrigger value="enrollment" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Open Enrollment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="font-semibold">
                Benefits Documents ({(documents || []).length})
              </span>
            </div>
            
            <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload Benefits Document</DialogTitle>
                  <DialogDescription>
                    Upload cost sheets, plan documentation, and other benefits materials
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...documentForm}>
                  <form onSubmit={documentForm.handleSubmit(handleDocumentSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={documentForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Document Title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., 2024 Health Plan Cost Sheet" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={documentForm.control}
                        name="classification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee Classification</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select classification" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {classifications.map((classification) => (
                                  <SelectItem key={classification.value} value={classification.value}>
                                    {classification.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={documentForm.control}
                        name="documentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Document Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select document type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {documentTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={documentForm.control}
                        name="planYear"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plan Year</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select plan year" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {planYears.map((year) => (
                                  <SelectItem key={year.value} value={year.value}>
                                    {year.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={documentForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category.value} value={category.value}>
                                    {category.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-2">
                        <Label htmlFor="file">File Upload</Label>
                        <Input
                          id="file"
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="cursor-pointer"
                        />
                        {selectedFile && (
                          <p className="text-sm text-muted-foreground">
                            Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                          </p>
                        )}
                      </div>
                    </div>

                    <FormField
                      control={documentForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Brief description of the document contents..."
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDocumentDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={uploadDocumentMutation.isPending || !selectedFile}
                      >
                        {uploadDocumentMutation.isPending ? "Uploading..." : "Upload Document"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : Array.isArray(documents) && documents.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                <p className="text-muted-foreground mb-4">
                  Upload your first benefits document to get started
                </p>
                <Button onClick={() => setIsDocumentDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            ) : Array.isArray(documents) ? (
              documents.map((doc: any) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">{doc.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {classifications.find(c => c.value === doc.classification)?.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{doc.planYear}</span>
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(doc.fileUrl, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteDocumentMutation.mutate(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">
                          {documentTypes.find(t => t.value === doc.documentType)?.label}
                        </Badge>
                        {doc.category && (
                          <Badge variant="outline" className="text-xs">
                            {categories.find(c => c.value === doc.category)?.label}
                          </Badge>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(doc.fileSize || 0)}</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              <span className="font-semibold">
                Benefits Plans ({plans.length})
              </span>
            </div>
            
            <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="flex items-center gap-2"
                  onClick={() => {
                    setEditingPlan(null);
                    planForm.reset();
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add Benefits Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPlan ? "Edit Benefits Plan" : "Add Benefits Plan"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingPlan ? "Update the benefits plan information" : "Create a new benefits plan with detailed information"}
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...planForm}>
                  <form onSubmit={planForm.handleSubmit(handlePlanSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={planForm.control}
                        name="planName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plan Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Premium Health Plan" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={planForm.control}
                        name="provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provider</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Blue Cross Blue Shield" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={planForm.control}
                        name="planType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plan Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select plan type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {planTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={planForm.control}
                        name="classification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee Classification</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select classification" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {classifications.map((classification) => (
                                  <SelectItem key={classification.value} value={classification.value}>
                                    {classification.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={planForm.control}
                        name="planYear"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plan Year</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select plan year" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {planYears.map((year) => (
                                  <SelectItem key={year.value} value={year.value}>
                                    {year.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={planForm.control}
                        name="coverageLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Coverage Level</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Individual, Family, Employee + Spouse" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={planForm.control}
                        name="enrollmentPeriod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Enrollment Period</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Annual Open Enrollment" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={planForm.control}
                        name="monthlyCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monthly Cost</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={planForm.control}
                        name="employeeContribution"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee Contribution</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={planForm.control}
                        name="employerContribution"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employer Contribution</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={planForm.control}
                        name="deductible"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deductible</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={planForm.control}
                        name="outOfPocketMax"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Out of Pocket Maximum</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={planForm.control}
                      name="planDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plan Details</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Detailed description of plan coverage and benefits..."
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={planForm.control}
                      name="eligibilityRequirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Eligibility Requirements</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Requirements for employee eligibility..."
                              rows={2}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsPlanDialogOpen(false);
                          setEditingPlan(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                      >
                        {createPlanMutation.isPending || updatePlanMutation.isPending 
                          ? "Saving..." 
                          : editingPlan ? "Update Plan" : "Create Plan"
                        }
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {plansLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : !plans || plans.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <FileSpreadsheet className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No benefits plans found</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first benefits plan to get started
                </p>
                <Button onClick={() => setIsPlanDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Benefits Plan
                </Button>
              </div>
            ) : (
              (plans || []).map((plan: any) => (
                <Card key={plan.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{plan.planName}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {planTypes.find(t => t.value === plan.planType)?.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {classifications.find(c => c.value === plan.classification)?.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{plan.planYear}</span>
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditPlan(plan)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deletePlanMutation.mutate(plan.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {plan.provider && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Provider:</span>
                          <span>{plan.provider}</span>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {plan.monthlyCost && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Monthly:</span>
                            <span>{formatCurrency(plan.monthlyCost)}</span>
                          </div>
                        )}
                        
                        {plan.deductible && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Deductible:</span>
                            <span>{formatCurrency(plan.deductible)}</span>
                          </div>
                        )}
                      </div>

                      {(plan.employeeContribution || plan.employerContribution) && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {plan.employeeContribution && (
                            <div>
                              <span className="font-medium">Employee:</span>
                              <span className="ml-2">{formatCurrency(plan.employeeContribution)}</span>
                            </div>
                          )}
                          {plan.employerContribution && (
                            <div>
                              <span className="font-medium">Employer:</span>
                              <span className="ml-2">{formatCurrency(plan.employerContribution)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {plan.coverageLevel && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Coverage:</span>
                          <span>{plan.coverageLevel}</span>
                        </div>
                      )}

                      {plan.planDetails && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {plan.planDetails}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>Updated {new Date(plan.updatedAt).toLocaleDateString()}</span>
                        {plan.isActive === false && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="enrollment" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Open Enrollment Campaigns</h3>
              <p className="text-sm text-muted-foreground">
                Create and manage open enrollment email campaigns for benefits communication
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Open Enrollment Campaign</DialogTitle>
                  <DialogDescription>
                    Set up a new campaign to send benefits information to employees
                  </DialogDescription>
                </DialogHeader>
                <OpenEnrollmentCampaignForm />
              </DialogContent>
            </Dialog>
          </div>

          <OpenEnrollmentCampaigns />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Open Enrollment Campaign Form Component
function OpenEnrollmentCampaignForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      campaignName: "",
      planYear: new Date().getFullYear().toString(),
      startDate: "",
      endDate: "",
      emailSubject: "Important: Open Enrollment Information for {planYear}",
      emailTemplate: "Dear {employeeName},\n\nOpen enrollment for {planYear} is now available. Please review the attached benefits information for your classification ({classification}).\n\nEnrollment Period: {startDate} - {endDate}\n\nPlease contact HR if you have any questions.\n\nBest regards,\nHR Department",
      senderEmail: "hr@district.edu",
      senderName: "HR Department",
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data: CampaignForm) => apiRequest('/api/open-enrollment/campaigns', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/open-enrollment/campaigns'] });
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CampaignForm) => {
    createCampaignMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="campaignName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Campaign Name</FormLabel>
                <FormControl>
                  <Input placeholder="2025 Open Enrollment" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="planYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plan Year</FormLabel>
                <FormControl>
                  <Input placeholder="2025" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
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
            control={form.control}
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="senderEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sender Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="hr@district.edu" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="senderName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sender Name</FormLabel>
                <FormControl>
                  <Input placeholder="HR Department" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="emailSubject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Subject</FormLabel>
              <FormControl>
                <Input placeholder="Open Enrollment Information" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="emailTemplate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Template</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Email message template..."
                  className="min-h-[120px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="submit" disabled={createCampaignMutation.isPending}>
            {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Open Enrollment Campaigns List Component
function OpenEnrollmentCampaigns() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedClassifications, setSelectedClassifications] = useState<string[]>([]);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['/api/open-enrollment/campaigns'],
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/open-enrollment/campaigns/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/open-enrollment/campaigns'] });
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  const sendEmailsMutation = useMutation({
    mutationFn: ({ campaignId, classifications }: { campaignId: number; classifications: string[] }) =>
      apiRequest(`/api/open-enrollment/campaigns/${campaignId}/send`, 'POST', { classifications }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/open-enrollment/campaigns'] });
      toast({
        title: "Success",
        description: `Emails sent successfully! ${data.emailsSent} sent, ${data.emailsFailed} failed`,
      });
      setShowSendDialog(false);
      setSelectedCampaign(null);
      setSelectedClassifications([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send emails",
        variant: "destructive",
      });
    },
  });

  const handleSendEmails = () => {
    if (selectedCampaign && selectedClassifications.length > 0) {
      sendEmailsMutation.mutate({
        campaignId: selectedCampaign.id,
        classifications: selectedClassifications,
      });
    }
  };

  const handleDeleteCampaign = (id: number) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      deleteCampaignMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Campaigns Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first open enrollment campaign to start sending benefits information to employees.
              </p>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign: any) => (
            <Card key={campaign.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{campaign.campaignName}</h3>
                      <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {campaign.planYear}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {campaign.totalEmployees || 0} employees
                      </div>
                    </div>
                    {campaign.emailsSent > 0 && (
                      <div className="text-sm">
                        <span className="text-green-600">{campaign.emailsSent} sent</span>
                        {campaign.emailsFailed > 0 && (
                          <span className="text-red-600 ml-2">{campaign.emailsFailed} failed</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setShowSendDialog(true);
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Emails
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      disabled={deleteCampaignMutation.isPending}
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

      {/* Send Emails Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Campaign Emails</DialogTitle>
            <DialogDescription>
              Select employee classifications to send benefits information to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee Classifications</Label>
              <div className="space-y-2 mt-2">
                {['Certificated', 'Classified', 'Management'].map((classification) => (
                  <div key={classification} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={classification}
                      checked={selectedClassifications.includes(classification)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClassifications([...selectedClassifications, classification]);
                        } else {
                          setSelectedClassifications(selectedClassifications.filter(c => c !== classification));
                        }
                      }}
                    />
                    <Label htmlFor={classification}>{classification}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSendEmails}
                disabled={selectedClassifications.length === 0 || sendEmailsMutation.isPending}
              >
                {sendEmailsMutation.isPending ? "Sending..." : `Send to ${selectedClassifications.length} Classification(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Benefits;