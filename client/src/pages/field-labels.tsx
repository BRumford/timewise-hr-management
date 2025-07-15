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
import { AlertCircle, Settings, Plus, Edit2, Trash2, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FieldLabel {
  id: number;
  fieldName: string;
  displayLabel: string;
  section: string;
  description?: string;
  isCustom: boolean;
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
      ...newLabel,
      isCustom: true,
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
    if (!acc[label.section]) {
      acc[label.section] = [];
    }
    acc[label.section].push(label);
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
                  <Label htmlFor="fieldName">Field Name</Label>
                  <Input
                    id="fieldName"
                    value={newLabel.fieldName}
                    onChange={(e) => setNewLabel({ ...newLabel, fieldName: e.target.value })}
                    placeholder="e.g., employeeId, salary, department"
                  />
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
                <div>
                  <Label htmlFor="section">Section</Label>
                  <select
                    id="section"
                    value={newLabel.section}
                    onChange={(e) => setNewLabel({ ...newLabel, section: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="employee">Employee Fields</option>
                    <option value="payroll">Payroll Fields</option>
                    <option value="leave">Leave Fields</option>
                    <option value="timecard">Timecard Fields</option>
                    <option value="onboarding">Onboarding Fields</option>
                  </select>
                </div>
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
                          <Badge variant={label.isCustom ? "default" : "secondary"}>
                            {label.isCustom ? "Custom" : "Default"}
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
                          {label.isCustom && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLabel(label.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
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