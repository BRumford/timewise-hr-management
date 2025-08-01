import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle, Clock, FileText, Plus, User, Search, ArrowRight, Calendar, Building, Send, Eye } from "lucide-react";
import { useLocation } from "wouter";

interface PafSubmission {
  id: number;
  templateId: number;
  status: string;
  formData: any;
  employeeName: string;
  positionTitle: string;
  effectiveDate: string;
  submittedBy: string;
  createdAt: string;
  updatedAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    draft: "secondary",
    submitted: "default",
    under_review: "secondary",
    approved: "default",
    denied: "destructive",
  } as const;

  const icons = {
    draft: Clock,
    submitted: Send,
    under_review: AlertCircle,
    approved: CheckCircle,
    denied: AlertCircle,
  };

  const Icon = icons[status as keyof typeof icons] || Clock;

  return (
    <Badge variant={variants[status as keyof typeof variants] || "secondary"} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
    </Badge>
  );
}

function PafSubmissionViewer({ submission, onClose }: { submission: PafSubmission; onClose: () => void }) {
  const formData = submission.formData as any || {};

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Status:</span>
            <div className="mt-1">
              <StatusBadge status={submission.status} />
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Employee:</span>
            <div className="mt-1">{submission.employeeName}</div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Position:</span>
            <div className="mt-1">{submission.positionTitle || 'Not specified'}</div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Submitted:</span>
            <div className="mt-1">{new Date(submission.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* Form Data Display */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Form Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Effective Date:</span>
            <div className="mt-1">
              {submission.effectiveDate ? new Date(submission.effectiveDate).toLocaleDateString() : 'Not provided'}
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Submitted By:</span>
            <div className="mt-1">{submission.submittedBy}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

export default function PafManagement() {
  const [selectedSubmission, setSelectedSubmission] = useState<PafSubmission | null>(null);
  const [isViewSubmissionDialogOpen, setIsViewSubmissionDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/paf/submissions"],
  });

  const filteredSubmissions = submissions?.filter((submission: PafSubmission) => 
    submission.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.positionTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.status.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleViewSubmission = (submission: PafSubmission) => {
    setSelectedSubmission(submission);
    setIsViewSubmissionDialogOpen(true);
  };

  const handleCreateNewPaf = () => {
    setLocation("/paf-form");
  };

  if (submissionsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Personnel Action Forms</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Personnel Action Forms</h1>
        </div>
      </div>

      {/* Create New PAF Section */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Plus className="h-5 w-5 mr-2" />
            Create New Personnel Action Form
          </CardTitle>
          <CardDescription className="text-blue-700">
            Start a new Personnel Action Form with comprehensive tracking and approval workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700 mb-4">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Employee Information
                </div>
                <div className="flex items-center">
                  <Building className="h-4 w-4 mr-2" />
                  Position Details
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Approval Workflow
                </div>
              </div>
              <p className="text-sm text-blue-600 mb-4">
                Complete online form with real-time audit trail, automatic workflow routing, and comprehensive timestamping system.
              </p>
            </div>
            <div className="flex items-center">
              <Button 
                onClick={handleCreateNewPaf}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              >
                Create New PAF
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Personnel Action Forms</span>
            <Badge variant="outline" className="text-xs">
              {filteredSubmissions.length} Total Forms
            </Badge>
          </CardTitle>
          <CardDescription>
            Track and manage all Personnel Action Form submissions
          </CardDescription>
          
          {/* Search */}
          <div className="flex items-center space-x-2 pt-4">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by employee name, position, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No Personnel Action Forms Found</p>
              <p className="text-sm">
                {searchTerm ? "Try adjusting your search criteria" : "Get started by creating your first PAF"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission: PafSubmission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{submission.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{submission.positionTitle || 'Not specified'}</TableCell>
                      <TableCell>
                        <StatusBadge status={submission.status} />
                      </TableCell>
                      <TableCell>
                        {submission.effectiveDate ? new Date(submission.effectiveDate).toLocaleDateString() : 'Not set'}
                      </TableCell>
                      <TableCell>{new Date(submission.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewSubmission(submission)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Submission Dialog */}
      <Dialog open={isViewSubmissionDialogOpen} onOpenChange={setIsViewSubmissionDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Personnel Action Form Details</DialogTitle>
            <DialogDescription>
              View complete form information and submission details
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <PafSubmissionViewer
              submission={selectedSubmission}
              onClose={() => setIsViewSubmissionDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}