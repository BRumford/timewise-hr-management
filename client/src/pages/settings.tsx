import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  Users, 
  Bell, 
  Shield, 
  Database, 
  Zap, 
  Save,
  RefreshCw,
  AlertCircle,
  Activity
} from "lucide-react";
import SystemHealthMonitor from "@/components/SystemHealthMonitor";
import PayrollCalendar from "@/components/PayrollCalendar";
import { useState, useEffect } from "react";
import { useRolePermissionsManagement } from "@/hooks/useRolePermissions";
import { useToast } from "@/hooks/use-toast";
import type { RolePermission } from "@shared/schema";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const { allPermissions, updatePermission, isUpdating } = useRolePermissionsManagement();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Initialize permissions state from database
    const permissionsMap: Record<string, boolean> = {};
    allPermissions.forEach((permission: RolePermission) => {
      permissionsMap[`${permission.role}-${permission.pagePath}`] = permission.canAccess;
    });
    setPermissions(permissionsMap);
  }, [allPermissions]);

  const handlePermissionToggle = (role: string, pagePath: string, value: boolean) => {
    const key = `${role}-${pagePath}`;
    setPermissions(prev => ({ ...prev, [key]: value }));
    
    updatePermission({ role, pagePath, canAccess: value });
    
    toast({
      title: "Permission Updated",
      description: `${role} role ${value ? 'granted' : 'revoked'} access to ${pagePath}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <Button className="bg-primary hover:bg-blue-700">
          <Save className="mr-2" size={16} />
          Save Changes
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
          <TabsTrigger value="payroll-calendar">Payroll Calendar</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="mr-2" size={20} />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="district-name">District Name</Label>
                  <Input id="district-name" defaultValue="Lincoln School District" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district-code">District Code</Label>
                  <Input id="district-code" defaultValue="LSD-001" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="district-address">District Address</Label>
                <Textarea id="district-address" defaultValue="123 Education Drive, Lincoln, NE 68508" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact Email</Label>
                  <Input id="contact-email" type="email" defaultValue="admin@lincoln.edu" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Contact Phone</Label>
                  <Input id="contact-phone" defaultValue="(555) 123-4567" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">System Preferences</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Automatic Backups</Label>
                    <p className="text-sm text-gray-500">Enable daily system backups</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-500">Send email notifications for important events</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Data Retention</Label>
                    <p className="text-sm text-gray-500">Retain employee data for 7 years after termination</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2" size={20} />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Email Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>New Employee Onboarding</Label>
                      <p className="text-sm text-gray-500">Notify when new employees start onboarding</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Leave Request Approvals</Label>
                      <p className="text-sm text-gray-500">Notify supervisors of pending leave requests</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Payroll Processing</Label>
                      <p className="text-sm text-gray-500">Notify when payroll is processed</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Document Expiration</Label>
                      <p className="text-sm text-gray-500">Notify when employee documents expire</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">System Alerts</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>System Maintenance</Label>
                      <p className="text-sm text-gray-500">Notify users of scheduled maintenance</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Security Alerts</Label>
                      <p className="text-sm text-gray-500">Notify of security-related events</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>AI Processing Errors</Label>
                      <p className="text-sm text-gray-500">Notify when AI document processing fails</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2" size={20} />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Access Control</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-gray-500">Require 2FA for all admin accounts</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Session Timeout</Label>
                      <p className="text-sm text-gray-500">Auto-logout after 30 minutes of inactivity</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>IP Restrictions</Label>
                      <p className="text-sm text-gray-500">Limit access to specific IP addresses</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Data Protection</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Data Encryption</Label>
                      <p className="text-sm text-gray-500">Encrypt sensitive data at rest</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Audit Logging</Label>
                      <p className="text-sm text-gray-500">Log all user actions for compliance</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Regular Backups</Label>
                      <p className="text-sm text-gray-500">Perform encrypted backups daily</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2" size={20} />
                System Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Active Integrations</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Database className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <Label className="font-medium">Student Information System</Label>
                        <p className="text-sm text-gray-500">PowerSchool integration for student data</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <Label className="font-medium">Active Directory</Label>
                        <p className="text-sm text-gray-500">Employee authentication and user management</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <Label className="font-medium">Payroll System</Label>
                        <p className="text-sm text-gray-500">ADP integration for payroll processing</p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Available Integrations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Google Workspace</h4>
                    <p className="text-sm text-gray-500 mt-1">Connect with Google Calendar and Drive</p>
                    <Button variant="outline" className="mt-3" size="sm">
                      Configure
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Microsoft 365</h4>
                    <p className="text-sm text-gray-500 mt-1">Integration with Outlook and Teams</p>
                    <Button variant="outline" className="mt-3" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="mr-2" size={20} />
                AI Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Document Processing</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Process Documents</Label>
                      <p className="text-sm text-gray-500">Automatically process uploaded documents with AI</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Confidence Threshold</Label>
                      <p className="text-sm text-gray-500">Minimum confidence level for auto-approval (85%)</p>
                    </div>
                    <Input type="number" defaultValue="85" className="w-20" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Manual Review Required</Label>
                      <p className="text-sm text-gray-500">Require human review for low-confidence results</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Substitute Assignment</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Assign Substitutes</Label>
                      <p className="text-sm text-gray-500">Automatically assign substitutes for approved leave</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Matching Algorithm</Label>
                      <p className="text-sm text-gray-500">Use AI to match substitutes based on qualifications</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Payroll Analysis</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Anomaly Detection</Label>
                      <p className="text-sm text-gray-500">Detect unusual patterns in payroll data</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Predictive Analytics</Label>
                      <p className="text-sm text-gray-500">Generate insights and predictions for HR planning</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">API Configuration</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="openai-key">OpenAI API Key</Label>
                    <Input id="openai-key" type="password" placeholder="sk-..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-model">AI Model</Label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option>gpt-4o</option>
                      <option>gpt-4-turbo</option>
                      <option>gpt-3.5-turbo</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <SystemHealthMonitor />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2" size={20} />
                Role-Based Page Access Control
              </CardTitle>
              <p className="text-sm text-gray-500">Configure which pages each role can access based on your district's needs</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Secretary Role Permissions</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Leave Management</Label>
                      <p className="text-sm text-gray-500">Access to employee leave requests and approvals</p>
                    </div>
                    <Switch 
                      checked={permissions['secretary-/leave-management'] || false}
                      onCheckedChange={(value) => handlePermissionToggle('secretary', '/leave-management', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Timecards</Label>
                      <p className="text-sm text-gray-500">Access to employee timecard management</p>
                    </div>
                    <Switch 
                      checked={permissions['secretary-/time-cards'] || false}
                      onCheckedChange={(value) => handlePermissionToggle('secretary', '/time-cards', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Extra Pay Activities</Label>
                      <p className="text-sm text-gray-500">Access to extra pay contracts and requests</p>
                    </div>
                    <Switch 
                      checked={permissions['secretary-/extra-pay-activities'] || false}
                      onCheckedChange={(value) => handlePermissionToggle('secretary', '/extra-pay-activities', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Employee Management</Label>
                      <p className="text-sm text-gray-500">Access to employee records and management</p>
                    </div>
                    <Switch 
                      checked={permissions['secretary-/employees'] || false}
                      onCheckedChange={(value) => handlePermissionToggle('secretary', '/employees', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Payroll Processing</Label>
                      <p className="text-sm text-gray-500">Access to payroll calculations and processing</p>
                    </div>
                    <Switch 
                      checked={permissions['secretary-/payroll'] || false}
                      onCheckedChange={(value) => handlePermissionToggle('secretary', '/payroll', value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Employee Role Permissions</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Leave Management</Label>
                      <p className="text-sm text-gray-500">Access to submit personal leave requests</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Timecards</Label>
                      <p className="text-sm text-gray-500">Access to own timecard approval</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Employee Management</Label>
                      <p className="text-sm text-gray-500">Access to employee records and management</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Payroll Processing</Label>
                      <p className="text-sm text-gray-500">Access to payroll calculations and processing</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Admin & HR Role Permissions</h3>
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Admin and HR roles have full access to all system functions by default.</p>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>All System Functions</Label>
                      <p className="text-sm text-gray-500">Complete access to all pages and functionality</p>
                    </div>
                    <Switch defaultChecked disabled />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Changes are automatically saved when you toggle permissions.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll-calendar" className="space-y-6">
          <PayrollCalendar districtId={1} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
