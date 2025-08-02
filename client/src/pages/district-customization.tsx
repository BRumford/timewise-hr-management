import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Settings, Plus, Edit2, Trash2, RotateCcw, Info, Save, Palette, Type, Layout, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAllCustomFields, useCustomFields, useUpdateCustomField, useCreateCustomField, useDeleteCustomField } from '@/hooks/useCustomFields';

interface CustomField {
  id: number;
  districtId: number;
  fieldName: string;
  originalFieldName: string;
  displayLabel: string;
  description?: string;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  isVisible: boolean;
  isEditable: boolean;
  category: string;
  section: string;
  displayOrder: number;
  fieldType: string;
  validationRules: any;
  options: any[];
  defaultValue?: string;
  maxLength?: number;
  minLength?: number;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function DistrictCustomization() {
  const [selectedCategory, setSelectedCategory] = useState('employee');
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const districtId = 1; // Get from auth context in real implementation

  // Fetch all custom fields for the district
  const { data: allFields, isLoading } = useAllCustomFields(districtId);
  
  // Fetch fields for selected category
  const { data: categoryFields } = useCustomFields(selectedCategory, districtId);

  // Mutations
  const updateFieldMutation = useUpdateCustomField();
  const createFieldMutation = useCreateCustomField();
  const deleteFieldMutation = useDeleteCustomField();

  // All available categories with comprehensive field sets
  const categories = {
    employee: {
      name: 'Employee Information',
      icon: Users,
      description: 'Personal and employment data fields',
      defaultFields: [
        { name: 'firstName', label: 'First Name', type: 'text', required: true },
        { name: 'lastName', label: 'Last Name', type: 'text', required: true },
        { name: 'email', label: 'Email Address', type: 'email', required: true },
        { name: 'phoneNumber', label: 'Phone Number', type: 'text' },
        { name: 'address', label: 'Home Address', type: 'textarea' },
        { name: 'department', label: 'Department', type: 'dropdown' },
        { name: 'position', label: 'Job Position', type: 'text' },
        { name: 'employeeType', label: 'Employee Type', type: 'dropdown' },
        { name: 'hireDate', label: 'Hire Date', type: 'date', required: true },
        { name: 'salary', label: 'Annual Salary', type: 'number' },
        { name: 'payGrade', label: 'Pay Grade', type: 'text' },
        { name: 'educationLevel', label: 'Education Level', type: 'dropdown' },
        { name: 'certifications', label: 'Certifications', type: 'textarea' },
        { name: 'status', label: 'Employment Status', type: 'dropdown' },
        { name: 'supervisorId', label: 'Supervisor', type: 'dropdown' },
        { name: 'emergencyContact', label: 'Emergency Contact', type: 'text' },
        { name: 'emergencyPhone', label: 'Emergency Phone', type: 'text' }
      ]
    },
    timecard: {
      name: 'Timecard Management',
      icon: Type,
      description: 'Time tracking and approval fields',
      defaultFields: [
        { name: 'date', label: 'Work Date', type: 'date', required: true },
        { name: 'clockIn', label: 'Clock In Time', type: 'time' },
        { name: 'clockOut', label: 'Clock Out Time', type: 'time' },
        { name: 'breakStart', label: 'Break Start', type: 'time' },
        { name: 'breakEnd', label: 'Break End', type: 'time' },
        { name: 'lunchStart', label: 'Lunch Start', type: 'time' },
        { name: 'lunchEnd', label: 'Lunch End', type: 'time' },
        { name: 'totalHours', label: 'Total Hours', type: 'number' },
        { name: 'regularHours', label: 'Regular Hours', type: 'number' },
        { name: 'overtimeHours', label: 'Overtime Hours', type: 'number' },
        { name: 'notes', label: 'Work Notes', type: 'textarea' },
        { name: 'status', label: 'Approval Status', type: 'dropdown' },
        { name: 'payrollPeriod', label: 'Pay Period', type: 'text' },
        { name: 'approvedBy', label: 'Approved By', type: 'text' }
      ]
    },
    leave: {
      name: 'Leave Management',
      icon: Layout,
      description: 'Leave request and approval fields',
      defaultFields: [
        { name: 'leaveType', label: 'Leave Type', type: 'dropdown', required: true },
        { name: 'startDate', label: 'Start Date', type: 'date', required: true },
        { name: 'endDate', label: 'End Date', type: 'date', required: true },
        { name: 'totalDays', label: 'Total Days', type: 'number' },
        { name: 'reason', label: 'Leave Reason', type: 'textarea' },
        { name: 'status', label: 'Request Status', type: 'dropdown' },
        { name: 'approvedBy', label: 'Approved By', type: 'text' },
        { name: 'substituteName', label: 'Substitute Teacher', type: 'text' },
        { name: 'substituteRequired', label: 'Substitute Required', type: 'checkbox' },
        { name: 'medicalCertification', label: 'Medical Certification', type: 'checkbox' },
        { name: 'returnDate', label: 'Return Date', type: 'date' },
        { name: 'workRestrictions', label: 'Work Restrictions', type: 'textarea' }
      ]
    },
    payroll: {
      name: 'Payroll Processing',
      icon: Palette,
      description: 'Payroll calculation and deduction fields',
      defaultFields: [
        { name: 'payPeriod', label: 'Pay Period', type: 'text', required: true },
        { name: 'regularHours', label: 'Regular Hours', type: 'number' },
        { name: 'overtimeHours', label: 'Overtime Hours', type: 'number' },
        { name: 'grossPay', label: 'Gross Pay', type: 'number' },
        { name: 'netPay', label: 'Net Pay', type: 'number' },
        { name: 'federalTax', label: 'Federal Tax', type: 'number' },
        { name: 'stateTax', label: 'State Tax', type: 'number' },
        { name: 'socialSecurity', label: 'Social Security', type: 'number' },
        { name: 'medicare', label: 'Medicare Tax', type: 'number' },
        { name: 'healthInsurance', label: 'Health Insurance', type: 'number' },
        { name: 'dentalInsurance', label: 'Dental Insurance', type: 'number' },
        { name: 'retirement', label: 'Retirement', type: 'number' },
        { name: 'otherDeductions', label: 'Other Deductions', type: 'number' }
      ]
    },
    onboarding: {
      name: 'Onboarding Process',
      icon: Settings,
      description: 'New employee onboarding workflow fields',
      defaultFields: [
        { name: 'workflowName', label: 'Workflow Name', type: 'text', required: true },
        { name: 'status', label: 'Workflow Status', type: 'dropdown' },
        { name: 'startDate', label: 'Start Date', type: 'date' },
        { name: 'expectedCompletionDate', label: 'Expected Completion', type: 'date' },
        { name: 'actualCompletionDate', label: 'Actual Completion', type: 'date' },
        { name: 'assignedTo', label: 'Assigned To', type: 'dropdown' },
        { name: 'currentStep', label: 'Current Step', type: 'text' },
        { name: 'totalSteps', label: 'Total Steps', type: 'number' },
        { name: 'completedSteps', label: 'Completed Steps', type: 'number' },
        { name: 'notes', label: 'Onboarding Notes', type: 'textarea' },
        { name: 'documents', label: 'Required Documents', type: 'textarea' }
      ]
    }
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setIsEditDialogOpen(true);
  };

  const handleSaveField = async (fieldData: Partial<CustomField>) => {
    try {
      if (editingField) {
        await updateFieldMutation.mutateAsync({ id: editingField.id, ...fieldData });
        toast({ title: "Field updated successfully" });
      } else {
        await createFieldMutation.mutateAsync({
          ...fieldData,
          districtId,
          category: selectedCategory,
          section: 'main',
          displayOrder: 0,
          createdBy: 'current_user' // Replace with actual user
        } as any);
        toast({ title: "Field created successfully" });
      }
      setIsEditDialogOpen(false);
      setIsCreateDialogOpen(false);
      setEditingField(null);
    } catch (error) {
      toast({ 
        title: "Error saving field", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    }
  };

  const handleDeleteField = async (fieldId: number) => {
    try {
      await deleteFieldMutation.mutateAsync(fieldId);
      toast({ title: "Field deleted successfully" });
    } catch (error) {
      toast({ 
        title: "Error deleting field", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    }
  };

  const CategoryIcon = categories[selectedCategory as keyof typeof categories]?.icon || Settings;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading customization options...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">District Field Customization</h1>
          <p className="text-muted-foreground mt-2">
            Customize all field labels, forms, and system configurations for your district
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Customize field labels, validation rules, and form layouts to match your district's specific terminology and requirements.
          Changes will apply to all new forms and can be retroactively applied to existing data.
        </AlertDescription>
      </Alert>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          {Object.entries(categories).map(([key, category]) => {
            const Icon = category.icon;
            return (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {category.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(categories).map(([categoryKey, category]) => (
          <TabsContent key={categoryKey} value={categoryKey} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CategoryIcon className="h-6 w-6" />
                    <div>
                      <CardTitle>{category.name}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Custom Field
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {categoryFields?.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No custom fields configured for this category.</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Add custom fields to override default labels and behavior.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {categoryFields?.map((field) => (
                        <Card key={field.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div>
                                  <h4 className="font-medium">{field.displayLabel}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Field: {field.fieldName} • Type: {field.fieldType}
                                  </p>
                                  {field.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {field.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {field.isRequired && (
                                    <Badge variant="destructive">Required</Badge>
                                  )}
                                  {!field.isVisible && (
                                    <Badge variant="secondary">Hidden</Badge>
                                  )}
                                  {!field.isEditable && (
                                    <Badge variant="outline">Read-only</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditField(field)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteField(field.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Show default fields that can be customized */}
                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-4">Available Default Fields</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {category.defaultFields.map((defaultField) => {
                        const isCustomized = categoryFields?.some(
                          (field) => field.originalFieldName === defaultField.name
                        );
                        
                        return (
                          <Card key={defaultField.name} className={`p-3 ${isCustomized ? 'bg-muted' : ''}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium">{defaultField.label}</h5>
                                <p className="text-sm text-muted-foreground">
                                  {defaultField.name} • {defaultField.type}
                                </p>
                                {defaultField.required && (
                                  <Badge variant="outline" className="mt-1">Required</Badge>
                                )}
                              </div>
                              {isCustomized ? (
                                <Badge variant="default">Customized</Badge>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingField({
                                      originalFieldName: defaultField.name,
                                      fieldName: defaultField.name,
                                      displayLabel: defaultField.label,
                                      fieldType: defaultField.type,
                                      isRequired: defaultField.required || false,
                                      isVisible: true,
                                      isEditable: true,
                                      category: selectedCategory,
                                      section: 'main',
                                      displayOrder: 0
                                    } as CustomField);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  Customize
                                </Button>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit/Create Field Dialog */}
      <Dialog open={isEditDialogOpen || isCreateDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        setIsCreateDialogOpen(open);
        if (!open) setEditingField(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingField?.id ? 'Edit Field' : 'Create Custom Field'}
            </DialogTitle>
            <DialogDescription>
              Configure the field properties, validation rules, and display options.
            </DialogDescription>
          </DialogHeader>
          
          {editingField && (
            <CustomFieldForm
              field={editingField}
              onSave={handleSaveField}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setIsCreateDialogOpen(false);
                setEditingField(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Custom Field Form Component
function CustomFieldForm({ 
  field, 
  onSave, 
  onCancel 
}: { 
  field: CustomField; 
  onSave: (data: Partial<CustomField>) => void; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState(field);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="displayLabel">Display Label</Label>
          <Input
            id="displayLabel"
            value={formData.displayLabel}
            onChange={(e) => setFormData({ ...formData, displayLabel: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="fieldName">Field Name</Label>
          <Input
            id="fieldName"
            value={formData.fieldName}
            onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description for this field"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="placeholder">Placeholder Text</Label>
          <Input
            id="placeholder"
            value={formData.placeholder || ''}
            onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
            placeholder="Enter placeholder text"
          />
        </div>
        <div>
          <Label htmlFor="fieldType">Field Type</Label>
          <Select 
            value={formData.fieldType} 
            onValueChange={(value) => setFormData({ ...formData, fieldType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="time">Time</SelectItem>
              <SelectItem value="textarea">Textarea</SelectItem>
              <SelectItem value="dropdown">Dropdown</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="helpText">Help Text</Label>
        <Textarea
          id="helpText"
          value={formData.helpText || ''}
          onChange={(e) => setFormData({ ...formData, helpText: e.target.value })}
          placeholder="Additional help text for users"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="isRequired"
            checked={formData.isRequired}
            onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
          />
          <Label htmlFor="isRequired">Required</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="isVisible"
            checked={formData.isVisible}
            onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
          />
          <Label htmlFor="isVisible">Visible</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="isEditable"
            checked={formData.isEditable}
            onCheckedChange={(checked) => setFormData({ ...formData, isEditable: checked })}
          />
          <Label htmlFor="isEditable">Editable</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Save Field
        </Button>
      </div>
    </form>
  );
}