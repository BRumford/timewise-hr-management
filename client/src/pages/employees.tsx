import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownEdit } from "@/components/ui/dropdown-edit";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Filter, Download, Upload, FileText, AlertCircle, CheckCircle, Edit, Eye, Trash2, Calendar, User } from "lucide-react";
import { useState, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Form validation schema for employee editing
const editEmployeeSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  department: z.string().min(1, "Department is required"),
  position: z.string().min(1, "Position is required"),
  employeeType: z.enum(["teacher", "administrator", "support_staff", "substitute"]),
  hireDate: z.string().min(1, "Hire date is required"),
  salary: z.string().min(1, "Salary is required"),
  status: z.enum(["active", "inactive", "on_leave", "terminated"]),
  payGrade: z.string().optional(),
  educationLevel: z.string().optional(),
  certifications: z.string().optional(),
  supervisorId: z.string().optional(),
});

type EditEmployeeFormData = z.infer<typeof editEmployeeSchema>;

// Onboarding Paperwork History Component
function OnboardingPaperworkHistory({ employeeId }: { employeeId: number }) {
  const { data: onboardingWorkflows, isLoading: isLoadingWorkflows } = useQuery({
    queryKey: ["/api/onboarding/workflows", employeeId],
    queryFn: async () => {
      const response = await apiRequest(`/api/onboarding/workflows?employeeId=${employeeId}`, "GET");
      return response;
    },
  });

  const { data: formSubmissions, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ["/api/onboarding/form-submissions", employeeId],
    queryFn: async () => {
      const response = await apiRequest(`/api/onboarding/form-submissions?employeeId=${employeeId}`, "GET");
      return response;
    },
  });

  if (isLoadingWorkflows || isLoadingSubmissions) {
    return <div className="text-sm text-gray-500">Loading onboarding history...</div>;
  }

  const workflows = Array.isArray(onboardingWorkflows) ? onboardingWorkflows : [];
  const submissions = Array.isArray(formSubmissions) ? formSubmissions : [];

  return (
    <div className="space-y-4">
      {/* Onboarding Workflows */}
      {workflows.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Onboarding Workflows ({workflows.length})
          </h4>
          <div className="space-y-2">
            {workflows.map((workflow: any) => (
              <div key={workflow.id} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">
                      {workflow.workflowType?.replace('_', ' ')?.replace(/\b\w/g, (l: string) => l.toUpperCase())} Workflow
                    </p>
                    <p className="text-xs text-gray-600">
                      Status: <Badge className={workflow.status === 'completed' ? 'bg-green-100 text-green-800' : 
                               workflow.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                               'bg-yellow-100 text-yellow-800'}>{workflow.status.replace('_', ' ')}</Badge>
                    </p>
                    <p className="text-xs text-gray-600">
                      Started: {new Date(workflow.startDate).toLocaleDateString()}
                    </p>
                    {workflow.completedAt && (
                      <p className="text-xs text-gray-600">
                        Completed: {new Date(workflow.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Current Step:</p>
                    <p className="text-xs font-medium">{workflow.currentStep || 'Not specified'}</p>
                  </div>
                </div>
                {workflow.requiredDocuments && workflow.requiredDocuments.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">Required Documents:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {workflow.requiredDocuments.map((doc: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {doc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Submissions */}
      {submissions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Completed Forms ({submissions.length})
          </h4>
          <div className="space-y-2">
            {submissions.map((submission: any) => (
              <div key={submission.id} className="bg-blue-50 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{submission.formTitle || `Form #${submission.formId}`}</p>
                    <p className="text-xs text-gray-600">
                      Status: <Badge className={submission.status === 'approved' ? 'bg-green-100 text-green-800' : 
                               submission.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 
                               submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                               'bg-yellow-100 text-yellow-800'}>{submission.status}</Badge>
                    </p>
                    {submission.submittedAt && (
                      <p className="text-xs text-gray-600">
                        Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                      </p>
                    )}
                    {submission.reviewedAt && (
                      <p className="text-xs text-gray-600">
                        Reviewed: {new Date(submission.reviewedAt).toLocaleDateString()}
                        {submission.reviewedBy && ` by ${submission.reviewedBy}`}
                      </p>
                    )}
                  </div>
                  <div>
                    {submission.fileUrls && submission.fileUrls.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {submission.fileUrls.length} file{submission.fileUrls.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
                {submission.reviewNotes && (
                  <div className="mt-2 p-2 bg-white rounded border">
                    <p className="text-xs text-gray-600">Review Notes:</p>
                    <p className="text-xs">{submission.reviewNotes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {workflows.length === 0 && submissions.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No onboarding paperwork history found</p>
          <p className="text-xs">Completed forms and workflows will appear here</p>
        </div>
      )}
    </div>
  );
}

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [importSuccess, setImportSuccess] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ["/api/employees"],
  });

  // Fetch custom field labels
  const { data: fieldLabels } = useQuery({
    queryKey: ["/api/custom-field-labels"],
  });

  // Initialize default field labels if none exist
  const initializeFieldLabelsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/custom-field-labels/initialize", "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-field-labels"] });
    },
  });

  // Helper function to get field label
  const getFieldLabel = (fieldName: string, defaultLabel: string) => {
    const label = fieldLabels?.find((l: any) => l.fieldName === fieldName);
    return label ? label.displayLabel : defaultLabel;
  };

  // Form for editing employees
  const editForm = useForm<EditEmployeeFormData>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      employeeId: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      address: "",
      department: "",
      position: "",
      employeeType: "teacher",
      hireDate: "",
      salary: "",
      status: "active",
      payGrade: "",
      educationLevel: "",
      certifications: "",
      supervisorId: "",
    },
  });

  // Form for adding new employees
  const addForm = useForm<EditEmployeeFormData>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      employeeId: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      address: "",
      department: "",
      position: "",
      employeeType: "teacher",
      hireDate: "",
      salary: "",
      status: "active",
      payGrade: "",
      educationLevel: "",
      certifications: "",
      supervisorId: "",
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'on_leave':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const filteredEmployees = employees?.filter((employee: any) => {
    const matchesSearch = !searchTerm || 
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "all" || employee.employeeType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const exportEmployeesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/employees/export');
      if (!response.ok) throw new Error('Export failed');
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "Employee data exported successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to export employee data",
        variant: "destructive",
      });
    },
  });

  const importEmployeesMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const lines = csvData.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      const employees = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim());
        const employee: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index];
          if (value && value !== '') {
            switch (header) {
              case 'hireDate':
                employee[header] = new Date(value);
                break;
              case 'salary':
                // Convert to string as database expects decimal as string
                employee[header] = parseFloat(value).toString();
                break;
              case 'supervisorId':
                employee[header] = parseInt(value) || null;
                break;
              case 'certifications':
                // Handle array fields
                employee[header] = value.split(';').filter(cert => cert.trim());
                break;
              default:
                employee[header] = value;
            }
          }
        });
        
        // Set required fields with defaults
        employee.userId = employee.userId || 'imported_user';
        employee.status = employee.status || 'active';
        
        return employee;
      });

      return await apiRequest('/api/employees/import', 'POST', { employees });
    },
    onSuccess: (data) => {
      setImportSuccess(`Successfully imported ${data.imported} employees`);
      setImportErrors([]);
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: "Success",
        description: `Imported ${data.imported} employees`,
      });
    },
    onError: (error: any) => {
      const errorData = error.message.includes('Validation errors') ? JSON.parse(error.message.split('Validation errors found')[1]) : { errors: [] };
      setImportErrors(errorData.errors || []);
      setImportSuccess("");
      toast({
        title: "Import Error",
        description: "Some employees could not be imported. Check the error details.",
        variant: "destructive",
      });
    },
  });

  // Update individual employee field mutation
  const updateEmployeeFieldMutation = useMutation({
    mutationFn: async ({ employeeId, field, value }: { employeeId: number; field: string; value: string }) => {
      const employee = employees?.find((e: any) => e.id === employeeId);
      if (!employee) throw new Error('Employee not found');
      
      const updatedEmployee = { ...employee, [field]: value };
      return await apiRequest(`/api/employees/${employeeId}`, 'PUT', updatedEmployee);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive",
      });
    },
  });

  const createUserAccountsMutation = useMutation({
    mutationFn: async (defaultPassword?: string) => {
      return await apiRequest("/api/admin/create-employee-accounts", "POST", { defaultPassword });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Success",
        description: `Created ${data.created} user accounts. Default password: ${data.defaultPassword}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user accounts",
        variant: "destructive",
      });
    },
  });

  const handleCreateUserAccounts = () => {
    const defaultPassword = 'TempPassword123!';
    if (window.confirm(`This will create login accounts for all employees who don't have one yet. The default password will be: ${defaultPassword}\n\nEmployees should change this password after their first login. Continue?`)) {
      createUserAccountsMutation.mutate(defaultPassword);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportErrors([]);
    setImportSuccess("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target?.result as string;
      importEmployeesMutation.mutate(csvData);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const template = `employeeId,firstName,lastName,email,phoneNumber,address,department,position,employeeType,hireDate,salary,status
490001,John,Smith,john.smith@school.edu,555-0123,123 Main St,Mathematics,Teacher,teacher,2024-01-15,50000,active
490002,Jane,Johnson,jane.johnson@school.edu,555-0124,456 Oak Ave,Administration,Principal,administrator,2023-08-01,75000,active
490003,Bob,Williams,bob.williams@school.edu,555-0125,789 Pine St,Science,Teacher,teacher,2024-02-01,48000,active`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleEditEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    // Populate form with employee data
    editForm.reset({
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phoneNumber: employee.phoneNumber || "",
      address: employee.address || "",
      department: employee.department,
      position: employee.position,
      employeeType: employee.employeeType,
      hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : "",
      salary: employee.salary || "",
      status: employee.status,
      payGrade: employee.payGrade || "",
      educationLevel: employee.educationLevel || "",
      certifications: employee.certifications ? employee.certifications.join(', ') : "",
      supervisorId: employee.supervisorId ? employee.supervisorId.toString() : "",
    });
    setIsEditDialogOpen(true);
  };

  const handleViewEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setIsViewDialogOpen(true);
  };

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    addForm.reset();
    setIsAddDialogOpen(true);
  };

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      await apiRequest(`/api/employees/${employeeId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      });
    },
  });

  const editEmployeeMutation = useMutation({
    mutationFn: async (data: EditEmployeeFormData & { id: number }) => {
      const { id, ...updateData } = data;
      // Convert fields to proper types for backend
      const formattedData = {
        ...updateData,
        hireDate: new Date(updateData.hireDate),
        supervisorId: updateData.supervisorId ? parseInt(updateData.supervisorId) : null,
        certifications: updateData.certifications ? updateData.certifications.split(',').map(c => c.trim()) : [],
      };
      return await apiRequest(`/api/employees/${id}`, 'PUT', formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setIsEditDialogOpen(false);
      editForm.reset();
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee",
        variant: "destructive",
      });
    },
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async (data: EditEmployeeFormData) => {
      // Convert fields to proper types for backend
      const formattedData = {
        ...data,
        userId: `user_${Date.now()}`, // Generate a unique user ID
        hireDate: new Date(data.hireDate),
        supervisorId: data.supervisorId ? parseInt(data.supervisorId) : null,
        certifications: data.certifications ? data.certifications.split(',').map(c => c.trim()) : [],
      };
      return await apiRequest('/api/employees', 'POST', formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setIsAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "Success",
        description: "Employee added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add employee",
        variant: "destructive",
      });
    },
  });

  const handleDeleteEmployee = (employee: any) => {
    if (window.confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
      deleteEmployeeMutation.mutate(employee.id);
    }
  };

  const onEditSubmit = (data: EditEmployeeFormData) => {
    if (selectedEmployee) {
      editEmployeeMutation.mutate({
        ...data,
        id: selectedEmployee.id,
      });
    }
  };

  const onAddSubmit = (data: EditEmployeeFormData) => {
    addEmployeeMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-300 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-300 rounded w-32 animate-pulse"></div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-300 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => exportEmployeesMutation.mutate()}
            disabled={exportEmployeesMutation.isPending}
          >
            <Download className="mr-2" size={16} />
            {exportEmployeesMutation.isPending ? "Exporting..." : "Export CSV"}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleCreateUserAccounts}
            disabled={createUserAccountsMutation.isPending}
          >
            <Plus className="mr-2" size={16} />
            {createUserAccountsMutation.isPending ? "Creating..." : "Create User Accounts"}
          </Button>
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2" size={16} />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Employee Data</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to import or update employee information. Download the template to see the required format.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={downloadTemplate} className="flex-1">
                    <FileText className="mr-2" size={16} />
                    Download Template
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Upload className="mr-2" size={16} />
                    Choose File
                  </Button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {importFile && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Selected file: <span className="font-medium">{importFile.name}</span>
                    </p>
                  </div>
                )}
                
                {importEmployeesMutation.isPending && (
                  <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-blue-600">Processing import...</span>
                  </div>
                )}
                
                {importSuccess && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      {importSuccess}
                    </AlertDescription>
                  </Alert>
                )}
                
                {importErrors.length > 0 && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <div className="font-medium mb-2">Import Errors:</div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {importErrors.map((error, index) => (
                          <div key={index} className="text-sm">
                            Row {error.row}: {error.errors.join(', ')}
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button className="bg-primary hover:bg-blue-700" onClick={handleAddEmployee}>
            <Plus className="mr-2" size={16} />
            Add Employee
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>All Employees</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Types</option>
                <option value="teacher">Teachers</option>
                <option value="administrator">Administrators</option>
                <option value="support_staff">Support Staff</option>
                <option value="substitute">Substitutes</option>
              </select>
            </div>
          </div>
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
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
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
                {filteredEmployees?.map((employee: any) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{getInitials(employee.firstName, employee.lastName)}</AvatarFallback>
                        </Avatar>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DropdownEdit
                        value={employee.position}
                        onSave={(value) => updateEmployeeFieldMutation.mutate({ employeeId: employee.id, field: 'position', value })}
                        type="text"
                        placeholder="Enter position"
                        className="min-w-32"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DropdownEdit
                        value={employee.department}
                        onSave={(value) => updateEmployeeFieldMutation.mutate({ employeeId: employee.id, field: 'department', value })}
                        type="text"
                        placeholder="Enter department"
                        className="min-w-32"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DropdownEdit
                        value={employee.employeeType}
                        onSave={(value) => updateEmployeeFieldMutation.mutate({ employeeId: employee.id, field: 'employeeType', value })}
                        type="select"
                        options={[
                          { value: 'teacher', label: 'Teacher' },
                          { value: 'administrator', label: 'Administrator' },
                          { value: 'support_staff', label: 'Support Staff' },
                          { value: 'substitute', label: 'Substitute' }
                        ]}
                        className="min-w-32"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DropdownEdit
                        value={employee.status}
                        onSave={(value) => updateEmployeeFieldMutation.mutate({ employeeId: employee.id, field: 'status', value })}
                        type="status"
                        options={[
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' },
                          { value: 'on_leave', label: 'On Leave' },
                          { value: 'terminated', label: 'Terminated' }
                        ]}
                        className="min-w-24"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewEmployee(employee)}
                          className="text-blue-600 hover:text-blue-900 h-8 w-8 p-0"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditEmployee(employee)}
                          className="text-green-600 hover:text-green-900 h-8 w-8 p-0"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteEmployee(employee)}
                          className="text-red-600 hover:text-red-900 h-8 w-8 p-0"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!filteredEmployees || filteredEmployees.length === 0) && (
              <div className="text-center py-8">
                <p className="text-gray-500">No employees found matching your criteria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Employee Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>
              Viewing information for {selectedEmployee?.firstName} {selectedEmployee?.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Employee ID</Label>
                  <p className="text-sm text-gray-600">{selectedEmployee.employeeId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusColor(selectedEmployee.status)}>
                    {selectedEmployee.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Full Name</Label>
                  <p className="text-sm text-gray-600">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-gray-600">{selectedEmployee.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Department</Label>
                  <p className="text-sm text-gray-600">{selectedEmployee.department}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Position</Label>
                  <p className="text-sm text-gray-600">{selectedEmployee.position}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Employee Type</Label>
                  <p className="text-sm text-gray-600 capitalize">{selectedEmployee.employeeType.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Hire Date</Label>
                  <p className="text-sm text-gray-600">{new Date(selectedEmployee.hireDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Salary</Label>
                  <p className="text-sm text-gray-600">${parseFloat(selectedEmployee.salary).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-sm text-gray-600">{selectedEmployee.phoneNumber || 'Not provided'}</p>
                </div>
              </div>
              {selectedEmployee.address && (
                <div>
                  <Label className="text-sm font-medium">Address</Label>
                  <p className="text-sm text-gray-600">{selectedEmployee.address}</p>
                </div>
              )}
              
              {/* Onboarding Paperwork Section */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <Label className="text-lg font-semibold">Onboarding Paperwork History</Label>
                </div>
                <OnboardingPaperworkHistory employeeId={selectedEmployee.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update information for {selectedEmployee?.firstName} {selectedEmployee?.lastName}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("employeeId", "Employee ID")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("employeeId", "Employee ID").toLowerCase()}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("status", "Status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${getFieldLabel("status", "Status").toLowerCase()}`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="on_leave">On Leave</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("firstName", "First Name")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("firstName", "First Name").toLowerCase()}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("lastName", "Last Name")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("lastName", "Last Name").toLowerCase()}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("email", "Email")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder={`Enter ${getFieldLabel("email", "Email").toLowerCase()}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("phoneNumber", "Phone Number")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("phoneNumber", "Phone Number").toLowerCase()}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("department", "Department")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("department", "Department").toLowerCase()}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("position", "Position")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("position", "Position").toLowerCase()}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="employeeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("employeeType", "Employee Type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${getFieldLabel("employeeType", "Employee Type").toLowerCase()}`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="administrator">Administrator</SelectItem>
                          <SelectItem value="support_staff">Support Staff</SelectItem>
                          <SelectItem value="substitute">Substitute</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("hireDate", "Hire Date")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("salary", "Salary")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("salary", "Salary").toLowerCase()}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="payGrade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("payGrade", "Pay Grade")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("payGrade", "Pay Grade").toLowerCase()} (optional)`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="educationLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("educationLevel", "Education Level")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("educationLevel", "Education Level").toLowerCase()} (optional)`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="supervisorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("supervisorId", "Supervisor ID")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("supervisorId", "Supervisor ID").toLowerCase()} (optional)`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getFieldLabel("address", "Address")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder={`Enter ${getFieldLabel("address", "Address").toLowerCase()} (optional)`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="certifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getFieldLabel("certifications", "Certifications")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder={`Enter ${getFieldLabel("certifications", "Certifications").toLowerCase()}, separated by commas (optional)`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={editEmployeeMutation.isPending}
                >
                  {editEmployeeMutation.isPending ? "Updating..." : "Update Employee"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Employee Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Create a new employee record in the system
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("employeeId", "Employee ID")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("employeeId", "Employee ID").toLowerCase()}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("status", "Status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${getFieldLabel("status", "Status").toLowerCase()}`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="on_leave">On Leave</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("firstName", "First Name")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("firstName", "First Name").toLowerCase()}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("lastName", "Last Name")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("lastName", "Last Name").toLowerCase()}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("email", "Email")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder={`Enter ${getFieldLabel("email", "Email").toLowerCase()}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("phoneNumber", "Phone Number")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("phoneNumber", "Phone Number").toLowerCase()} (optional)`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("department", "Department")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("department", "Department").toLowerCase()}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("position", "Position")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("position", "Position").toLowerCase()}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="employeeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("employeeType", "Employee Type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${getFieldLabel("employeeType", "Employee Type").toLowerCase()}`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="administrator">Administrator</SelectItem>
                          <SelectItem value="support_staff">Support Staff</SelectItem>
                          <SelectItem value="substitute">Substitute</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("hireDate", "Hire Date")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("salary", "Salary")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("salary", "Salary").toLowerCase()}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="payGrade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("payGrade", "Pay Grade")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("payGrade", "Pay Grade").toLowerCase()} (optional)`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="educationLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("educationLevel", "Education Level")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("educationLevel", "Education Level").toLowerCase()} (optional)`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="supervisorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel("supervisorId", "Supervisor ID")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`Enter ${getFieldLabel("supervisorId", "Supervisor ID").toLowerCase()} (optional)`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={addForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getFieldLabel("address", "Address")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder={`Enter ${getFieldLabel("address", "Address").toLowerCase()} (optional)`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="certifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getFieldLabel("certifications", "Certifications")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder={`Enter ${getFieldLabel("certifications", "Certifications").toLowerCase()}, separated by commas (optional)`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addEmployeeMutation.isPending}
                >
                  {addEmployeeMutation.isPending ? "Adding..." : "Add Employee"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
