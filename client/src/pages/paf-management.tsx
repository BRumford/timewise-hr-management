import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, Clock, FileText, Plus, Upload, Download, Edit, Trash2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PafTemplate {
  id: number;
  name: string;
  description: string;
  fileUrl: string;
  isActive: boolean;
  isDefault: boolean;
  formFields: Array<{
    name: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
  createdAt: string;
  updatedAt: string;
}

interface PafSubmission {
  id: number;
  templateId: number;
  status: string;
  formData: any;
  employeeName: string;
  positionTitle: string;
  effectiveDate: string;
  submittedBy: string;
  createdAt: string;
  updatedAt: string;
}

function PafTemplateForm({ template, onClose }: { template?: PafTemplate; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: template?.name || "",
    description: template?.description || "",
    isActive: template?.isActive ?? true,
    isDefault: template?.isDefault ?? false,
    formFields: template?.formFields || [],
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTemplate = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/paf/templates', {
        method: 'POST',
        body: data,
      });
      if (!response.ok) {
        throw new Error('Failed to create template');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/paf/templates"] });
      toast({
        title: "Success",
        description: "PAF template created successfully",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/paf/templates/${template!.id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/paf/templates"] });
      toast({
        title: "Success",
        description: "PAF template updated successfully",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (template) {
      // Update existing template
      updateTemplate.mutate(formData);
    } else {
      // Create new template
      if (!selectedFile) {
        toast({
          title: "Error",
          description: "Please select a PDF file",
          variant: "destructive",
        });
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('pdfFile', selectedFile);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('formFields', JSON.stringify(formData.formFields));
      
      createTemplate.mutate(formDataToSend);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Template Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      {!template && (
        <div>
          <Label htmlFor="pdfFile">PDF Template File</Label>
          <Input
            id="pdfFile"
            type="file"
            accept=".pdf"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            required
          />
        </div>
      )}

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
        />
        <Label htmlFor="isActive">Active Template</Label>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isDefault"
          checked={formData.isDefault}
          onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
        />
        <Label htmlFor="isDefault">Default Template</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
          {template ? "Update" : "Create"} Template
        </Button>
      </div>
    </form>
  );
}

function PafSubmissionForm({ templateId, onClose }: { templateId: number; onClose: () => void }) {
  const [formData, setFormData] = useState({
    templateId,
    // Employee Information
    employeeName: "",
    employeeId: "",
    department: "",
    currentPosition: "",
    newPosition: "",
    payGrade: "",
    workLocation: "",
    
    // Action Details
    actionType: "",
    effectiveDate: "",
    reason: "",
    description: "",
    
    // Salary Information
    currentSalary: "",
    newSalary: "",
    budgetAccount: "",
    fundingSource: "",
    
    // Additional Information
    supervisorName: "",
    hrNotes: "",
    attachments: "",
    
    formData: {},
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createSubmission = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/paf/submissions', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/paf/submissions"] });
      toast({
        title: "Success",
        description: "Personnel Action Form submitted successfully",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSubmission.mutate(formData);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Employee Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employeeName">Employee Name *</Label>
              <Input
                id="employeeName"
                value={formData.employeeName}
                onChange={(e) => updateFormData('employeeName', e.target.value)}
                placeholder="First Last"
                required
              />
            </div>
            <div>
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                value={formData.employeeId}
                onChange={(e) => updateFormData('employeeId', e.target.value)}
                placeholder="EMP-12345"
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => updateFormData('department', e.target.value)}
                placeholder="Human Resources"
              />
            </div>
            <div>
              <Label htmlFor="workLocation">Work Location</Label>
              <Input
                id="workLocation"
                value={formData.workLocation}
                onChange={(e) => updateFormData('workLocation', e.target.value)}
                placeholder="Main Campus"
              />
            </div>
          </div>
        </div>

        {/* Position Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Position Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currentPosition">Current Position</Label>
              <Input
                id="currentPosition"
                value={formData.currentPosition}
                onChange={(e) => updateFormData('currentPosition', e.target.value)}
                placeholder="Teacher"
              />
            </div>
            <div>
              <Label htmlFor="newPosition">New Position</Label>
              <Input
                id="newPosition"
                value={formData.newPosition}
                onChange={(e) => updateFormData('newPosition', e.target.value)}
                placeholder="Department Head"
              />
            </div>
            <div>
              <Label htmlFor="payGrade">Pay Grade</Label>
              <Input
                id="payGrade"
                value={formData.payGrade}
                onChange={(e) => updateFormData('payGrade', e.target.value)}
                placeholder="Grade 5"
              />
            </div>
            <div>
              <Label htmlFor="supervisorName">Supervisor Name</Label>
              <Input
                id="supervisorName"
                value={formData.supervisorName}
                onChange={(e) => updateFormData('supervisorName', e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
          </div>
        </div>

        {/* Action Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Action Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="actionType">Action Type *</Label>
              <select
                id="actionType"
                value={formData.actionType}
                onChange={(e) => updateFormData('actionType', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              >
                <option value="">Select Action Type</option>
                <option value="hire">New Hire</option>
                <option value="promotion">Promotion</option>
                <option value="transfer">Transfer</option>
                <option value="salary_change">Salary Change</option>
                <option value="title_change">Title Change</option>
                <option value="termination">Termination</option>
                <option value="leave">Leave of Absence</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="effectiveDate">Effective Date *</Label>
              <Input
                id="effectiveDate"
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => updateFormData('effectiveDate', e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="reason">Reason for Action *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => updateFormData('reason', e.target.value)}
              placeholder="Provide detailed reason for this personnel action..."
              rows={3}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Additional Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Any additional details or special circumstances..."
              rows={2}
            />
          </div>
        </div>

        {/* Salary Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Salary Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currentSalary">Current Salary</Label>
              <Input
                id="currentSalary"
                value={formData.currentSalary}
                onChange={(e) => updateFormData('currentSalary', e.target.value)}
                placeholder="$50,000"
              />
            </div>
            <div>
              <Label htmlFor="newSalary">New Salary</Label>
              <Input
                id="newSalary"
                value={formData.newSalary}
                onChange={(e) => updateFormData('newSalary', e.target.value)}
                placeholder="$55,000"
              />
            </div>
            <div>
              <Label htmlFor="budgetAccount">Budget Account</Label>
              <Input
                id="budgetAccount"
                value={formData.budgetAccount}
                onChange={(e) => updateFormData('budgetAccount', e.target.value)}
                placeholder="ACC-2024-001"
              />
            </div>
            <div>
              <Label htmlFor="fundingSource">Funding Source</Label>
              <Input
                id="fundingSource"
                value={formData.fundingSource}
                onChange={(e) => updateFormData('fundingSource', e.target.value)}
                placeholder="General Fund"
              />
            </div>
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Additional Information</h3>
          <div>
            <Label htmlFor="hrNotes">HR Notes</Label>
            <Textarea
              id="hrNotes"
              value={formData.hrNotes}
              onChange={(e) => updateFormData('hrNotes', e.target.value)}
              placeholder="Internal HR notes or comments..."
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="attachments">Attachments</Label>
            <Input
              id="attachments"
              value={formData.attachments}
              onChange={(e) => updateFormData('attachments', e.target.value)}
              placeholder="List any supporting documents..."
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createSubmission.isPending}>
            {createSubmission.isPending ? "Submitting..." : "Submit Personnel Action Form"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    draft: "secondary",
    submitted: "default",
    under_review: "secondary",
    approved: "default",
    denied: "destructive",
  } as const;

  const icons = {
    draft: Clock,
    submitted: Send,
    under_review: AlertCircle,
    approved: CheckCircle,
    denied: AlertCircle,
  };

  const Icon = icons[status as keyof typeof icons] || Clock;

  return (
    <Badge variant={variants[status as keyof typeof variants] || "secondary"} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
    </Badge>
  );
}

export default function PafManagement() {
  const [selectedTemplate, setSelectedTemplate] = useState<PafTemplate | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isSubmissionDialogOpen, setIsSubmissionDialogOpen] = useState(false);
  const [selectedTemplateForSubmission, setSelectedTemplateForSubmission] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/paf/templates"],
  });

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/paf/submissions"],
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/paf/templates/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/paf/templates"] });
      toast({
        title: "Success",
        description: "PAF template deleted successfully",
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

  const loadStandardTemplate = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/paf/templates/load-prebuilt', 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/paf/templates"] });
      toast({
        title: "Success",
        description: "Standard PAF template loaded successfully",
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
      return await apiRequest(`/api/paf/submissions/${id}/submit`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/paf/submissions"] });
      toast({
        title: "Success",
        description: "PAF submitted for approval",
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

  if (templatesLoading || submissionsLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Personnel Action Forms (PAF)</h1>
          <p className="text-muted-foreground">Manage personnel action form templates and submissions</p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">PAF Templates</h2>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => loadStandardTemplate.mutate()}
                disabled={loadStandardTemplate.isPending}
              >
                <Upload className="h-4 w-4 mr-2" />
                Load Standard Template
              </Button>
              <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setSelectedTemplate(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedTemplate ? "Edit Template" : "Create New Template"}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedTemplate 
                      ? "Update the template details" 
                      : "Upload a new PAF template and configure its settings"}
                  </DialogDescription>
                </DialogHeader>
                <PafTemplateForm 
                  template={selectedTemplate || undefined} 
                  onClose={() => setIsTemplateDialogOpen(false)} 
                />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(templates as PafTemplate[] || []).map((template: PafTemplate) => (
              <Card key={template.id} className="relative">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    <div className="flex space-x-1">
                      {template.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      {template.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTemplateForSubmission(template.id);
                          setIsSubmissionDialogOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Fill Out Form
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          console.log('Opening template URL:', template.fileUrl);
                          // Create a direct link and click it
                          const link = document.createElement('a');
                          link.href = template.fileUrl;
                          link.target = '_blank';
                          link.rel = 'noopener noreferrer';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        View Template
                      </Button>
                    </div>
                    <div className="space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setIsTemplateDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTemplate.mutate(template.id)}
                        disabled={deleteTemplate.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">PAF Submissions</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
              <CardDescription>All personnel action form submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(submissions as PafSubmission[] || []).map((submission: PafSubmission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        {submission.employeeName}
                      </TableCell>
                      <TableCell>{submission.positionTitle}</TableCell>
                      <TableCell>
                        {new Date(submission.effectiveDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={submission.status} />
                      </TableCell>
                      <TableCell>
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {submission.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => submitForApproval.mutate(submission.id)}
                              disabled={submitForApproval.isPending}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Submit
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isSubmissionDialogOpen} onOpenChange={setIsSubmissionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New PAF Submission</DialogTitle>
            <DialogDescription>
              Fill out the personnel action form details
            </DialogDescription>
          </DialogHeader>
          <PafSubmissionForm 
            templateId={selectedTemplateForSubmission!} 
            onClose={() => setIsSubmissionDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}