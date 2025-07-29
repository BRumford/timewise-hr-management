import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileSignature, CalendarDays, User, FileText } from "lucide-react";

const signatureRequestSchema = z.object({
  employeeId: z.number().min(1, "Employee is required"),
  documentType: z.string().min(1, "Document type is required"),
  documentId: z.number().min(1, "Document ID is required"),
  templateId: z.number().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  emailNotification: z.boolean().default(true),
  reminderFrequency: z.enum(['none', 'daily', 'weekly']).default('weekly'),
});

type SignatureRequestForm = z.infer<typeof signatureRequestSchema>;

interface SignatureRequestDialogProps {
  trigger?: React.ReactNode;
  documentType?: string;
  documentId?: number;
  onSuccess?: () => void;
}

export function SignatureRequestDialog({ 
  trigger, 
  documentType = '',
  documentId = 0,
  onSuccess 
}: SignatureRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SignatureRequestForm>({
    resolver: zodResolver(signatureRequestSchema),
    defaultValues: {
      employeeId: 0,
      documentType,
      documentId,
      templateId: undefined,
      title: '',
      description: '',
      dueDate: '',
      emailNotification: true,
      reminderFrequency: 'weekly',
    },
  });

  // Fetch employees for selection
  const { data: employees = [] } = useQuery({
    queryKey: ['/api/employees'],
  });

  // Fetch signature templates
  const { data: templates = [] } = useQuery({
    queryKey: ['/api/signature-templates/active'],
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: SignatureRequestForm) => {
      const requestData = {
        ...data,
        status: 'pending' as const,
        createdBy: 'demo_user', // This should be the current user
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      };
      return apiRequest('/api/signature-requests', 'POST', requestData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Signature request created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/signature-requests'] });
      form.reset();
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create signature request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SignatureRequestForm) => {
    createRequestMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Request Signature
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Create Signature Request
          </DialogTitle>
          <DialogDescription>
            Send a digital signature request to an employee for document approval.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Employee
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value ? String(field.value) : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((employee: any) => (
                          <SelectItem key={employee.id} value={String(employee.id)}>
                            {employee.firstName} {employee.lastName} - {employee.position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signature Template (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      value={field.value ? String(field.value) : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.map((template: any) => (
                          <SelectItem key={template.id} value={String(template.id)}>
                            {template.name} - {template.documentType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Document Type
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="onboarding_form">Onboarding Form</SelectItem>
                        <SelectItem value="extra_pay_contract">Extra Pay Contract</SelectItem>
                        <SelectItem value="policy_acknowledgment">Policy Acknowledgment</SelectItem>
                        <SelectItem value="employment_contract">Employment Contract</SelectItem>
                        <SelectItem value="performance_review">Performance Review</SelectItem>
                        <SelectItem value="disciplinary_action">Disciplinary Action</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="documentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document ID</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter document ID"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      The ID of the specific document requiring signature
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter signature request title" {...field} />
                  </FormControl>
                  <FormDescription>
                    A clear title describing what needs to be signed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about the signature request..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Due Date (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      When the signature is needed by
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reminderFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reminder Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Reminders</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRequestMutation.isPending}>
                {createRequestMutation.isPending ? "Creating..." : "Create Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}