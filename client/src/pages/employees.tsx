import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Filter, Download, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { useState, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [importSuccess, setImportSuccess] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ["/api/employees"],
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
                employee[header] = parseFloat(value) || 0;
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

      return await apiRequest('/api/employees/import', {
        method: 'POST',
        body: JSON.stringify({ employees }),
      });
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
EMP001,John,Doe,john.doe@school.edu,555-0123,123 Main St,Mathematics,Teacher,teacher,2024-01-15,50000,active
EMP002,Jane,Smith,jane.smith@school.edu,555-0124,456 Oak Ave,Administration,Principal,administrator,2023-08-01,75000,active`;
    
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
          <Button className="bg-primary hover:bg-blue-700">
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
                      <div className="text-sm text-gray-900">{employee.position}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">
                        {employee.employeeType.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusColor(employee.status)}>
                        {employee.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Button variant="link" className="text-indigo-600 hover:text-indigo-900 p-0 mr-3">
                        Edit
                      </Button>
                      <Button variant="link" className="text-red-600 hover:text-red-900 p-0">
                        View
                      </Button>
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
    </div>
  );
}
