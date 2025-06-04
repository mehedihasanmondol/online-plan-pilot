import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Clock, Calendar, DollarSign, Edit, Trash2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkingHour, Profile, Client, Project, WorkingHoursStatus } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { ProfileSelector } from "@/components/common/ProfileSelector";
import { EditWorkingHoursDialog } from "@/components/EditWorkingHoursDialog";

export const WorkingHoursComponent = () => {
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkingHours, setEditingWorkingHours] = useState<WorkingHour | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    profile_id: "",
    client_id: "",
    project_id: "",
    date: "",
    start_time: "",
    end_time: "",
    total_hours: 0,
    actual_hours: 0,
    overtime_hours: 0,
    payable_amount: 0,
    hourly_rate: 0,
    notes: "",
    status: "pending" as WorkingHoursStatus,
    sign_in_time: "",
    sign_out_time: ""
  });

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
        .order('name');

      if (error) throw error;
      setProjects(data as Project[]);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('working_hours')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast({ title: "Success", description: "Working hours record deleted successfully" });
        fetchWorkingHours();
      } catch (error) {
        console.error('Error deleting working hours:', error);
        toast({
          title: "Error",
          description: "Failed to delete working hours record",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEdit = (workingHour: WorkingHour) => {
    setEditingWorkingHours(workingHour);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (updatedData: WorkingHour) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('working_hours')
        .update(updatedData)
        .eq('id', updatedData.id);

      if (error) throw error;
      toast({ title: "Success", description: "Working hours updated successfully" });
      setIsEditDialogOpen(false);
      setEditingWorkingHours(null);
      fetchWorkingHours();
    } catch (error) {
      console.error('Error updating working hours:', error);
      toast({
        title: "Error",
        description: "Failed to update working hours",
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
      const { error } = await supabase
        .from('working_hours')
        .insert([{
          total_hours: formData.total_hours,
          actual_hours: formData.actual_hours,
          overtime_hours: formData.overtime_hours,
          payable_amount: formData.payable_amount,
          sign_in_time: formData.sign_in_time,
          sign_out_time: formData.sign_out_time,
          profile_id: formData.profile_id,
          client_id: formData.client_id,
          project_id: formData.project_id,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          hourly_rate: formData.hourly_rate,
          notes: formData.notes,
          status: formData.status as WorkingHoursStatus
        }]);

      if (error) throw error;
      toast({ title: "Success", description: "Working hours recorded successfully" });
      
      setIsDialogOpen(false);
      setFormData({
        profile_id: "",
        client_id: "",
        project_id: "",
        date: "",
        start_time: "",
        end_time: "",
        total_hours: 0,
        actual_hours: 0,
        overtime_hours: 0,
        payable_amount: 0,
        hourly_rate: 0,
        notes: "",
        status: "pending",
        sign_in_time: "",
        sign_out_time: ""
      });
      fetchWorkingHours();
    } catch (error) {
      console.error('Error saving working hours:', error);
      toast({
        title: "Error",
        description: "Failed to save working hours",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && workingHours.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Working Hours</h1>
            <p className="text-gray-600">Record and manage employee working hours</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Record Hours
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record Working Hours</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <ProfileSelector
                profiles={profiles}
                selectedProfileId={formData.profile_id}
                onProfileSelect={(profileId) => setFormData({ ...formData, profile_id: profileId })}
                label="Select Profile"
                placeholder="Choose an employee"
                showRoleFilter={true}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_id">Client</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.company})
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="hourly_rate">Hourly Rate</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sign_in_time">Sign In Time</Label>
                  <Input
                    id="sign_in_time"
                    type="time"
                    value={formData.sign_in_time}
                    onChange={(e) => setFormData({ ...formData, sign_in_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="sign_out_time">Sign Out Time</Label>
                  <Input
                    id="sign_out_time"
                    type="time"
                    value={formData.sign_out_time}
                    onChange={(e) => setFormData({ ...formData, sign_out_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="total_hours">Total Hours</Label>
                  <Input
                    id="total_hours"
                    type="number"
                    step="0.5"
                    value={formData.total_hours}
                    onChange={(e) => setFormData({ ...formData, total_hours: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="actual_hours">Actual Hours</Label>
                  <Input
                    id="actual_hours"
                    type="number"
                    step="0.5"
                    value={formData.actual_hours}
                    onChange={(e) => setFormData({ ...formData, actual_hours: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="overtime_hours">Overtime Hours</Label>
                  <Input
                    id="overtime_hours"
                    type="number"
                    step="0.5"
                    value={formData.overtime_hours}
                    onChange={(e) => setFormData({ ...formData, overtime_hours: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="payable_amount">Payable Amount</Label>
                  <Input
                    id="payable_amount"
                    type="number"
                    step="0.01"
                    value={formData.payable_amount}
                    onChange={(e) => setFormData({ ...formData, payable_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes or comments"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as WorkingHoursStatus })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Recording..." : "Record Hours"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Records</CardTitle>
            <FileText className="h-5 w-5 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{workingHours.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {workingHours.filter(wh => wh.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {workingHours.filter(wh => wh.status === 'approved').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Paid</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {workingHours.filter(wh => wh.status === 'paid').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-600">Employee</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Client</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Project</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Hours</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Rate</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workingHours.map((hour) => (
              <tr key={hour.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900">{hour.profiles?.full_name || 'Unknown'}</div>
                  <div className="text-sm text-gray-600">{hour.profiles?.role || 'N/A'}</div>
                </td>
                <td className="py-3 px-4 text-gray-600">{hour.clients?.name || 'N/A'}</td>
                <td className="py-3 px-4 text-gray-600">{hour.projects?.name || 'N/A'}</td>
                <td className="py-3 px-4 text-gray-600">{new Date(hour.date).toLocaleDateString()}</td>
                <td className="py-3 px-4 text-gray-600">{hour.total_hours}h</td>
                <td className="py-3 px-4 text-gray-600">${hour.hourly_rate}</td>
                <td className="py-3 px-4">
                  <Badge variant={
                    hour.status === "paid" ? "default" : 
                    hour.status === "approved" ? "secondary" : "outline"
                  }>
                    {hour.status}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(hour)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(hour.id)}
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

      <EditWorkingHoursDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onUpdate={handleUpdate}
        workingHours={editingWorkingHours}
        clients={clients}
        projects={projects}
      />
    </div>
  );
};
