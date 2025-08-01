import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Building2, FileText, Clock, Calendar, DollarSign, User, Settings, Briefcase, Users, CheckCircle2 } from "lucide-react";

// PAF Form Schema based on the PDF structure
const pafFormSchema = z.object({
  // PAF Type
  pafType: z.enum(["new_position", "vacant_position", "change_existing"]),
  
  // Position Type and Category
  positionType: z.enum(["certificated", "classified", "management", "administrator", "coach_extra"]),
  positionCategory: z.enum(["prob_perm", "temporary", "short_term", "categorical", "summer_program"]),
  
  // Section 1 - Position Information
  positionTitle: z.string().min(1, "Position title is required"),
  workSite: z.string().min(1, "Work site is required"),
  fte: z.string().optional(),
  gradeLevel: z.string().optional(),
  subjectArea: z.string().optional(),
  extraDutyType: z.string().optional(),
  
  // Section 2 - Advertisement Status
  advertise: z.boolean().default(false),
  postingDate: z.string().optional(),
  advertisementType: z.enum(["in_house", "out_of_house", "both"]).optional(),
  edjoinTimeline: z.enum(["standard", "open_until_filled", "other"]).optional(),
  screeningCommittee: z.boolean().default(false),
  screeningDate: z.string().optional(),
  formalInterview: z.boolean().default(false),
  interviewDate: z.string().optional(),
  
  // Section 3 - Employee Information
  employeeName: z.string().optional(),
  effectiveDate: z.string().optional(),
  reason: z.enum(["resignation", "retirement", "leave", "transfer", "increase_decrease", "other"]).optional(),
  transferFromPC: z.string().optional(),
  transferToPC: z.string().optional(),
  hoursChange: z.string().optional(),
  otherReason: z.string().optional(),
  
  // Section 4 - Work Shift Information
  totalHoursDay: z.string().optional(),
  totalDaysWeek: z.string().optional(),
  totalDaysYear: z.string().optional(),
  
  // Work schedule for each day
  mondayTimeIn: z.string().optional(),
  mondayTimeOut: z.string().optional(),
  tuesdayTimeIn: z.string().optional(),
  tuesdayTimeOut: z.string().optional(),
  wednesdayTimeIn: z.string().optional(),
  wednesdayTimeOut: z.string().optional(),
  thursdayTimeIn: z.string().optional(),
  thursdayTimeOut: z.string().optional(),
  fridayTimeIn: z.string().optional(),
  fridayTimeOut: z.string().optional(),
  
  // Section 5 - Budget Code Information (multiple budget lines)
  budgetCode1: z.string().optional(),
  budgetPercentage1: z.string().optional(),
  budgetCode2: z.string().optional(),
  budgetPercentage2: z.string().optional(),
  budgetCode3: z.string().optional(),
  budgetPercentage3: z.string().optional(),
  budgetCode4: z.string().optional(),
  budgetPercentage4: z.string().optional(),
  budgetCode5: z.string().optional(),
  budgetPercentage5: z.string().optional(),
  
  // Workflow Selection
  workflowTemplateId: z.string().optional(),
  
  // Section 6 - Reason/Justification
  justification: z.string().min(1, "Justification is required for new or changed positions"),
});

type PAFFormData = z.infer<typeof pafFormSchema>;

