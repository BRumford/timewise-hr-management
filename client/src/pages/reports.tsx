import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  FileText,
  Download,
  Filter,
  Eye,
  Receipt,
  Calculator,
  Heart
} from "lucide-react";

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: payrollSummary, isLoading: payrollLoading } = useQuery({
    queryKey: ["/api/payroll/summary"],
  });

  const { data: leaveRequests, isLoading: leaveLoading } = useQuery({
    queryKey: ["/api/leave-requests"],
  });

  // Payroll Reports Queries
  const { data: payrollSummaryReport, isLoading: payrollSummaryLoading } = useQuery({
    queryKey: ["/api/payroll/reports/summary", dateRange.startDate, dateRange.endDate],
    queryFn: () => fetch(`/api/payroll/reports/summary?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
      credentials: 'include'
    }).then(res => res.json()),
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });

  const { data: taxLiabilityReport, isLoading: taxLiabilityLoading } = useQuery({
    queryKey: ["/api/payroll/reports/tax-liability", dateRange.startDate, dateRange.endDate],
    queryFn: () => fetch(`/api/payroll/reports/tax-liability?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
      credentials: 'include'
    }).then(res => res.json()),
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });

  const { data: benefitsReport, isLoading: benefitsLoading } = useQuery({
    queryKey: ["/api/payroll/reports/benefits", dateRange.startDate, dateRange.endDate],
    queryFn: () => fetch(`/api/payroll/reports/benefits?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
      credentials: 'include'
    }).then(res => res.json()),
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const handleExport = async (reportType: string) => {
    try {
      const url = `/api/payroll/reports/${reportType}/export?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${reportType}-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed. Please try again.`);
    }
  };

  const reports = [
    {
      id: 1,
      name: 'Employee Demographics Report',
      description: 'Detailed breakdown of employee distribution by department, type, and status',
      type: 'Operational',
      lastGenerated: '2024-01-15',
      size: '2.4 MB',
      format: 'PDF',
      status: 'ready'
    },
    {
      id: 2,
      name: 'Payroll Summary Report',
      description: 'Monthly payroll breakdown including gross pay, deductions, and net pay',
      type: 'Financial',
      lastGenerated: '2024-01-14',
      size: '1.8 MB',
      format: 'Excel',
      status: 'ready'
    },
    {
      id: 3,
      name: 'Leave Analytics Report',
      description: 'Leave patterns, utilization rates, and seasonal trends analysis',
      type: 'Analytics',
      lastGenerated: '2024-01-13',
      size: '3.2 MB',
      format: 'PDF',
      status: 'ready'
    },
    {
      id: 4,
      name: 'Substitute Assignment Report',
      description: 'Substitute teacher assignments, availability, and performance metrics',
      type: 'Operational',
      lastGenerated: '2024-01-12',
      size: '1.5 MB',
      format: 'Excel',
      status: 'generating'
    },
    {
      id: 5,
      name: 'Onboarding Efficiency Report',
      description: 'Time-to-complete analysis and onboarding workflow optimization insights',
      type: 'Analytics',
      lastGenerated: '2024-01-11',
      size: '2.1 MB',
      format: 'PDF',
      status: 'ready'
    },
    {
      id: 6,
      name: 'Document Processing Report',
      description: 'AI processing statistics, compliance rates, and document approval timelines',
      type: 'Compliance',
      lastGenerated: '2024-01-10',
      size: '1.9 MB',
      format: 'Excel',
      status: 'ready'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Financial':
        return 'bg-purple-100 text-purple-800';
      case 'Analytics':
        return 'bg-blue-100 text-blue-800';
      case 'Operational':
        return 'bg-green-100 text-green-800';
      case 'Compliance':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (statsLoading || employeesLoading || payrollLoading || leaveLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-300 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-300 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-16 bg-gray-300 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <Button className="bg-primary hover:bg-blue-700">
          <BarChart3 className="mr-2" size={16} />
          Generate Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalEmployees || 0}</p>
                <p className="text-xs text-green-600">+5% from last month</p>
              </div>
              <Users className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payroll</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(payrollSummary?.totalPayroll)}
                </p>
                <p className="text-xs text-green-600">+2.3% from last month</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Leave Requests</p>
                <p className="text-2xl font-bold text-blue-600">{leaveRequests?.length || 0}</p>
                <p className="text-xs text-blue-600">This month</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Efficiency Score</p>
                <p className="text-2xl font-bold text-purple-600">94%</p>
                <p className="text-xs text-green-600">+1.2% improvement</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Employee Distribution by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Teachers</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '77%' }}></div>
                  </div>
                  <span className="text-sm text-gray-900">{stats?.teachers || 0}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Support Staff</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '13%' }}></div>
                  </div>
                  <span className="text-sm text-gray-900">{stats?.supportStaff || 0}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Administrators</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '10%' }}></div>
                  </div>
                  <span className="text-sm text-gray-900">{stats?.administrators || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">New Hires</span>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-900">12 this month</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Leave Utilization</span>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-900">68% average</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Substitute Coverage</span>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-gray-900">96% success rate</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Reports */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Available Reports</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2" size={16} />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2" size={16} />
                Export All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Generated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{report.name}</div>
                          <div className="text-sm text-gray-500">{report.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getTypeColor(report.type)}>
                        {report.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.lastGenerated}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.size}</div>
                      <div className="text-sm text-gray-500">{report.format}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" disabled={report.status !== 'ready'}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" disabled={report.status !== 'ready'}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Reports Section */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Payroll Reports</CardTitle>
            <div className="flex space-x-4 mt-4">
              <div className="flex-1">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">
                  <Receipt className="w-4 h-4 mr-2" />
                  Payroll Summary
                </TabsTrigger>
                <TabsTrigger value="tax">
                  <Calculator className="w-4 h-4 mr-2" />
                  Tax Liabilities
                </TabsTrigger>
                <TabsTrigger value="benefits">
                  <Heart className="w-4 h-4 mr-2" />
                  Benefits Report
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Employees</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {payrollSummaryLoading ? "Loading..." : payrollSummaryReport?.summary?.totalEmployees || 0}
                          </p>
                        </div>
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Gross Pay</p>
                          <p className="text-2xl font-bold text-green-600">
                            {payrollSummaryLoading ? "Loading..." : formatCurrency(payrollSummaryReport?.summary?.totalGrossPay || 0)}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Deductions</p>
                          <p className="text-2xl font-bold text-red-600">
                            {payrollSummaryLoading ? "Loading..." : formatCurrency(payrollSummaryReport?.summary?.totalDeductions || 0)}
                          </p>
                        </div>
                        <Calculator className="h-8 w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Net Pay</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {payrollSummaryLoading ? "Loading..." : formatCurrency(payrollSummaryReport?.summary?.totalNetPay || 0)}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6">
                  <Button className="w-full" onClick={() => handleExport('summary')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Payroll Summary Report
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="tax" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Federal Tax</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {taxLiabilityLoading ? "Loading..." : formatCurrency(taxLiabilityReport?.federalTax || 0)}
                          </p>
                        </div>
                        <Calculator className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">State Tax</p>
                          <p className="text-2xl font-bold text-green-600">
                            {taxLiabilityLoading ? "Loading..." : formatCurrency(taxLiabilityReport?.stateTax || 0)}
                          </p>
                        </div>
                        <Calculator className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Social Security</p>
                          <p className="text-2xl font-bold text-yellow-600">
                            {taxLiabilityLoading ? "Loading..." : formatCurrency(taxLiabilityReport?.socialSecurityTax || 0)}
                          </p>
                        </div>
                        <Calculator className="h-8 w-8 text-yellow-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Medicare Tax</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {taxLiabilityLoading ? "Loading..." : formatCurrency(taxLiabilityReport?.medicareTax || 0)}
                          </p>
                        </div>
                        <Calculator className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Unemployment Tax</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {taxLiabilityLoading ? "Loading..." : formatCurrency(taxLiabilityReport?.unemploymentTax || 0)}
                          </p>
                        </div>
                        <Calculator className="h-8 w-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Tax Liability</p>
                          <p className="text-2xl font-bold text-red-600">
                            {taxLiabilityLoading ? "Loading..." : formatCurrency(taxLiabilityReport?.totalTaxLiability || 0)}
                          </p>
                        </div>
                        <Calculator className="h-8 w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6">
                  <Button className="w-full" onClick={() => handleExport('tax-liability')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Tax Liability Report
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="benefits" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Employees</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {benefitsLoading ? "Loading..." : benefitsReport?.totalEmployees || 0}
                          </p>
                        </div>
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Benefit Deductions</p>
                          <p className="text-2xl font-bold text-green-600">
                            {benefitsLoading ? "Loading..." : formatCurrency(benefitsReport?.totalBenefitDeductions || 0)}
                          </p>
                        </div>
                        <Heart className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6">
                  <Button className="w-full" onClick={() => handleExport('benefits')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Benefits Report
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
