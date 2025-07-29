import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  FileSignature, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Eye, 
  Send,
  Calendar,
  User,
  FileText,
  Mail
} from "lucide-react";
import { SignatureRequestDialog } from "./SignatureRequestDialog";
import { SignatureCapture } from "./SignatureCapture";
import { format } from "date-fns";

interface SignatureManagementProps {
  documentType?: string;
  documentId?: number;
  employeeId?: number;
  showCreateButton?: boolean;
}

export function SignatureManagement({ 
  documentType, 
  documentId, 
  employeeId,
  showCreateButton = true 
}: SignatureManagementProps) {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showSigningDialog, setShowSigningDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Build query key based on filters
  const getQueryKey = () => {
    if (employeeId) {
      return ['/api/signature-requests/employee', employeeId];
    } else if (documentType && documentId) {
      return ['/api/signature-requests/document', documentType, documentId];
    } else {
      return ['/api/signature-requests'];
    }
  };

  // Fetch signature requests based on props
  const { data: signatureRequests = [], isLoading } = useQuery({
    queryKey: getQueryKey(),
    queryFn: async () => {
      if (employeeId) {
        return apiRequest(`/api/signature-requests/employee/${employeeId}`, 'GET');
      } else if (documentType && documentId) {
        return apiRequest(`/api/signature-requests/document/${documentType}/${documentId}`, 'GET');
      } else {
        return apiRequest('/api/signature-requests', 'GET');
      }
    },
  });

  // Fetch pending requests for dashboard
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['/api/signature-requests/pending'],
  });

  const signRequestMutation = useMutation({
    mutationFn: async ({ id, signatureData }: { id: number; signatureData: string }) => {
      return apiRequest(`/api/signature-requests/${id}/sign`, 'POST', {
        signatureData,
        signedBy: 'demo_user', // This should be the current user
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document signed successfully",
      });
      queryClient.invalidateQueries({ queryKey: getQueryKey() });
      setShowSigningDialog(false);
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sign document",
        variant: "destructive",
      });
    },
  });

  const declineRequestMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      return apiRequest(`/api/signature-requests/${id}/decline`, 'POST', { notes });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Signature request declined",
      });
      queryClient.invalidateQueries({ queryKey: getQueryKey() });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to decline request",
        variant: "destructive",
      });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/signature-requests/${id}/reminder`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Reminder sent successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'signed':
        return <CheckCircle className="h-4 w-4" />;
      case 'declined':
        return <XCircle className="h-4 w-4" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileSignature className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'signed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const handleSignature = (signatureData: string) => {
    if (selectedRequest && signatureData) {
      signRequestMutation.mutate({
        id: selectedRequest.id,
        signatureData,
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading signature requests...</div>
        </CardContent>
      </Card>
    );
  }

  const filteredRequests = Array.isArray(signatureRequests) ? signatureRequests.filter((request: any) => {
    if (documentType && documentId) {
      return request.documentType === documentType && request.documentId === documentId;
    }
    return true;
  }) : [];

  return (
    <div className="space-y-6">
      {/* Header with create button */}
      {showCreateButton && (
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              E-Signature Management
            </h3>
            <p className="text-sm text-gray-600">
              Manage digital signature requests and approvals
            </p>
          </div>
          <SignatureRequestDialog
            documentType={documentType}
            documentId={documentId}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: getQueryKey() })}
          />
        </div>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="signed">Signed</TabsTrigger>
          <TabsTrigger value="declined">Declined</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredRequests.length === 0 ? (
            <Alert>
              <FileSignature className="h-4 w-4" />
              <AlertDescription>
                No signature requests found. Create a new request to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {filteredRequests.map((request: any) => (
                <Card key={request.id} className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(request.status)}
                        <div>
                          <CardTitle className="text-base">{request.title}</CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Employee ID: {request.employeeId}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {request.documentType}
                            </span>
                            {request.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due: {format(new Date(request.dueDate), 'MMM d, yyyy')}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {request.description && (
                      <p className="text-sm text-gray-600 mb-3">{request.description}</p>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Created: {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
                        {request.signedAt && (
                          <span className="ml-3">
                            Signed: {format(new Date(request.signedAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowSigningDialog(true);
                              }}
                            >
                              <FileSignature className="h-4 w-4 mr-1" />
                              Sign
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => declineRequestMutation.mutate({ id: request.id })}
                              disabled={declineRequestMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => sendReminderMutation.mutate(request.id)}
                              disabled={sendReminderMutation.isPending}
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              Remind
                            </Button>
                          </>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{request.title}</DialogTitle>
                              <DialogDescription>
                                Signature request details and history
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <strong>Employee ID:</strong> {request.employeeId}
                                </div>
                                <div>
                                  <strong>Document Type:</strong> {request.documentType}
                                </div>
                                <div>
                                  <strong>Document ID:</strong> {request.documentId}
                                </div>
                                <div>
                                  <strong>Status:</strong> 
                                  <Badge className={`ml-2 ${getStatusColor(request.status)}`}>
                                    {request.status.toUpperCase()}
                                  </Badge>
                                </div>
                                {request.dueDate && (
                                  <div>
                                    <strong>Due Date:</strong> {format(new Date(request.dueDate), 'MMM d, yyyy')}
                                  </div>
                                )}
                                <div>
                                  <strong>Created:</strong> {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
                                </div>
                              </div>
                              
                              {request.description && (
                                <div>
                                  <strong>Description:</strong>
                                  <p className="mt-1 text-gray-600">{request.description}</p>
                                </div>
                              )}
                              
                              {request.signatureData && (
                                <div>
                                  <strong>Signature:</strong>
                                  <div className="mt-2 border rounded-lg p-4 bg-gray-50">
                                    <img 
                                      src={request.signatureData} 
                                      alt="Digital Signature" 
                                      className="max-w-full h-auto"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending">
          <div className="grid gap-4">
            {filteredRequests.filter((r: any) => r.status === 'pending').map((request: any) => (
              <Card key={request.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {request.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      {request.description}
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowSigningDialog(true);
                      }}
                    >
                      Sign Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="signed">
          <div className="grid gap-4">
            {filteredRequests.filter((r: any) => r.status === 'signed').map((request: any) => (
              <Card key={request.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    {request.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Signed on {format(new Date(request.signedAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="declined">
          <div className="grid gap-4">
            {filteredRequests.filter((r: any) => r.status === 'declined').map((request: any) => (
              <Card key={request.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    {request.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Declined {request.notes && `with reason: ${request.notes}`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Signature Dialog */}
      <Dialog open={showSigningDialog} onOpenChange={setShowSigningDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
            <DialogDescription>
              Please review the document and provide your digital signature below.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{selectedRequest.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{selectedRequest.description}</p>
                <div className="text-xs text-gray-500">
                  Document Type: {selectedRequest.documentType} | Document ID: {selectedRequest.documentId}
                </div>
              </div>
              
              <SignatureCapture
                onSignature={handleSignature}
                title="Your Digital Signature"
                description="By signing below, you acknowledge that you have read and agree to the document above."
              />
              
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSigningDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => declineRequestMutation.mutate({ id: selectedRequest.id })}
                  variant="destructive"
                  disabled={declineRequestMutation.isPending}
                >
                  Decline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}