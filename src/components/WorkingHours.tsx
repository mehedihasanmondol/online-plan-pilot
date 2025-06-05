import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Clock, User, Building } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditWorkingHoursDialog } from "./EditWorkingHoursDialog";
import { WorkingHoursActions } from "./working-hours/WorkingHoursActions";
import { Client, Project, Profile, WorkingHour } from "@/types/database";

export const WorkingHours = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [selectedWorkingHour, setSelectedWorkingHour] = useState<WorkingHour | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [bulkData, setBulkData] = useState({
    client_id: '',
    project_id: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    notes: '',
    hourly_rate: 0
  });

  useEffect(() => {
    fetchClients();
    fetchProjects();
    fetchProfiles();
    fetchWorkingHours();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive"
      });
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive"
      });
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch profiles",
        variant: "destructive"
      });
    }
  };

  const fetchWorkingHours = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('working_hours')
        .select(`
          *,
          clients!working_hours_client_id_fkey (id, name, company),
          projects!working_hours_project_id_fkey (id, name),
          profiles!working_hours_profile_id_fkey (id, full_name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setWorkingHours(data || []);
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

  const generateBulkWorkingHours = () => {
    const startDate = new Date(bulkData.start_date);
    const endDate = new Date(bulkData.end_date);
    const workingHours = [];

    let currentDate = startDate;
    while (currentDate <= endDate) {
      const dateString = format(currentDate, 'yyyy-MM-dd');

      profiles.forEach(profile => {
        workingHours.push({
          profile_id: profile.id,
          client_id: bulkData.client_id,
          project_id: bulkData.project_id,
          date: dateString,
          start_time: bulkData.start_time,
          end_time: bulkData.end_time,
          total_hours: calculateTotalHours(bulkData.start_time, bulkData.end_time),
          status: 'pending',
          notes: bulkData.notes,
          hourly_rate: bulkData.hourly_rate
        });
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingHours;
  };

  const calculateTotalHours = (startTime: string, endTime: string): number => {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    const diffMinutes = endTotalMinutes - startTotalMinutes;
    const totalHours = diffMinutes / 60;

    return parseFloat(totalHours.toFixed(2));
  };

  const handleBulkSubmit = async () => {
    if (!bulkData.client_id || !bulkData.project_id || !bulkData.start_date || !bulkData.end_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const workingHoursToCreate = generateBulkWorkingHours();
      
      // Convert status to proper enum type
      const workingHoursWithValidStatus = workingHoursToCreate.map(wh => ({
        ...wh,
        status: 'pending' as const
      }));

      const { error } = await supabase
        .from('working_hours')
        .insert(workingHoursWithValidStatus);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Created ${workingHoursToCreate.length} working hour entries successfully`,
      });

      // Reset form
      setBulkData({
        client_id: '',
        project_id: '',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        notes: '',
        hourly_rate: 0
      });

      fetchWorkingHours();
    } catch (error) {
      console.error('Error creating bulk working hours:', error);
      toast({
        title: "Error",
        description: "Failed to create working hour entries",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Add Working Hours (Bulk)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="client">Client</Label>
            <Select onValueChange={(value) => setBulkData({ ...bulkData, client_id: value })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="project">Project</Label>
            <Select onValueChange={(value) => setBulkData({ ...bulkData, project_id: value })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !bulkData.start_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {bulkData.start_date ? format(new Date(bulkData.start_date), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  defaultMonth={date}
                  selected={date}
                  onSelect={(date) => {
                    setDate(date);
                    setBulkData({ ...bulkData, start_date: format(date!, 'yyyy-MM-dd') });
                  }}
                  disabled={(date) =>
                    date > new Date()
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !bulkData.end_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {bulkData.end_date ? format(new Date(bulkData.end_date), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  defaultMonth={date}
                  selected={date}
                  onSelect={(date) => {
                    setDate(date);
                    setBulkData({ ...bulkData, end_date: format(date!, 'yyyy-MM-dd') });
                  }}
                  disabled={(date) =>
                    date > new Date()
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="start_time">Start Time</Label>
            <Input
              type="time"
              id="start_time"
              value={bulkData.start_time}
              onChange={(e) => setBulkData({ ...bulkData, start_time: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="end_time">End Time</Label>
            <Input
              type="time"
              id="end_time"
              value={bulkData.end_time}
              onChange={(e) => setBulkData({ ...bulkData, end_time: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="hourly_rate">Hourly Rate</Label>
            <Input
              type="number"
              id="hourly_rate"
              value={bulkData.hourly_rate}
              onChange={(e) => setBulkData({ ...bulkData, hourly_rate: parseFloat(e.target.value) })}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Working hour notes"
              value={bulkData.notes}
              onChange={(e) => setBulkData({ ...bulkData, notes: e.target.value })}
            />
          </div>
          <Button
            className="w-full md:col-span-2"
            onClick={handleBulkSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Bulk Working Hours"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Working Hours</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-lg">Loading working hours...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Profile
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 bg-gray-50"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workingHours.map((wh) => (
                    <tr key={wh.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {wh.profiles?.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {wh.clients?.company}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {wh.projects?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(wh.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {wh.total_hours}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {wh.status}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <WorkingHoursActions
                          workingHour={wh}
                          onEdit={() => {
                            setSelectedWorkingHour(wh);
                            setIsEditDialogOpen(true);
                          }}
                          onDelete={async () => {
                            try {
                              const { error } = await supabase
                                .from('working_hours')
                                .delete()
                                .eq('id', wh.id);

                              if (error) throw error;

                              toast({
                                title: "Success",
                                description: "Working hour entry deleted successfully",
                              });

                              fetchWorkingHours();
                            } catch (error) {
                              console.error('Error deleting working hour entry:', error);
                              toast({
                                title: "Error",
                                description: "Failed to delete working hour entry",
                                variant: "destructive"
                              });
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <EditWorkingHoursDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        workingHour={selectedWorkingHour}
        clients={clients}
        projects={projects}
        onWorkingHoursUpdated={fetchWorkingHours}
      />
    </div>
  );
};
