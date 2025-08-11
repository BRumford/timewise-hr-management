import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, User, Save, FileText, Building, Lock, Unlock, AlertTriangle, Download, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Employee } from "@shared/schema";

// Types based on the template fields
interface TimecardTemplateField {
  id: number;
  templateId: number;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  fieldOptions: any;
  isRequired: boolean;
  isReadOnly: boolean;
  displayOrder: number;
  section: string;
  validationRules: any;
}

interface TimecardTemplate {
  id: number;
  name: string;
  description: string;
  employeeType: string;
  isActive: boolean;
  isDefault: boolean;
  approvalWorkflow: any[];
  settings: any;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface MonthlyTimecardData {
  id?: number;
  employeeId: number;
  templateId: number;
  month: number;
  year: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: string;
  entries: any[];
  customFieldsData: any;
  notes: string;
  submittedBy?: string;
  submittedAt?: string;
  isLocked?: boolean;
  lockedBy?: string;
  lockedAt?: string;
  lockReason?: string;
}

export default function MonthlyTimecard() {
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  

  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [timecardData, setTimecardData] = useState<MonthlyTimecardData | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [dailyEntries, setDailyEntries] = useState<any[]>([]);
  const [payrollEntries, setPayrollEntries] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Helper function to safely parse JSON data
  const safeJsonParse = (data: any, fallback: any = null) => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Error parsing JSON:', e);
        return fallback;
      }
    }
    return data || fallback;
  };

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  // Fetch timecard templates
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/timecard-templates"],
  });

  // Fetch template fields for selected template
  const { data: templateFields = [], isLoading: templateFieldsLoading, error: templateFieldsError } = useQuery({
    queryKey: ["/api/timecard-template-fields", selectedTemplate],
    enabled: !!selectedTemplate,
  });



  // Fetch dropdown options for timecard fields
  const { data: codeOptions = [] } = useQuery({
    queryKey: ["/api/dropdown-options", "code"],
  });

  const { data: fundingOptions = [] } = useQuery({
    queryKey: ["/api/dropdown-options", "funding"],
  });

  const { data: siteOptions = [] } = useQuery({
    queryKey: ["/api/dropdown-options", "site"],
  });

  const { data: addonOptions = [] } = useQuery({
    queryKey: ["/api/dropdown-options", "addon"],
  });

  // Fetch existing monthly timecards for the selected employee
  const { data: existingTimecards = [] } = useQuery({
    queryKey: ["/api/monthly-timecards", selectedEmployee],
    enabled: !!selectedEmployee,
  });

  // Fetch existing timecards for all employees at selected site
  const { data: siteTimecards = [] } = useQuery({
    queryKey: ["/api/monthly-timecards/site", selectedSite],
    enabled: !!selectedSite && selectedSite !== 'all',
  });

  // Get unique sites from employees for filtering
  const uniqueSites = [...new Set(employees.map((emp: Employee) => emp.department).filter(Boolean))];
  
  // Filter employees by selected site
  const filteredEmployees = selectedSite && selectedSite !== 'all'
    ? employees.filter((emp: Employee) => emp.department === selectedSite)
    : employees;
  
  // Get employee data
  const selectedEmployeeData = employees.find((emp: Employee) => emp.id === selectedEmployee);

  // Reset selected employee when site filter changes (but not when loading a timecard)
  useEffect(() => {
    if (selectedSite && selectedSite !== 'all' && selectedEmployee && !timecardData) {
      const employeeInFilteredList = filteredEmployees.find((emp: Employee) => emp.id === selectedEmployee);
      if (!employeeInFilteredList) {
        setSelectedEmployee(null);
        setSelectedTemplate(null);
      }
    }
  }, [selectedSite, filteredEmployees, selectedEmployee, timecardData]);

  // Initialize form data when template changes
  useEffect(() => {
    if (selectedTemplate && selectedEmployee && !timecardData) {
      const template = templates.find((t: TimecardTemplate) => t.id === selectedTemplate);
      if (template) {
        setTimecardData({
          employeeId: selectedEmployee,
          templateId: selectedTemplate,
          month: currentMonth,
          year: currentYear,
          payPeriodStart: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`,
          payPeriodEnd: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${new Date(currentYear, currentMonth, 0).getDate()}`,
          status: 'draft',
          entries: [],
          customFieldsData: {},
          notes: ''
        });
        
        // Initialize form data with employee information
        setFormData({
          'Employee Name': `${selectedEmployeeData?.firstName || ''} ${selectedEmployeeData?.lastName || ''}`,
          'Employee ID': selectedEmployeeData?.employeeId || '',
          'Month/Year': `${currentMonth}/${currentYear}`,
          'Duty': selectedEmployeeData?.position || '',
          'Position Hours': '40', // Default position hours
        });
        
        // Generate daily entries for the month
        generateDailyEntries();
        
        // Initialize payroll entries (10 rows)
        initializePayrollEntries();
      }
    }
  }, [selectedTemplate, selectedEmployee, currentMonth, currentYear, selectedEmployeeData, templates]);

  // Generate daily entries for current month
  const generateDailyEntries = () => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const entries: any[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth - 1, day);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = `${currentMonth}/${day}`;
      
      entries.push({
        date: monthDay,
        dayName,
        code: '',
        hours: '',
        personReplaced: '',
        description: '',
        funding: '',
        site: ''
      });
    }
    
    setDailyEntries(entries);
  };

  // Initialize payroll entries (10 rows)
  const initializePayrollEntries = () => {
    const entries: any[] = [];
    
    for (let i = 0; i < 10; i++) {
      entries.push({
        addon: '',
        units: '',
        rate: '',
        alias: '',
        notes: ''
      });
    }
    
    setPayrollEntries(entries);
  };

  // Update form field
  const updateFormField = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Update daily entry
  const updateDailyEntry = (index: number, field: string, value: any) => {
    setDailyEntries(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  // Update payroll entry - with debugging
  const updatePayrollEntry = (index: number, field: string, value: any) => {
    console.log(`Monthly: Updating entry ${index}, field ${field}, value:`, value);
    setPayrollEntries(prev => {
      const updated = [...prev];
      if (!updated[index]) {
        updated[index] = {};
      }
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      console.log('Monthly: New entries array:', updated);
      return updated;
    });
  };

  // Save timecard mutation
  const saveTimecardMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/monthly-timecards", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Monthly timecard saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-timecards", selectedEmployee] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save timecard",
        variant: "destructive",
      });
    },
  });

  // Save timecard
  const saveTimecard = () => {
    if (!timecardData) return;

    const finalData = {
      ...timecardData,
      customFieldsData: formData,
      entries: dailyEntries,
      payrollEntries: payrollEntries
    };

    saveTimecardMutation.mutate(finalData);
  };

  // Submit timecard to employee for approval mutation
  const submitTimecardMutation = useMutation({
    mutationFn: async () => {
      if (!timecardData?.id) {
        throw new Error('Must save timecard before submitting');
      }
      
      return await apiRequest(`/api/monthly-timecards/${timecardData.id}/submit-to-employee`, 'POST');
    },
    onSuccess: (data) => {
      setTimecardData(data);
      toast({ title: "Success", description: "Timecard submitted to employee for approval" });
      queryClient.invalidateQueries({ queryKey: [`/api/monthly-timecard/${selectedEmployee}/${currentMonth}/${currentYear}`] });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to submit timecard", variant: "destructive" });
    },
  });

  // Submit timecard function
  const submitTimecard = () => {
    if (!timecardData?.id) {
      toast({ title: "Error", description: "Please save the timecard before submitting", variant: "destructive" });
      return;
    }
    submitTimecardMutation.mutate();
  };

  // Lock timecard mutation
  const lockTimecard = useMutation({
    mutationFn: async (data: { id: number; lockReason?: string }) => {
      return await apiRequest(`/api/monthly-timecards/${data.id}/lock`, "POST", { lockReason: data.lockReason });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timecard locked successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-timecards"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to lock timecard",
        variant: "destructive",
      });
    },
  });

  // Unlock timecard mutation
  const unlockTimecard = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/monthly-timecards/${id}/unlock`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timecard unlocked successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-timecards"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to unlock timecard",
        variant: "destructive",
      });
    },
  });

  // Group template fields by section
  const groupFieldsBySection = (fields: TimecardTemplateField[]) => {
    const grouped: { [key: string]: TimecardTemplateField[] } = {};
    
    fields.forEach(field => {
      if (!grouped[field.section]) {
        grouped[field.section] = [];
      }
      grouped[field.section].push(field);
    });
    
    // Sort fields within each section by displayOrder
    Object.keys(grouped).forEach(section => {
      grouped[section].sort((a, b) => a.displayOrder - b.displayOrder);
    });
    
    return grouped;
  };

  // Render field based on type
  const renderField = (field: TimecardTemplateField) => {
    const value = formData[field.fieldName] || '';
    
    switch (field.fieldType) {
      case 'text':
      case 'number':
        return (
          <Input
            type={field.fieldType}
            value={value}
            onChange={(e) => updateFormField(field.fieldName, e.target.value)}
            placeholder={field.fieldLabel}
            required={field.isRequired}
            readOnly={field.isReadOnly}
            className="w-full"
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => updateFormField(field.fieldName, e.target.value)}
            placeholder={field.fieldLabel}
            required={field.isRequired}
            readOnly={field.isReadOnly}
            className="w-full"
          />
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => updateFormField(field.fieldName, e.target.checked)}
              className="h-4 w-4"
            />
            <label className="text-sm">{field.fieldLabel}</label>
          </div>
        );
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => updateFormField(field.fieldName, e.target.value)}
            placeholder={field.fieldLabel}
            required={field.isRequired}
            readOnly={field.isReadOnly}
            className="w-full"
          />
        );
    }
  };

  const groupedFields = groupFieldsBySection(templateFields);

  // PayrollProcessingRowInline component for payroll processing section
  const PayrollProcessingRowInline = ({ lineNumber }: { lineNumber: number }) => {
    const index = lineNumber - 1;
    const entry = payrollEntries[index] || {};

    // Calculate total automatically
    const total = (parseFloat(entry.units) || 0) * (parseFloat(entry.rate) || 0);

    return (
      <tr className="even:bg-gray-50">
        <td className="border border-gray-400 px-2 py-1 text-center text-sm font-medium text-purple-600">
          {lineNumber}
        </td>
        <td className="border border-gray-400 px-1 py-1">
          <Select onValueChange={(value) => updatePayrollEntry(index, 'addon', value)} value={entry.addon || ''}>
            <SelectTrigger className="h-8 text-sm border-0 bg-transparent p-1">
              <SelectValue placeholder="Addon" />
            </SelectTrigger>
            <SelectContent>
              {addonOptions.map((option) => (
                <SelectItem key={option.id} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="border border-gray-400 px-1 py-1">
          <Input
            type="text"
            value={entry.units || ''}
            onChange={(e) => updatePayrollEntry(index, 'units', e.target.value)}
            className="h-8 text-sm border-0 bg-transparent p-1"
            placeholder="0"
          />
        </td>
        <td className="border border-gray-400 px-1 py-1">
          <Input
            type="text"
            value={entry.rate || ''}
            onChange={(e) => {
              console.log('Monthly Rate input change:', e.target.value);
              updatePayrollEntry(index, 'rate', e.target.value);
            }}
            onFocus={() => console.log('Monthly Rate input focused')}
            onBlur={() => console.log('Monthly Rate input blurred')}
            className="h-8 text-sm border-0 bg-transparent p-1"
            placeholder="0.00"
          />
        </td>
        <td className="border border-gray-400 px-2 py-1 text-center text-sm font-medium text-purple-600">
          ${total.toFixed(2)}
        </td>
        <td className="border border-gray-400 px-1 py-1">
          <Input
            type="text"
            value={entry.alias || ''}
            onChange={(e) => updatePayrollEntry(index, 'alias', e.target.value)}
            className="h-8 text-sm border-0 bg-transparent p-1"
            placeholder="Alias"
          />
        </td>
        <td className="border border-gray-400 px-1 py-1">
          <Input
            type="text"
            value={entry.notes || ''}
            onChange={(e) => updatePayrollEntry(index, 'notes', e.target.value)}
            className="h-8 text-sm border-0 bg-transparent p-1"
            placeholder="Notes"
          />
        </td>
      </tr>
    );
  };

  // Calculate grand total for payroll processing
  const calculateGrandTotal = () => {
    return payrollEntries.reduce((total, entry) => {
      const lineTotal = (parseFloat(entry.units) || 0) * (parseFloat(entry.rate) || 0);
      return total + lineTotal;
    }, 0);
  };

  // Export payroll data to CSV
  const exportPayrollData = () => {
    const selectedEmployeeData = employees.find((emp: Employee) => emp.id === selectedEmployee);
    const template = templates.find((t: TimecardTemplate) => t.id === selectedTemplate);
    
    if (!selectedEmployeeData || !template) {
      toast({ title: "Error", description: "Please select employee and template first", variant: "destructive" });
      return;
    }

    // Create CSV headers
    const headers = [
      "Employee Name",
      "Employee ID",
      "Template",
      "Month/Year",
      "Line",
      "Addon",
      "Units",
      "Rate",
      "Total",
      "Alias",
      "Notes"
    ];

    // Create CSV data
    const csvData = payrollEntries
      .filter(entry => entry.addon || entry.units || entry.rate || entry.notes)
      .map((entry, index) => [
        `${selectedEmployeeData.firstName} ${selectedEmployeeData.lastName}`,
        selectedEmployeeData.employeeId,
        template.name,
        `${currentMonth}/${currentYear}`,
        index + 1,
        entry.addon || '',
        entry.units || '',
        entry.rate || '',
        ((parseFloat(entry.units) || 0) * (parseFloat(entry.rate) || 0)).toFixed(2),
        entry.alias || '',
        entry.notes || ''
      ]);

    // Add grand total row
    csvData.push([
      '', '', '', '', '', '', 'GRAND TOTAL', calculateGrandTotal().toFixed(2), '', ''
    ]);

    // Convert to CSV string
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `monthly-payroll-${selectedEmployeeData.firstName}-${selectedEmployeeData.lastName}-${currentMonth}-${currentYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Success", description: "Payroll data exported successfully" });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Monthly Timecard</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={saveTimecard} disabled={!timecardData || timecardData?.isLocked}>
            <Save className="h-4 w-4 mr-2" />
            Save Timecard
          </Button>
          {timecardData?.status === 'draft' && (
            <Button 
              onClick={submitTimecard} 
              disabled={!timecardData?.id || timecardData?.isLocked || submitTimecardMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitTimecardMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          )}
        </div>
      </div>

      {/* Employee and Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Setup</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="site-filter">Filter by Site/Location:</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger>
                  <SelectValue placeholder="All sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {uniqueSites.map((site) => (
                    <SelectItem key={site} value={site}>
                      {site}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="employee-select">Select Employee:</Label>
              <Select value={selectedEmployee?.toString() || ""} onValueChange={(value) => setSelectedEmployee(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {filteredEmployees.map((employee: Employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.firstName} {employee.lastName} - {employee.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="template-select">Select Template:</Label>
              <Select value={selectedTemplate?.toString() || ""} onValueChange={(value) => setSelectedTemplate(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template: TimecardTemplate) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name} - {template.employeeType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Site Timecards Section */}
      {selectedSite && selectedSite !== 'all' && siteTimecards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Existing Timecards for {selectedSite}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {siteTimecards.map((timecard: any) => (
                <div
                  key={timecard.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    // Set the employee and template to load this timecard
                    setSelectedEmployee(timecard.employeeId);
                    setSelectedTemplate(timecard.templateId);
                    
                    // Parse JSON data if it's stored as strings
                    const parsedEntries = safeJsonParse(timecard.entries, []);
                    const parsedCustomFieldsData = safeJsonParse(timecard.customFieldsData, {});
                    
                    // Load the timecard data
                    setTimecardData(timecard);
                    setFormData(parsedCustomFieldsData);
                    setDailyEntries(parsedEntries);
                    setCurrentMonth(timecard.month);
                    setCurrentYear(timecard.year);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-lg">
                        {timecard.employeeName} - {timecard.month}/{timecard.year}
                      </div>
                      <div className="text-sm text-gray-600">
                        {timecard.employeePosition} • {templates.find((t: any) => t.id === timecard.templateId)?.name || 'Unknown Template'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Pay Period: {new Date(timecard.payPeriodStart).toLocaleDateString()} - {new Date(timecard.payPeriodEnd).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        Status: <span className={`px-2 py-1 rounded-full text-xs ${
                          timecard.status === 'approved' ? 'bg-green-100 text-green-800' :
                          timecard.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                          timecard.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {timecard.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {timecard.isLocked && (
                        <div className="flex items-center space-x-1 bg-red-100 text-red-700 px-2 py-1 rounded-md">
                          <Lock className="h-4 w-4" />
                          <span className="text-sm">Locked</span>
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        {timecard.entries?.reduce((sum: number, entry: any) => sum + (parseFloat(entry.hours) || 0), 0) || 0} hrs
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedEmployee && selectedTemplate && (
        <>
          {/* Paper-style Timecard Form */}
          <Card className="bg-white border-2 border-gray-400" data-testid="timecard-form">
            <CardHeader className="bg-gray-50 border-b-2 border-gray-400">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-center text-xl font-bold">
                    CLASSIFIED/CONFIDENTIAL PERMANENT TIMECARD
                  </CardTitle>
                  <div className="text-center text-sm text-gray-600">
                    School District Personnel Department
                  </div>
                </div>
                
                {/* Lock Status and Controls */}
                <div className="flex items-center space-x-2">
                  {timecardData?.isLocked ? (
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 bg-red-100 text-red-700 px-2 py-1 rounded-md">
                        <Lock className="h-4 w-4" />
                        <span className="text-sm font-medium">Locked</span>
                      </div>
                      {user?.role === 'admin' || user?.role === 'hr' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unlockTimecard.mutate(timecardData.id!)}
                          disabled={unlockTimecard.isPending}
                        >
                          <Unlock className="h-4 w-4 mr-1" />
                          Unlock
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-md">
                        <Unlock className="h-4 w-4" />
                        <span className="text-sm font-medium">Unlocked</span>
                      </div>
                      {user?.role === 'admin' || user?.role === 'hr' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => lockTimecard.mutate({ id: timecardData.id!, lockReason: 'Manually locked by ' + user.username })}
                          disabled={lockTimecard.isPending}
                        >
                          <Lock className="h-4 w-4 mr-1" />
                          Lock
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className={`p-6 ${timecardData?.isLocked ? 'opacity-75 pointer-events-none' : ''}`}>
              
              {/* Lock notification */}
              {timecardData?.isLocked && (
                <div className="bg-orange-100 border border-orange-300 text-orange-700 px-4 py-3 rounded-md mb-6">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    <div>
                      <div className="font-medium">Timecard is locked</div>
                      <div className="text-sm">
                        Locked by {timecardData.lockedBy} on {timecardData.lockedAt ? new Date(timecardData.lockedAt).toLocaleDateString() : 'Unknown date'}
                        {timecardData.lockReason && (
                          <div className="mt-1">Reason: {timecardData.lockReason}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* General Information Section */}
              {groupedFields.general && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-300 pb-2">
                    Employee Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedFields.general.map((field) => (
                      <div key={field.id} className="space-y-1">
                        <Label className="text-sm font-medium text-gray-700">
                          {field.fieldLabel}
                          {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              )}



              {/* Monthly Time Tracking Grid */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-300 pb-2">
                  Monthly Time Record
                </h3>
                
                {/* Time tracking table */}
                <div className="border border-gray-400 rounded">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-400 px-2 py-1 text-xs font-semibold">Month/Day</th>
                        <th className="border border-gray-400 px-2 py-1 text-xs font-semibold">Code</th>
                        <th className="border border-gray-400 px-2 py-1 text-xs font-semibold">Hours</th>
                        <th className="border border-gray-400 px-2 py-1 text-xs font-semibold">Person Replaced</th>
                        <th className="border border-gray-400 px-2 py-1 text-xs font-semibold">Description</th>
                        <th className="border border-gray-400 px-2 py-1 text-xs font-semibold">Funding</th>
                        <th className="border border-gray-400 px-2 py-1 text-xs font-semibold">Site</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyEntries.map((entry, index) => (
                        <tr key={index} className="even:bg-gray-50">
                          <td className="border border-gray-400 px-1 py-1">
                            <Input
                              type="text"
                              value={entry.date}
                              onChange={(e) => updateDailyEntry(index, 'date', e.target.value)}
                              className="h-6 text-xs border-0 bg-transparent p-1"
                              placeholder="MM/DD"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-1">
                            <Select onValueChange={(value) => updateDailyEntry(index, 'code', value)} value={entry.code}>
                              <SelectTrigger className="h-6 text-xs border-0 bg-transparent p-1">
                                <SelectValue placeholder="Code" />
                              </SelectTrigger>
                              <SelectContent>
                                {codeOptions.map((option) => (
                                  <SelectItem key={option.id} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="border border-gray-400 px-1 py-1">
                            <Input
                              type="number"
                              step="0.25"
                              value={entry.hours}
                              onChange={(e) => updateDailyEntry(index, 'hours', e.target.value)}
                              className="h-6 text-xs border-0 bg-transparent p-1"
                              placeholder="0"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-1">
                            <Input
                              type="text"
                              value={entry.personReplaced}
                              onChange={(e) => updateDailyEntry(index, 'personReplaced', e.target.value)}
                              className="h-6 text-xs border-0 bg-transparent p-1"
                              placeholder="Name"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-1">
                            <Input
                              type="text"
                              value={entry.description}
                              onChange={(e) => updateDailyEntry(index, 'description', e.target.value)}
                              className="h-6 text-xs border-0 bg-transparent p-1"
                              placeholder="Description"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-1">
                            <Select onValueChange={(value) => updateDailyEntry(index, 'funding', value)} value={entry.funding}>
                              <SelectTrigger className="h-6 text-xs border-0 bg-transparent p-1">
                                <SelectValue placeholder="Funding" />
                              </SelectTrigger>
                              <SelectContent>
                                {fundingOptions.map((option) => (
                                  <SelectItem key={option.id} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="border border-gray-400 px-1 py-1">
                            <Select onValueChange={(value) => updateDailyEntry(index, 'site', value)} value={entry.site}>
                              <SelectTrigger className="h-6 text-xs border-0 bg-transparent p-1">
                                <SelectValue placeholder="Site" />
                              </SelectTrigger>
                              <SelectContent>
                                {siteOptions.map((option) => (
                                  <SelectItem key={option.id} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Approval Section */}
              {groupedFields.approval && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-300 pb-2">
                    Approvals
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {groupedFields.approval.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          {field.fieldLabel}
                          {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payroll Processing Section */}
              <div className="mt-6 pt-4 border-t-2 border-gray-400">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2">
                    Payroll Processing Section
                  </h3>
                  <Button
                    onClick={exportPayrollData}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export Payroll</span>
                  </Button>
                </div>
                <div className="border border-gray-400 rounded">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-purple-50">
                        <th className="border border-gray-400 px-2 py-2 text-sm font-semibold text-purple-800">Line</th>
                        <th className="border border-gray-400 px-2 py-2 text-sm font-semibold text-purple-800">Addon</th>
                        <th className="border border-gray-400 px-2 py-2 text-sm font-semibold text-purple-800">Units</th>
                        <th className="border border-gray-400 px-2 py-2 text-sm font-semibold text-purple-800">Rate</th>
                        <th className="border border-gray-400 px-2 py-2 text-sm font-semibold text-purple-800">Total</th>
                        <th className="border border-gray-400 px-2 py-2 text-sm font-semibold text-purple-800">Alias</th>
                        <th className="border border-gray-400 px-2 py-2 text-sm font-semibold text-purple-800">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 10 }, (_, index) => (
                        <PayrollProcessingRowInline key={index} lineNumber={index + 1} />
                      ))}
                      {/* Grand Total Row */}
                      <tr className="bg-purple-100 border-t-2 border-purple-400">
                        <td className="border border-gray-400 px-2 py-2 text-center text-sm font-bold text-purple-800" colSpan={4}>
                          GRAND TOTAL
                        </td>
                        <td className="border border-gray-400 px-2 py-2 text-center text-lg font-bold text-purple-800">
                          ${calculateGrandTotal().toFixed(2)}
                        </td>
                        <td className="border border-gray-400 px-2 py-2" colSpan={2}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Section */}
              <div className="mt-6 pt-4 border-t border-gray-300">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {dailyEntries.reduce((sum, entry) => sum + (parseFloat(entry.hours) || 0), 0)}
                    </div>
                    <div className="text-sm text-gray-500">Total Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {dailyEntries.filter(entry => entry.hours && parseFloat(entry.hours) > 0).length}
                    </div>
                    <div className="text-sm text-gray-500">Days Worked</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {currentMonth}/{currentYear}
                    </div>
                    <div className="text-sm text-gray-500">Pay Period</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Existing Timecards Section */}
      {selectedEmployee && existingTimecards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Existing Timecards for {selectedEmployeeData?.firstName} {selectedEmployeeData?.lastName}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {existingTimecards.map((timecard: any) => (
                <div
                  key={timecard.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    // Parse JSON data if it's stored as strings
                    const parsedEntries = safeJsonParse(timecard.entries, []);
                    const parsedCustomFieldsData = safeJsonParse(timecard.customFieldsData, {});
                    
                    // Load the timecard data
                    setTimecardData(timecard);
                    setFormData(parsedCustomFieldsData);
                    setDailyEntries(parsedEntries);
                    setPayrollEntries(timecard.payrollEntries || []);
                    setCurrentMonth(timecard.month);
                    setCurrentYear(timecard.year);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-lg">
                        {timecard.month}/{timecard.year} - {templates.find((t: any) => t.id === timecard.templateId)?.name || 'Unknown Template'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Pay Period: {new Date(timecard.payPeriodStart).toLocaleDateString()} - {new Date(timecard.payPeriodEnd).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        Status: <span className={`px-2 py-1 rounded-full text-xs ${
                          timecard.status === 'approved' ? 'bg-green-100 text-green-800' :
                          timecard.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                          timecard.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {timecard.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {timecard.isLocked && (
                        <div className="flex items-center space-x-1 bg-red-100 text-red-700 px-2 py-1 rounded-md">
                          <Lock className="h-4 w-4" />
                          <span className="text-sm">Locked</span>
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        {timecard.entries?.reduce((sum: number, entry: any) => sum + (parseFloat(entry.hours) || 0), 0) || 0} hrs
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}