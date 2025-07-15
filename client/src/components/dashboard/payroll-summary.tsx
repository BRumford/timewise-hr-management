import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export default function PayrollSummary() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["/api/payroll/summary"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payroll Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                <div className="h-4 bg-gray-300 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const getCurrentPeriod = () => {
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();
    return `${month} 1-30, ${year}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Current Period</span>
            <span className="text-sm font-medium text-gray-900">{getCurrentPeriod()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Payroll</span>
            <span className="text-lg font-bold text-green-600">
              {formatCurrency(summary?.totalPayroll)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Employees Paid</span>
            <span className="text-sm font-medium text-gray-900">{summary?.employeeCount || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Deductions</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(summary?.totalDeductions)}
            </span>
          </div>
          <div className="pt-4 border-t border-gray-200">
            <Button className="w-full bg-primary hover:bg-blue-700">
              Process Payroll
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
