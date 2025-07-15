import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Plus, Send, Edit, Trash2, Search, User, Eye, Download, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { insertLetterSchema } from "@shared/schema";
import type { Letter, Employee } from "@shared/schema";

const letterFormSchema = insertLetterSchema.extend({
  employeeId: z.number().min(1, "Employee is required"),
});

type LetterFormData = z.infer<typeof letterFormSchema>;

export default function Letters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [letterTypeFilter, setLetterTypeFilter] = useState<string>("all");
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<LetterFormData>({
    resolver: zodResolver(letterFormSchema),
    defaultValues: {
      title: "",
      templateContent: "",
      employeeId: 0,
      letterType: "offer",
      status: "draft",
      createdBy: "admin",
      notes: "",
    },
  });

  const { data: letters = [], isLoading: isLoadingLetters } = useQuery<Letter[]>({
    queryKey: ["/api/letters"],
  });

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const filteredLetters = useMemo(() => {
    return letters.filter(letter => {
      const matchesSearch = letter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          letter.letterType.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || letter.status === statusFilter;
      const matchesType = letterTypeFilter === "all" || letter.letterType === letterTypeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [letters, searchTerm, statusFilter, letterTypeFilter]);

  const createLetterMutation = useMutation({
    mutationFn: async (data: LetterFormData) => {
      return await apiRequest("/api/letters", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Letter template created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/letters"] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create letter template",
        variant: "destructive",
      });
    },
  });

  const processLetterMutation = useMutation({
    mutationFn: async ({ letterId, employeeId }: { letterId: number; employeeId: number }) => {
      return await apiRequest(`/api/letters/${letterId}/process`, {
        method: "POST",
        body: JSON.stringify({ employeeId }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Letter processed successfully with employee information",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/letters"] });
      setIsProcessDialogOpen(false);
      setSelectedLetter(null);
      setSelectedEmployee(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process letter",
        variant: "destructive",
      });
    },
  });

  const deleteLetterMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/letters/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Letter deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/letters"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete letter",
        variant: "destructive",
      });
    },
  });

  const handleCreateLetter = (data: LetterFormData) => {
    createLetterMutation.mutate(data);
  };

  const handleProcessLetter = () => {
    if (selectedLetter && selectedEmployee) {
      processLetterMutation.mutate({
        letterId: selectedLetter.id,
        employeeId: selectedEmployee,
      });
    }
  };

  const handlePreviewLetter = (letter: Letter) => {
    setPreviewContent(letter.processedContent || letter.templateContent);
    setIsPreviewDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "processed": return "bg-blue-100 text-blue-800";
      case "sent": return "bg-green-100 text-green-800";
      case "archived": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getLetterTypeColor = (type: string) => {
    switch (type) {
      case "offer": return "bg-green-100 text-green-800";
      case "recommendation": return "bg-blue-100 text-blue-800";
      case "disciplinary": return "bg-red-100 text-red-800";
      case "termination": return "bg-orange-100 text-orange-800";
      case "promotion": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const letterTypes = [
    { value: "offer", label: "Job Offer" },
    { value: "recommendation", label: "Recommendation" },
    { value: "disciplinary", label: "Disciplinary" },
    { value: "termination", label: "Termination" },
    { value: "promotion", label: "Promotion" },
    { value: "warning", label: "Warning" },
    { value: "contract", label: "Contract" },
    { value: "other", label: "Other" },
  ];

  const sampleTemplate = `Dear {{firstName}} {{lastName}},

We are pleased to offer you the position of {{position}} in the {{department}} department at our school district.

This position will begin on {{startDate}} with an annual salary of {{salary}}.

Please contact us at your earliest convenience to confirm your acceptance of this position.

Sincerely,
HR Department

Date: {{currentDate}}`;

  if (isLoadingLetters || isLoadingEmployees) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading letters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Letters</h1>
          <p className="text-gray-600">Automated document generation with employee information</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Letter Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Letter Template</DialogTitle>
              <DialogDescription>
                Create a new letter template that can be automatically populated with employee information.
                Use placeholders like {"{firstName}"}, {"{lastName}"}, {"{position}"}, etc.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateLetter)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Job Offer Letter" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="letterType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Letter Type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select letter type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {letterTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="templateContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={sampleTemplate}
                          rows={12}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Available placeholders: {"{firstName}"}, {"{lastName}"}, {"{fullName}"}, {"{position}"}, {"{department}"}, {"{startDate}"}, {"{salary}"}, {"{currentDate}"}, {"{currentYear}"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any additional notes..." rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLetterMutation.isPending}>
                    {createLetterMutation.isPending ? "Creating..." : "Create Template"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-72">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search letters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={letterTypeFilter} onValueChange={setLetterTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {letterTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Letters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{letters.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {letters.filter(l => l.status === "draft").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processed Letters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {letters.filter(l => l.status === "processed").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sent Letters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {letters.filter(l => l.status === "sent").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Letters List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredLetters.map((letter) => (
          <Card key={letter.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-base">{letter.title}</CardTitle>
                  <CardDescription className="mt-1">
                    Created {new Date(letter.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex space-x-1">
                  <Badge className={getStatusColor(letter.status)}>
                    {letter.status}
                  </Badge>
                  <Badge variant="outline" className={getLetterTypeColor(letter.letterType)}>
                    {letter.letterType}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="text-sm text-gray-600 line-clamp-2">
                  {letter.templateContent.substring(0, 100)}...
                </div>
                
                {letter.processedAt && (
                  <div className="flex items-center text-sm text-green-600">
                    <Clock className="w-3 h-3 mr-1" />
                    Processed {new Date(letter.processedAt).toLocaleDateString()}
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviewLetter(letter)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                    
                    {letter.status === "draft" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedLetter(letter);
                          setIsProcessDialogOpen(true);
                        }}
                      >
                        <User className="w-3 h-3 mr-1" />
                        Process
                      </Button>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteLetterMutation.mutate(letter.id)}
                    disabled={deleteLetterMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLetters.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No letters found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== "all" || letterTypeFilter !== "all"
              ? "No letters match your current filters."
              : "Get started by creating your first letter template."}
          </p>
          {!searchTerm && statusFilter === "all" && letterTypeFilter === "all" && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Letter Template
            </Button>
          )}
        </div>
      )}

      {/* Process Letter Dialog */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Letter</DialogTitle>
            <DialogDescription>
              Select an employee to automatically populate the letter template with their information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="employee">Select Employee</Label>
              <Select value={selectedEmployee?.toString() || ""} onValueChange={(value) => setSelectedEmployee(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.firstName} {employee.lastName} - {employee.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleProcessLetter}
                disabled={!selectedEmployee || processLetterMutation.isPending}
              >
                {processLetterMutation.isPending ? "Processing..." : "Process Letter"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Letter Preview</DialogTitle>
          </DialogHeader>
          <div className="bg-white border rounded-lg p-8">
            <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {previewContent}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}