import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Client, Project, Profile, Roster } from "@/types/database";
import { EnhancedRosterCalendarView } from "./roster/EnhancedRosterCalendarView";

export const Roster = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bulkData, setBulkData] = useState({
    client_id: '',
    project_id: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    notes: '',
    name: '',
    expected_profiles: 1,
    per_hour_rate: 0
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
    fetchProjects();
    fetchProfiles();
    fetchRosters();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
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
        .eq('status', 'active')
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
        .eq('is_active', true)
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

  const fetchRosters = async () => {
    try {
      const { data, error } = await supabase
        .from('rosters')
        .select(`
          *,
          clients!rosters_client_id_fkey (id, name, company),
          projects!rosters_project_id_fkey (id, name),
          profiles!rosters_profile_id_fkey (id, full_name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setRosters(data || []);
    } catch (error) {
      console.error('Error fetching rosters:', error);
      toast({
        title: "Error",
        description: "Failed to fetch rosters",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBulkData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setBulkData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberInputChange = (name: string, value: number) => {
    setBulkData(prev => ({ ...prev, [name]: value }));
  };

  const generateBulkRosters = () => {
    const startDate = new Date(bulkData.start_date);
    const endDate = new Date(bulkData.end_date);
    const startTime = bulkData.start_time;
    const endTime = bulkData.end_time;
    const notes = bulkData.notes;
    const name = bulkData.name;
    const expectedProfiles = bulkData.expected_profiles;
    const perHourRate = bulkData.per_hour_rate;

    const rosters = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
      const roster = {
        client_id: bulkData.client_id,
        project_id: bulkData.project_id,
        date: format(currentDate, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        notes: notes,
        name: name,
        expected_profiles: expectedProfiles,
        per_hour_rate: perHourRate,
        profile_id: profiles[0]?.id, // Assign the first profile ID as default
        total_hours: calculateHours(startTime, endTime),
        is_locked: false,
        is_editable: true,
        status: 'pending',
      };
      rosters.push(roster);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return rosters;
  };

  const calculateHours = (start: string, end: string): number => {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    let diffMinutes = endTotalMinutes - startTotalMinutes;
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }

    return diffMinutes / 60;
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
      const rostersToCreate = generateBulkRosters();
      
      // Convert status to proper enum type
      const rostersWithValidStatus = rostersToCreate.map(roster => ({
        ...roster,
        status: 'pending' as const
      }));

      const { error } = await supabase
        .from('rosters')
        .insert(rostersWithValidStatus);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Created ${rostersToCreate.length} roster entries successfully`,
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
        name: '',
        expected_profiles: 1,
        per_hour_rate: 0
      });

      fetchRosters();
    } catch (error) {
      console.error('Error creating bulk rosters:', error);
      toast({
        title: "Error",
        description: "Failed to create roster entries",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Roster Management</h1>

      {/* Bulk Roster Creation Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create Bulk Rosters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="client_id">Client</Label>
            <Select onValueChange={(value) => handleSelectChange('client_id', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>{client.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="project_id">Project</Label>
            <Select onValueChange={(value) => handleSelectChange('project_id', value)}>
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
            <Label htmlFor="start_date">Start Date</Label>
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
                  {bulkData.start_date ? (
                    format(new Date(bulkData.start_date), "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={bulkData.start_date ? new Date(bulkData.start_date) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      handleSelectChange('start_date', format(date, 'yyyy-MM-dd'));
                    }
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
            <Label htmlFor="end_date">End Date</Label>
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
                  {bulkData.end_date ? (
                    format(new Date(bulkData.end_date), "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={bulkData.end_date ? new Date(bulkData.end_date) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      handleSelectChange('end_date', format(date, 'yyyy-MM-dd'));
                    }
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
              name="start_time"
              value={bulkData.start_time}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <Label htmlFor="end_time">End Time</Label>
            <Input
              type="time"
              id="end_time"
              name="end_time"
              value={bulkData.end_time}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <Label htmlFor="name">Roster Name</Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={bulkData.name}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <Label htmlFor="expected_profiles">Expected Profiles</Label>
            <Input
              type="number"
              id="expected_profiles"
              name="expected_profiles"
              value={bulkData.expected_profiles}
              onChange={(e) => handleNumberInputChange('expected_profiles', Number(e.target.value))}
            />
          </div>

           <div>
            <Label htmlFor="per_hour_rate">Per Hour Rate</Label>
            <Input
              type="number"
              id="per_hour_rate"
              name="per_hour_rate"
              value={bulkData.per_hour_rate}
              onChange={(e) => handleNumberInputChange('per_hour_rate', Number(e.target.value))}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={bulkData.notes}
              onChange={handleInputChange}
            />
          </div>
        </CardContent>
        <div className="p-4">
          <Button onClick={handleBulkSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Create Rosters"}
          </Button>
        </div>
      </Card>

      {/* Roster Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle>Roster Calendar View</CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedRosterCalendarView rosters={rosters} />
        </CardContent>
      </Card>
    </div>
  );
};
