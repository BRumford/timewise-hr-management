import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Workflow
} from "lucide-react";

interface District {
  id: number;
  name: string;
  slug: string;
  subscriptionTier: string;
  subscriptionStatus: string;
}

interface DistrictWorkflow {
  id: number;
  districtId: number;
  name: string;
  description: string;
  workflowType: string;
  configuration: any;
  isActive: boolean;
  createdBy: string;
  lastModifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowExecution {
  id: number;
  workflowId: number;
  districtId: number;
  status: string;
  startedAt: string;
  completedAt?: string;
  executedBy: string;
  result?: any;
  errorMessage?: string;
}

export default function WorkflowManagement() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [workflows, setWorkflows] = useState<DistrictWorkflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<DistrictWorkflow | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    workflowType: "",
    districtId: "",
    configuration: "{}"
  });

  useEffect(() => {
    fetchDistricts();
    fetchWorkflows();
    fetchExecutions();
  }, []);

  useEffect(() => {
    if (selectedDistrict) {
      fetchWorkflows(parseInt(selectedDistrict));
      fetchExecutions(parseInt(selectedDistrict));
    }
  }, [selectedDistrict]);

  const fetchDistricts = async () => {
    try {
      const response = await fetch('/api/system-owner/districts');
      const data = await response.json();
      setDistricts(data);
    } catch (error) {
      console.error('Error fetching districts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch districts",
        variant: "destructive",
      });
    }
  };

  const fetchWorkflows = async (districtId?: number) => {
    try {
      const url = districtId 
        ? `/api/system-owner/workflows?districtId=${districtId}`
        : '/api/system-owner/workflows';
      const response = await fetch(url);
      const data = await response.json();
      setWorkflows(data);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast({
        title: "Error",
        description: "Failed to fetch workflows",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async (districtId?: number) => {
    try {
      const url = districtId 
        ? `/api/system-owner/workflow-executions?districtId=${districtId}`
        : '/api/system-owner/workflow-executions';
      const response = await fetch(url);
      const data = await response.json();
      setExecutions(data);
    } catch (error) {
      console.error('Error fetching executions:', error);
    }
  };

  const handleCreateWorkflow = async () => {
    try {
      const response = await fetch('/api/system-owner/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          districtId: parseInt(formData.districtId),
          configuration: JSON.parse(formData.configuration || '{}')
        })
      });

      if (response.ok) {
        const workflow = await response.json();
        setWorkflows([...workflows, workflow]);
        setShowCreateDialog(false);
        resetForm();
        toast({
          title: "Success",
          description: "Workflow created successfully",
        });
      } else {
        throw new Error('Failed to create workflow');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create workflow",
        variant: "destructive",
      });
    }
  };

  const handleUpdateWorkflow = async () => {
    if (!editingWorkflow) return;

    try {
      const response = await fetch(`/api/system-owner/workflows/${editingWorkflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          districtId: parseInt(formData.districtId),
          configuration: JSON.parse(formData.configuration || '{}')
        })
      });

      if (response.ok) {
        const updatedWorkflow = await response.json();
        setWorkflows(workflows.map(w => w.id === updatedWorkflow.id ? updatedWorkflow : w));
        setEditingWorkflow(null);
        resetForm();
        toast({
          title: "Success",
          description: "Workflow updated successfully",
        });
      } else {
        throw new Error('Failed to update workflow');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update workflow",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWorkflow = async (workflowId: number) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      const response = await fetch(`/api/system-owner/workflows/${workflowId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setWorkflows(workflows.filter(w => w.id !== workflowId));
        toast({
          title: "Success",
          description: "Workflow deleted successfully",
        });
      } else {
        throw new Error('Failed to delete workflow');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete workflow",
        variant: "destructive",
      });
    }
  };

  const handleExecuteWorkflow = async (workflowId: number, districtId: number) => {
    try {
      const response = await fetch('/api/system-owner/workflow-executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          districtId,
          status: 'running'
        })
      });

      if (response.ok) {
        const execution = await response.json();
        setExecutions([execution, ...executions]);
        toast({
          title: "Success",
          description: "Workflow execution started",
        });
      } else {
        throw new Error('Failed to execute workflow');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute workflow",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      workflowType: "",
      districtId: "",
      configuration: "{}"
    });
  };

  const openEditDialog = (workflow: DistrictWorkflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name,
      description: workflow.description,
      workflowType: workflow.workflowType,
      districtId: workflow.districtId.toString(),
      configuration: JSON.stringify(workflow.configuration, null, 2)
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-600" />;
      default: return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'running': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflow management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/system-owner/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="border-l border-gray-300 h-6"></div>
              <Workflow className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                Workflow Management
              </h1>
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workflow
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Workflow</DialogTitle>
                  <DialogDescription>
                    Create a custom workflow for a specific district
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Workflow Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter workflow name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Workflow Type</Label>
                      <Select
                        value={formData.workflowType}
                        onValueChange={(value) => setFormData({ ...formData, workflowType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="onboarding">Employee Onboarding</SelectItem>
                          <SelectItem value="payroll">Payroll Processing</SelectItem>
                          <SelectItem value="compliance">Compliance Check</SelectItem>
                          <SelectItem value="reporting">Automated Reporting</SelectItem>
                          <SelectItem value="custom">Custom Workflow</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">Target District</Label>
                    <Select
                      value={formData.districtId}
                      onValueChange={(value) => setFormData({ ...formData, districtId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((district) => (
                          <SelectItem key={district.id} value={district.id.toString()}>
                            {district.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what this workflow does"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="configuration">Configuration (JSON)</Label>
                    <Textarea
                      id="configuration"
                      value={formData.configuration}
                      onChange={(e) => setFormData({ ...formData, configuration: e.target.value })}
                      placeholder='{"steps": [], "settings": {}}'
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateWorkflow}>
                    Create Workflow
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6">
          <div className="flex gap-4 items-center">
            <div className="w-64">
              <Label htmlFor="district-filter">Filter by District</Label>
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger>
                  <SelectValue placeholder="All districts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Districts</SelectItem>
                  {districts.map((district) => (
                    <SelectItem key={district.id} value={district.id.toString()}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Workflows Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>District Workflows</CardTitle>
            <CardDescription>
              Manage and execute custom workflows for each district
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Workflow</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">District</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Last Modified</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.map((workflow) => {
                    const district = districts.find(d => d.id === workflow.districtId);
                    return (
                      <tr key={workflow.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{workflow.name}</p>
                            <p className="text-sm text-gray-600">{workflow.description}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-900">{district?.name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{workflow.workflowType}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={workflow.isActive ? 'default' : 'secondary'}>
                            {workflow.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-600">
                            {new Date(workflow.updatedAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExecuteWorkflow(workflow.id, workflow.districtId)}
                              disabled={!workflow.isActive}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Execute
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(workflow)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteWorkflow(workflow.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Executions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Workflow Executions</CardTitle>
            <CardDescription>
              Monitor the status and results of workflow executions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Workflow</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">District</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Started</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Duration</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Executed By</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((execution) => {
                    const workflow = workflows.find(w => w.id === execution.workflowId);
                    const district = districts.find(d => d.id === execution.districtId);
                    const duration = execution.completedAt 
                      ? Math.round((new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000)
                      : null;

                    return (
                      <tr key={execution.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-900">{workflow?.name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-900">{district?.name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(execution.status)}
                            <Badge variant={getStatusBadgeVariant(execution.status)}>
                              {execution.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-600">
                            {new Date(execution.startedAt).toLocaleString()}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-600">
                            {duration ? `${duration}s` : '-'}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-600">{execution.executedBy}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editingWorkflow !== null} onOpenChange={() => setEditingWorkflow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
            <DialogDescription>
              Update workflow configuration and settings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Workflow Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter workflow name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Workflow Type</Label>
                <Select
                  value={formData.workflowType}
                  onValueChange={(value) => setFormData({ ...formData, workflowType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onboarding">Employee Onboarding</SelectItem>
                    <SelectItem value="payroll">Payroll Processing</SelectItem>
                    <SelectItem value="compliance">Compliance Check</SelectItem>
                    <SelectItem value="reporting">Automated Reporting</SelectItem>
                    <SelectItem value="custom">Custom Workflow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-district">Target District</Label>
              <Select
                value={formData.districtId}
                onValueChange={(value) => setFormData({ ...formData, districtId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((district) => (
                    <SelectItem key={district.id} value={district.id.toString()}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this workflow does"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-configuration">Configuration (JSON)</Label>
              <Textarea
                id="edit-configuration"
                value={formData.configuration}
                onChange={(e) => setFormData({ ...formData, configuration: e.target.value })}
                placeholder='{"steps": [], "settings": {}}'
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingWorkflow(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateWorkflow}>
              Update Workflow
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}