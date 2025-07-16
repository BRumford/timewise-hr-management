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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Settings, Plus, Edit2, Trash2, RotateCcw, Info } from 'lucide-react';
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Available fields for each section
  const availableFields = {
    employee: [
      { name: 'employeeId', label: 'Employee ID' },
      { name: 'firstName', label: 'First Name' },
      { name: 'lastName', label: 'Last Name' },
      { name: 'email', label: 'Email' },
      { name: 'phoneNumber', label: 'Phone Number' },
      { name: 'address', label: 'Address' },
      { name: 'department', label: 'Department' },
      { name: 'position', label: 'Position' },
      { name: 'employeeType', label: 'Employee Type' },
      { name: 'hireDate', label: 'Hire Date' },
      { name: 'salary', label: 'Salary' },
      { name: 'payGrade', label: 'Pay Grade' },
      { name: 'educationLevel', label: 'Education Level' },
      { name: 'certifications', label: 'Certifications' },
      { name: 'status', label: 'Status' },
      { name: 'supervisorId', label: 'Supervisor ID' }
    ],
    timecard: [
      { name: 'employeeId', label: 'Employee' },
      { name: 'date', label: 'Date' },
      { name: 'clockIn', label: 'Clock In' },
      { name: 'clockOut', label: 'Clock Out' },
      { name: 'breakStart', label: 'Break Start' },
      { name: 'breakEnd', label: 'Break End' },
      { name: 'notes', label: 'Notes' },
      { name: 'status', label: 'Status' },
      { name: 'totalHours', label: 'Total Hours' },
      { name: 'overtimeHours', label: 'Overtime Hours' }
    ],
    leave: [
      { name: 'employeeId', label: 'Employee' },
      { name: 'leaveType', label: 'Leave Type' },
      { name: 'startDate', label: 'Start Date' },
      { name: 'endDate', label: 'End Date' },
      { name: 'reason', label: 'Reason' },
      { name: 'status', label: 'Status' },
      { name: 'isSubstituteNeeded', label: 'Substitute Needed' },
      { name: 'notes', label: 'Notes' }
    ],
    payroll: [
      { name: 'employeeId', label: 'Employee' },
      { name: 'payPeriodStart', label: 'Pay Period Start' },
      { name: 'payPeriodEnd', label: 'Pay Period End' },
      { name: 'grossPay', label: 'Gross Pay' },
      { name: 'netPay', label: 'Net Pay' },
      { name: 'deductions', label: 'Deductions' },
      { name: 'hoursWorked', label: 'Hours Worked' },
      { name: 'overtimeHours', label: 'Overtime Hours' },
      { name: 'processed', label: 'Processed Status' }
    ],
    onboarding: [
      { name: 'employeeId', label: 'Employee' },
      { name: 'workflowName', label: 'Workflow Name' },
      { name: 'status', label: 'Status' },
      { name: 'currentStep', label: 'Current Step' },
      { name: 'expectedCompletionDate', label: 'Expected Completion Date' },
      { name: 'notes', label: 'Notes' }
    ]
  };

  const { data: fieldLabels, isLoading } = useQuery({
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
        description: "Field label created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create field label",
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
        displayLabel: editingLabel.displayLabel,
        description: editingLabel.description,
      },
    });
  };

  const handleDeleteLabel = (id: number) => {
    if (confirm('Are you sure you want to delete this field label?')) {
      deleteLabelMutation.mutate(id);
    }
  };

  const groupedLabels = fieldLabels?.reduce((acc: any, label: FieldLabel) => {
    const section = label.category || 'general'; // Use category instead of section
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(label);
    return acc;
  }, {}) || {};

  const sections = [
    { key: 'employee', label: 'Employee Fields' },
    { key: 'payroll', label: 'Payroll Fields' },
    { key: 'leave', label: 'Leave Fields' },
    { key: 'timecard', label: 'Timecard Fields' },
    { key: 'onboarding', label: 'Onboarding Fields' },
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Field Label</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="section">Section</Label>
                  <Select value={newLabel.section} onValueChange={(value) => setNewLabel({ ...newLabel, section: value, fieldName: '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee Fields</SelectItem>
                      <SelectItem value="payroll">Payroll Fields</SelectItem>
                      <SelectItem value="leave">Leave Fields</SelectItem>
                      <SelectItem value="timecard">Timecard Fields</SelectItem>
                      <SelectItem value="onboarding">Onboarding Fields</SelectItem>
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
                      {availableFields[newLabel.section as keyof typeof availableFields]?.map((field) => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.name} - {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="displayLabel">Display Label</Label>
                  <Input
                    id="displayLabel"
                    value={newLabel.displayLabel}
                    onChange={(e) => setNewLabel({ ...newLabel, displayLabel: e.target.value })}
                    placeholder="e.g., Staff ID, Annual Salary, Cost Center"
                  />
                </div>
                {newLabel.fieldName && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Selected Field:</strong> {newLabel.fieldName}
                    </p>
                    <p className="text-sm text-blue-600">
                      This will change how "{availableFields[newLabel.section as keyof typeof availableFields]?.find(f => f.name === newLabel.fieldName)?.label}" appears in {newLabel.section} forms.
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={newLabel.description}
                    onChange={(e) => setNewLabel({ ...newLabel, description: e.target.value })}
                    placeholder="Brief description of this field"
                  />
                </div>
                <Button onClick={handleCreateLabel} disabled={createLabelMutation.isPending} className="w-full">
                  Create Label
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!fieldLabels || fieldLabels.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No field labels configured. Click "Initialize Defaults" to create default labels, or "Add Custom Label" to create your own.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Custom field labels only work for fields that actually exist in the forms. If you see labels that don't appear in the system, they may be for fields that don't exist. Use the dropdowns when creating new labels to ensure they work properly.
            </AlertDescription>
          </Alert>
          
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Available Fields by Section:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(availableFields).map(([section, fields]) => (
                <Card key={section} className="p-4">
                  <h4 className="font-medium text-sm uppercase text-gray-600 mb-2">
                    {section} Fields
                  </h4>
                  <div className="space-y-1">
                    {fields.slice(0, 5).map((field) => (
                      <div key={field.name} className="text-xs text-gray-500">
                        <code className="bg-gray-100 px-1 py-0.5 rounded">{field.name}</code> - {field.label}
                      </div>
                    ))}
                    {fields.length > 5 && (
                      <div className="text-xs text-gray-400">+{fields.length - 5} more...</div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
      
      {fieldLabels && fieldLabels.length > 0 && (
        <Tabs defaultValue="employee" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            {sections.map((section) => (
              <TabsTrigger key={section.key} value={section.key}>
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {sections.map((section) => (
            <TabsContent key={section.key} value={section.key} className="space-y-4">
              <div className="grid gap-4">
                {groupedLabels[section.key]?.map((label: FieldLabel) => (
                  <Card key={label.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{label.displayLabel}</CardTitle>
                          <CardDescription>
                            Field: <code className="bg-muted px-1 py-0.5 rounded">{label.fieldName}</code>
                            {label.description && ` • ${label.description}`}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={label.isRequired ? "destructive" : "secondary"}>
                            {label.isRequired ? "Required" : "Optional"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingLabel(label);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLabel(label.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    No labels configured for this section
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Field Label</DialogTitle>
          </DialogHeader>
          {editingLabel && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editFieldName">Field Name</Label>
                <Input
                  id="editFieldName"
                  value={editingLabel.fieldName}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="editDisplayLabel">Display Label</Label>
                <Input
                  id="editDisplayLabel"
                  value={editingLabel.displayLabel}
                  onChange={(e) => setEditingLabel({ ...editingLabel, displayLabel: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Input
                  id="editDescription"
                  value={editingLabel.description || ''}
                  onChange={(e) => setEditingLabel({ ...editingLabel, description: e.target.value })}
                />
              </div>
              <Button onClick={handleUpdateLabel} disabled={updateLabelMutation.isPending} className="w-full">
                Update Label
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}