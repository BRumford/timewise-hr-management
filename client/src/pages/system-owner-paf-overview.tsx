import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Building2, FileText, Clock, CheckCircle, AlertCircle, TrendingUp, Users, Calculator } from "lucide-react";

interface PafOverviewData {
  districts: Array<{
    id: number;
    name: string;
    slug: string;
    totalTemplates: number;
    activeTemplates: number;
    totalSubmissions: number;
    pendingSubmissions: number;
    approvedSubmissions: number;
    lastActivity: string;
  }>;
  systemStats: {
    totalDistricts: number;
    totalTemplates: number;
    totalSubmissions: number;
    pendingApprovals: number;
    avgProcessingTime: number;
  };
  recentActivity: Array<{
    id: number;
    districtName: string;
    action: string;
    description: string;
    timestamp: string;
    status: string;
  }>;
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    draft: "secondary",
    submitted: "default",
    under_review: "secondary",
    approved: "default",
    denied: "destructive",
    active: "default",
    inactive: "secondary",
  } as const;

  const icons = {
    draft: Clock,
    submitted: FileText,
    under_review: AlertCircle,
    approved: CheckCircle,
    denied: AlertCircle,
    active: CheckCircle,
    inactive: Clock,
  };

  const Icon = icons[status as keyof typeof icons] || Clock;

  return (
    <Badge variant={variants[status as keyof typeof variants] || "secondary"} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
    </Badge>
  );
}

function MetricCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend 
}: { 
  title: string; 
  value: string | number; 
  description: string; 
  icon: any; 
  trend?: { value: number; label: string; }; 
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className="flex items-center pt-1">
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            <span className="text-xs text-green-500">
              {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SystemOwnerPafOverview() {
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");

  const { data: pafData, isLoading } = useQuery({
    queryKey: ["/api/system-owner/paf/overview"],
  });

  if (isLoading || !pafData) {
    return <div className="flex items-center justify-center h-64">Loading PAF overview...</div>;
  }

  const filteredDistricts = selectedDistrict === "all" 
    ? pafData.districts 
    : pafData.districts.filter((d: any) => d.id.toString() === selectedDistrict);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">PAF System Overview</h1>
          <p className="text-muted-foreground">Personnel Action Forms management across all districts</p>
        </div>
      </div>

      {/* System-wide metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Districts"
          value={pafData.systemStats.totalDistricts}
          description="Active school districts"
          icon={Building2}
          trend={{ value: 12, label: "this quarter" }}
        />
        <MetricCard
          title="Total Templates"
          value={pafData.systemStats.totalTemplates}
          description="PAF templates across all districts"
          icon={FileText}
          trend={{ value: 8, label: "this month" }}
        />
        <MetricCard
          title="Total Submissions"
          value={pafData.systemStats.totalSubmissions}
          description="All PAF submissions"
          icon={Users}
          trend={{ value: 23, label: "this month" }}
        />
        <MetricCard
          title="Avg Processing Time"
          value={`${pafData.systemStats.avgProcessingTime} days`}
          description="Average approval time"
          icon={Calculator}
          trend={{ value: -15, label: "improvement" }}
        />
      </div>

      <Tabs defaultValue="districts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="districts">District Overview</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="districts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">District PAF Status</h2>
            <div className="flex space-x-2">
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by district" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Districts</SelectItem>
                  {pafData.districts.map((district: any) => (
                    <SelectItem key={district.id} value={district.id.toString()}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">District Name</SelectItem>
                  <SelectItem value="submissions">Total Submissions</SelectItem>
                  <SelectItem value="pending">Pending Submissions</SelectItem>
                  <SelectItem value="activity">Last Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>District PAF Management</CardTitle>
              <CardDescription>Overview of PAF templates and submissions by district</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer">
                      <div className="flex items-center">
                        District <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Templates</TableHead>
                    <TableHead>Total Submissions</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDistricts.map((district: any) => (
                    <TableRow key={district.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{district.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{district.activeTemplates} active</div>
                          <div className="text-muted-foreground">{district.totalTemplates} total</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{district.totalSubmissions}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {district.pendingSubmissions}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">
                          {district.approvedSubmissions}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(district.lastActivity).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={district.activeTemplates > 0 ? "active" : "inactive"} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent PAF Activity</CardTitle>
              <CardDescription>Latest PAF-related actions across all districts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>District</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pafData.recentActivity.map((activity: any) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.districtName}</TableCell>
                      <TableCell>{activity.action}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {activity.description}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(activity.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={activity.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>PAF Processing Efficiency</CardTitle>
                <CardDescription>Average processing times by district</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pafData.districts.slice(0, 5).map((district: any) => (
                    <div key={district.id} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{district.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-secondary h-2 rounded-full">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${Math.min((district.approvedSubmissions / district.totalSubmissions) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12">
                          {Math.round((district.approvedSubmissions / district.totalSubmissions) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Template Usage</CardTitle>
                <CardDescription>Most commonly used PAF templates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-secondary">
                    <span className="text-sm font-medium">New Hire Form</span>
                    <Badge variant="default">342 uses</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-secondary">
                    <span className="text-sm font-medium">Position Change</span>
                    <Badge variant="default">189 uses</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-secondary">
                    <span className="text-sm font-medium">Salary Adjustment</span>
                    <Badge variant="default">156 uses</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-secondary">
                    <span className="text-sm font-medium">Leave of Absence</span>
                    <Badge variant="default">98 uses</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-secondary">
                    <span className="text-sm font-medium">Termination</span>
                    <Badge variant="default">67 uses</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}