export default function PAFForm() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize form first
  const form = useForm<PAFFormData>({
    resolver: zodResolver(pafFormSchema),
    defaultValues: {
      pafType: "new_position",
      positionType: "certificated",
      positionCategory: "prob_perm",
      advertise: false,
      screeningCommittee: false,
      formalInterview: false,
    },
  });

  // Fetch workflow templates
  const { data: workflowTemplates } = useQuery({
    queryKey: ["/api/paf/workflow-templates"],
  });

  const watchWorkflowTemplateId = form.watch("workflowTemplateId");
  const selectedWorkflow = workflowTemplates?.find((w: any) => w.id.toString() === watchWorkflowTemplateId);

  const submitPAF = useMutation({
    mutationFn: async (data: PAFFormData) => {
      return await apiRequest("/api/paf/submit", "POST", data);
    },
    onSuccess: (data) => {
      toast({
        title: "PAF Submitted Successfully",
        description: "Your Personnel Action Form has been submitted for approval.",
      });
      navigate("/paf-management");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit PAF. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PAFFormData) => {
    submitPAF.mutate(data);
  };

  const watchPafType = form.watch("pafType");
  const watchPositionType = form.watch("positionType");
  const watchAdvertise = form.watch("advertise");

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Personnel Action Form (PAF)</h1>
        <p className="text-muted-foreground">Complete the form below to submit a personnel action request</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* PAF Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>PAF Type and Position Information</CardTitle>
              <CardDescription>Select the type of personnel action and position details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="pafType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAF Type Requested</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="new_position" id="new_position" />
                          <Label htmlFor="new_position">New Position (Section 1, 2, 4, 5, 6)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="vacant_position" id="vacant_position" />
                          <Label htmlFor="vacant_position">Vacant Position (Section 1, 2, 3, 4, 5)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="change_existing" id="change_existing" />
                          <Label htmlFor="change_existing">Change Existing Position (Section 1, 3, 4, 5, 6)</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="positionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="certificated" id="certificated" />
                            <Label htmlFor="certificated">Certificated</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="classified" id="classified" />
                            <Label htmlFor="classified">Classified</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="management" id="management" />
                            <Label htmlFor="management">Management/Confidential</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="administrator" id="administrator" />
                            <Label htmlFor="administrator">Administrator</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="coach_extra" id="coach_extra" />
                            <Label htmlFor="coach_extra">Coach or Extra Duty</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="positionCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position Category</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="prob_perm" id="prob_perm" />
                            <Label htmlFor="prob_perm">Prob/Perm</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="temporary" id="temporary" />
                            <Label htmlFor="temporary">Temporary</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="short_term" id="short_term" />
                            <Label htmlFor="short_term">Short-Term</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="categorical" id="categorical" />
                            <Label htmlFor="categorical">Categorical</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="summer_program" id="summer_program" />
                            <Label htmlFor="summer_program">Summer Program</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 1 - Position Information */}
          <Card>
            <CardHeader>
              <CardTitle>Section 1 - Position Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="positionTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position Title *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter position title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workSite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Site *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter work site location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="fte"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FTE *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 1.0, 0.5, 0.75" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gradeLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade Level(s)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., K-3, 9-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchPositionType === "certificated" && (
                  <FormField
                    control={form.control}
                    name="subjectArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject Area(s) *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Math, Science" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {watchPositionType === "coach_extra" && (
                <FormField
                  control={form.control}
                  name="extraDutyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra Duty Type</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Describe the extra duty role" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Section 2 - Advertisement Status (only for new and vacant positions) */}
          {(watchPafType === "new_position" || watchPafType === "vacant_position") && (
            <Card>
              <CardHeader>
                <CardTitle>Section 2 - Advertisement Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="advertise"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Advertise this position</FormLabel>
                    </FormItem>
                  )}
                />

                {watchAdvertise && (
                  <div className="space-y-4 ml-6">
                    <FormField
                      control={form.control}
                      name="advertisementType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Advertisement Type</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="in_house" id="in_house" />
                                <Label htmlFor="in_house">In-House Only</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="out_of_house" id="out_of_house" />
                                <Label htmlFor="out_of_house">Out-of-House Only</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="both" id="both" />
                                <Label htmlFor="both">Both</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="postingDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Posting Date</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="edjoinTimeline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Edjoin Posting Timeline</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select timeline" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="standard">Standard (2 weeks)</SelectItem>
                                <SelectItem value="open_until_filled">Open Until Filled</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="screeningCommittee"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Screening Committee Required</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="formalInterview"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Formal Interview Session Required</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Section 3 - Employee Information (only for vacant and change existing positions) */}
          {(watchPafType === "vacant_position" || watchPafType === "change_existing") && (
            <Card>
              <CardHeader>
                <CardTitle>Section 3 - Employee Information/Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employeeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter employee name" />
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
                        <FormLabel>Effective Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-wrap gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="resignation" id="resignation" />
                            <Label htmlFor="resignation">Resignation</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="retirement" id="retirement" />
                            <Label htmlFor="retirement">Retirement</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="leave" id="leave" />
                            <Label htmlFor="leave">Leave of Absence</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="transfer" id="transfer" />
                            <Label htmlFor="transfer">Transfer</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="increase_decrease" id="increase_decrease" />
                            <Label htmlFor="increase_decrease">Increase/Decrease Assignment</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="other" id="other_reason" />
                            <Label htmlFor="other_reason">Other</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("reason") === "transfer" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="transferFromPC"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transfer From PC#</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="PC number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="transferToPC"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transfer To PC#</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="PC number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {form.watch("reason") === "other" && (
                  <FormField
                    control={form.control}
                    name="otherReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other Reason</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Please specify other reason" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Section 4 - Work Shift Information */}
          <Card>
            <CardHeader>
              <CardTitle>Section 4 - Work Shift Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="totalHoursDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Hours/Day</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 8" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalDaysWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Days/Week</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 5" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalDaysYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Days/Year</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 185" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>


            </CardContent>
          </Card>

          {/* Section 5 - Budget Code Information */}
          <Card>
            <CardHeader>
              <CardTitle>Section 5 - Budget Code Information</CardTitle>
              <CardDescription>Fund - Resource - Year - Object - Goal - Function - School - Budget Responsibility - Type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">Format: XX-XXXX-X-XXXX-XXXX-XXXX-XXX-XXXX-XXXX</div>
                
                {[1, 2, 3, 4, 5].map((index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`budgetCode${index}` as keyof PAFFormData}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Budget Code {index}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="XX-XXXX-X-XXXX-XXXX-XXXX-XXX-XXXX-XXXX" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`budgetPercentage${index}` as keyof PAFFormData}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Percentage {index}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 100%" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Approval Workflow Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Approval Workflow</span>
              </CardTitle>
              <CardDescription>Select the approval workflow for this PAF</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="workflowTemplateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Workflow *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose approval workflow" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(workflowTemplates as any[] || []).map((template: any) => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              <div className="flex items-center space-x-2">
                                <span>{template.name}</span>
                                {template.isDefault && <Badge variant="secondary">Default</Badge>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedWorkflow && (
                  <div>
                    <Label>Approval Steps</Label>
                    <div className="space-y-3 mt-2">
                      {selectedWorkflow.steps
                        .sort((a: any, b: any) => a.order - b.order)
                        .map((step: any, index: number) => (
                          <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                              {step.order}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{step.title}</div>
                              <div className="text-xs text-gray-600 capitalize">{step.role}</div>
                            </div>
                            {step.required && (
                              <Badge variant="outline" className="text-xs">Required</Badge>
                            )}
                          </div>
                        ))}
                    </div>
                    
                    {selectedWorkflow.description && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600">Workflow Description:</div>
                        <div className="text-sm">{selectedWorkflow.description}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Workflow Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Workflow Management</span>
              </CardTitle>
              <CardDescription>Track the approval process for this PAF</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="text-sm font-medium">Status</div>
                      <div className="text-xs text-gray-600">Draft</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <User className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="text-sm font-medium">Current Step</div>
                      <div className="text-xs text-gray-600">Not Started</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <div>
                      <div className="text-sm font-medium">Priority</div>
                      <div className="text-xs text-gray-600">Standard</div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="text-sm font-medium mb-2">Workflow Progress</div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-gray-300" />
                      <span className="text-sm text-gray-600">Form Submission</span>
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    </div>
                    
                    {selectedWorkflow && selectedWorkflow.steps
                      .sort((a: any, b: any) => a.order - b.order)
                      .map((step: any, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-gray-300" />
                          <span className="text-sm text-gray-600">{step.title}</span>
                          <Badge variant="outline" className="text-xs">Waiting</Badge>
                        </div>
                      ))}
                    
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-gray-300" />
                      <span className="text-sm text-gray-600">Final Approval</span>
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 6 - Reason/Justification */}
          {(watchPafType === "new_position" || watchPafType === "change_existing") && (
            <Card>
              <CardHeader>
                <CardTitle>Section 6 - Reason/Justification for Request</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="justification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Justification *
                        <span className="text-sm text-muted-foreground ml-2">
                          (Required for new positions or changes to existing positions)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Please provide detailed reasoning and justification for this request"
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/paf-management")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitPAF.isPending}>
              {submitPAF.isPending ? "Submitting..." : "Submit PAF"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}