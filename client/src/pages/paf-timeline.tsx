import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, Calendar, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';

interface TimelineEvent {
  id: number;
  eventType: string;
  eventDescription: string;
  userId?: string;
  userRole?: string;
  fromStatus?: string;
  toStatus?: string;
  workflowStep?: number;
  metadata?: any;
  timestamp: string;
}

interface TimelineSummary {
  totalDuration: string | null;
  currentStatus: string;
  keyMilestones: Array<{ event: string; date: string; duration?: string }>;
  averageStepTime: string | null;
  isOverdue: boolean;
  nextExpectedAction: string | null;
}

interface TimelineData {
  submission: any;
  timeline: TimelineEvent[];
  summary: TimelineSummary;
}

function getStatusBadgeVariant(status: string): "destructive" | "secondary" | "default" | "outline" {
  switch (status) {
    case 'approved':
      return 'default'; // Use default for approved since success variant doesn't exist
    case 'denied':
    case 'rejected':
      return 'destructive';
    case 'needs_correction':
      return 'secondary';
    case 'submitted':
    case 'under_review':
      return 'default';
    default:
      return 'outline';
  }
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'created':
      return <Calendar className="h-4 w-4" />;
    case 'submitted':
      return <CheckCircle className="h-4 w-4" />;
    case 'approved':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'rejected':
    case 'corrected':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'reviewed':
      return <User className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

export default function PafTimeline() {
  const { id } = useParams();
  
  const { data: timelineData, isLoading, error } = useQuery<TimelineData>({
    queryKey: ['/api/paf/submissions', id, 'timeline'],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !timelineData) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>Failed to load PAF timeline. Please try again.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { submission, timeline, summary } = timelineData;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-4">
            <Link href="/paf">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to PAFs
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">PAF Timeline</h1>
          </div>
          <p className="text-muted-foreground">
            Personnel Action Form #{id} - {submission?.employeeName || 'Unknown Employee'}
          </p>
        </div>
        <Badge variant={getStatusBadgeVariant(submission?.status)}>
          {submission?.status?.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.currentStatus}</div>
            {summary.nextExpectedAction && (
              <p className="text-xs text-muted-foreground mt-1">
                {summary.nextExpectedAction}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalDuration || 'In Progress'}
            </div>
            {summary.isOverdue && (
              <p className="text-xs text-red-500 mt-1">Overdue</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Key Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.keyMilestones.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {submission?.createdAt ? 
                new Date(submission.createdAt).toLocaleDateString() : 
                'Unknown'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {submission?.createdAt ? 
                new Date(submission.createdAt).toLocaleTimeString() : 
                ''
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Events */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline Events</CardTitle>
          <CardDescription>
            Complete history of all actions and status changes for this PAF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timeline.map((event, index) => (
              <div key={event.id} className="flex items-start space-x-4 pb-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {getEventIcon(event.eventType)}
                  </div>
                  {index < timeline.length - 1 && (
                    <div className="w-px h-12 bg-border mt-2" />
                  )}
                </div>
                
                {/* Event content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">{event.eventDescription}</h4>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                        {event.userId && (
                          <span className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{event.userId}</span>
                          </span>
                        )}
                        {event.userRole && (
                          <Badge variant="outline" className="text-xs">
                            {event.userRole}
                          </Badge>
                        )}
                        {event.workflowStep && (
                          <span>Step {event.workflowStep}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                  
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs">
                      <strong>Details:</strong>
                      <pre className="mt-1 text-xs overflow-auto">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {(event.fromStatus || event.toStatus) && (
                    <div className="mt-2 flex items-center space-x-2 text-xs">
                      {event.fromStatus && (
                        <Badge variant="outline">{event.fromStatus}</Badge>
                      )}
                      {event.fromStatus && event.toStatus && (
                        <span>→</span>
                      )}
                      {event.toStatus && (
                        <Badge variant="outline">{event.toStatus}</Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Milestones Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Key Milestones</CardTitle>
          <CardDescription>
            Major events and their durations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.keyMilestones.map((milestone, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{milestone.event}</span>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm">{new Date(milestone.date).toLocaleString()}</div>
                  {milestone.duration && (
                    <div className="text-xs text-muted-foreground">
                      Duration: {milestone.duration}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}