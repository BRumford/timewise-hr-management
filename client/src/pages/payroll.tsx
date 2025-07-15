import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  DollarSign, 
  Users, 
  Calculator, 
  TrendingUp, 
  Calendar, 
  Settings, 
  FileText,
  Receipt,
  CreditCard,
  Building,
  Percent
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Payroll() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [showTaxConfigDialog, setShowTaxConfigDialog] = useState(false);
  const [showBenefitDialog, setShowBenefitDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  
  const [processData, setProcessData] = useState({
    payPeriodStart: '',
    payPeriodEnd: '',
    payDate: '',
    employeeType: 'all',
    notes: ''
  });
  
  const [taxConfig, setTaxConfig] = useState({
    taxType: '',
    employeeType: 'all',
    taxRate: '',
    maxTaxableIncome: '',
    minTaxableIncome: '',
    description: '',
    effectiveDate: ''
  });

  const [benefitData, setBenefitData] = useState({
    employeeId: '',
    benefitType: '',
    planName: '',
    coverageType: '',
    employeeContribution: '',
    employerContribution: '',
    deductionFrequency: 'bi-weekly',
    effectiveDate: ''
  });

  const { data: payrollRecords, isLoading } = useQuery({
    queryKey: ["/api/payroll"],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/payroll/summary"],
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: timeCards } = useQuery({
    queryKey: ["/api/time-cards"],
  });

  const { data: taxConfigs } = useQuery({
    queryKey: ["/api/tax-configs"],
  });

  const { data: benefitElections } = useQuery({
    queryKey: ["/api/benefit-elections"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees?.find((emp: any) => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
  };

  // Calculate taxes and deductions
  const calculatePayroll = (employee: any, hoursWorked: number, overtimeHours: number) => {
    const hourlyRate = parseFloat(employee.salary) || 0;
    const regularHours = Math.max(0, hoursWorked - overtimeHours);
    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * hourlyRate * 1.5;
    const grossPay = regularPay + overtimePay;

    // Calculate taxes based on tax configs
    const federalTax = grossPay * 0.12; // 12% federal tax
    const stateTax = grossPay * 0.05; // 5% state tax  
    const socialSecurityTax = grossPay * 0.062; // 6.2% social security
    const medicareTax = grossPay * 0.0145; // 1.45% medicare

    // Calculate benefits (example deductions)
    const healthInsurance = 150; // Fixed amount
    const retirement401k = grossPay * 0.05; // 5% of gross pay

    const totalDeductions = federalTax + stateTax + socialSecurityTax + medicareTax + healthInsurance + retirement401k;
    const netPay = grossPay - totalDeductions;

    return {
      regularPay,
      overtimePay,
      grossPay,
      federalTax,
      stateTax,
      socialSecurityTax,
      medicareTax,
      healthInsurance,
      retirement401k,
      totalDeductions,
      netPay
    };
  };

  // Process payroll mutation
  const processPayrollMutation = useMutation({
    mutationFn: async (data: any) => {
      const approvedTimeCards = timeCards?.filter((card: any) => 
        card.status === 'approved' && 
        new Date(card.clockInTime) >= new Date(data.payPeriodStart) &&
        new Date(card.clockInTime) <= new Date(data.payPeriodEnd)
      );

      const payrollPromises = approvedTimeCards?.map(async (timeCard: any) => {
        const employee = employees?.find((emp: any) => emp.id === timeCard.employeeId);
        if (!employee) return null;

        const payrollCalc = calculatePayroll(employee, timeCard.totalHours || 0, timeCard.overtimeHours || 0);

        return apiRequest('/api/payroll', 'POST', {
          employeeId: timeCard.employeeId,
          payPeriodStart: data.payPeriodStart,
          payPeriodEnd: data.payPeriodEnd,
          payDate: data.payDate,
          hoursWorked: timeCard.totalHours || 0,
          overtimeHours: timeCard.overtimeHours || 0,
          regularPay: payrollCalc.regularPay.toString(),
          overtimePay: payrollCalc.overtimePay.toString(),
          grossPay: payrollCalc.grossPay.toString(),
          federalTax: payrollCalc.federalTax.toString(),
          stateTax: payrollCalc.stateTax.toString(),
          socialSecurityTax: payrollCalc.socialSecurityTax.toString(),
          medicareTax: payrollCalc.medicareTax.toString(),
          healthInsurance: payrollCalc.healthInsurance.toString(),
          retirement401k: payrollCalc.retirement401k.toString(),
          totalDeductions: payrollCalc.totalDeductions.toString(),
          netPay: payrollCalc.netPay.toString(),
          status: 'processed',
          notes: data.notes
        });
      }) || [];

      const results = await Promise.allSettled(payrollPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      return { processedCount: successful, totalCards: approvedTimeCards?.length || 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll/summary'] });
      setShowProcessDialog(false);
      setProcessData({ payPeriodStart: '', payPeriodEnd: '', payDate: '', employeeType: 'all', notes: '' });
      toast({
        title: "Success",
        description: `Processed ${data.processedCount} of ${data.totalCards} time cards into payroll records.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to process payroll: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Tax configuration mutation
  const createTaxConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/tax-configs', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tax-configs'] });
      setShowTaxConfigDialog(false);
      setTaxConfig({ taxType: '', employeeType: 'all', taxRate: '', maxTaxableIncome: '', minTaxableIncome: '', description: '', effectiveDate: '' });
      toast({
        title: "Success",
        description: "Tax configuration created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create tax configuration: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Benefit election mutation
  const createBenefitMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/benefit-elections', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/benefit-elections'] });
      setShowBenefitDialog(false);
      setBenefitData({ employeeId: '', benefitType: '', planName: '', coverageType: '', employeeContribution: '', employerContribution: '', deductionFrequency: 'bi-weekly', effectiveDate: '' });
      toast({
        title: "Success",
        description: "Benefit election created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create benefit election: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleProcessPayroll = () => {
    if (!processData.payPeriodStart || !processData.payPeriodEnd || !processData.payDate) {
      toast({
        title: "Error",
        description: "Please select pay period dates and pay date.",
        variant: "destructive",
      });
      return;
    }
    processPayrollMutation.mutate(processData);
  };

  const handleCreateTaxConfig = () => {
    if (!taxConfig.taxType || !taxConfig.taxRate || !taxConfig.effectiveDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createTaxConfigMutation.mutate(taxConfig);
  };

  const handleCreateBenefit = () => {
    if (!benefitData.employeeId || !benefitData.benefitType || !benefitData.planName || !benefitData.employeeContribution || !benefitData.effectiveDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createBenefitMutation.mutate(benefitData);
  };

  if (isLoading || summaryLoading) {
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
        <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
        <div className="flex space-x-2">
          <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-blue-700">
                <Plus className="mr-2" size={16} />
                Process Payroll
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Process Payroll</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="payPeriodStart">Pay Period Start</Label>
                  <Input
                    id="payPeriodStart"
                    type="date"
                    value={processData.payPeriodStart}
                    onChange={(e) => setProcessData({...processData, payPeriodStart: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="payPeriodEnd">Pay Period End</Label>
                  <Input
                    id="payPeriodEnd"
                    type="date"
                    value={processData.payPeriodEnd}
                    onChange={(e) => setProcessData({...processData, payPeriodEnd: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="payDate">Pay Date</Label>
                  <Input
                    id="payDate"
                    type="date"
                    value={processData.payDate}
                    onChange={(e) => setProcessData({...processData, payDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="employeeType">Employee Type</Label>
                  <Select value={processData.employeeType} onValueChange={(value) => setProcessData({...processData, employeeType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      <SelectItem value="certificated">Certificated</SelectItem>
                      <SelectItem value="classified">Classified</SelectItem>
                      <SelectItem value="substitute">Substitute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Optional notes for this payroll batch..."
                    value={processData.notes}
                    onChange={(e) => setProcessData({...processData, notes: e.target.value})}
                  />
                </div>
                <Button 
                  onClick={handleProcessPayroll} 
                  className="w-full" 
                  disabled={processPayrollMutation.isPending}
                >
                  {processPayrollMutation.isPending ? "Processing..." : "Process Payroll"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showTaxConfigDialog} onOpenChange={setShowTaxConfigDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2" size={16} />
                Tax Setup
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tax Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="taxType">Tax Type</Label>
                  <Select value={taxConfig.taxType} onValueChange={(value) => setTaxConfig({...taxConfig, taxType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tax type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="federal">Federal Income Tax</SelectItem>
                      <SelectItem value="state">State Income Tax</SelectItem>
                      <SelectItem value="social_security">Social Security Tax</SelectItem>
                      <SelectItem value="medicare">Medicare Tax</SelectItem>
                      <SelectItem value="unemployment">Unemployment Tax</SelectItem>
                      <SelectItem value="disability">State Disability Tax</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 12.50"
                    value={taxConfig.taxRate}
                    onChange={(e) => setTaxConfig({...taxConfig, taxRate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="maxTaxableIncome">Max Taxable Income (Annual)</Label>
                  <Input
                    id="maxTaxableIncome"
                    type="number"
                    placeholder="e.g., 142800"
                    value={taxConfig.maxTaxableIncome}
                    onChange={(e) => setTaxConfig({...taxConfig, maxTaxableIncome: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="effectiveDate">Effective Date</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={taxConfig.effectiveDate}
                    onChange={(e) => setTaxConfig({...taxConfig, effectiveDate: e.target.value})}
                  />
                </div>
                <Button 
                  onClick={handleCreateTaxConfig} 
                  className="w-full" 
                  disabled={createTaxConfigMutation.isPending}
                >
                  {createTaxConfigMutation.isPending ? "Creating..." : "Create Tax Config"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Benefit Dialog */}
      <Dialog open={showBenefitDialog} onOpenChange={setShowBenefitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Employee Benefit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="employeeId">Employee</Label>
              <Select value={benefitData.employeeId} onValueChange={(value) => setBenefitData({...benefitData, employeeId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="benefitType">Benefit Type</Label>
              <Select value={benefitData.benefitType} onValueChange={(value) => setBenefitData({...benefitData, benefitType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select benefit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health">Health Insurance</SelectItem>
                  <SelectItem value="dental">Dental Insurance</SelectItem>
                  <SelectItem value="vision">Vision Insurance</SelectItem>
                  <SelectItem value="life">Life Insurance</SelectItem>
                  <SelectItem value="retirement">Retirement/401k</SelectItem>
                  <SelectItem value="hsa">Health Savings Account</SelectItem>
                  <SelectItem value="parking">Parking</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="planName">Plan Name</Label>
              <Input
                id="planName"
                placeholder="e.g., Blue Cross Blue Shield PPO"
                value={benefitData.planName}
                onChange={(e) => setBenefitData({...benefitData, planName: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="coverageType">Coverage Type</Label>
              <Select value={benefitData.coverageType} onValueChange={(value) => setBenefitData({...benefitData, coverageType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select coverage type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="spouse">Employee + Spouse</SelectItem>
                  <SelectItem value="children">Employee + Children</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="employeeContribution">Employee Contribution ($)</Label>
              <Input
                id="employeeContribution"
                type="number"
                step="0.01"
                placeholder="e.g., 150.00"
                value={benefitData.employeeContribution}
                onChange={(e) => setBenefitData({...benefitData, employeeContribution: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="employerContribution">Employer Contribution ($)</Label>
              <Input
                id="employerContribution"
                type="number"
                step="0.01"
                placeholder="e.g., 300.00"
                value={benefitData.employerContribution}
                onChange={(e) => setBenefitData({...benefitData, employerContribution: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="deductionFrequency">Deduction Frequency</Label>
              <Select value={benefitData.deductionFrequency} onValueChange={(value) => setBenefitData({...benefitData, deductionFrequency: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="effectiveDate">Effective Date</Label>
              <Input
                id="effectiveDate"
                type="date"
                value={benefitData.effectiveDate}
                onChange={(e) => setBenefitData({...benefitData, effectiveDate: e.target.value})}
              />
            </div>
            <Button 
              onClick={handleCreateBenefit} 
              className="w-full" 
              disabled={createBenefitMutation.isPending}
            >
              {createBenefitMutation.isPending ? "Creating..." : "Create Benefit Election"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payroll</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary?.totalPayroll || 0)}
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
                <p className="text-sm font-medium text-gray-600">Employees Paid</p>
                <p className="text-2xl font-bold text-blue-600">{summary?.employeeCount || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Deductions</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(summary?.totalDeductions || 0)}
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
                <p className="text-sm font-medium text-gray-600">Net Pay</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(summary?.totalNetPay || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payroll" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payroll">Payroll Records</TabsTrigger>
          <TabsTrigger value="taxes">Tax Configuration</TabsTrigger>
          <TabsTrigger value="benefits">Benefits & Deductions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Payroll Records</CardTitle>
                <Button variant="outline">
                  <FileText className="mr-2" size={16} />
                  Export Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pay Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gross Pay
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Taxes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net Pay
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payrollRecords?.map((record: any) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {getEmployeeName(record.employeeId)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(new Date(record.payPeriodStart), 'MMM dd')} - {format(new Date(record.payPeriodEnd), 'MMM dd, yyyy')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {record.hoursWorked}
                            {record.overtimeHours > 0 && (
                              <span className="text-orange-600 ml-1">({record.overtimeHours} OT)</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(parseFloat(record.grossPay))}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(parseFloat(record.totalDeductions))}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(parseFloat(record.netPay))}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={record.status === 'processed' ? 'default' : 'secondary'}>
                            {record.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="taxes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Tax Configurations</CardTitle>
                <Button onClick={() => setShowTaxConfigDialog(true)}>
                  <Plus className="mr-2" size={16} />
                  Add Tax Config
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {taxConfigs?.map((config: any) => (
                  <Card key={config.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 capitalize">
                          {config.taxType.replace('_', ' ')} Tax
                        </h4>
                        <Badge variant={config.isActive ? 'default' : 'secondary'}>
                          {config.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Rate: {(parseFloat(config.taxRate) * 100).toFixed(2)}%</p>
                        <p>Employee Type: {config.employeeType}</p>
                        {config.maxTaxableIncome && (
                          <p>Max Income: {formatCurrency(parseFloat(config.maxTaxableIncome))}</p>
                        )}
                        <p>Effective: {format(new Date(config.effectiveDate), 'MMM dd, yyyy')}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="benefits" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Employee Benefits & Deductions</CardTitle>
                <Button onClick={() => setShowBenefitDialog(true)}>
                  <Plus className="mr-2" size={16} />
                  Add Benefit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {benefitElections?.map((benefit: any) => (
                  <Card key={benefit.id} className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 capitalize">
                          {benefit.benefitType.replace('_', ' ')} - {benefit.planName}
                        </h4>
                        <Badge variant={benefit.isActive ? 'default' : 'secondary'}>
                          {benefit.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Employee: {getEmployeeName(benefit.employeeId)}</p>
                        <p>Coverage: {benefit.coverageType}</p>
                        <p>Employee Contribution: ${benefit.employeeContribution}</p>
                        <p>Employer Contribution: ${benefit.employerContribution || 0}</p>
                        <p>Frequency: {benefit.deductionFrequency}</p>
                        <p>Effective: {format(new Date(benefit.effectiveDate), 'MMM dd, yyyy')}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!benefitElections || benefitElections.length === 0) && (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    <Building className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">No Benefits Configured</h3>
                    <p>Set up health insurance, retirement plans, and other employee benefits.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}