import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit2, Trash2, Save, X, Eye, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

interface TimecardTemplate {
  id: number;
  name: string;
  description: string;
  employeeType: string;
  isActive: boolean;
  isDefault: boolean;
  approvalWorkflow: string[];
  settings: any;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

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
  createdAt: string;
  updatedAt: string;
}

const fieldTypes = [
  { value: "text", label: "Text Input" },
  { value: "number", label: "Number Input" },
  { value: "date", label: "Date Picker" },
  { value: "time", label: "Time Picker" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "textarea", label: "Text Area" },
  { value: "radio", label: "Radio Buttons" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone Number" },
];

const sections = [
  { value: "general", label: "General Information" },
  { value: "time_tracking", label: "Time Tracking" },
  { value: "breaks", label: "Breaks & Lunch" },
  { value: "overtime", label: "Overtime" },
  { value: "leave", label: "Leave Time" },
  { value: "approval", label: "Approval" },
  { value: "notes", label: "Notes" },
];

const employeeTypes = [
  { value: "certificated", label: "Certificated" },
  { value: "classified", label: "Classified" },
  { value: "substitute", label: "Substitute" },
];

export default function TimecardTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<TimecardTemplate | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<TimecardTemplate>>({});
  const [editingField, setEditingField] = useState<Partial<TimecardTemplateField>>({});
  const [previewMode, setPreviewMode] = useState(false);

  // Fetch timecard templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/timecard-templates'],
    retry: false,
  });

  // Fetch fields for selected template
  const { data: templateFields = [] } = useQuery({
    queryKey: ['/api/timecard-template-fields', selectedTemplate?.id],
    queryFn: selectedTemplate?.id ? () => 
      fetch(`/api/timecard-template-fields/${selectedTemplate.id}`)
        .then(res => res.json()) : undefined,
    enabled: !!selectedTemplate?.id,
    retry: false,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/timecard-templates`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timecard-templates'] });
      setShowTemplateDialog(false);
      setEditingTemplate({});
      toast({ title: "Success", description: "Template created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to create template: ${error.message}`, variant: "destructive" });
    }
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/timecard-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timecard-templates'] });
      setShowTemplateDialog(false);
      setEditingTemplate({});
      toast({ title: "Success", description: "Template updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to update template: ${error.message}`, variant: "destructive" });
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/timecard-templates/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timecard-templates'] });
      toast({ title: "Success", description: "Template deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to delete template: ${error.message}`, variant: "destructive" });
    }
  });

  // Create field mutation
  const createFieldMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/timecard-template-fields`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timecard-template-fields', selectedTemplate?.id] });
      setShowFieldDialog(false);
      setEditingField({});
      toast({ title: "Success", description: "Field created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to create field: ${error.message}`, variant: "destructive" });
    }
  });

  // Update field mutation
  const updateFieldMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/timecard-template-fields/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timecard-template-fields', selectedTemplate?.id] });
      setShowFieldDialog(false);
      setEditingField({});
      toast({ title: "Success", description: "Field updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to update field: ${error.message}`, variant: "destructive" });
    }
  });

  // Delete field mutation
  const deleteFieldMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/timecard-template-fields/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timecard-template-fields', selectedTemplate?.id] });
      toast({ title: "Success", description: "Field deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to delete field: ${error.message}`, variant: "destructive" });
    }
  });

  const handleCreateTemplate = () => {
    const templateData = {
      ...editingTemplate,
      createdBy: "Admin", // In real app, get from auth context
      approvalWorkflow: editingTemplate.approvalWorkflow || [],
      settings: editingTemplate.settings || {},
    };
    createTemplateMutation.mutate(templateData);
  };

  const handleUpdateTemplate = () => {
    if (!selectedTemplate) return;
    updateTemplateMutation.mutate({ id: selectedTemplate.id, data: editingTemplate });
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleCreateField = () => {
    if (!selectedTemplate) return;
    const fieldData = {
      ...editingField,
      templateId: selectedTemplate.id,
      fieldOptions: editingField.fieldOptions || {},
      validationRules: editingField.validationRules || {},
      displayOrder: editingField.displayOrder || templateFields.length,
    };
    createFieldMutation.mutate(fieldData);
  };

  const handleUpdateField = () => {
    if (!editingField.id) return;
    updateFieldMutation.mutate({ id: editingField.id, data: editingField });
  };

  const handleDeleteField = (id: number) => {
    if (confirm('Are you sure you want to delete this field?')) {
      deleteFieldMutation.mutate(id);
    }
  };

  const groupedFields = templateFields.reduce((acc: any, field: TimecardTemplateField) => {
    if (!acc[field.section]) {
      acc[field.section] = [];
    }
    acc[field.section].push(field);
    return acc;
  }, {});

  const renderFieldPreview = (field: TimecardTemplateField) => {
    const commonProps = {
      className: "w-full",
      placeholder: field.fieldLabel,
      required: field.isRequired,
      disabled: field.isReadOnly,
    };

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'phone':
        return <Input {...commonProps} type={field.fieldType} />;
      case 'number':
        return <Input {...commonProps} type="number" />;
      case 'date':
        return <Input {...commonProps} type="date" />;
      case 'time':
        return <Input {...commonProps} type="time" />;
      case 'textarea':
        return <Textarea {...commonProps} rows={3} />;
      case 'checkbox':
        return <div className="flex items-center space-x-2">
          <Switch disabled={field.isReadOnly} />
          <Label>{field.fieldLabel}</Label>
        </div>;
      case 'dropdown':
        return (
          <Select disabled={field.isReadOnly}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.fieldLabel}`} />
            </SelectTrigger>
            <SelectContent>
              {field.fieldOptions?.options?.map((option: any, index: number) => (
                <SelectItem key={index} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return <Input {...commonProps} />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Timecard Templates</h1>
          <p className="text-gray-600">Design custom timecard layouts for different employee types</p>
        </div>
        <Button onClick={() => {
          setEditingTemplate({});
          setShowTemplateDialog(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          {selectedTemplate && (
            <TabsTrigger value="design">Design Fields</TabsTrigger>
          )}
          {selectedTemplate && (
            <TabsTrigger value="preview">Preview</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template: TimecardTemplate) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {template.isDefault && (
                        <Badge variant="outline">Default</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      <p><strong>Employee Type:</strong> {template.employeeType}</p>
                      <p><strong>Created:</strong> {new Date(template.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {selectedTemplate && (
          <TabsContent value="design">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Design Fields for {selectedTemplate.name}</h2>
                  <p className="text-gray-600">Add and configure fields for your timecard template</p>
                </div>
                <Button onClick={() => {
                  setEditingField({});
                  setShowFieldDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-6">
                {sections.map((section) => (
                  <div key={section.value}>
                    <h3 className="text-lg font-medium mb-3">{section.label}</h3>
                    <div className="space-y-2">
                      {groupedFields[section.value]?.map((field: TimecardTemplateField) => (
                        <Card key={field.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{field.fieldLabel}</span>
                                <Badge variant="secondary">{field.fieldType}</Badge>
                                {field.isRequired && <Badge variant="destructive">Required</Badge>}
                                {field.isReadOnly && <Badge variant="outline">Read Only</Badge>}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">Field Name: {field.fieldName}</p>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingField(field);
                                  setShowFieldDialog(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteField(field.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                      {!groupedFields[section.value]?.length && (
                        <div className="text-center py-8 text-gray-500">
                          No fields in this section
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        )}

        {selectedTemplate && (
          <TabsContent value="preview">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Preview: {selectedTemplate.name}</h2>
                  <p className="text-gray-600">This is how the timecard will look for users</p>
                </div>
              </div>

              <Card className="max-w-4xl mx-auto">
                <CardHeader>
                  <CardTitle>Timecard - {selectedTemplate.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {sections.map((section) => (
                    groupedFields[section.value]?.length > 0 && (
                      <div key={section.value}>
                        <h3 className="text-lg font-medium mb-3">{section.label}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {groupedFields[section.value]?.map((field: TimecardTemplateField) => (
                            <div key={field.id} className="space-y-2">
                              <Label htmlFor={field.fieldName}>
                                {field.fieldLabel}
                                {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                              {renderFieldPreview(field)}
                            </div>
                          ))}
                        </div>
                        <Separator className="mt-4" />
                      </div>
                    )
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate.id ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={editingTemplate.name || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="Enter template name"
                />
              </div>
              <div>
                <Label htmlFor="employeeType">Employee Type</Label>
                <Select
                  value={editingTemplate.employeeType || ''}
                  onValueChange={(value) => setEditingTemplate({ ...editingTemplate, employeeType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee type" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingTemplate.description || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                placeholder="Enter template description"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={editingTemplate.isActive ?? true}
                  onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isDefault"
                  checked={editingTemplate.isDefault ?? false}
                  onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, isDefault: checked })}
                />
                <Label htmlFor="isDefault">Default Template</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={editingTemplate.id ? handleUpdateTemplate : handleCreateTemplate}>
                {editingTemplate.id ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Field Dialog */}
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingField.id ? 'Edit Field' : 'Create Field'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fieldName">Field Name</Label>
                <Input
                  id="fieldName"
                  value={editingField.fieldName || ''}
                  onChange={(e) => setEditingField({ ...editingField, fieldName: e.target.value })}
                  placeholder="e.g., employeeId, clockInTime"
                />
              </div>
              <div>
                <Label htmlFor="fieldLabel">Field Label</Label>
                <Input
                  id="fieldLabel"
                  value={editingField.fieldLabel || ''}
                  onChange={(e) => setEditingField({ ...editingField, fieldLabel: e.target.value })}
                  placeholder="e.g., Employee ID, Clock In Time"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fieldType">Field Type</Label>
                <Select
                  value={editingField.fieldType || ''}
                  onValueChange={(value) => setEditingField({ ...editingField, fieldType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="section">Section</Label>
                <Select
                  value={editingField.section || ''}
                  onValueChange={(value) => setEditingField({ ...editingField, section: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.value} value={section.value}>
                        {section.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isRequired"
                  checked={editingField.isRequired ?? false}
                  onCheckedChange={(checked) => setEditingField({ ...editingField, isRequired: checked })}
                />
                <Label htmlFor="isRequired">Required</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isReadOnly"
                  checked={editingField.isReadOnly ?? false}
                  onCheckedChange={(checked) => setEditingField({ ...editingField, isReadOnly: checked })}
                />
                <Label htmlFor="isReadOnly">Read Only</Label>
              </div>
            </div>
            <div>
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={editingField.displayOrder || 0}
                onChange={(e) => setEditingField({ ...editingField, displayOrder: parseInt(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowFieldDialog(false)}>
                Cancel
              </Button>
              <Button onClick={editingField.id ? handleUpdateField : handleCreateField}>
                {editingField.id ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}