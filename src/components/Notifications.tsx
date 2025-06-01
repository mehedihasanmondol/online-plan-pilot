
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, X, Clock, AlertCircle, CheckCircle2, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WorkingHour, Roster as RosterType, Profile } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: 'working_hours_pending' | 'roster_pending' | 'payroll_due' | 'system';
  title: string;
  message: string;
  data?: any;
  created_at: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

export const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    generateRealNotifications();
    
    // Set up real-time subscription for working hours
    const workingHoursChannel = supabase
      .channel('working-hours-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'working_hours'
        },
        (payload) => {
          console.log('New working hours entry:', payload);
          generateRealNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'working_hours'
        },
        (payload) => {
          console.log('Working hours updated:', payload);
          generateRealNotifications();
        }
      )
      .subscribe();

    // Set up real-time subscription for rosters
    const rostersChannel = supabase
      .channel('rosters-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rosters'
        },
        (payload) => {
          console.log('New roster created:', payload);
          generateRealNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rosters'
        },
        (payload) => {
          console.log('Roster updated:', payload);
          generateRealNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(workingHoursChannel);
      supabase.removeChannel(rostersChannel);
    };
  }, []);

  const generateRealNotifications = async () => {
    try {
      const notifications: Notification[] = [];

      // Fetch pending working hours
      const { data: pendingWorkingHours, error: whError } = await supabase
        .from('working_hours')
        .select(`
          *,
          profiles!working_hours_profile_id_fkey (full_name),
          projects!working_hours_project_id_fkey (name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!whError && pendingWorkingHours) {
        pendingWorkingHours.forEach((wh) => {
          const profile = Array.isArray(wh.profiles) ? wh.profiles[0] : wh.profiles;
          const project = Array.isArray(wh.projects) ? wh.projects[0] : wh.projects;
          
          notifications.push({
            id: `wh-${wh.id}`,
            type: 'working_hours_pending',
            title: 'Working Hours Approval Required',
            message: `${profile?.full_name || 'Unknown'} submitted working hours for ${project?.name || 'Unknown Project'} on ${new Date(wh.date).toLocaleDateString()}`,
            data: wh,
            created_at: wh.created_at,
            read: false,
            priority: 'medium'
          });
        });
      }

      // Fetch pending rosters
      const { data: pendingRosters, error: rosterError } = await supabase
        .from('rosters')
        .select(`
          *,
          profiles!rosters_profile_id_fkey (full_name),
          projects!rosters_project_id_fkey (name),
          clients!rosters_client_id_fkey (company)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!rosterError && pendingRosters) {
        pendingRosters.forEach((roster) => {
          const profile = Array.isArray(roster.profiles) ? roster.profiles[0] : roster.profiles;
          const project = Array.isArray(roster.projects) ? roster.projects[0] : roster.projects;
          const client = Array.isArray(roster.clients) ? roster.clients[0] : roster.clients;
          
          notifications.push({
            id: `roster-${roster.id}`,
            type: 'roster_pending',
            title: 'Roster Confirmation Required',
            message: `New roster "${roster.name || 'Unnamed'}" for ${profile?.full_name || 'Unknown'} at ${client?.company || 'Unknown Client'} - ${project?.name || 'Unknown Project'}`,
            data: roster,
            created_at: roster.created_at,
            read: false,
            priority: 'high'
          });
        });
      }

      // Add system notifications
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check for upcoming rosters
      const { data: upcomingRosters, error: upcomingError } = await supabase
        .from('rosters')
        .select(`
          *,
          profiles!rosters_profile_id_fkey (full_name),
          projects!rosters_project_id_fkey (name)
        `)
        .eq('date', tomorrow.toISOString().split('T')[0])
        .eq('status', 'confirmed');

      if (!upcomingError && upcomingRosters && upcomingRosters.length > 0) {
        notifications.push({
          id: 'upcoming-rosters',
          type: 'system',
          title: 'Upcoming Rosters Tomorrow',
          message: `${upcomingRosters.length} confirmed roster${upcomingRosters.length !== 1 ? 's' : ''} scheduled for tomorrow`,
          data: upcomingRosters,
          created_at: new Date().toISOString(),
          read: false,
          priority: 'low'
        });
      }

      // Sort by priority and date
      const sortedNotifications = notifications.sort((a, b) => {
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setNotifications(sortedNotifications);
    } catch (error) {
      console.error('Error generating notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast({ title: "Success", description: "All notifications marked as read" });
  };

  const approveWorkingHours = async (workingHourId: string, notificationId: string) => {
    try {
      const { error } = await supabase
        .from('working_hours')
        .update({ status: 'approved' })
        .eq('id', workingHourId);

      if (error) throw error;
      
      markAsRead(notificationId);
      toast({ title: "Success", description: "Working hours approved successfully" });
      generateRealNotifications();
    } catch (error) {
      console.error('Error approving working hours:', error);
      toast({
        title: "Error",
        description: "Failed to approve working hours",
        variant: "destructive"
      });
    }
  };

  const confirmRoster = async (rosterId: string, notificationId: string) => {
    try {
      const { error } = await supabase
        .from('rosters')
        .update({ status: 'confirmed' })
        .eq('id', rosterId);

      if (error) throw error;
      
      markAsRead(notificationId);
      toast({ title: "Success", description: "Roster confirmed successfully" });
      generateRealNotifications();
    } catch (error) {
      console.error('Error confirming roster:', error);
      toast({
        title: "Error",
        description: "Failed to confirm roster",
        variant: "destructive"
      });
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    switch (type) {
      case 'working_hours_pending':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'roster_pending':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'payroll_due':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading notifications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Real-time Notifications</h1>
            <p className="text-gray-600">
              Stay updated with system events and pending actions
              {unreadCount > 0 && (
                <span className="ml-2 text-blue-600 font-medium">
                  ({unreadCount} unread)
                </span>
              )}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Notification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Notifications</CardTitle>
            <Bell className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{notifications.length}</div>
            <p className="text-xs text-muted-foreground">All notifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Unread</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Working Hours</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {notifications.filter(n => n.type === 'working_hours_pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Rosters</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {notifications.filter(n => n.type === 'roster_pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Pending confirmation</p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications ({notifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No notifications available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 transition-all ${
                    notification.read 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-white border-blue-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type, notification.priority)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className={`font-semibold ${
                            notification.read ? 'text-gray-700' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </h3>
                          <p className={`text-sm mt-1 ${
                            notification.read ? 'text-gray-500' : 'text-gray-700'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              notification.priority === 'high' ? 'destructive' : 
                              notification.priority === 'medium' ? 'default' : 'outline'
                            }
                          >
                            {notification.priority}
                          </Badge>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons for specific notification types */}
                      {!notification.read && (
                        <div className="mt-3 flex items-center gap-2">
                          {notification.type === 'working_hours_pending' && notification.data && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => approveWorkingHours(notification.data.id, notification.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAsRead(notification.id)}
                              >
                                Mark Read
                              </Button>
                            </>
                          )}
                          
                          {notification.type === 'roster_pending' && notification.data && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => confirmRoster(notification.data.id, notification.id)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAsRead(notification.id)}
                              >
                                Mark Read
                              </Button>
                            </>
                          )}
                          
                          {notification.type === 'system' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Mark Read
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
