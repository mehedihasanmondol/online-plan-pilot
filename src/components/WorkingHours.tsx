import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock, Eye, Edit2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProfileSelector } from "@/components/common/ProfileSelector";
import type { WorkingHour, Profile, Client, Project } from "@/types/database";

export const DataTableToolbar = ({ profiles, clients, projects, onAddWorkingHour }: {
  profiles: Profile[];
  clients: Client[];
  projects: Project[];
  onAddWorkingHour: (workingHour: any) => Promise<void>;
}) => {
  const [profileId, setProfileId] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [totalHours, setTotalHours] = useState(0);
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleAddWorkingHour = async () => {
    if (!profileId || !clientId || !projectId || !date || !startTime || !endTime) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const newWorkingHour = {
      profile_id: profileId,
      client_id: clientId,
      project_id: projectId,
      date: date.toISOString().split('T')[0],
      start_time: startTime,
      end_time: endTime,
      total_hours: totalHours,
      notes: notes,
      status: 'pending' as const
    };

    await onAddWorkingHour(newWorkingHour);
    setOpen(false);
    setProfileId("");
    setClientId("");
    setProjectId("");
    setDate(undefined);
    setStartTime("");
    setEndTime("");
    setTotalHours(0);
    setNotes("");
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" data-state={open ? "open" : "closed"}>
              <Plus className="mr-2 h-4 w-4" />
              Add Working Hour
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start" side="bottom">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile">Employee</Label>
                <ProfileSelector
                  profiles={profiles}
                  selectedProfileId={profileId}
                  onProfileSelect={setProfileId}
                  placeholder="Select employee"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select project</option>
                  {projects.filter(p => p.client_id === clientId).map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total-hours">Total Hours</Label>
                <Input
                  id="total-hours"
                  type="number"
                  step="0.5"
                  value={totalHours}
                  onChange={(e) => setTotalHours(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>

              <Button onClick={handleAddWorkingHour} className="w-full">
                Add Working Hour
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export const WorkingHoursComponent = () => {
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkingHour, setSelectedWorkingHour] = useState<WorkingHour | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkingHours();
    fetchProfiles();
    fetchClients();
    fetchProjects();
  }, []);

  const fetchWorkingHours = async () => {
    try {
      const { data, error } = await supabase
        .from('working_hours')
        .select(`
          *,
          profiles!working_hours_profile_id_fkey (id, full_name, role),
          clients!working_hours_client_id_fkey (id, name, company),
          projects!working_hours_project_id_fkey (id, name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setWorkingHours(data as WorkingHour[]);
    } catch (error) {
      console.error('Error fetching working hours:', error);
      toast({
        title: "Error",
        description: "Failed to fetch working hours",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setProfiles(data as Profile[]);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('company');

      if (error) throw error;
      setClients(data as Client[]);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProjects(data as Project[]);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleAddWorkingHour = async (newWorkingHour: any) => {
    try {
      const { error } = await supabase
        .from('working_hours')
        .insert([newWorkingHour]);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Working hour added successfully"
      });
      
      fetchWorkingHours();
    } catch (error) {
      console.error('Error adding working hour:', error);
      toast({
        title: "Error",
        description: "Failed to add working hour",
        variant: "destructive"
      });
    }
  };

  const handleEditWorkingHour = async (updatedData: WorkingHour) => {
    try {
      const { error } = await supabase
        .from('working_hours')
        .update(updatedData)
        .eq('id', updatedData.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Working hour updated successfully"
      });
      
      setShowEditDialog(false);
      setSelectedWorkingHour(null);
      fetchWorkingHours();
    } catch (error) {
      console.error('Error updating working hour:', error);
      toast({
        title: "Error",
        description: "Failed to update working hour",
        variant: "destructive"
      });
    }
  };

  const handleDeleteWorkingHour = async (id: string) => {
    try {
      const { error } = await supabase
        .from('working_hours')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Working hour deleted successfully"
      });
      
      fetchWorkingHours();
    } catch (error) {
      console.error('Error deleting working hour:', error);
      toast({
        title: "Error",
        description: "Failed to delete working hour",
        variant: "destructive"
      });
    }
  };

  const handleUpdateStatus = async (id: string, status: 'pending' | 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('working_hours')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Working hour ${status} successfully`
      });
      
      fetchWorkingHours();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Working Hours</h1>
            <p className="text-gray-600">Track and manage employee working hours</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Working Hours Records</CardTitle>
            <DataTableToolbar 
              profiles={profiles}
              clients={clients}
              projects={projects}
              onAddWorkingHour={handleAddWorkingHour}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workingHours.map((workingHour) => (
              <div key={workingHour.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-lg">{workingHour.profiles?.full_name || 'Unknown'}</h3>
                      <Badge variant={
                        workingHour.status === "approved" ? "default" : 
                        workingHour.status === "rejected" ? "destructive" : "outline"
                      }>
                        {workingHour.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(workingHour.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {workingHour.start_time} - {workingHour.end_time} ({workingHour.total_hours}h)
                      </div>
                      <div>
                        {workingHour.clients?.company} - {workingHour.projects?.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedWorkingHour(workingHour);
                        setShowEditDialog(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    {workingHour.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(workingHour.id, "approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(workingHour.id, "rejected")}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteWorkingHour(workingHour.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {workingHours.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No working hours records found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog - placeholder for now */}
      {showEditDialog && selectedWorkingHour && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Working Hour</h3>
            <p className="text-gray-600 mb-4">Edit functionality will be implemented here.</p>
            <div className="flex gap-2">
              <Button onClick={() => setShowEditDialog(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={() => handleEditWorkingHour(selectedWorkingHour)}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
