import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User, Save, ArrowLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Employee } from "@shared/schema";

interface MonthlyTimecard {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: string;
  entries: MonthlyTimecardEntry[];
}

interface MonthlyTimecardEntry {
  id: number;
  timecardId: number;
  date: string;
  regularHours: number;
  overtimeHours: number;
  extraHours: number;
  leaveHours: number;
  leaveType: string;
  notes: string;
}

const leaveTypes = [
  { value: "sick", label: "Sick Leave" },
  { value: "vacation", label: "Vacation" },
  { value: "personal", label: "Personal Leave" },
  { value: "bereavement", label: "Bereavement" },
  { value: "jury", label: "Jury Duty" },
  { value: "medical", label: "Medical Leave" },
  { value: "emergency", label: "Emergency Leave" }
];

export default function MonthlyTimecard() {
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [timecardData, setTimecardData] = useState<MonthlyTimecard | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees for selection
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  // Fetch or create monthly timecard for selected employee
  const { data: monthlyTimecard, refetch: refetchTimecard } = useQuery({
    queryKey: ["/api/monthly-timecard", selectedEmployee, currentMonth, currentYear],
    enabled: !!selectedEmployee,
  });

  // Create or update timecard mutation
  const saveTimecardMutation = useMutation({
    mutationFn: async (data: any) => {
      if (timecardData?.id) {
        return await apiRequest(`/api/monthly-timecard/${timecardData.id}`, 'PUT', data);
      } else {
        return await apiRequest("/api/monthly-timecard", 'POST', data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Monthly timecard saved successfully",
      });
      refetchTimecard();
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-timecard"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save monthly timecard",
        variant: "destructive",
      });
    }
  });

  // Initialize timecard data when monthlyTimecard is loaded
  useEffect(() => {
    if (monthlyTimecard) {
      setTimecardData(monthlyTimecard);
    } else if (selectedEmployee) {
      // Create new timecard structure
      const newTimecard: MonthlyTimecard = {
        id: 0,
        employeeId: selectedEmployee,
        month: currentMonth,
        year: currentYear,
        payPeriodStart: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`,
        payPeriodEnd: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${new Date(currentYear, currentMonth, 0).getDate()}`,
        status: 'draft',
        entries: []
      };
      setTimecardData(newTimecard);
    }
  }, [monthlyTimecard, selectedEmployee, currentMonth, currentYear]);

  // Update entry data
  const updateEntry = (date: string, field: string, value: any) => {
    if (!timecardData) return;

    const updatedEntries = [...timecardData.entries];
    const existingEntryIndex = updatedEntries.findIndex(entry => entry.date === date);

    if (existingEntryIndex >= 0) {
      updatedEntries[existingEntryIndex] = {
        ...updatedEntries[existingEntryIndex],
        [field]: value
      };
    } else {
      updatedEntries.push({
        id: 0,
        timecardId: timecardData.id,
        date,
        regularHours: field === 'regularHours' ? value : 0,
        overtimeHours: field === 'overtimeHours' ? value : 0,
        extraHours: field === 'extraHours' ? value : 0,
        leaveHours: field === 'leaveHours' ? value : 0,
        leaveType: field === 'leaveType' ? value : '',
        notes: field === 'notes' ? value : ''
      });
    }

    setTimecardData({
      ...timecardData,
      entries: updatedEntries
    });
  };

  // Get entry for specific date
  const getEntryForDate = (date: string) => {
    return timecardData?.entries.find(entry => entry.date === date) || {
      id: 0,
      timecardId: 0,
      date,
      regularHours: 0,
      overtimeHours: 0,
      extraHours: 0,
      leaveHours: 0,
      leaveType: '',
      notes: ''
    };
  };

  // Save timecard
  const handleSave = () => {
    if (!timecardData) return;
    saveTimecardMutation.mutate(timecardData);
  };

  // Navigate months
  const previousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const days: Date[] = [];
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentYear, currentMonth - 1, i));
    }
    
    return days;
  };

  const days = generateCalendarDays();

  // Calculate totals
  const calculateTotals = () => {
    if (!timecardData) return { regular: 0, overtime: 0, extra: 0, leave: 0, total: 0 };
    
    const totals = timecardData.entries.reduce((acc, entry) => {
      acc.regular += parseFloat(entry.regularHours.toString()) || 0;
      acc.overtime += parseFloat(entry.overtimeHours.toString()) || 0;
      acc.extra += parseFloat(entry.extraHours.toString()) || 0;
      acc.leave += parseFloat(entry.leaveHours.toString()) || 0;
      return acc;
    }, { regular: 0, overtime: 0, extra: 0, leave: 0, total: 0 });

    totals.total = totals.regular + totals.overtime + totals.extra + totals.leave;
    return totals;
  };

  const totals = calculateTotals();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Calendar className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Monthly Timecard</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleSave} disabled={!timecardData || saveTimecardMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveTimecardMutation.isPending ? "Saving..." : "Save Timecard"}
          </Button>
        </div>
      </div>

      {/* Employee Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Employee Selection</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Label htmlFor="employee-select" className="text-sm font-medium">
              Select Employee:
            </Label>
            <Select value={selectedEmployee?.toString() || ""} onValueChange={(value) => setSelectedEmployee(parseInt(value))}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee: Employee) => (
                  <SelectItem key={employee.id} value={employee.id.toString()}>
                    {employee.firstName} {employee.lastName} - {employee.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedEmployee && (
        <>
          {/* Month Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>{new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={previousMonth}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextMonth}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-2 text-center font-semibold text-sm bg-gray-50 rounded">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {days.map((day) => {
                  const dateStr = day.toISOString().split('T')[0];
                  const entry = getEntryForDate(dateStr);
                  const today = new Date();
                  const isToday = day.toDateString() === today.toDateString();
                  const hasHours = entry.regularHours > 0 || entry.overtimeHours > 0 || entry.extraHours > 0 || entry.leaveHours > 0;
                  
                  return (
                    <div
                      key={dateStr}
                      className={`p-2 border rounded-lg min-h-[120px] bg-white ${
                        isToday ? 'ring-2 ring-blue-500' : ''
                      } ${hasHours ? 'bg-blue-50' : ''}`}
                    >
                      <div className="text-sm font-medium mb-1">
                        {day.getDate()}
                      </div>
                      
                      <div className="space-y-1">
                        {/* Regular Hours */}
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500">Reg:</span>
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            max="24"
                            value={entry.regularHours || ''}
                            onChange={(e) => updateEntry(dateStr, 'regularHours', parseFloat(e.target.value) || 0)}
                            className="h-6 text-xs p-1"
                            placeholder="0"
                          />
                        </div>
                        
                        {/* Overtime Hours */}
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500">OT:</span>
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            max="24"
                            value={entry.overtimeHours || ''}
                            onChange={(e) => updateEntry(dateStr, 'overtimeHours', parseFloat(e.target.value) || 0)}
                            className="h-6 text-xs p-1"
                            placeholder="0"
                          />
                        </div>
                        
                        {/* Extra Hours */}
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500">Ex:</span>
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            max="24"
                            value={entry.extraHours || ''}
                            onChange={(e) => updateEntry(dateStr, 'extraHours', parseFloat(e.target.value) || 0)}
                            className="h-6 text-xs p-1"
                            placeholder="0"
                          />
                        </div>
                        
                        {/* Leave Hours */}
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500">Lv:</span>
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            max="24"
                            value={entry.leaveHours || ''}
                            onChange={(e) => updateEntry(dateStr, 'leaveHours', parseFloat(e.target.value) || 0)}
                            className="h-6 text-xs p-1"
                            placeholder="0"
                          />
                        </div>
                        
                        {/* Leave Type */}
                        {entry.leaveHours > 0 && (
                          <Select value={entry.leaveType} onValueChange={(value) => updateEntry(dateStr, 'leaveType', value)}>
                            <SelectTrigger className="h-6 text-xs">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {leaveTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Totals Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totals.regular}</div>
                  <div className="text-sm text-gray-500">Regular Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{totals.overtime}</div>
                  <div className="text-sm text-gray-500">Overtime Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{totals.extra}</div>
                  <div className="text-sm text-gray-500">Extra Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{totals.leave}</div>
                  <div className="text-sm text-gray-500">Leave Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{totals.total}</div>
                  <div className="text-sm text-gray-500">Total Hours</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}