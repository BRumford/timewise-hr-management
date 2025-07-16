import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, User, Save, FileText, Building, Lock, Unlock, AlertTriangle } from "lucide-react";
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
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [timecardData, setTimecardData] = useState<MonthlyTimecardData | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [dailyEntries, setDailyEntries] = useState<any[]>([]);
  const [payrollEntries, setPayrollEntries] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  // Fetch timecard templates
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/timecard-templates"],
  });

  // Fetch template fields for selected template
  const { data: templateFields = [] } = useQuery({
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

  // Get employee data
  const selectedEmployeeData = employees.find((emp: Employee) => emp.id === selectedEmployee);

  // Initialize form data when template changes
  useEffect(() => {
    if (selectedTemplate && selectedEmployee) {
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

  // Update payroll entry
  const updatePayrollEntry = (index: number, field: string, value: any) => {
    setPayrollEntries(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  // Save timecard (simulate API call for now)
  const saveTimecard = () => {
    if (!timecardData) return;

    const finalData = {
      ...timecardData,
      customFieldsData: formData,
      entries: dailyEntries
    };

    toast({
      title: "Success",
      description: "Monthly timecard saved successfully",
    });

    console.log('Timecard data:', finalData);
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
            type="number"
            step="0.01"
            value={entry.units || ''}
            onChange={(e) => updatePayrollEntry(index, 'units', e.target.value)}
            className="h-8 text-sm border-0 bg-transparent p-1"
            placeholder="0"
          />
        </td>
        <td className="border border-gray-400 px-1 py-1">
          <Input
            type="number"
            step="0.01"
            value={entry.rate || ''}
            onChange={(e) => updatePayrollEntry(index, 'rate', e.target.value)}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employee-select">Select Employee:</Label>
              <Select value={selectedEmployee?.toString() || ""} onValueChange={(value) => setSelectedEmployee(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee: Employee) => (
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

      {selectedEmployee && selectedTemplate && (
        <>
          {/* Paper-style Timecard Form */}
          <Card className="bg-white border-2 border-gray-400">
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
                          <td className="border border-gray-400 px-2 py-1 text-xs">
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">{entry.date}</span>
                              <span className="text-gray-500">({entry.dayName})</span>
                            </div>
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
                <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-300 pb-2">
                  Payroll Processing Section
                </h3>
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
    </div>
  );
}