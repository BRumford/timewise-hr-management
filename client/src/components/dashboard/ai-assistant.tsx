import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";

export default function AIAssistant() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Assistant</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Bot className="text-white" size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">
                I've processed 15 documents today and identified 3 items requiring attention:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                <li>• Missing background check for new hire</li>
                <li>• Certification expiring for 2 teachers</li>
                <li>• Incomplete substitute application</li>
              </ul>
            </div>
          </div>
        </div>
        <Button variant="outline" className="w-full">
          View Detailed Report
        </Button>
      </CardContent>
    </Card>
  );
}
