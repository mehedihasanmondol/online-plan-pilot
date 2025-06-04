import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Calendar, FileText, CheckCircle, XCircle, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkingHour, Profile, Client, Project } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { DataTable } from "@/components/ui/data-table";
import { EditWorkingHoursDialog } from "@/components/working-hours/EditWorkingHoursDialog";
import { WorkingHoursTable } from "@/components/working-hours/WorkingHoursTable";

export const WorkingHoursComponent = () => {
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkingHour | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    profile_id: "",
    date: "",
    start_time: "",
    end_time: "",
    total_hours: 0,
    notes: "",
    hourly_rate: 0,
    client_id: "",
    project_id: "",
    status: "pending" as const
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
          profiles!working_hours_profile_id_fkey (id, full_name, email, role, avatar_url, is_active, phone, employment_type, hourly_rate, salary, tax_file_number, start_date, created_at, updated_at),
          clients!working_hours_client_id_fkey (id, name, email, phone, company, status, created_at, updated_at),
          projects!working_hours_project_id_fkey (id, name, description, client_id, status, start_date, end_date, budget, created_at, updated_at)
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

  const updateWorkingHoursStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('working_hours')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast({ 
        title: "Success", 
        description: `Working hours ${status} successfully` 
      });
      fetchWorkingHours();
    } catch (error) {
      console.error('Error updating working hours status:', error);
      toast({
        title: "Error",
        description: "Failed to update working hours status",
        variant: "destructive"
      });
    }
  };

  const handleEditSubmit = async (updatedData: WorkingHour) => {
    if (!editingEntry) return;

    try {
      const { error } = await supabase
        .from('working_hours')
        .update({
          date: updatedData.date,
          start_time: updatedData.start_time,
          end_time: updatedData.end_time,
          total_hours: updatedData.total_hours,
          notes: updatedData.notes,
          hourly_rate: updatedData.hourly_rate,
          client_id: updatedData.client_id,
          project_id: updatedData.project_id
        })
        .eq('id', editingEntry.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Working hours updated successfully"
      });

      setEditingEntry(null);
      setShowEditDialog(false);
      fetchWorkingHours();
    } catch (error) {
      console.error('Error updating working hours:', error);
      toast({
        title: "Error",
        description: "Failed to update working hours",
        variant: "destructive"
      });
    }
  };

  const filteredWorkingHours = workingHours.filter(hour => {
    const matchesSearch = hour.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || hour.status === statusFilter;
    const matchesDate = dateFilter === "" || hour.date === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Working Hours</h1>
            <p className="text-gray-600">Track and manage employee working hours</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by employee name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Hours Tracked</CardTitle>
            <Clock className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {workingHours.reduce((sum, hour) => sum + hour.total_hours, 0).toFixed(1)} hours
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Hours</CardTitle>
            <FileText className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {workingHours.filter(hour => hour.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Approved Hours</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {workingHours.filter(hour => hour.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <WorkingHoursTable 
        workingHours={filteredWorkingHours}
        onStatusUpdate={updateWorkingHoursStatus}
        onEdit={(entry) => {
          setEditingEntry(entry);
          setShowEditDialog(true);
        }}
        loading={loading}
      />

      <EditWorkingHoursDialog
        workingHour={editingEntry}
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setEditingEntry(null);
        }}
        onSubmit={handleEditSubmit}
        clients={clients}
        projects={projects}
        profiles={profiles}
      />
    </div>
  );
};
