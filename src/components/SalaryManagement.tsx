
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, DollarSign, Calculator, Users, Calendar, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Payroll, Profile, Client, Project, BankAccount, WorkingHour } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

export const SalaryManagement = () => {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    profile_ids: [] as string[],
    pay_period_start: "",
    pay_period_end: "",
    client_id: "",
    project_id: "",
    bank_account_id: "",
    deductions: 0,
    status: "pending" as "pending" | "approved" | "paid"
  });

  useEffect(() => {
    fetchPayrolls();
    fetchProfiles();
    fetchClients();
    fetchProjects();
    fetchBankAccounts();
    fetchWorkingHours();
  }, []);

  const fetchPayrolls = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll')
        .select(`
          *,
          profiles!payroll_profile_id_fkey (id, full_name, hourly_rate),
          bank_accounts (id, bank_name, account_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayrolls(data || []);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payrolls",
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
      setProfiles(data || []);
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
      setClients(data || []);
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
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('bank_name');

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const fetchWorkingHours = async () => {
    try {
      const { data, error } = await supabase
        .from('working_hours')
        .select('*')
        .eq('status', 'approved');

      if (error) throw error;
      setWorkingHours(data || []);
    } catch (error) {
      console.error('Error fetching working hours:', error);
    }
  };

  const calculatePayrollData = (profileId: string) => {
    const profileWorkingHours = workingHours.filter(wh => 
      wh.profile_id === profileId &&
      wh.date >= formData.pay_period_start &&
      wh.date <= formData.pay_period_end &&
      (!formData.client_id || wh.client_id === formData.client_id) &&
      (!formData.project_id || wh.project_id === formData.project_id)
    );

    const totalHours = profileWorkingHours.reduce((sum, wh) => sum + (wh.actual_hours || wh.total_hours), 0);
    const grossPay = profileWorkingHours.reduce((sum, wh) => sum + (wh.payable_amount || 0), 0);
    const profile = profiles.find(p => p.id === profileId);
    const hourlyRate = profile?.hourly_rate || 0;

    return {
      totalHours,
      hourlyRate,
      grossPay,
      netPay: grossPay - formData.deductions
    };
  };

  const handleProfileSelection = (profileId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        profile_ids: [...formData.profile_ids, profileId]
      });
    } else {
      setFormData({
        ...formData,
        profile_ids: formData.profile_ids.filter(id => id !== profileId)
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        profile_ids: profiles.map(p => p.id)
      });
    } else {
      setFormData({
        ...formData,
        profile_ids: []
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.profile_ids.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one profile",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const payrollRecords = formData.profile_ids.map(profileId => {
        const payrollData = calculatePayrollData(profileId);
        return {
          profile_id: profileId,
          pay_period_start: formData.pay_period_start,
          pay_period_end: formData.pay_period_end,
          total_hours: payrollData.totalHours,
          hourly_rate: payrollData.hourlyRate,
          gross_pay: payrollData.grossPay,
          deductions: formData.deductions,
          net_pay: payrollData.netPay,
          status: formData.status,
          bank_account_id: formData.bank_account_id || null
        };
      });

      if (editingPayroll) {
        const { error } = await supabase
          .from('payroll')
          .update(payrollRecords[0])
          .eq('id', editingPayroll.id);

        if (error) throw error;
        toast({ title: "Success", description: "Payroll updated successfully" });
      } else {
        const { error } = await supabase
          .from('payroll')
          .insert(payrollRecords);

        if (error) throw error;
        toast({ 
          title: "Success", 
          description: `${payrollRecords.length} payroll record(s) created successfully` 
        });
      }

      setIsDialogOpen(false);
      setEditingPayroll(null);
      resetForm();
      fetchPayrolls();
    } catch (error: any) {
      console.error('Error saving payroll:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save payroll",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      profile_ids: [],
      pay_period_start: "",
      pay_period_end: "",
      client_id: "",
      project_id: "",
      bank_account_id: "",
      deductions: 0,
      status: "pending"
    });
    setIsBulkMode(false);
  };

  const handleEdit = (payroll: Payroll) => {
    setEditingPayroll(payroll);
    setFormData({
      profile_ids: [payroll.profile_id],
      pay_period_start: payroll.pay_period_start,
      pay_period_end: payroll.pay_period_end,
      client_id: "",
      project_id: "",
      bank_account_id: payroll.bank_account_id || "",
      deductions: payroll.deductions,
      status: payroll.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payroll record?')) return;

    try {
      const { error } = await supabase
        .from('payroll')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Success", description: "Payroll record deleted successfully" });
      fetchPayrolls();
    } catch (error: any) {
      console.error('Error deleting payroll:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete payroll record",
        variant: "destructive"
      });
    }
  };

  const filteredPayrolls = payrolls.filter(payroll =>
    payroll.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPayroll = filteredPayrolls.reduce((sum, p) => sum + p.net_pay, 0);
  const totalHours = filteredPayrolls.reduce((sum, p) => sum + p.total_hours, 0);

  if (loading && payrolls.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Salary Management</h1>
            <p className="text-gray-600">Manage payroll with working hours integration</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingPayroll(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Payroll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPayroll ? "Edit Payroll" : "Create Payroll"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pay_period_start">Pay Period Start *</Label>
                  <Input
                    id="pay_period_start"
                    type="date"
                    value={formData.pay_period_start}
                    onChange={(e) => setFormData({ ...formData, pay_period_start: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="pay_period_end">Pay Period End *</Label>
                  <Input
                    id="pay_period_end"
                    type="date"
                    value={formData.pay_period_end}
                    onChange={(e) => setFormData({ ...formData, pay_period_end: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="client_id">Filter by Client (Optional)</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Clients</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="project_id">Filter by Project (Optional)</Label>
                  <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Projects</SelectItem>
                      {projects.filter(p => !formData.client_id || p.client_id === formData.client_id).map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bank_account_id">Bank Account (Optional)</Label>
                  <Select value={formData.bank_account_id} onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Bank Account</SelectItem>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bank_name} - {account.account_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="deductions">Deductions ($)</Label>
                  <Input
                    id="deductions"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deductions}
                    onChange={(e) => setFormData({ ...formData, deductions: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {!editingPayroll && (
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="bulk"
                      checked={isBulkMode}
                      onCheckedChange={(checked) => setIsBulkMode(checked === true)}
                    />
                    <Label htmlFor="bulk">Bulk payroll (create for multiple profiles)</Label>
                  </div>

                  <Label>Select Profiles *</Label>
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                    {isBulkMode && (
                      <div className="flex items-center space-x-2 mb-3 pb-3 border-b">
                        <Checkbox
                          id="select-all"
                          checked={formData.profile_ids.length === profiles.length}
                          onCheckedChange={handleSelectAll}
                        />
                        <Label htmlFor="select-all" className="font-medium">Select All</Label>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      {profiles.map((profile) => {
                        const payrollData = calculatePayrollData(profile.id);
                        return (
                          <div key={profile.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={profile.id}
                                checked={formData.profile_ids.includes(profile.id)}
                                onCheckedChange={(checked) => handleProfileSelection(profile.id, checked === true)}
                              />
                              <Label htmlFor={profile.id} className="flex-1">
                                {profile.full_name} ({profile.role})
                              </Label>
                            </div>
                            <div className="text-sm text-gray-600">
                              {payrollData.totalHours}h - ${payrollData.grossPay.toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating..." : editingPayroll ? "Update Payroll" : "Create Payroll"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalPayroll.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Net pay amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Hours</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Hours worked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Payroll Records</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{filteredPayrolls.length}</div>
            <p className="text-xs text-muted-foreground">Total records</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payroll Records ({filteredPayrolls.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by profile name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Profile</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Period</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Gross Pay</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Deductions</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Net Pay</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayrolls.map((payroll) => (
                  <tr key={payroll.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {payroll.profiles?.full_name || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(payroll.pay_period_start).toLocaleDateString()} - {new Date(payroll.pay_period_end).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{payroll.total_hours}h</td>
                    <td className="py-3 px-4 text-gray-600">${payroll.hourly_rate}/hr</td>
                    <td className="py-3 px-4 text-green-600 font-medium">${payroll.gross_pay.toFixed(2)}</td>
                    <td className="py-3 px-4 text-red-600">${payroll.deductions.toFixed(2)}</td>
                    <td className="py-3 px-4 text-blue-600 font-medium">${payroll.net_pay.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        payroll.status === "paid" ? "default" : 
                        payroll.status === "approved" ? "secondary" : "outline"
                      }>
                        {payroll.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(payroll)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(payroll.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
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
