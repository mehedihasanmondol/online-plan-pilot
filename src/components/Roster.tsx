import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, Clock, Users, MapPin, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Roster as RosterType, Profile, Client, Project, RosterStatus } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { ProfileSelector } from "@/components/common/ProfileSelector";
import { MultipleProfileSelector } from "@/components/common/MultipleProfileSelector";

export const RosterComponent = () => {
  const [rosters, setRosters] = useState<RosterType[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoster, setEditingRoster] = useState<RosterType | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    profile_id: "",
    client_id: "",
    project_id: "",
    date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    total_hours: 0,
    notes: "",
    status: "pending" as RosterStatus,
    name: "",
    expected_profiles: 1,
    per_hour_rate: 0
  });

  useEffect(() => {
    fetchRosters();
    fetchProfiles();
    fetchClients();
    fetchProjects();
  }, []);

  const fetchRosters = async () => {
    try {
      const { data, error } = await supabase
        .from('rosters')
        .select(`
          *,
          profiles!rosters_profile_id_fkey (id, full_name, role),
          clients!rosters_client_id_fkey (id, name, company),
          projects!rosters_project_id_fkey (id, name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setRosters(data as RosterType[]);
    } catch (error) {
      console.error('Error fetching rosters:', error);
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
        .order('name');

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleEditRoster = (roster: RosterType) => {
    setEditingRoster(roster);
    setFormData({
      profile_id: roster.profile_id,
      client_id: roster.client_id,
      project_id: roster.project_id,
      date: roster.date,
      end_date: roster.end_date || roster.date,
      start_time: roster.start_time,
      end_time: roster.end_time,
      total_hours: roster.total_hours,
      notes: roster.notes || "",
      status: roster.status,
      name: roster.name || "",
      expected_profiles: roster.expected_profiles || 1,
      per_hour_rate: roster.per_hour_rate || 0
    });
    setIsDialogOpen(true);
  };

  const handleDeleteRoster = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this roster?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('rosters')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Roster deleted successfully" });
      fetchRosters();
    } catch (error) {
      console.error('Error deleting roster:', error);
      toast({
        title: "Error",
        description: "Failed to delete roster",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingRoster) {
        const { error } = await supabase
          .from('rosters')
          .update({
            profile_id: formData.profile_id,
            client_id: formData.client_id,
            project_id: formData.project_id,
            date: formData.date,
            end_date: formData.end_date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            total_hours: formData.total_hours,
            notes: formData.notes,
            status: formData.status as RosterStatus,
            name: formData.name,
            expected_profiles: formData.expected_profiles,
            per_hour_rate: formData.per_hour_rate
          })
          .eq('id', editingRoster.id);

        if (error) throw error;
        toast({ title: "Success", description: "Roster updated successfully" });
      } else {
        const { error } = await supabase
          .from('rosters')
          .insert([{
            profile_id: formData.profile_id,
            client_id: formData.client_id,
            project_id: formData.project_id,
            date: formData.date,
            end_date: formData.end_date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            total_hours: formData.total_hours,
            notes: formData.notes,
            status: formData.status as RosterStatus,
            name: formData.name,
            expected_profiles: formData.expected_profiles,
            per_hour_rate: formData.per_hour_rate
          }]);

        if (error) throw error;
        toast({ title: "Success", description: "Roster created successfully" });
      }

      setIsDialogOpen(false);
      setEditingRoster(null);
      setFormData({
        profile_id: "",
        client_id: "",
        project_id: "",
        date: "",
        end_date: "",
        start_time: "",
        end_time: "",
        total_hours: 0,
        notes: "",
        status: "pending" as RosterStatus,
        name: "",
        expected_profiles: 1,
        per_hour_rate: 0
      });
      fetchRosters();
    } catch (error) {
      console.error('Error saving roster:', error);
      toast({
        title: "Error",
        description: "Failed to save roster",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && rosters.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rosters</h1>
            <p className="text-gray-600">Manage employee work schedules and assignments</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Roster
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRoster ? "Edit Roster" : "Create Roster"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Roster Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Roster Name"
                  />
                </div>
                <div>
                  <Label htmlFor="expected_profiles">Expected Profiles</Label>
                  <Input
                    id="expected_profiles"
                    type="number"
                    value={formData.expected_profiles}
                    onChange={handleInputChange}
                    placeholder="Expected Profiles"
                  />
                </div>
              </div>

              <ProfileSelector
                profiles={profiles}
                selectedProfileId={formData.profile_id}
                onProfileSelect={(profileId) => setFormData({ ...formData, profile_id: profileId })}
                label="Select Profile"
                placeholder="Choose an employee"
                showRoleFilter={true}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_id">Client</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="project_id">Project</Label>
                  <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="total_hours">Total Hours</Label>
                <Input
                  id="total_hours"
                  type="number"
                  step="0.5"
                  value={formData.total_hours}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="per_hour_rate">Per Hour Rate</Label>
                <Input
                  id="per_hour_rate"
                  type="number"
                  step="0.01"
                  value={formData.per_hour_rate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes or instructions for this roster"
                  value={formData.notes}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as RosterStatus })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Saving..." : "Save Roster"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Rosters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Client</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Project</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rosters.map((roster) => (
                  <tr key={roster.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{roster.profiles?.full_name || 'Unknown'}</div>
                      <div className="text-sm text-gray-600">{roster.profiles?.role || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{roster.clients?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-600">{roster.projects?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(roster.date).toLocaleDateString()}
                      {roster.end_date && roster.date !== roster.end_date && ` - ${new Date(roster.end_date).toLocaleDateString()}`}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{roster.total_hours}h</td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        roster.status === "confirmed" ? "default" :
                          roster.status === "cancelled" ? "destructive" : "secondary"
                      }>
                        {roster.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditRoster(roster)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRoster(roster.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
