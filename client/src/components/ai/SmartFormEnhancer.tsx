import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, CheckCircle, AlertTriangle, Loader2, Lightbulb } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SmartFormEnhancerProps {
  formType: string;
  employeeData?: any;
  formData?: any;
  onPrefillData?: (data: any) => void;
  onSuggestions?: (suggestions: any[]) => void;
  className?: string;
}

export function SmartFormEnhancer({
  formType,
  employeeData,
  formData,
  onPrefillData,
  onSuggestions,
  className
}: SmartFormEnhancerProps) {
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [lastSuggestions, setLastSuggestions] = useState<any[]>([]);

  const enhanceFormMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/ai/enhance-form", "POST", data);
    },
    onSuccess: (result) => {
      if (result.success) {
        setIsEnhanced(true);
        if (onPrefillData && result.prefillData) {
          onPrefillData(result.prefillData);
        }
        if (result.suggestions) {
          setLastSuggestions(result.suggestions);
          if (onSuggestions) {
            onSuggestions(result.suggestions);
          }
        }
      }
    }
  });

  const handleEnhanceForm = async () => {
    enhanceFormMutation.mutate({
      formType,
      employeeData: employeeData || {},
      formData: formData || {}
    });
  };

  // Auto-enhance form when data changes
  useEffect(() => {
    if (formType && !isEnhanced && (employeeData || formData)) {
      const timer = setTimeout(() => {
        handleEnhanceForm();
      }, 1000); // Debounce auto-enhancement

      return () => clearTimeout(timer);
    }
  }, [formType, employeeData, formData]);

  const confidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const suggestionColor = (suggestion: any) => {
    switch (suggestion.reason) {
      case 'compliance': return "border-l-red-500";
      case 'efficiency': return "border-l-blue-500";
      case 'accuracy': return "border-l-green-500";
      default: return "border-l-gray-500";
    }
  };

  return (
    <div className={className}>
      {/* Enhancement Trigger */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleEnhanceForm}
          disabled={enhanceFormMutation.isPending || !formType}
          className="flex items-center gap-2"
        >
          {enhanceFormMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {enhanceFormMutation.isPending ? "Enhancing..." : "AI Enhance Form"}
        </Button>
        
        {isEnhanced && enhanceFormMutation.data?.confidence && (
          <Badge 
            variant="outline" 
            className={`${confidenceColor(enhanceFormMutation.data.confidence)}`}
          >
            {Math.round(enhanceFormMutation.data.confidence * 100)}% Confidence
          </Badge>
        )}
      </div>

      {/* Enhancement Results */}
      {enhanceFormMutation.data && enhanceFormMutation.data.success && (
        <div className="space-y-3">
          {/* Success Message */}
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Form enhanced with AI assistance! 
              {enhanceFormMutation.data.prefillData && 
                Object.keys(enhanceFormMutation.data.prefillData).length > 0 && (
                  <span className="ml-1">
                    {Object.keys(enhanceFormMutation.data.prefillData).length} fields pre-filled.
                  </span>
                )}
            </AlertDescription>
          </Alert>

          {/* Compliance Status */}
          {enhanceFormMutation.data.compliance && (
            <Alert className={`${
              enhanceFormMutation.data.isCompliant 
                ? "border-green-200 bg-green-50" 
                : "border-red-200 bg-red-50"
            }`}>
              {enhanceFormMutation.data.isCompliant ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={
                enhanceFormMutation.data.isCompliant ? "text-green-800" : "text-red-800"
              }>
                {enhanceFormMutation.data.isCompliant 
                  ? "All compliance requirements met" 
                  : `${enhanceFormMutation.data.compliance.violations?.length || 0} compliance issues detected`}
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Warnings */}
          {enhanceFormMutation.data.warnings?.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <div className="space-y-1">
                  <p className="font-medium">Validation Warnings:</p>
                  {enhanceFormMutation.data.warnings.map((warning: any, index: number) => (
                    <p key={index} className="text-sm">• {warning.message}</p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* AI Suggestions */}
      {lastSuggestions.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lastSuggestions.map((suggestion, index) => (
              <div 
                key={index}
                className={`p-3 border-l-4 bg-gray-50 rounded-r ${suggestionColor(suggestion)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{suggestion.field}</p>
                    <p className="text-sm text-gray-600">{suggestion.suggestion}</p>
                    {suggestion.reason && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {suggestion.reason}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {enhanceFormMutation.isError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to enhance form. AI assistance is temporarily unavailable.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default SmartFormEnhancer;