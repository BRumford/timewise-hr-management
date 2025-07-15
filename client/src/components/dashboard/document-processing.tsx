import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Check, FileText, AlertTriangle } from "lucide-react";

export default function DocumentProcessing() {
  const { data: documents, isLoading } = useQuery({
    queryKey: ["/api/documents"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Processing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-32"></div>
                    <div className="h-3 bg-gray-300 rounded w-24"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-300 rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusCounts = () => {
    if (!documents) return { approved: 0, processed: 0, pending: 0 };
    
    return documents.reduce((acc: any, doc: any) => {
      if (doc.status === 'approved') acc.approved++;
      else if (doc.status === 'processed') acc.processed++;
      else if (doc.status === 'pending') acc.pending++;
      return acc;
    }, { approved: 0, processed: 0, pending: 0 });
  };

  const statusCounts = getStatusCounts();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Processing</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="text-green-600" size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Background Checks</p>
                <p className="text-xs text-gray-500">Processed automatically</p>
              </div>
            </div>
            <span className="text-sm font-medium text-green-600">
              {statusCounts.approved} completed
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="text-blue-600" size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Certifications</p>
                <p className="text-xs text-gray-500">Auto-verified</p>
              </div>
            </div>
            <span className="text-sm font-medium text-blue-600">
              {statusCounts.processed} verified
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-orange-600" size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Compliance Issues</p>
                <p className="text-xs text-gray-500">Requires attention</p>
              </div>
            </div>
            <span className="text-sm font-medium text-orange-600">
              {statusCounts.pending} pending
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
