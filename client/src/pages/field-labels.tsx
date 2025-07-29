import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Settings, Plus, Edit2, Trash2, RotateCcw, Info, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FieldLabel {
  id: number;
  fieldName: string;
  displayLabel: string;
  category: string;
  description?: string;
  isRequired: boolean;
  isVisible: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function FieldLabels() {
  const [editingLabel, setEditingLabel] = useState<FieldLabel | null>(null);
  const [newLabel, setNewLabel] = useState({ fieldName: '', displayLabel: '', section: 'employee', description: '' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Comprehensive list of all customizable fields organized by section
  const allCustomizableFields = {
    employee: [
      { name: 'employeeId', label: 'Employee ID', description: 'Unique identifier for employee' },
      { name: 'firstName', label: 'First Name', description: 'Employee first name' },
      { name: 'lastName', label: 'Last Name', description: 'Employee last name' },
      { name: 'email', label: 'Email Address', description: 'Employee email contact' },
      { name: 'phoneNumber', label: 'Phone Number', description: 'Primary phone contact' },
      { name: 'address', label: 'Home Address', description: 'Residential address' },
      { name: 'department', label: 'Department', description: 'Work department or division' },
      { name: 'position', label: 'Job Position', description: 'Current job title or role' },
      { name: 'employeeType', label: 'Employee Type', description: 'Classification (teacher, admin, support, etc.)' },
      { name: 'hireDate', label: 'Hire Date', description: 'Date of employment start' },
      { name: 'salary', label: 'Annual Salary', description: 'Current annual compensation' },
      { name: 'payGrade', label: 'Pay Grade', description: 'Salary scale or pay level' },
      { name: 'educationLevel', label: 'Education Level', description: 'Highest degree or certification' },
      { name: 'certifications', label: 'Certifications', description: 'Professional licenses and certifications' },
      { name: 'status', label: 'Employment Status', description: 'Current employment status' },
      { name: 'supervisorId', label: 'Supervisor', description: 'Direct supervisor or manager' },
      { name: 'emergencyContact', label: 'Emergency Contact', description: 'Primary emergency contact person' },
      { name: 'emergencyPhone', label: 'Emergency Phone', description: 'Emergency contact phone number' }
    ],
    timecard: [
      { name: 'employeeId', label: 'Employee', description: 'Employee submitting timecard' },
      { name: 'date', label: 'Work Date', description: 'Date of work performed' },
      { name: 'clockIn', label: 'Clock In Time', description: 'Start time for work shift' },
      { name: 'clockOut', label: 'Clock Out Time', description: 'End time for work shift' },
      { name: 'breakStart', label: 'Break Start', description: 'Start time of break period' },
      { name: 'breakEnd', label: 'Break End', description: 'End time of break period' },
      { name: 'lunchStart', label: 'Lunch Start', description: 'Start time of lunch break' },
      { name: 'lunchEnd', label: 'Lunch End', description: 'End time of lunch break' },
      { name: 'notes', label: 'Work Notes', description: 'Additional work details or comments' },
      { name: 'status', label: 'Approval Status', description: 'Current timecard status' },
      { name: 'totalHours', label: 'Total Hours', description: 'Total hours worked' },
      { name: 'regularHours', label: 'Regular Hours', description: 'Standard work hours' },
      { name: 'overtimeHours', label: 'Overtime Hours', description: 'Hours worked beyond standard' },
      { name: 'payrollPeriod', label: 'Pay Period', description: 'Associated payroll period' },
      { name: 'approvedBy', label: 'Approved By', description: 'Supervisor who approved timecard' }
    ],
    leave: [
      { name: 'employeeId', label: 'Employee', description: 'Employee requesting leave' },
      { name: 'leaveType', label: 'Leave Type', description: 'Type of leave (sick, vacation, personal, etc.)' },
      { name: 'startDate', label: 'Start Date', description: 'First day of leave' },
      { name: 'endDate', label: 'End Date', description: 'Last day of leave' },
      { name: 'totalDays', label: 'Total Days', description: 'Number of days requested' },
      { name: 'reason', label: 'Leave Reason', description: 'Reason for leave request' },
      { name: 'status', label: 'Request Status', description: 'Current approval status' },
      { name: 'approvedBy', label: 'Approved By', description: 'Administrator who approved request' },
      { name: 'substituteName', label: 'Substitute Teacher', description: 'Assigned substitute teacher' },
      { name: 'substituteRequired', label: 'Substitute Required', description: 'Whether substitute is needed' },
      { name: 'medicalCertification', label: 'Medical Certification', description: 'Medical leave documentation' },
      { name: 'returnDate', label: 'Return Date', description: 'Expected return to work date' },
      { name: 'workRestrictions', label: 'Work Restrictions', description: 'Any return-to-work limitations' }
    ],
    payroll: [
      { name: 'employeeId', label: 'Employee', description: 'Employee for payroll record' },
      { name: 'payPeriod', label: 'Pay Period', description: 'Pay period dates' },
      { name: 'regularHours', label: 'Regular Hours', description: 'Standard work hours' },
      { name: 'overtimeHours', label: 'Overtime Hours', description: 'Overtime hours worked' },
      { name: 'grossPay', label: 'Gross Pay', description: 'Total pay before deductions' },
      { name: 'netPay', label: 'Net Pay', description: 'Take-home pay after deductions' },
      { name: 'federalTax', label: 'Federal Tax', description: 'Federal income tax withheld' },
      { name: 'stateTax', label: 'State Tax', description: 'State income tax withheld' },
      { name: 'socialSecurity', label: 'Social Security', description: 'Social Security tax deduction' },
      { name: 'medicare', label: 'Medicare Tax', description: 'Medicare tax deduction' },
      { name: 'healthInsurance', label: 'Health Insurance', description: 'Health insurance premium deduction' },
      { name: 'dentalInsurance', label: 'Dental Insurance', description: 'Dental insurance premium deduction' },
      { name: 'retirement', label: 'Retirement', description: 'Retirement plan contribution' },
      { name: 'otherDeductions', label: 'Other Deductions', description: 'Miscellaneous deductions' }
    ],
    onboarding: [
      { name: 'employeeId', label: 'New Employee', description: 'Employee being onboarded' },
      { name: 'workflowName', label: 'Workflow Name', description: 'Name of onboarding process' },
      { name: 'status', label: 'Workflow Status', description: 'Current onboarding status' },
      { name: 'startDate', label: 'Start Date', description: 'Onboarding process start date' },
      { name: 'expectedCompletionDate', label: 'Expected Completion', description: 'Target completion date' },
      { name: 'actualCompletionDate', label: 'Actual Completion', description: 'Actual completion date' },
      { name: 'assignedTo', label: 'Assigned To', description: 'HR representative managing onboarding' },
      { name: 'currentStep', label: 'Current Step', description: 'Current stage in onboarding process' },
      { name: 'totalSteps', label: 'Total Steps', description: 'Total onboarding steps' },
      { name: 'completedSteps', label: 'Completed Steps', description: 'Number of completed steps' },
      { name: 'notes', label: 'Onboarding Notes', description: 'Additional notes or comments' },
      { name: 'documents', label: 'Required Documents', description: 'Documents needed for onboarding' }
    ]
  };

  const { data: fieldLabels = [], isLoading } = useQuery({
    queryKey: ['/api/custom-field-labels'],
  });

  const initializeDefaultsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/custom-field-labels/initialize', 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-field-labels'] });
      toast({
        title: "Success",
        description: "Default field labels initialized successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to initialize default field labels",
        variant: "destructive",
      });
    },
  });

  const createLabelMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/custom-field-labels', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-field-labels'] });
      setIsAddDialogOpen(false);
      setNewLabel({ fieldName: '', displayLabel: '', section: 'employee', description: '' });
      toast({
        title: "Success",
        description: "Custom field label created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create custom field label",
        variant: "destructive",
      });
    },
  });

  const updateLabelMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      return await apiRequest(`/api/custom-field-labels/${data.id}`, 'PUT', data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-field-labels'] });
      setIsEditDialogOpen(false);
      setEditingLabel(null);
      toast({
        title: "Success",
        description: "Field label updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update field label",
        variant: "destructive",
      });
    },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/custom-field-labels/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-field-labels'] });
      toast({
        title: "Success",
        description: "Field label deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete field label",
        variant: "destructive",
      });
    },
  });

  const handleCreateLabel = () => {
    if (!newLabel.fieldName || !newLabel.displayLabel) {
      toast({
        title: "Error",
        description: "Field name and display label are required",
        variant: "destructive",
      });
      return;
    }

    createLabelMutation.mutate({
      fieldName: newLabel.fieldName,
      displayLabel: newLabel.displayLabel,
      description: newLabel.description,
      category: newLabel.section,
      isRequired: false,
      isVisible: true,
      displayOrder: 0,
    });
  };

  const handleUpdateLabel = () => {
    if (!editingLabel) return;

    updateLabelMutation.mutate({
      id: editingLabel.id,
      updates: {
        displayLabel: editValue,
        description: editDescription,
      },
    });
  };

  const handleDeleteLabel = (id: number) => {
    if (confirm('Are you sure you want to delete this field label?')) {
      deleteLabelMutation.mutate(id);
    }
  };

  const handleEditClick = (label: FieldLabel) => {
    setEditingLabel(label);
    setEditValue(label.displayLabel);
    setEditDescription(label.description || '');
    setIsEditDialogOpen(true);
  };

  const groupedLabels = fieldLabels.reduce((acc: Record<string, FieldLabel[]>, label: FieldLabel) => {
    const section = label.category || 'general';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(label);
    return acc;
  }, {});

  const sections = [
    { key: 'employee', label: 'Employee Fields', icon: '👤' },
    { key: 'payroll', label: 'Payroll Fields', icon: '💰' },
    { key: 'leave', label: 'Leave Fields', icon: '📅' },
    { key: 'timecard', label: 'Timecard Fields', icon: '⏰' },
    { key: 'onboarding', label: 'Onboarding Fields', icon: '🎯' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading field labels...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Field Labels</h1>
          <p className="text-muted-foreground mt-2">
            Customize field labels throughout the system to match your district's terminology
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => initializeDefaultsMutation.mutate()}
            disabled={initializeDefaultsMutation.isPending}
            variant="outline"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Initialize Defaults
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Label
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Custom Field Label</DialogTitle>
                <DialogDescription>
                  Create a new custom label for any field in the system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="section">Section</Label>
                  <Select value={newLabel.section} onValueChange={(value) => setNewLabel({ ...newLabel, section: value, fieldName: '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.key} value={section.key}>
                          {section.icon} {section.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fieldName">Field Name</Label>
                  <Select value={newLabel.fieldName} onValueChange={(value) => setNewLabel({ ...newLabel, fieldName: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a field" />
                    </SelectTrigger>
                    <SelectContent>
                      {newLabel.section && allCustomizableFields[newLabel.section as keyof typeof allCustomizableFields]?.map((field) => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="displayLabel">Custom Display Label</Label>
                  <Input
                    id="displayLabel"
                    value={newLabel.displayLabel}
                    onChange={(e) => setNewLabel({ ...newLabel, displayLabel: e.target.value })}
                    placeholder="Enter custom label"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newLabel.description}
                    onChange={(e) => setNewLabel({ ...newLabel, description: e.target.value })}
                    placeholder="Brief description of this field"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateLabel} disabled={createLabelMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Create Label
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {fieldLabels.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No field labels configured. Click "Initialize Defaults" to create default labels for all system fields, or "Add Custom Label" to create your own.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>District Customization:</strong> All field labels can be customized to match your district's specific terminology. Changes will be reflected throughout the entire system.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="employee" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {sections.map((section) => (
                <TabsTrigger key={section.key} value={section.key} className="text-xs">
                  {section.icon} {section.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {sections.map((section) => (
              <TabsContent key={section.key} value={section.key} className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{section.label}</h3>
                    <Badge variant="secondary">
                      {groupedLabels[section.key]?.length || 0} labels
                    </Badge>
                  </div>

                  {groupedLabels[section.key] && groupedLabels[section.key].length > 0 ? (
                    <div className="grid gap-2">
                      {groupedLabels[section.key].map((label: FieldLabel) => (
                        <Card key={label.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {label.fieldName}
                                </Badge>
                                <span className="font-medium">{label.displayLabel}</span>
                              </div>
                              {label.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {label.description}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditClick(label)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteLabel(label.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-8 text-center">
                      <div className="text-muted-foreground">
                        <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No custom labels for {section.label.toLowerCase()} yet.</p>
                        <p className="text-sm mt-2">Add custom labels to personalize field names for your district.</p>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Show available fields for this section */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Available {section.label} ({allCustomizableFields[section.key as keyof typeof allCustomizableFields]?.length} fields)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {allCustomizableFields[section.key as keyof typeof allCustomizableFields]?.map((field) => (
                      <div key={field.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="text-sm font-medium">{field.label}</div>
                          <div className="text-xs text-muted-foreground">{field.description}</div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {field.name}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Field Label</DialogTitle>
            <DialogDescription>
              Update the display label and description for "{editingLabel?.fieldName}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editDisplayLabel">Display Label</Label>
              <Input
                id="editDisplayLabel"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Enter display label"
              />
            </div>

            <div>
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Brief description"
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateLabel} disabled={updateLabelMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}