import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, Calendar, FileText, Clock, User, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkingHour as WorkingHourType, Profile, Client, Project } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { DateRange } from "react-day-picker";
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProfileSelector } from "@/components/common/ProfileSelector";
import { ClientSelector } from "@/components/common/ClientSelector";
import { ProjectSelector } from "@/components/common/ProjectSelector";
import { EditWorkingHoursDialog } from "@/components/working-hours/EditWorkingHoursDialog";

interface DataTableToolbarProps {
  profiles: Profile[];
  clients: Client[];
  projects: Project[];
  onAddWorkingHour: (workingHour: WorkingHourType) => Promise<void>;
}

export const DataTableToolbar: React.FC<DataTableToolbarProps> = ({ profiles, clients, projects, onAddWorkingHour }) => {
  const [profileId, setProfileId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [totalHours, setTotalHours] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleAddWorkingHour = async () => {
    if (!profileId || !clientId || !projectId || !date?.from || !date?.to || !totalHours) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    const newWorkingHour: Omit<WorkingHourType, 'id' | 'created_at' | 'profiles' | 'clients' | 'projects'> = {
      profile_id: profileId,
      client_id: clientId,
      project_id: projectId,
      date: date.from.toISOString().split('T')[0],
      start_time: date.from.toISOString(),
      end_time: date.to.toISOString(),
      total_hours: totalHours,
      description: description,
      status: 'pending',
    };

    await onAddWorkingHour(newWorkingHour as WorkingHourType);
    setOpen(false);
    setProfileId("");
    setClientId("");
    setProjectId("");
    setDate(undefined);
    setTotalHours(0);
    setDescription("");
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
                  selectedProfile={profileId}
                  onProfileChange={setProfileId}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <ClientSelector
                  clients={clients}
                  selectedClient={clientId}
                  onClientChange={setClientId}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <ProjectSelector
                  projects={projects}
                  selectedProject={projectId}
                  onProjectChange={setProjectId}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !date ? "text-muted-foreground" : undefined
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}`
                        ) : (
                          format(date.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" side="bottom">
                    <CalendarComponent
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={2}
                      pagedNavigation
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">Total Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  placeholder="Enter hours"
                  value={totalHours === 0 ? '' : totalHours.toString()}
                  onChange={(e) => setTotalHours(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Enter description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button onClick={handleAddWorkingHour}>Add Working Hour</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

interface WorkingHoursProps {
  profile: Profile;
  clients: Client[];
  projects: Project[];
}

export const WorkingHours = ({ profile, clients, projects }: WorkingHoursProps) => {
  const [workingHours, setWorkingHours] = useState<WorkingHourType[]>([]);
  const [selectedWorkingHour, setSelectedWorkingHour] = useState<WorkingHourType | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkingHours();
  }, []);

  const fetchWorkingHours = async () => {
    setLoading(true);
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
      setWorkingHours(data as WorkingHourType[]);
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

  const handleAddWorkingHour = async (workingHour: Omit<WorkingHourType, 'id' | 'created_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('working_hours')
        .insert([workingHour])
        .select()

      if (error) throw error;

      toast({
        title: "Success",
        description: "Working hour added successfully",
      });
      fetchWorkingHours();
    } catch (error) {
      console.error('Error adding working hour:', error);
      toast({
        title: "Error",
        description: "Failed to add working hour",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditWorkingHour = (workingHour: WorkingHourType) => {
    setSelectedWorkingHour(workingHour);
    setShowEditDialog(true);
  };

  const handleDeleteWorkingHour = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('working_hours')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Working hour deleted successfully",
      });
      fetchWorkingHours();
    } catch (error) {
      console.error('Error deleting working hour:', error);
      toast({
        title: "Error",
        description: "Failed to delete working hour",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveWorkingHour = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('working_hours')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Working hour approved successfully",
      });
      fetchWorkingHours();
    } catch (error) {
      console.error('Error approving working hour:', error);
      toast({
        title: "Error",
        description: "Failed to approve working hour",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Working Hours</h1>
            <p className="text-gray-600">Manage employee working hours and approvals</p>
          </div>
        </div>
      </div>

      <DataTableToolbar
        profiles={profile ? [profile] : []}
        clients={clients}
        projects={projects}
        onAddWorkingHour={handleAddWorkingHour}
      />

      <Card>
        <CardHeader>
          <CardTitle>Working Hours Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {workingHours.map((workingHour) => (
              <div key={workingHour.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{workingHour.profiles?.full_name || 'Unknown'}</h3>
                      <Badge variant="secondary">{workingHour.clients?.name || 'Unknown'}</Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <Calendar className="h-4 w-4 inline-block mr-1" />
                        {new Date(workingHour.date).toLocaleDateString()}
                      </div>
                      <div>
                        <Clock className="h-4 w-4 inline-block mr-1" />
                        {workingHour.total_hours} hours
                      </div>
                      <div>
                        Project: {workingHour.projects?.name || 'Unknown'}
                      </div>
                      <div>
                        Description: {workingHour.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditWorkingHour(workingHour)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteWorkingHour(workingHour.id)}
                    >
                      Delete
                    </Button>
                    {workingHour.status !== 'approved' && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveWorkingHour(workingHour.id)}
                      >
                        Approve
                      </Button>
                    )}
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

      <EditWorkingHoursDialog
        workingHour={selectedWorkingHour}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSave={() => {
          setShowEditDialog(false);
          fetchWorkingHours();
        }}
      />
    </div>
  );
};
