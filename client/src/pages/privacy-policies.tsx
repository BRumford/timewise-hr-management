import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Eye, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface PrivacyPolicy {
  id: number;
  version: string;
  title: string;
  content: string;
  effectiveDate: string;
  expirationDate?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface TermsOfService {
  id: number;
  version: string;
  title: string;
  content: string;
  effectiveDate: string;
  expirationDate?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PrivacyPoliciesPage() {
  const [selectedPolicy, setSelectedPolicy] = useState<PrivacyPolicy | null>(null);
  const [selectedTerms, setSelectedTerms] = useState<TermsOfService | null>(null);
  const [isCreatingPolicy, setIsCreatingPolicy] = useState(false);
  const [isCreatingTerms, setIsCreatingTerms] = useState(false);
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Privacy Policies queries
  const { data: privacyPolicies, isLoading: loadingPolicies } = useQuery({
    queryKey: ['/api/privacy/privacy-policies'],
    retry: false,
  });

  const { data: termsOfService, isLoading: loadingTerms } = useQuery({
    queryKey: ['/api/privacy/terms-of-service'],
    retry: false,
  });

  // Create Privacy Policy mutation
  const createPolicyMutation = useMutation({
    mutationFn: async (data: Partial<PrivacyPolicy>) => {
      return await apiRequest('/api/privacy/privacy-policies', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/privacy/privacy-policies'] });
      setIsCreatingPolicy(false);
      toast({
        title: "Success",
        description: "Privacy policy created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create privacy policy",
        variant: "destructive",
      });
    },
  });

  // Create Terms of Service mutation
  const createTermsMutation = useMutation({
    mutationFn: async (data: Partial<TermsOfService>) => {
      return await apiRequest('/api/privacy/terms-of-service', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/privacy/terms-of-service'] });
      setIsCreatingTerms(false);
      toast({
        title: "Success",
        description: "Terms of service created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create terms of service",
        variant: "destructive",
      });
    },
  });

  // Update Policy mutation
  const updatePolicyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PrivacyPolicy> }) => {
      return await apiRequest(`/api/privacy/privacy-policies/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/privacy/privacy-policies'] });
      setSelectedPolicy(null);
      toast({
        title: "Success",
        description: "Privacy policy updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update privacy policy",
        variant: "destructive",
      });
    },
  });

  // Update Terms mutation
  const updateTermsMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TermsOfService> }) => {
      return await apiRequest(`/api/privacy/terms-of-service/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/privacy/terms-of-service'] });
      setSelectedTerms(null);
      toast({
        title: "Success",
        description: "Terms of service updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update terms of service",
        variant: "destructive",
      });
    },
  });

  const handleCreatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      version: formData.get('version') as string,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      effectiveDate: new Date(formData.get('effectiveDate') as string),
      expirationDate: formData.get('expirationDate') ? new Date(formData.get('expirationDate') as string) : undefined,
      isActive: formData.get('isActive') === 'on',
    };
    createPolicyMutation.mutate(data);
  };

  const handleCreateTerms = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      version: formData.get('version') as string,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      effectiveDate: new Date(formData.get('effectiveDate') as string),
      expirationDate: formData.get('expirationDate') ? new Date(formData.get('expirationDate') as string) : undefined,
      isActive: formData.get('isActive') === 'on',
    };
    createTermsMutation.mutate(data);
  };

  const handleUpdatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicy) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      version: formData.get('version') as string,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      effectiveDate: new Date(formData.get('effectiveDate') as string),
      expirationDate: formData.get('expirationDate') ? new Date(formData.get('expirationDate') as string) : undefined,
      isActive: formData.get('isActive') === 'on',
    };
    updatePolicyMutation.mutate({ id: selectedPolicy.id, data });
  };

  const handleUpdateTerms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTerms) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      version: formData.get('version') as string,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      effectiveDate: new Date(formData.get('effectiveDate') as string),
      expirationDate: formData.get('expirationDate') ? new Date(formData.get('expirationDate') as string) : undefined,
      isActive: formData.get('isActive') === 'on',
    };
    updateTermsMutation.mutate({ id: selectedTerms.id, data });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Privacy Compliance</h1>
          <p className="text-gray-600">Manage privacy policies and terms of service</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'privacy'
              ? 'bg-white text-blue-600 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Privacy Policies</span>
        </button>
        <button
          onClick={() => setActiveTab('terms')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'terms'
              ? 'bg-white text-blue-600 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Terms of Service</span>
        </button>
      </div>

      {/* Privacy Policies Tab */}
      {activeTab === 'privacy' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Privacy Policies</CardTitle>
                <CardDescription>
                  Manage your organization's privacy policies and data handling practices
                </CardDescription>
              </div>
              <Dialog open={isCreatingPolicy} onOpenChange={setIsCreatingPolicy}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Policy
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Privacy Policy</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreatePolicy} className="space-y-4">
                    <div>
                      <Label htmlFor="version">Version</Label>
                      <Input id="version" name="version" placeholder="1.0" required />
                    </div>
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" name="title" placeholder="Privacy Policy" required />
                    </div>
                    <div>
                      <Label htmlFor="content">Content</Label>
                      <Textarea 
                        id="content" 
                        name="content" 
                        placeholder="Enter the privacy policy content..." 
                        rows={10} 
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="effectiveDate">Effective Date</Label>
                      <Input 
                        id="effectiveDate" 
                        name="effectiveDate" 
                        type="date" 
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
                      <Input 
                        id="expirationDate" 
                        name="expirationDate" 
                        type="date" 
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="isActive" name="isActive" />
                      <Label htmlFor="isActive">Active Policy</Label>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreatingPolicy(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createPolicyMutation.isPending}>
                        {createPolicyMutation.isPending ? 'Creating...' : 'Create Policy'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loadingPolicies ? (
              <div className="text-center py-8">Loading privacy policies...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Expiration Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {privacyPolicies?.map((policy: PrivacyPolicy) => (
                    <TableRow key={policy.id}>
                      <TableCell>{policy.version}</TableCell>
                      <TableCell>{policy.title}</TableCell>
                      <TableCell>
                        <Badge variant={policy.isActive ? 'default' : 'secondary'}>
                          {policy.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(policy.effectiveDate)}</TableCell>
                      <TableCell>
                        {policy.expirationDate ? formatDate(policy.expirationDate) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPolicy(policy)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {privacyPolicies?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No privacy policies found. Create your first policy to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Terms of Service Tab */}
      {activeTab === 'terms' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Terms of Service</CardTitle>
                <CardDescription>
                  Manage your organization's terms of service and user agreements
                </CardDescription>
              </div>
              <Dialog open={isCreatingTerms} onOpenChange={setIsCreatingTerms}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Terms
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Terms of Service</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTerms} className="space-y-4">
                    <div>
                      <Label htmlFor="version">Version</Label>
                      <Input id="version" name="version" placeholder="1.0" required />
                    </div>
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" name="title" placeholder="Terms of Service" required />
                    </div>
                    <div>
                      <Label htmlFor="content">Content</Label>
                      <Textarea 
                        id="content" 
                        name="content" 
                        placeholder="Enter the terms of service content..." 
                        rows={10} 
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="effectiveDate">Effective Date</Label>
                      <Input 
                        id="effectiveDate" 
                        name="effectiveDate" 
                        type="date" 
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
                      <Input 
                        id="expirationDate" 
                        name="expirationDate" 
                        type="date" 
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="isActive" name="isActive" />
                      <Label htmlFor="isActive">Active Terms</Label>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreatingTerms(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createTermsMutation.isPending}>
                        {createTermsMutation.isPending ? 'Creating...' : 'Create Terms'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTerms ? (
              <div className="text-center py-8">Loading terms of service...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Expiration Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {termsOfService?.map((terms: TermsOfService) => (
                    <TableRow key={terms.id}>
                      <TableCell>{terms.version}</TableCell>
                      <TableCell>{terms.title}</TableCell>
                      <TableCell>
                        <Badge variant={terms.isActive ? 'default' : 'secondary'}>
                          {terms.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(terms.effectiveDate)}</TableCell>
                      <TableCell>
                        {terms.expirationDate ? formatDate(terms.expirationDate) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTerms(terms)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {termsOfService?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No terms of service found. Create your first terms to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Policy Dialog */}
      {selectedPolicy && (
        <Dialog open={!!selectedPolicy} onOpenChange={() => setSelectedPolicy(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Privacy Policy</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdatePolicy} className="space-y-4">
              <div>
                <Label htmlFor="version">Version</Label>
                <Input id="version" name="version" defaultValue={selectedPolicy.version} required />
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={selectedPolicy.title} required />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea 
                  id="content" 
                  name="content" 
                  defaultValue={selectedPolicy.content}
                  rows={10} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="effectiveDate">Effective Date</Label>
                <Input 
                  id="effectiveDate" 
                  name="effectiveDate" 
                  type="date" 
                  defaultValue={selectedPolicy.effectiveDate.split('T')[0]}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
                <Input 
                  id="expirationDate" 
                  name="expirationDate" 
                  type="date" 
                  defaultValue={selectedPolicy.expirationDate ? selectedPolicy.expirationDate.split('T')[0] : ''}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="isActive" name="isActive" defaultChecked={selectedPolicy.isActive} />
                <Label htmlFor="isActive">Active Policy</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setSelectedPolicy(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePolicyMutation.isPending}>
                  {updatePolicyMutation.isPending ? 'Updating...' : 'Update Policy'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Terms Dialog */}
      {selectedTerms && (
        <Dialog open={!!selectedTerms} onOpenChange={() => setSelectedTerms(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Terms of Service</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateTerms} className="space-y-4">
              <div>
                <Label htmlFor="version">Version</Label>
                <Input id="version" name="version" defaultValue={selectedTerms.version} required />
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={selectedTerms.title} required />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea 
                  id="content" 
                  name="content" 
                  defaultValue={selectedTerms.content}
                  rows={10} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="effectiveDate">Effective Date</Label>
                <Input 
                  id="effectiveDate" 
                  name="effectiveDate" 
                  type="date" 
                  defaultValue={selectedTerms.effectiveDate.split('T')[0]}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
                <Input 
                  id="expirationDate" 
                  name="expirationDate" 
                  type="date" 
                  defaultValue={selectedTerms.expirationDate ? selectedTerms.expirationDate.split('T')[0] : ''}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="isActive" name="isActive" defaultChecked={selectedTerms.isActive} />
                <Label htmlFor="isActive">Active Terms</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setSelectedTerms(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTermsMutation.isPending}>
                  {updateTermsMutation.isPending ? 'Updating...' : 'Update Terms'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}