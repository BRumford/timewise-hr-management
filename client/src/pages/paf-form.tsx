import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FileText, User, Building, Calendar, Send, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

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

export default function PafForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setLocation("/paf-management");
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
    setIsSubmitting(true);
    try {
      await createPafMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPafType = form.watch("pafType");
  const selectedPosition = form.watch("positionTitle");

  // Show conditional fields based on PAF type and position
  const showSalaryFields = ["new-hire", "promotion", "salary-adjustment"].includes(selectedPafType);
  const showScheduleFields = ["new-hire", "position-change"].includes(selectedPafType);
  const showSubjectArea = selectedPosition?.toLowerCase().includes("teacher") || selectedPosition?.toLowerCase().includes("instructor");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Create Personnel Action Form</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation("/paf-management")}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to PAF Management</span>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Employee Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Employee Information
              </CardTitle>
              <CardDescription>
                Basic employee details and identification
              </CardDescription>
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
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Position Information
              </CardTitle>
              <CardDescription>
                Position details and department information
              </CardDescription>
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
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Action Details
              </CardTitle>
              <CardDescription>
                Specify the type of personnel action and details
              </CardDescription>
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
                        className="min-h-[100px]"
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
                <CardTitle>Compensation & Benefits</CardTitle>
                <CardDescription>
                  Salary and benefit information for this position
                </CardDescription>
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
                <CardTitle>Work Schedule</CardTitle>
                <CardDescription>
                  Work schedule and supervisor information
                </CardDescription>
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
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>
                Any additional comments or special considerations
              </CardDescription>
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
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/paf-management")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createPafMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? "Submitting..." : "Submit PAF"}</span>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}