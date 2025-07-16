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
  const [payrollData, setPayrollData] = useState<any>({});
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

  // Fetch dropdown options
  const { data: dropdownOptions = [] } = useQuery({
    queryKey: ["/api/dropdown-options"],
  });

  // Get substitute employees only
  const substitutes = employees.filter((e: Employee) => e.employeeType === "substitute");

  // Get substitute templates only
  const substituteTemplates = templates.filter((t: TimecardTemplate) => t.employeeType === "substitute");

  // Save timecard mutation
  const saveTimecard = useMutation({
    mutationFn: async (data: any) => {
      const timecardPayload = {
        substituteId: selectedSubstitute,
        templateId: selectedTemplate,
        workDate: new Date().toISOString().split('T')[0], // Use current date
        status: timecardData?.status || "draft",
        customFieldsData: formData,
        notes: data.notes || "",
        payrollAddon: payrollData.payrollAddon || "",
        payrollUnits: payrollData.payrollUnits || 0,
        payrollRate: payrollData.payrollRate || 0,
        payrollTotal: payrollData.payrollTotal || 0,
        payrollProcessingNotes: payrollData.payrollProcessingNotes || "",
      };

      if (timecardData?.id) {
        return await apiRequest(`/api/substitute-time-cards/${timecardData.id}`, "PUT", timecardPayload);
      } else {
        return await apiRequest("/api/substitute-time-cards", "POST", timecardPayload);
      }
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Timecard saved successfully" });
      refetchTimecard();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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
      setPayrollData({
        payrollAddon: existingTimecard.payrollAddon || "",
        payrollUnits: existingTimecard.payrollUnits || 0,
        payrollRate: existingTimecard.payrollRate || 0,
        payrollTotal: existingTimecard.payrollTotal || 0,
        payrollProcessingNotes: existingTimecard.payrollProcessingNotes || "",
      });
    } else {
      setTimecardData(null);
      setFormData({});
      setPayrollData({});
    }
  }, [existingTimecard]);

  // Auto-select default template when substitute is selected
  useEffect(() => {
    if (selectedSubstitute && substituteTemplates.length > 0) {
      const defaultTemplate = substituteTemplates.find(t => t.isDefault) || substituteTemplates[0];
      setSelectedTemplate(defaultTemplate.id);
    }
  }, [selectedSubstitute, substituteTemplates]);

  // Calculate payroll total when units or rate change
  useEffect(() => {
    const units = parseFloat(payrollData.payrollUnits) || 0;
    const rate = parseFloat(payrollData.payrollRate) || 0;
    const total = units * rate;
    setPayrollData(prev => ({ ...prev, payrollTotal: total }));
  }, [payrollData.payrollUnits, payrollData.payrollRate]);

  const handleFormFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handlePayrollChange = (fieldName: string, value: any) => {
    setPayrollData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSave = () => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Substitute Time Cards</h1>
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

      {/* Paper-like Timecard Form */}
      {selectedSubstitute && selectedTemplate && templateFields.length > 0 && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Substitute Timecard</CardTitle>
                <p className="text-sm text-gray-600">
                  {substitutes.find(s => s.id === selectedSubstitute)?.firstName} {substitutes.find(s => s.id === selectedSubstitute)?.lastName}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {timecardData?.isLocked && (
                  <div className="flex items-center space-x-1 text-red-600">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm">Locked</span>
                  </div>
                )}
                {user && (user.role === 'admin' || user.role === 'hr') && timecardData?.id && (
                  <>
                    {timecardData.isLocked ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleUnlock}
                        disabled={unlockTimecard.isPending}
                      >
                        <Unlock className="h-4 w-4 mr-1" />
                        Unlock
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleLock}
                        disabled={lockTimecard.isPending}
                      >
                        <Lock className="h-4 w-4 mr-1" />
                        Lock
                      </Button>
                    )}
                  </>
                )}
                <Button 
                  onClick={handleSave}
                  disabled={saveTimecard.isPending || timecardData?.isLocked}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Render form sections */}
              {Object.entries(groupedFields).map(([section, fields]) => (
                <div key={section} className="space-y-4">
                  <h3 className="text-lg font-semibold capitalize border-b pb-2">
                    {section.replace('_', ' ')}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(fields as TimecardTemplateField[])
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={field.fieldName} className="text-sm font-medium">
                            {field.fieldLabel}
                            {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {renderFormField(field)}
                        </div>
                      ))}
                  </div>
                </div>
              ))}

              {/* Payroll Processing Section */}
              {timecardData?.status === 'admin_approved' || timecardData?.status === 'payroll_processed' ? (
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold text-purple-700 border-b pb-2">
                    Payroll Processing
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="payrollAddon" className="text-sm font-medium">
                        Addon
                      </Label>
                      <Select 
                        value={payrollData.payrollAddon || ""} 
                        onValueChange={(val) => handlePayrollChange('payrollAddon', val)}
                        disabled={timecardData?.isLocked}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select addon" />
                        </SelectTrigger>
                        <SelectContent>
                          {dropdownOptions
                            .filter((option: any) => option.category === 'Addon')
                            .map((option: any) => (
                              <SelectItem key={option.id} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payrollUnits" className="text-sm font-medium">
                        Units
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={payrollData.payrollUnits || ''}
                        onChange={(e) => handlePayrollChange('payrollUnits', e.target.value)}
                        disabled={timecardData?.isLocked}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payrollRate" className="text-sm font-medium">
                        Rate ($)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={payrollData.payrollRate || ''}
                        onChange={(e) => handlePayrollChange('payrollRate', e.target.value)}
                        disabled={timecardData?.isLocked}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payrollTotal" className="text-sm font-medium">
                        Total ($)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={payrollData.payrollTotal || ''}
                        disabled={true}
                        className="bg-gray-100"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="payrollProcessingNotes" className="text-sm font-medium">
                        Processing Notes
                      </Label>
                      <Textarea
                        value={payrollData.payrollProcessingNotes || ''}
                        onChange={(e) => handlePayrollChange('payrollProcessingNotes', e.target.value)}
                        disabled={timecardData?.isLocked}
                        placeholder="Payroll processing notes..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Lock Status */}
              {timecardData?.isLocked && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center space-x-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Timecard Locked</span>
                  </div>
                  <div className="mt-2 text-sm text-red-600">
                    <p><strong>Locked by:</strong> {timecardData.lockedBy || 'System'}</p>
                    {timecardData.lockedAt && (
                      <p><strong>Locked at:</strong> {new Date(timecardData.lockedAt).toLocaleString()}</p>
                    )}
                    {timecardData.lockReason && (
                      <p><strong>Reason:</strong> {timecardData.lockReason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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