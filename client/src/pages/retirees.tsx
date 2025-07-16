import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  Calendar,
  DollarSign,
  Heart,
  Shield,
  Eye,
  User,
  FileText,
  Search,
  Filter
} from "lucide-react";
import { insertRetireeSchema, type Retiree, type InsertRetiree } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const retireeFormSchema = insertRetireeSchema.extend({
  retirementDate: z.string().min(1, "Retirement date is required"),
  pensionAmount: z.string().optional(),
  healthInsurancePremium: z.string().optional(),
  lifeInsuranceAmount: z.string().optional(),
});

export default function Retirees() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRetiree, setSelectedRetiree] = useState<Retiree | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [benefitFilter, setBenefitFilter] = useState<string>("");

  // Fetch retirees
  const { data: retirees = [], isLoading } = useQuery({
    queryKey: ["/api/retirees"],
  });

  // Add retiree mutation
  const addRetiree = useMutation({
    mutationFn: async (data: InsertRetiree) => {
      return await apiRequest("/api/retirees", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retirees"] });
      setIsAddDialogOpen(false);
      toast({ title: "Retiree added successfully" });
    },
    onError: (error) => {
      toast({ title: "Error adding retiree", description: error.message, variant: "destructive" });
    },
  });

  // Update retiree mutation
  const updateRetiree = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertRetiree> }) => {
      return await apiRequest(`/api/retirees/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retirees"] });
      setIsEditDialogOpen(false);
      toast({ title: "Retiree updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating retiree", description: error.message, variant: "destructive" });
    },
  });

  // Delete retiree mutation
  const deleteRetiree = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/retirees/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retirees"] });
      toast({ title: "Retiree deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting retiree", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof retireeFormSchema>>({
    resolver: zodResolver(retireeFormSchema),
    defaultValues: {
      employeeId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      retirementDate: "",
      yearsOfService: 0,
      pensionPlan: "",
      pensionAmount: "",
      healthInsurance: "",
      healthInsurancePremium: "",
      dentalInsurance: "",
      visionInsurance: "",
      lifeInsurance: "",
      lifeInsuranceAmount: "",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
      medicarePartA: false,
      medicarePartB: false,
      medicarePartD: false,
      medicareNumber: "",
      notes: "",
    },
  });

  const onSubmit = (data: z.infer<typeof retireeFormSchema>) => {
    const formattedData: InsertRetiree = {
      ...data,
      retirementDate: new Date(data.retirementDate),
      pensionAmount: data.pensionAmount ? parseFloat(data.pensionAmount) : undefined,
      healthInsurancePremium: data.healthInsurancePremium ? parseFloat(data.healthInsurancePremium) : undefined,
      lifeInsuranceAmount: data.lifeInsuranceAmount ? parseFloat(data.lifeInsuranceAmount) : undefined,
    };

    if (selectedRetiree) {
      updateRetiree.mutate({ id: selectedRetiree.id, data: formattedData });
    } else {
      addRetiree.mutate(formattedData);
    }
  };

  const handleEdit = (retiree: Retiree) => {
    setSelectedRetiree(retiree);
    form.reset({
      employeeId: retiree.employeeId,
      firstName: retiree.firstName,
      lastName: retiree.lastName,
      email: retiree.email || "",
      phone: retiree.phone || "",
      retirementDate: retiree.retirementDate ? new Date(retiree.retirementDate).toISOString().split('T')[0] : "",
      yearsOfService: retiree.yearsOfService || 0,
      pensionPlan: retiree.pensionPlan || "",
      pensionAmount: retiree.pensionAmount ? retiree.pensionAmount.toString() : "",
      healthInsurance: retiree.healthInsurance || "",
      healthInsurancePremium: retiree.healthInsurancePremium ? retiree.healthInsurancePremium.toString() : "",
      dentalInsurance: retiree.dentalInsurance || "",
      visionInsurance: retiree.visionInsurance || "",
      lifeInsurance: retiree.lifeInsurance || "",
      lifeInsuranceAmount: retiree.lifeInsuranceAmount ? retiree.lifeInsuranceAmount.toString() : "",
      address: retiree.address || "",
      emergencyContactName: retiree.emergencyContactName || "",
      emergencyContactPhone: retiree.emergencyContactPhone || "",
      emergencyContactRelation: retiree.emergencyContactRelation || "",
      medicarePartA: retiree.medicarePartA || false,
      medicarePartB: retiree.medicarePartB || false,
      medicarePartD: retiree.medicarePartD || false,
      medicareNumber: retiree.medicareNumber || "",
      notes: retiree.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedRetiree(null);
    form.reset();
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this retiree record?")) {
      deleteRetiree.mutate(id);
    }
  };

  // Filter retirees based on search and benefit filter
  const filteredRetirees = retirees.filter((retiree: Retiree) => {
    const matchesSearch = 
      retiree.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retiree.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retiree.employeeId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = !benefitFilter || benefitFilter === "all" ||
      (benefitFilter === "pension" && retiree.pensionPlan) ||
      (benefitFilter === "health" && retiree.healthInsurance) ||
      (benefitFilter === "medicare" && (retiree.medicarePartA || retiree.medicarePartB || retiree.medicarePartD));

    return matchesSearch && matchesFilter;
  });

  const RetireeForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="benefits">Benefits</TabsTrigger>
            <TabsTrigger value="medicare">Medicare</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl>
                      <Input placeholder="EMP001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="yearsOfService"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years of Service</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="25" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@school.edu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="retirementDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retirement Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          
          <TabsContent value="benefits" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pensionPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pension Plan</FormLabel>
                    <FormControl>
                      <Input placeholder="Teachers' Retirement System" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pensionAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Pension Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="2500.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="healthInsurance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Health Insurance Plan</FormLabel>
                    <FormControl>
                      <Input placeholder="Blue Cross Blue Shield" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="healthInsurancePremium"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Health Premium</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="450.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="dentalInsurance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dental Insurance</FormLabel>
                    <FormControl>
                      <Input placeholder="Delta Dental" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visionInsurance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vision Insurance</FormLabel>
                    <FormControl>
                      <Input placeholder="VSP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lifeInsurance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Life Insurance</FormLabel>
                    <FormControl>
                      <Input placeholder="MetLife" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="lifeInsuranceAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Life Insurance Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="50000.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          
          <TabsContent value="medicare" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="medicarePartA"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Medicare Part A</FormLabel>
                        <p className="text-sm text-muted-foreground">Hospital Insurance</p>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="medicarePartB"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Medicare Part B</FormLabel>
                        <p className="text-sm text-muted-foreground">Medical Insurance</p>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="medicarePartD"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Medicare Part D</FormLabel>
                        <p className="text-sm text-muted-foreground">Prescription Drug</p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="medicareNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medicare Number</FormLabel>
                    <FormControl>
                      <Input placeholder="1EG4-TE5-MK73" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="contact" className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="123 Main St, City, State 12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 987-6543" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactRelation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
                    <FormControl>
                      <Input placeholder="Spouse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes or special instructions..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
          }}>
            Cancel
          </Button>
          <Button type="submit" disabled={addRetiree.isPending || updateRetiree.isPending}>
            {selectedRetiree ? "Update Retiree" : "Add Retiree"}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Retirees</h1>
          <p className="text-gray-600">Manage retiree benefit information and records</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Retiree
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search retirees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={benefitFilter} onValueChange={setBenefitFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by benefit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Benefits</SelectItem>
            <SelectItem value="pension">Has Pension</SelectItem>
            <SelectItem value="health">Has Health Insurance</SelectItem>
            <SelectItem value="medicare">Has Medicare</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Retirees</p>
                <p className="text-2xl font-bold">{retirees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">With Pension</p>
                <p className="text-2xl font-bold">{retirees.filter((r: Retiree) => r.pensionPlan).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Health Insurance</p>
                <p className="text-2xl font-bold">{retirees.filter((r: Retiree) => r.healthInsurance).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Medicare Enrolled</p>
                <p className="text-2xl font-bold">{retirees.filter((r: Retiree) => r.medicarePartA || r.medicarePartB || r.medicarePartD).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retirees List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredRetirees.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No retirees found</p>
          </div>
        ) : (
          filteredRetirees.map((retiree: Retiree) => (
            <Card key={retiree.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{retiree.firstName} {retiree.lastName}</CardTitle>
                    <CardDescription>ID: {retiree.employeeId}</CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(retiree)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(retiree.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>Retired: {retiree.retirementDate ? new Date(retiree.retirementDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                
                {retiree.email && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{retiree.email}</span>
                  </div>
                )}
                
                {retiree.phone && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{retiree.phone}</span>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-1 mt-2">
                  {retiree.pensionPlan && (
                    <Badge variant="outline" className="text-xs">
                      <DollarSign className="h-3 w-3 mr-1" />
                      Pension
                    </Badge>
                  )}
                  {retiree.healthInsurance && (
                    <Badge variant="outline" className="text-xs">
                      <Heart className="h-3 w-3 mr-1" />
                      Health
                    </Badge>
                  )}
                  {(retiree.medicarePartA || retiree.medicarePartB || retiree.medicarePartD) && (
                    <Badge variant="outline" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Medicare
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Retiree Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Retiree</DialogTitle>
          </DialogHeader>
          <RetireeForm />
        </DialogContent>
      </Dialog>

      {/* Edit Retiree Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Retiree</DialogTitle>
          </DialogHeader>
          <RetireeForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}