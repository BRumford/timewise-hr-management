import { useState, useEffect, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, User, Save, FileText, Building, Lock, Unlock, AlertTriangle, Download } from "lucide-react";
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

interface SubstituteTimecardData {
  id?: number;
  substituteId: number;
  templateId: number;
  workDate: string;
  status: string;
  customFieldsData: any;
  notes: string;
  submittedBy?: string;
  submittedAt?: string;
  isLocked?: boolean;
  lockedBy?: string;
  lockedAt?: string;
  lockReason?: string;
  payrollAddon?: string;
  payrollUnits?: number;
  payrollRate?: number;
  payrollTotal?: number;
  payrollProcessingNotes?: string;
}

export default function SubstituteTimeCards() {
  const [selectedSubstitute, setSelectedSubstitute] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [timecardData, setTimecardData] = useState<SubstituteTimecardData | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [payrollEntries, setPayrollEntries] = useState<any[]>([]);
  const [dailyEntries, setDailyEntries] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch employees (substitutes only)
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  // Fetch timecard templates for substitute type
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/timecard-templates"],
  });

  // Fetch template fields for the selected template
  const { data: templateFields = [] } = useQuery({
    queryKey: ["/api/timecard-template-fields", selectedTemplate],
    enabled: !!selectedTemplate,
  });

  // Fetch existing timecard data - for now we'll create new timecards each time
  const { data: existingTimecard, refetch: refetchTimecard } = useQuery({
    queryKey: ["/api/substitute-time-cards", "new", selectedSubstitute, selectedTemplate],
    enabled: false, // Disable for now until we implement proper timecard fetching
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

  // Get substitute employees only
  const substitutes = employees.filter((e: Employee) => e.employeeType === "substitute");

  // Get substitute templates only
  const substituteTemplates = templates.filter((t: TimecardTemplate) => t.employeeType === "substitute");

  // Get substitute data
  const selectedSubstituteData = substitutes.find((sub: Employee) => sub.id === selectedSubstitute);

  // Initialize form data when template changes
  useEffect(() => {
    if (selectedTemplate && selectedSubstitute) {
      const template = templates.find((t: TimecardTemplate) => t.id === selectedTemplate);
      if (template) {
        setTimecardData({
          substituteId: selectedSubstitute,
          templateId: selectedTemplate,
          workDate: new Date().toISOString().split('T')[0],
          status: 'draft',
          customFieldsData: {},
          notes: ''
        });
        
        // Initialize form data with substitute information
        setFormData({
          'Employee Name': `${selectedSubstituteData?.firstName || ''} ${selectedSubstituteData?.lastName || ''}`,
          'Employee ID': selectedSubstituteData?.employeeId || '',
          'Date': new Date().toLocaleDateString(),
          'Position': selectedSubstituteData?.position || '',
          'Department': selectedSubstituteData?.department || '',
        });
        
        // Initialize payroll entries (10 rows)
        initializePayrollEntries();
        
        // Initialize daily entries for the month
        initializeDailyEntries();
      }
    }
  }, [selectedTemplate, selectedSubstitute, selectedSubstituteData, templates]);

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

  // Update payroll entry - optimized with useCallback to prevent re-renders
  const updatePayrollEntry = useCallback((index: number, field: string, value: any) => {
    setPayrollEntries(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  }, []);

  // Initialize daily entries for the current month
  const initializeDailyEntries = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const entries = Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(currentYear, currentMonth, index + 1);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = String(index + 1).padStart(2, '0');
      
      return {
        date: `${currentMonth + 1}/${dayNumber}`,
        dayName,
        code: '',
        hours: '',
        personReplaced: '',
        description: '',
        funding: '',
        site: ''
      };
    });
    setDailyEntries(entries);
  };

  // Update daily entry - optimized with useCallback to prevent re-renders
  const updateDailyEntry = useCallback((index: number, field: string, value: string) => {
    setDailyEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    ));
  }, []);

  // Save timecard mutation
  const saveTimecard = useMutation({
    mutationFn: async (data: any) => {
      const timecardPayload = {
        substituteId: selectedSubstitute,
        templateId: selectedTemplate,
        workDate: new Date().toISOString().split('T')[0],
        status: timecardData?.status || "draft",
        customFieldsData: formData,
        notes: data.notes || "",
        payrollEntries: payrollEntries,
      };

      if (timecardData?.id) {
        return await apiRequest(`/api/substitute-time-cards/${timecardData.id}`, "PUT", timecardPayload);
      } else {
        return await apiRequest("/api/substitute-time-cards", "POST", timecardPayload);
      }
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Substitute timecard saved successfully" });
      refetchTimecard();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Save timecard function
  const handleSaveTimecard = () => {
    if (!timecardData) return;
    
    saveTimecard.mutate({
      notes: formData.notes || ""
    });
  };

  // Lock timecard mutation
  const lockTimecard = useMutation({
    mutationFn: async ({ id, lockReason }: { id: number, lockReason?: string }) => {
      return await apiRequest(`/api/substitute-time-cards/${id}/lock`, "POST", { lockReason });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Timecard locked successfully" });
      refetchTimecard();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Unlock timecard mutation
  const unlockTimecard = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/substitute-time-cards/${id}/unlock`, "POST");
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Timecard unlocked successfully" });
      refetchTimecard();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Load existing timecard data when it's available
  useEffect(() => {
    if (existingTimecard) {
      setTimecardData(existingTimecard);
      setFormData(existingTimecard.customFieldsData || {});
      
      // Initialize payroll entries from existing data if available
      if (existingTimecard.payrollEntries && Array.isArray(existingTimecard.payrollEntries)) {
        setPayrollEntries(existingTimecard.payrollEntries);
      } else {
        initializePayrollEntries();
      }
    } else {
      setTimecardData(null);
      setFormData({});
      setPayrollEntries([]);
    }
  }, [existingTimecard]);

  // Reset template selection when substitute changes
  useEffect(() => {
    if (selectedSubstitute) {
      setSelectedTemplate(null);
    }
  }, [selectedSubstitute]);

  const handleFormFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSave = () => {
    if (!timecardData) return;
    saveTimecard.mutate({ notes: formData.notes || "" });
  };

  const handleLock = () => {
    if (timecardData?.id) {
      const lockReason = prompt("Please provide a reason for locking this timecard:");
      if (lockReason) {
        lockTimecard.mutate({ id: timecardData.id, lockReason });
      }
    }
  };

  const handleUnlock = () => {
    if (timecardData?.id) {
      unlockTimecard.mutate(timecardData.id);
    }
  };

  const renderFormField = (field: TimecardTemplateField) => {
    const value = formData[field.fieldName] || '';
    const isDisabled = field.isReadOnly || timecardData?.isLocked;

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <Input
            value={value}
            onChange={(e) => handleFormFieldChange(field.fieldName, e.target.value)}
            disabled={isDisabled}
            placeholder={field.fieldLabel}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFormFieldChange(field.fieldName, e.target.value)}
            disabled={isDisabled}
            placeholder={field.fieldLabel}
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFormFieldChange(field.fieldName, e.target.value)}
            disabled={isDisabled}
          />
        );
      
      case 'time':
        return (
          <Input
            type="time"
            value={value}
            onChange={(e) => handleFormFieldChange(field.fieldName, e.target.value)}
            disabled={isDisabled}
          />
        );
      
      case 'dropdown':
        const options = field.fieldOptions?.options || [];
        return (
          <Select value={value} onValueChange={(val) => handleFormFieldChange(field.fieldName, val)} disabled={isDisabled}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.fieldLabel}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFormFieldChange(field.fieldName, e.target.value)}
            disabled={isDisabled}
            placeholder={field.fieldLabel}
            rows={3}
          />
        );
      
      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFormFieldChange(field.fieldName, e.target.value)}
            disabled={isDisabled}
            placeholder={field.fieldLabel}
          />
        );
    }
  };

  const groupedFields = templateFields.reduce((acc: any, field: TimecardTemplateField) => {
    if (!acc[field.section]) {
      acc[field.section] = [];
    }
    acc[field.section].push(field);
    return acc;
  }, {});

  // PayrollProcessingRowInline component for payroll processing section (copied from working monthly-timecard.tsx)
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
              {(addonOptions as any[]).map((option) => (
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

  // Export payroll data to CSV
  const exportPayrollData = () => {
    const selectedSubstituteData = substitutes.find((sub: Employee) => sub.id === selectedSubstitute);
    const template = templates.find((t: TimecardTemplate) => t.id === selectedTemplate);
    
    if (!selectedSubstituteData || !template) {
      toast({ title: "Error", description: "Please select substitute and template first", variant: "destructive" });
      return;
    }

    // Create CSV headers
    const headers = [
      "Employee Name",
      "Employee ID",
      "Template",
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
        `${selectedSubstituteData.firstName} ${selectedSubstituteData.lastName}`,
        selectedSubstituteData.employeeId,
        template.name,
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
    link.setAttribute('download', `substitute-payroll-${selectedSubstituteData.firstName}-${selectedSubstituteData.lastName}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Success", description: "Payroll data exported successfully" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Substitute Time Cards</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleSaveTimecard} disabled={!timecardData || timecardData?.isLocked}>
            <Save className="h-4 w-4 mr-2" />
            Save Timecard
          </Button>
        </div>
      </div>

      {/* Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Select Substitute and Template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="substitute">Substitute</Label>
              <Select value={selectedSubstitute?.toString() || ""} onValueChange={(val) => setSelectedSubstitute(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select substitute" />
                </SelectTrigger>
                <SelectContent>
                  {substitutes.map((substitute: Employee) => (
                    <SelectItem key={substitute.id} value={substitute.id.toString()}>
                      {substitute.firstName} {substitute.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="template">Template</Label>
              <Select value={selectedTemplate?.toString() || ""} onValueChange={(val) => setSelectedTemplate(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {substituteTemplates.map((template: TimecardTemplate) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedSubstitute && selectedTemplate && (
        <>
          {/* Paper-style Timecard Form */}
          <Card className="bg-white border-2 border-gray-400">
            <CardHeader className="bg-gray-50 border-b-2 border-gray-400">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-center text-xl font-bold">
                    SUBSTITUTE TIMECARD
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
                          onClick={handleUnlock}
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
                          onClick={handleLock}
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
                    Substitute Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedFields.general.map((field) => (
                      <div key={field.id} className="space-y-1">
                        <Label className="text-sm font-medium text-gray-700">
                          {field.fieldLabel}
                          {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {renderFormField(field)}
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
                        {renderFormField(field)}
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
                      {new Date().getMonth() + 1}/{new Date().getFullYear()}
                    </div>
                    <div className="text-sm text-gray-500">Pay Period</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Instructions */}
      {(!selectedSubstitute || !selectedTemplate) && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Select Substitute and Template
            </h3>
            <p className="text-gray-600">
              Choose a substitute and template to create or edit a timecard.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}