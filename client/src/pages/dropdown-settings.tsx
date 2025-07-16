import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, Settings, Code, DollarSign, MapPin, Package } from "lucide-react";

const dropdownOptionSchema = z.object({
  category: z.string().min(1, "Category is required"),
  value: z.string().min(1, "Value is required"),
  label: z.string().min(1, "Label is required"),
  description: z.string().optional(),
  displayOrder: z.number().min(0, "Display order must be 0 or greater").optional(),
  isActive: z.boolean().optional(),
});

type DropdownOption = {
  id: number;
  category: string;
  value: string;
  label: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const categoryConfig = {
  code: {
    label: "Code Options",
    description: "Time entry codes for different types of work",
    icon: Code,
    color: "bg-blue-500"
  },
  funding: {
    label: "Funding Sources",
    description: "Funding sources and budget codes",
    icon: DollarSign,
    color: "bg-green-500"
  },
  site: {
    label: "Site Locations",
    description: "School sites and work locations",
    icon: MapPin,
    color: "bg-red-500"
  },
  addon: {
    label: "Addon Types",
    description: "Additional pay and stipend types",
    icon: Package,
    color: "bg-purple-500"
  }
};

export default function DropdownSettings() {
  const [selectedCategory, setSelectedCategory] = useState<string>("code");
  const [editingOption, setEditingOption] = useState<DropdownOption | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch all dropdown options
  const { data: allOptions = [], isLoading } = useQuery({
    queryKey: ["/api/dropdown-options"],
  });

  // Group options by category
  const optionsByCategory = allOptions.reduce((acc: Record<string, DropdownOption[]>, option: DropdownOption) => {
    if (!acc[option.category]) {
      acc[option.category] = [];
    }
    acc[option.category].push(option);
    return acc;
  }, {});

  // Sort options by display order
  Object.keys(optionsByCategory).forEach(category => {
    optionsByCategory[category].sort((a, b) => a.displayOrder - b.displayOrder);
  });

  const createForm = useForm({
    resolver: zodResolver(dropdownOptionSchema),
    defaultValues: {
      category: selectedCategory,
      value: "",
      label: "",
      description: "",
      displayOrder: 0,
      isActive: true,
    },
  });

  const editForm = useForm({
    resolver: zodResolver(dropdownOptionSchema),
    defaultValues: {
      category: "",
      value: "",
      label: "",
      description: "",
      displayOrder: 0,
      isActive: true,
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof dropdownOptionSchema>) => {
      return await apiRequest("/api/dropdown-options", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dropdown-options"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Dropdown option created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create dropdown option",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof dropdownOptionSchema>> }) => {
      return await apiRequest(`/api/dropdown-options/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dropdown-options"] });
      setIsEditDialogOpen(false);
      setEditingOption(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Dropdown option updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update dropdown option",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/dropdown-options/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dropdown-options"] });
      toast({
        title: "Success",
        description: "Dropdown option deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete dropdown option",
        variant: "destructive",
      });
    },
  });

  const handleCreate = (data: z.infer<typeof dropdownOptionSchema>) => {
    createMutation.mutate({
      ...data,
      category: selectedCategory,
      displayOrder: data.displayOrder || (optionsByCategory[selectedCategory]?.length || 0) + 1,
    });
  };

  const handleEdit = (option: DropdownOption) => {
    setEditingOption(option);
    editForm.reset({
      category: option.category,
      value: option.value,
      label: option.label,
      description: option.description || "",
      displayOrder: option.displayOrder,
      isActive: option.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = (data: z.infer<typeof dropdownOptionSchema>) => {
    if (editingOption) {
      updateMutation.mutate({
        id: editingOption.id,
        data,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this dropdown option?")) {
      deleteMutation.mutate(id);
    }
  };

  const moveOption = async (option: DropdownOption, direction: 'up' | 'down') => {
    const categoryOptions = optionsByCategory[option.category] || [];
    const currentIndex = categoryOptions.findIndex(opt => opt.id === option.id);
    
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === categoryOptions.length - 1)
    ) {
      return;
    }

    const newOrder = direction === 'up' ? option.displayOrder - 1 : option.displayOrder + 1;
    const otherOption = categoryOptions[direction === 'up' ? currentIndex - 1 : currentIndex + 1];
    
    // Swap display orders
    await updateMutation.mutateAsync({
      id: option.id,
      data: { displayOrder: newOrder }
    });
    
    await updateMutation.mutateAsync({
      id: otherOption.id,
      data: { displayOrder: option.displayOrder }
    });
  };

  const toggleActive = (option: DropdownOption) => {
    updateMutation.mutate({
      id: option.id,
      data: { isActive: !option.isActive }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading dropdown options...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dropdown Options</h1>
          <p className="text-gray-600">Manage dropdown options for timecard fields</p>
        </div>
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-4">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger key={key} value={key} className="flex items-center space-x-2">
                <Icon className="h-4 w-4" />
                <span>{config.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(categoryConfig).map(([category, config]) => (
          <TabsContent key={category} value={category}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <config.icon className="h-5 w-5" />
                      <span>{config.label}</span>
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{config.description}</p>
                  </div>
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => createForm.setValue('category', category)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New {config.label} Option</DialogTitle>
                      </DialogHeader>
                      <Form {...createForm}>
                        <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
                          <FormField
                            control={createForm.control}
                            name="value"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Value</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter value (e.g., SUB, TITLE1)" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="label"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Label</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter display label" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Enter description" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="displayOrder"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Display Order</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="0" 
                                    {...field}
                                    onChange={e => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch 
                                    checked={field.value} 
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel>Active</FormLabel>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending}>
                              {createMutation.isPending ? "Creating..." : "Create"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {optionsByCategory[category]?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No options configured for this category
                    </div>
                  ) : (
                    optionsByCategory[category]?.map((option) => (
                      <div key={option.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() => moveOption(option, 'up')}
                              className="p-1 hover:bg-gray-100 rounded"
                              disabled={option.displayOrder === 1}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => moveOption(option, 'down')}
                              className="p-1 hover:bg-gray-100 rounded"
                              disabled={option.displayOrder === (optionsByCategory[category]?.length || 0)}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{option.label}</span>
                              <Badge variant="secondary">{option.value}</Badge>
                              <Badge variant={option.isActive ? "default" : "destructive"}>
                                {option.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            {option.description && (
                              <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(option)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {option.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(option)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(option.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Dropdown Option</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter value" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter display label" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Active</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}