import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download,
  Upload,
  Settings,
  AlertCircle,
  Info,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  History,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Bell,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';

interface SecurityUpdate {
  id: number;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'security_patch' | 'vulnerability' | 'policy_update' | 'compliance';
  version?: string;
  affectedSystems: string[];
  status: 'pending' | 'testing' | 'approved' | 'deployed' | 'failed';
  requiresApproval: boolean;
  requiresDowntime: boolean;
  estimatedDowntime?: number;
  scheduledFor?: string;
  releasedAt: string;
  approvedAt?: string;
  deployedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface SecurityNotification {
  id: number;
  title: string;
  message: string;
  type: 'alert' | 'warning' | 'info' | 'update';
  severity: 'low' | 'medium' | 'high' | 'critical';
  targetAudience: 'all' | 'admins' | 'hr' | 'employees';
  isActive: boolean;
  isDismissible: boolean;
  expiresAt?: string;
  createdAt: string;
}

interface VulnerabilityAssessment {
  id: number;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cvssScore?: number;
  affectedSystems: string[];
  status: 'open' | 'investigating' | 'patched' | 'closed';
  riskLevel: string;
  discoveredAt: string;
  resolvedAt?: string;
}

export default function SecurityUpdates() {
  const [selectedTab, setSelectedTab] = useState('updates');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createUpdateOpen, setCreateUpdateOpen] = useState(false);
  const [createNotificationOpen, setCreateNotificationOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch security updates
  const { data: updates = [], isLoading: updatesLoading } = useQuery<SecurityUpdate[]>({
    queryKey: ['/api/security/updates', selectedSeverity, selectedStatus, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSeverity !== 'all') params.append('severity', selectedSeverity);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (searchQuery) params.append('search', searchQuery);
      return await apiRequest(`/api/security/updates?${params.toString()}`);
    },
  });

  // Fetch security notifications
  const { data: notifications = [] } = useQuery<SecurityNotification[]>({
    queryKey: ['/api/security/notifications'],
  });

  // Fetch vulnerability assessments
  const { data: vulnerabilities = [] } = useQuery<VulnerabilityAssessment[]>({
    queryKey: ['/api/security/vulnerabilities'],
  });

