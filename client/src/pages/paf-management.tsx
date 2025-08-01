import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle, Clock, FileText, User, Search, Send, Eye, Plus, Building, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const pafFormSchema = z.object({
  employeeName: z.string().min(1, "Employee name is required"),
  employeeId: z.string().optional(),
  positionTitle: z.string().min(1, "Position title is required"),
  department: z.string().min(1, "Department is required"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  pafType: z.string().min(1, "PAF type is required"),
  actionReason: z.string().min(1, "Action reason is required"),
  salaryGrade: z.string().optional(),
  stepLevel: z.string().optional(),
  annualSalary: z.string().optional(),
  hourlyRate: z.string().optional(),
  workSchedule: z.string().optional(),
  benefitEligible: z.string().optional(),
  supervisorName: z.string().optional(),
  jurisdictionBox: z.string().optional(),
  subjectArea: z.string().optional(),
  additionalComments: z.string().optional(),
});

type PafFormData = z.infer<typeof pafFormSchema>;

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
  const [isCreatePafDialogOpen, setIsCreatePafDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/paf/submissions"],
  });

  const filteredSubmissions = (submissions as PafSubmission[] || []).filter((submission: PafSubmission) => 
    submission.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.positionTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewSubmission = (submission: PafSubmission) => {
    setSelectedSubmission(submission);
    setIsViewSubmissionDialogOpen(true);
  };

  const form = useForm<PafFormData>({
    resolver: zodResolver(pafFormSchema),
    defaultValues: {
      employeeName: "",
      employeeId: "",
      positionTitle: "",
      department: "",
      effectiveDate: "",
      pafType: "",
      actionReason: "",
      salaryGrade: "",
      stepLevel: "",
      annualSalary: "",
      hourlyRate: "",
      workSchedule: "",
      benefitEligible: "",
      supervisorName: "",
      jurisdictionBox: "",
      subjectArea: "",
      additionalComments: "",
    },
  });

  const createPafMutation = useMutation({
    mutationFn: async (data: PafFormData) => {
      return apiRequest("/api/paf/create", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Personnel Action Form submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/paf/submissions"] });
      setIsCreatePafDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit PAF",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: PafFormData) => {
    await createPafMutation.mutateAsync(data);
  };

  const selectedPafType = form.watch("pafType");
  const selectedPosition = form.watch("positionTitle");

  // Show conditional fields based on PAF type and position
  const showSalaryFields = ["new-hire", "promotion", "salary-adjustment"].includes(selectedPafType);
  const showScheduleFields = ["new-hire", "position-change"].includes(selectedPafType);
  const showSubjectArea = selectedPosition?.toLowerCase().includes("teacher") || selectedPosition?.toLowerCase().includes("instructor");

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
        <Dialog open={isCreatePafDialogOpen} onOpenChange={setIsCreatePafDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create New PAF</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Personnel Action Form</DialogTitle>
              <DialogDescription>
                Fill out the form below to create a new Personnel Action Form
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Employee Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-2" />
                      Employee Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="employeeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter employee full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter employee ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Position Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-sm">
                      <Building className="h-4 w-4 mr-2" />
                      Position Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="positionTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter position title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department *</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="administration">Administration</SelectItem>
                                <SelectItem value="elementary">Elementary Education</SelectItem>
                                <SelectItem value="middle-school">Middle School</SelectItem>
                                <SelectItem value="high-school">High School</SelectItem>
                                <SelectItem value="special-education">Special Education</SelectItem>
                                <SelectItem value="transportation">Transportation</SelectItem>
                                <SelectItem value="maintenance">Maintenance</SelectItem>
                                <SelectItem value="food-service">Food Service</SelectItem>
                                <SelectItem value="technology">Technology</SelectItem>
                                <SelectItem value="counseling">Counseling</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {showSubjectArea && (
                      <FormField
                        control={form.control}
                        name="subjectArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject Area (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter subject area" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="jurisdictionBox"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jurisdiction Box (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter jurisdiction" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Action Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Action Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pafType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAF Type *</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select PAF type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new-hire">New Hire</SelectItem>
                                <SelectItem value="promotion">Promotion</SelectItem>
                                <SelectItem value="transfer">Transfer</SelectItem>
                                <SelectItem value="salary-adjustment">Salary Adjustment</SelectItem>
                                <SelectItem value="position-change">Position Change</SelectItem>
                                <SelectItem value="termination">Termination</SelectItem>
                                <SelectItem value="leave">Leave of Absence</SelectItem>
                                <SelectItem value="return-from-leave">Return from Leave</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="effectiveDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Effective Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="actionReason"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Action Reason *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Provide detailed reason for this personnel action"
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Compensation & Benefits (Conditional) */}
                {showSalaryFields && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Compensation & Benefits</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="salaryGrade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Salary Grade</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter salary grade" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="stepLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Step Level</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter step level" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="annualSalary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Annual Salary</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter annual salary" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="hourlyRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hourly Rate</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter hourly rate" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="benefitEligible"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Benefit Eligible</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select benefit eligibility" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Work Schedule (Conditional) */}
                {showScheduleFields && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Work Schedule</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="workSchedule"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Work Schedule</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select work schedule" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="full-time">Full-time</SelectItem>
                                  <SelectItem value="part-time">Part-time</SelectItem>
                                  <SelectItem value="substitute">Substitute</SelectItem>
                                  <SelectItem value="temporary">Temporary</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="supervisorName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supervisor Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter supervisor name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Additional Comments */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="additionalComments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Comments</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter any additional comments or special instructions"
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreatePafDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPafMutation.isPending}
                    className="flex items-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>{createPafMutation.isPending ? "Submitting..." : "Submit PAF"}</span>
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

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