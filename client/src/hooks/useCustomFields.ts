import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export interface CustomField {
  id: number;
  districtId: number;
  fieldName: string;
  originalFieldName: string;
  displayLabel: string;
  description?: string;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  isVisible: boolean;
  isEditable: boolean;
  category: string;
  section: string;
  displayOrder: number;
  fieldType: string;
  validationRules: any;
  options: any[];
  defaultValue?: string;
  maxLength?: number;
  minLength?: number;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormConfiguration {
  id: number;
  districtId: number;
  formName: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  layout: string;
  theme: string;
  customCSS?: string;
  submitButtonText: string;
  resetButtonText: string;
  sections: any[];
  workflows: any;
  permissions: any;
  notifications: any;
  validation: any;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Hook to get custom fields for a specific category and district
export function useCustomFields(category: string, districtId: number = 1) {
  return useQuery({
    queryKey: ["/api/custom-fields", districtId, category],
    queryFn: async () => {
      const response = await fetch(`/api/custom-fields/${districtId}/${category}`);
      if (!response.ok) throw new Error("Failed to fetch custom fields");
      return response.json() as Promise<CustomField[]>;
    },
    enabled: !!category && !!districtId,
  });
}

// Hook to get all custom fields for a district
export function useAllCustomFields(districtId: number = 1) {
  return useQuery({
    queryKey: ["/api/custom-fields", districtId],
    queryFn: async () => {
      const response = await fetch(`/api/custom-fields/${districtId}`);
      if (!response.ok) throw new Error("Failed to fetch custom fields");
      return response.json() as Promise<CustomField[]>;
    },
    enabled: !!districtId,
  });
}

// Hook to get form configuration
export function useFormConfiguration(formName: string, districtId: number = 1) {
  return useQuery({
    queryKey: ["/api/form-configurations", districtId, formName],
    queryFn: async () => {
      const response = await fetch(`/api/form-configurations/${districtId}/${formName}`);
      if (!response.ok) throw new Error("Failed to fetch form configuration");
      return response.json() as Promise<FormConfiguration>;
    },
    enabled: !!formName && !!districtId,
  });
}

// Hook to update custom field
export function useUpdateCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CustomField> & { id: number }) => {
      if (!id || isNaN(id)) {
        throw new Error('Invalid field ID provided');
      }
      const response = await fetch(`/api/custom-fields/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update custom field");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
    },
  });
}

// Hook to create custom field
export function useCreateCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<CustomField, "id" | "createdAt" | "updatedAt">) => {
      const response = await fetch("/api/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create custom field");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
    },
  });
}

// Hook to delete custom field
export function useDeleteCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!id || isNaN(id)) {
        throw new Error('Invalid field ID provided');
      }
      const response = await fetch(`/api/custom-fields/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete custom field");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
    },
  });
}

// Hook to update form configuration
export function useUpdateFormConfiguration() {
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<FormConfiguration> & { id: number }) => {
      const response = await fetch(`/api/form-configurations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update form configuration");
      return response.json();
    },
    onSuccess: (_, { districtId, formName }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-configurations", districtId, formName] });
    },
  });
}

// Utility function to get field label (fallback to original if no custom label)
export function getFieldLabel(
  fieldName: string, 
  customFields: CustomField[], 
  defaultLabel?: string
): string {
  const customField = customFields.find(field => 
    field.originalFieldName === fieldName || field.fieldName === fieldName
  );
  return customField?.displayLabel || defaultLabel || fieldName;
}

// Utility function to get field configuration
export function getFieldConfig(
  fieldName: string, 
  customFields: CustomField[]
): Partial<CustomField> | null {
  return customFields.find(field => 
    field.originalFieldName === fieldName || field.fieldName === fieldName
  ) || null;
}

// Utility function to check if field is required
export function isFieldRequired(
  fieldName: string, 
  customFields: CustomField[], 
  defaultRequired: boolean = false
): boolean {
  const customField = customFields.find(field => 
    field.originalFieldName === fieldName || field.fieldName === fieldName
  );
  return customField?.isRequired ?? defaultRequired;
}

// Utility function to check if field is visible
export function isFieldVisible(
  fieldName: string, 
  customFields: CustomField[], 
  defaultVisible: boolean = true
): boolean {
  const customField = customFields.find(field => 
    field.originalFieldName === fieldName || field.fieldName === fieldName
  );
  return customField?.isVisible ?? defaultVisible;
}