  // Create update mutation
  const createUpdateMutation = useMutation({
    mutationFn: async (updateData: Partial<SecurityUpdate>) => {
      return await apiRequest('/api/security/updates', 'POST', updateData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Security update created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/security/updates'] });
      setCreateUpdateOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create security update",
        variant: "destructive",
      });
    },
  });

  // Create notification mutation
  const createNotificationMutation = useMutation({
    mutationFn: async (notificationData: Partial<SecurityNotification>) => {
      return await apiRequest('/api/security/notifications', 'POST', notificationData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Security notification created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/security/notifications'] });
      setCreateNotificationOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create security notification",
        variant: "destructive",
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest(`/api/security/updates/${id}/status`, 'PATCH', { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Update status changed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/security/updates'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'testing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed': return <CheckCircle className="h-4 w-4" />;
      case 'approved': return <ThumbsUp className="h-4 w-4" />;
      case 'testing': return <Clock className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredUpdates = updates.filter(update => {
    const matchesSearch = !searchQuery || 
      update.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      update.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = selectedSeverity === 'all' || update.severity === selectedSeverity;
    const matchesStatus = selectedStatus === 'all' || update.status === selectedStatus;
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  if (updatesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Security Updates
          </h1>
          <p className="text-gray-600 mt-2">
            Manage security patches, vulnerabilities, and compliance updates
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createNotificationOpen} onOpenChange={setCreateNotificationOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Bell className="h-4 w-4 mr-2" />
                New Notification
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Security Notification</DialogTitle>
              </DialogHeader>
              <CreateNotificationForm 
                onSubmit={(data) => createNotificationMutation.mutate(data)}
                isLoading={createNotificationMutation.isPending}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={createUpdateOpen} onOpenChange={setCreateUpdateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Update
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Security Update</DialogTitle>
              </DialogHeader>
              <CreateUpdateForm 
                onSubmit={(data) => createUpdateMutation.mutate(data)}
                isLoading={createUpdateMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="updates">Security Updates</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="updates" className="space-y-6">
          {/* Active Notifications */}
          {notifications.filter(n => n.isActive).length > 0 && (
            <div className="space-y-2">
              {notifications.filter(n => n.isActive).map(notification => (
                <Alert key={notification.id} className={`${getSeverityColor(notification.severity)} border-l-4`}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{notification.title}</strong> - {notification.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search updates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="deployed">Deployed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Updates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUpdates.map((update) => (
              <Card key={update.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(update.severity)}>
                        {update.severity}
                      </Badge>
                      <Badge variant="outline">{update.category}</Badge>
                    </div>
                    <Badge className={getStatusColor(update.status)}>
                      {getStatusIcon(update.status)}
                      <span className="ml-1">{update.status}</span>
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{update.title}</CardTitle>
                  <CardDescription>
                    {update.description.substring(0, 120)}...
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {update.affectedSystems.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Affected Systems:</p>
                        <div className="flex flex-wrap gap-1">
                          {update.affectedSystems.slice(0, 3).map((system, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {system}
                            </Badge>
                          ))}
                          {update.affectedSystems.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{update.affectedSystems.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Released: {format(new Date(update.releasedAt), 'MMM d, yyyy')}</span>
                      {update.version && <span>v{update.version}</span>}
                    </div>
                    
                    {update.requiresDowntime && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Requires downtime: {update.estimatedDowntime || 'Unknown'} minutes
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {/* View details */}}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                      {update.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: update.id, status: 'approved' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                      )}
                      {update.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: update.id, status: 'deployed' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Deploy
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredUpdates.length === 0 && (
            <div className="text-center py-12">
              <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No security updates found</h3>
              <p className="text-gray-500">
                Try adjusting your search criteria or create a new security update.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications">
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card key={notification.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(notification.severity)}>
                        {notification.severity}
                      </Badge>
                      <Badge variant="outline">{notification.type}</Badge>
                      <Badge variant="outline">{notification.targetAudience}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {notification.isActive && (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      )}
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle>{notification.title}</CardTitle>
                  <CardDescription>{notification.message}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Created: {format(new Date(notification.createdAt), 'MMM d, yyyy')}</span>
                    {notification.expiresAt && (
                      <span>Expires: {format(new Date(notification.expiresAt), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="vulnerabilities">
          <div className="space-y-4">
            {vulnerabilities.map((vulnerability) => (
              <Card key={vulnerability.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(vulnerability.severity)}>
                        {vulnerability.severity}
                      </Badge>
                      <Badge variant="outline">{vulnerability.status}</Badge>
                      {vulnerability.cvssScore && (
                        <Badge variant="outline">CVSS: {vulnerability.cvssScore}</Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle>{vulnerability.title}</CardTitle>
                  <CardDescription>{vulnerability.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">Risk Level: {vulnerability.riskLevel}</p>
                      <p className="text-sm text-gray-600">
                        Discovered: {format(new Date(vulnerability.discoveredAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    
                    {vulnerability.affectedSystems.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Affected Systems:</p>
                        <div className="flex flex-wrap gap-1">
                          {vulnerability.affectedSystems.map((system, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {system}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="policies">
          <div className="text-center py-12">
            <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Security Policies</h3>
            <p className="text-gray-500">
              Security policy management will be available soon.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateUpdateForm({ 
  onSubmit, 
  isLoading 
}: { 
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    category: 'security_patch',
    version: '',
    affectedSystems: '',
    requiresApproval: true,
    requiresDowntime: false,
    estimatedDowntime: '',
    scheduledFor: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      affectedSystems: formData.affectedSystems.split(',').map(s => s.trim()).filter(Boolean),
      estimatedDowntime: formData.estimatedDowntime ? parseInt(formData.estimatedDowntime) : undefined,
      scheduledFor: formData.scheduledFor || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="severity">Severity</Label>
          <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="security_patch">Security Patch</SelectItem>
              <SelectItem value="vulnerability">Vulnerability</SelectItem>
              <SelectItem value="policy_update">Policy Update</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="affectedSystems">Affected Systems (comma-separated)</Label>
        <Input
          id="affectedSystems"
          value={formData.affectedSystems}
          onChange={(e) => setFormData({ ...formData, affectedSystems: e.target.value })}
          placeholder="Web Server, Database, Email System"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Update'}
        </Button>
      </div>
    </form>
  );
}

function CreateNotificationForm({ 
  onSubmit, 
  isLoading 
}: { 
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    severity: 'medium',
    targetAudience: 'all',
    isDismissible: true,
    expiresAt: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      expiresAt: formData.expiresAt || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alert">Alert</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="update">Update</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="severity">Severity</Label>
          <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="targetAudience">Target Audience</Label>
        <Select value={formData.targetAudience} onValueChange={(value) => setFormData({ ...formData, targetAudience: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="admins">Administrators</SelectItem>
            <SelectItem value="hr">HR Staff</SelectItem>
            <SelectItem value="employees">Employees</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Notification'}
        </Button>
      </div>
    </form>
  );
}