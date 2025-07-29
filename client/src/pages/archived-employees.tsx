import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Archive, 
  Plus, 
  Upload, 
  FileText, 
  Download, 
  Eye,
  Search,
  Filter,
  Calendar,
  Building,
  User,
  Trash2,
  Edit,
  Scan,
  File,
  Paperclip,
  FolderOpen,
  Tag
} from "lucide-react";
import { insertArchivedEmployeeSchema, insertPersonnelFileSchema, type ArchivedEmployee, type PersonnelFile, type InsertArchivedEmployee, type InsertPersonnelFile } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const archivedEmployeeFormSchema = insertArchivedEmployeeSchema.extend({
  hireDate: z.string().optional(),
  terminationDate: z.string().optional(),
});

const fileUploadSchema = z.object({
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  documentDate: z.string().optional(),
  tags: z.string().optional(),
});

export default function ArchivedEmployees() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<ArchivedEmployee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch archived employees
  const { data: archivedEmployees = [], isLoading } = useQuery({
    queryKey: ["/api/archived-employees"],
  });

  // Fetch personnel files for selected employee
  const { data: personnelFiles = [], isLoading: isLoadingFiles } = useQuery({
    queryKey: ["/api/personnel-files", selectedEmployee?.id],
    enabled: !!selectedEmployee,
  });

  // Add archived employee mutation
  const addArchivedEmployee = useMutation({
    mutationFn: async (data: InsertArchivedEmployee) => {
      return await apiRequest("/api/archived-employees", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/archived-employees"] });
      setIsAddDialogOpen(false);
      toast({ title: "Archived employee added successfully" });
    },
    onError: (error) => {
      toast({ title: "Error adding archived employee", description: error.message, variant: "destructive" });
    },
  });

  // Update archived employee mutation
  const updateArchivedEmployee = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertArchivedEmployee> }) => {
      return await apiRequest(`/api/archived-employees/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/archived-employees"] });
      setIsEditDialogOpen(false);
      toast({ title: "Archived employee updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating archived employee", description: error.message, variant: "destructive" });
    },
  });

  // Delete archived employee mutation
  const deleteArchivedEmployee = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/archived-employees/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/archived-employees"] });
      toast({ title: "Archived employee deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting archived employee", description: error.message, variant: "destructive" });
    },
  });

  // File upload mutation
  const uploadFile = useMutation({
    mutationFn: async ({ file, metadata }: { file: File; metadata: any }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('archivedEmployeeId', selectedEmployee!.id.toString());
      formData.append('category', metadata.category);
      formData.append('description', metadata.description || '');
      formData.append('documentDate', metadata.documentDate || '');
      formData.append('tags', metadata.tags || '');

      return await apiRequest("/api/personnel-files/upload", "POST", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personnel-files", selectedEmployee?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/archived-employees"] });
      setIsUploadDialogOpen(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast({ title: "File uploaded successfully" });
    },
    onError: (error) => {
      toast({ title: "Error uploading file", description: error.message, variant: "destructive" });
      setUploadProgress(0);
    },
  });

  // Delete file mutation
  const deleteFile = useMutation({
    mutationFn: async (fileId: number) => {
      return await apiRequest(`/api/personnel-files/${fileId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personnel-files", selectedEmployee?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/archived-employees"] });
      toast({ title: "File deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting file", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof archivedEmployeeFormSchema>>({
    resolver: zodResolver(archivedEmployeeFormSchema),
    defaultValues: {
      originalEmployeeId: "",
      firstName: "",
      lastName: "",
      email: "",
      department: "",
      position: "",
      hireDate: "",
      terminationDate: "",
      terminationReason: "",
      archivedBy: "",
      archiveReason: "",
    },
  });

  const uploadForm = useForm<z.infer<typeof fileUploadSchema>>({
    resolver: zodResolver(fileUploadSchema),
    defaultValues: {
      category: "",
      description: "",
      documentDate: "",
      tags: "",
    },
  });

  const onSubmit = (data: z.infer<typeof archivedEmployeeFormSchema>) => {
    const formattedData: InsertArchivedEmployee = {
      ...data,
      hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
      terminationDate: data.terminationDate ? new Date(data.terminationDate) : undefined,
    };

    if (selectedEmployee) {
      updateArchivedEmployee.mutate({ id: selectedEmployee.id, data: formattedData });
    } else {
      addArchivedEmployee.mutate(formattedData);
    }
  };

  const handleFileUpload = async (data: z.infer<typeof fileUploadSchema>) => {
    if (!selectedEmployee) return;
    
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({ title: "Please select a file", variant: "destructive" });
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload PDF, image, or Word documents only", variant: "destructive" });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload files smaller than 10MB", variant: "destructive" });
      return;
    }

    setUploadProgress(25);
    setTimeout(() => setUploadProgress(50), 500);
    setTimeout(() => setUploadProgress(75), 1000);
    
    uploadFile.mutate({ file, metadata: data });
  };

  const handleEdit = (employee: ArchivedEmployee) => {
    setSelectedEmployee(employee);
    form.reset({
      originalEmployeeId: employee.originalEmployeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email || "",
      department: employee.department || "",
      position: employee.position || "",
      hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : "",
      terminationDate: employee.terminationDate ? new Date(employee.terminationDate).toISOString().split('T')[0] : "",
      terminationReason: employee.terminationReason || "",
      archivedBy: employee.archivedBy,
      archiveReason: employee.archiveReason || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedEmployee(null);
    form.reset();
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this archived employee record? This will also delete all associated files.")) {
      deleteArchivedEmployee.mutate(id);
    }
  };

  const handleUploadFiles = (employee: ArchivedEmployee) => {
    setSelectedEmployee(employee);
    uploadForm.reset();
    setIsUploadDialogOpen(true);
  };

  const handleDownloadFile = async (file: PersonnelFile) => {
    try {
      const response = await fetch(`/api/personnel-files/${file.id}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Error downloading file", description: "Please try again", variant: "destructive" });
    }
  };

  const handleDeleteFile = (fileId: number) => {
    if (confirm("Are you sure you want to delete this file?")) {
      deleteFile.mutate(fileId);
    }
  };

  // Filter employees
  const filteredEmployees = archivedEmployees.filter((employee: ArchivedEmployee) => {
    const matchesSearch = 
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.originalEmployeeId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = !departmentFilter || departmentFilter === "all" || employee.department === departmentFilter;

    return matchesSearch && matchesFilter;
  });

  const departments = [...new Set(archivedEmployees.map((e: ArchivedEmployee) => e.department).filter(Boolean))];

  const ArchivedEmployeeForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="originalEmployeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Original Employee ID</FormLabel>
                <FormControl>
                  <Input placeholder="EMP001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="archivedBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Archived By</FormLabel>
                <FormControl>
                  <Input placeholder="Admin User" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john.doe@school.edu" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input placeholder="Mathematics" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Position</FormLabel>
              <FormControl>
                <Input placeholder="Math Teacher" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hireDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hire Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="terminationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Termination Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="terminationReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Termination Reason</FormLabel>
              <FormControl>
                <Input placeholder="Resignation, Retirement, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="archiveReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Archive Reason</FormLabel>
              <FormControl>
                <Textarea placeholder="Reason for archiving this employee record..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
          }}>
            Cancel
          </Button>
          <Button type="submit" disabled={addArchivedEmployee.isPending || updateArchivedEmployee.isPending}>
            {selectedEmployee ? "Update Employee" : "Add Employee"}
          </Button>
        </div>
      </form>
    </Form>
  );

  const FileUploadForm = () => (
    <Form {...uploadForm}>
      <form onSubmit={uploadForm.handleSubmit(handleFileUpload)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select File</Label>
          <Input
            id="file-upload"
            type="file"
            ref={fileInputRef}
            accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx"
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-sm text-gray-600">
            Supported formats: PDF, JPEG, PNG, TIFF, DOC, DOCX (max 10MB)
          </p>
        </div>
        
        <FormField
          control={uploadForm.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select file category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="application">Application Materials</SelectItem>
                  <SelectItem value="evaluation">Performance Evaluations</SelectItem>
                  <SelectItem value="disciplinary">Disciplinary Actions</SelectItem>
                  <SelectItem value="training">Training Records</SelectItem>
                  <SelectItem value="medical">Medical Records</SelectItem>
                  <SelectItem value="contracts">Contracts & Agreements</SelectItem>
                  <SelectItem value="correspondence">Correspondence</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={uploadForm.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Brief description of the document..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={uploadForm.control}
          name="documentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={uploadForm.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input placeholder="contract, evaluation, important (comma-separated)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={uploadFile.isPending}>
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Archived Employees</h1>
          <p className="text-gray-600">Manage archived employee records and personnel files</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Archived Employee
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search archived employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Archive className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Archived</p>
                <p className="text-2xl font-bold">{archivedEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Total Files</p>
                <p className="text-2xl font-bold">{archivedEmployees.reduce((sum: number, emp: ArchivedEmployee) => sum + (emp.personnelFilesCount || 0), 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Departments</p>
                <p className="text-2xl font-bold">{departments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold">{archivedEmployees.filter((emp: ArchivedEmployee) => {
                  const archiveDate = new Date(emp.archiveDate);
                  const thisMonth = new Date();
                  return archiveDate.getMonth() === thisMonth.getMonth() && archiveDate.getFullYear() === thisMonth.getFullYear();
                }).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No archived employees found</p>
          </div>
        ) : (
          filteredEmployees.map((employee: ArchivedEmployee) => (
            <Card key={employee.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{employee.firstName} {employee.lastName}</CardTitle>
                    <CardDescription>ID: {employee.originalEmployeeId}</CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline" onClick={() => handleUploadFiles(employee)} title="Upload Files">
                      <Upload className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(employee)} title="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(employee.id)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span>{employee.department || 'N/A'}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{employee.position || 'N/A'}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>Archived: {new Date(employee.archiveDate).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <Badge variant="outline" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    {employee.personnelFilesCount || 0} Files
                  </Badge>
                  {employee.terminationReason && (
                    <Badge variant="secondary" className="text-xs">
                      {employee.terminationReason}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Archived Employee</DialogTitle>
          </DialogHeader>
          <ArchivedEmployeeForm />
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Archived Employee</DialogTitle>
          </DialogHeader>
          <ArchivedEmployeeForm />
        </DialogContent>
      </Dialog>

      {/* File Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Personnel File</DialogTitle>
            <DialogDescription>
              Upload a scanned personnel file for {selectedEmployee?.firstName} {selectedEmployee?.lastName}
            </DialogDescription>
          </DialogHeader>
          <FileUploadForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}