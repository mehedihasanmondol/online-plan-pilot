import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, User, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile, WorkingHour } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { ProfileSelector } from "@/components/common/ProfileSelector";

interface PayrollQuickGenerateProps {
  profiles: Profile[];
  profilesWithHours: Profile[];
  workingHours: WorkingHour[];
  onRefresh: () => void;
}

export const PayrollQuickGenerate = ({ 
  profiles, 
  profilesWithHours, 
  workingHours, 
  onRefresh 
}: PayrollQuickGenerateProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWorkingHoursPreviewOpen, setIsWorkingHoursPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    profile_id: "",
    pay_period_start: "",
    pay_period_end: "",
    total_hours: 0,
    hourly_rate: 0,
    gross_pay: 0,
    deductions: 0,
    net_pay: 0,
    status: "pending" as const
  });

  const [previewWorkingHours, setPreviewWorkingHours] = useState<WorkingHour[]>([]);

  const calculatePayroll = (hours: number, rate: number, deductions: number) => {
    const gross = hours * rate;
    const net = gross - deductions;
    return { gross, net };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { gross, net } = calculatePayroll(formData.total_hours, formData.hourly_rate, formData.deductions);
      
      const { error } = await supabase
        .from('payroll')
        .insert([{
          ...formData,
          gross_pay: gross,
          net_pay: net
        }]);

      if (error) throw error;
      toast({ title: "Success", description: "Payroll record created successfully" });
      
      setIsDialogOpen(false);
      setFormData({
        profile_id: "",
        pay_period_start: "",
        pay_period_end: "",
        total_hours: 0,
        hourly_rate: 0,
        gross_pay: 0,
        deductions: 0,
        net_pay: 0,
        status: "pending"
      });
      setPreviewWorkingHours([]);
      onRefresh();
    } catch (error) {
      console.error('Error creating payroll:', error);
      toast({
        title: "Error",
        description: "Failed to create payroll record",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePayrollForProfile = async (profileId: string) => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const profileWorkingHours = workingHours.filter(wh => 
        wh.profile_id === profileId &&
        wh.date >= monthStart &&
        wh.date <= monthEnd
      );

      const totalHours = profileWorkingHours.reduce((sum, wh) => sum + wh.total_hours, 0);
      const avgHourlyRate = profileWorkingHours.length > 0 
        ? profileWorkingHours.reduce((sum, wh) => sum + (wh.hourly_rate || 0), 0) / profileWorkingHours.length
        : 0;

      setFormData({
        profile_id: profileId,
        pay_period_start: monthStart,
        pay_period_end: monthEnd,
        total_hours: totalHours,
        hourly_rate: avgHourlyRate,
        gross_pay: 0,
        deductions: 0,
        net_pay: 0,
        status: "pending"
      });
      
      setPreviewWorkingHours(profileWorkingHours);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error generating payroll:', error);
      toast({
        title: "Error",
        description: "Failed to generate payroll",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (formData.profile_id && formData.pay_period_start && formData.pay_period_end) {
      const profileWorkingHours = workingHours.filter(wh => 
        wh.profile_id === formData.profile_id &&
        wh.date >= formData.pay_period_start &&
        wh.date <= formData.pay_period_end
      );

      const totalHours = profileWorkingHours.reduce((sum, wh) => sum + wh.total_hours, 0);
      const avgHourlyRate = profileWorkingHours.length > 0 
        ? profileWorkingHours.reduce((sum, wh) => sum + (wh.hourly_rate || 0), 0) / profileWorkingHours.length
        : 0;

      setFormData(prev => ({
        ...prev,
        total_hours: totalHours,
        hourly_rate: avgHourlyRate
      }));
      
      setPreviewWorkingHours(profileWorkingHours);
    }
  }, [formData.profile_id, formData.pay_period_start, formData.pay_period_end, workingHours]);

  return (
    <div className="space-y-6">
      {/* Manual Payroll Creation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create Individual Payroll</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Payroll
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Payroll Record</DialogTitle>
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
                      <Label htmlFor="pay_period_start">Period Start</Label>
                      <Input
                        id="pay_period_start"
                        type="date"
                        value={formData.pay_period_start}
                        onChange={(e) => setFormData({ ...formData, pay_period_start: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="pay_period_end">Period End</Label>
                      <Input
                        id="pay_period_end"
                        type="date"
                        value={formData.pay_period_end}
                        onChange={(e) => setFormData({ ...formData, pay_period_end: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="total_hours">Total Hours (Auto-calculated)</Label>
                      <Input
                        id="total_hours"
                        type="number"
                        step="0.5"
                        value={formData.total_hours}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hourly_rate">Average Hourly Rate (Auto-calculated)</Label>
                      <Input
                        id="hourly_rate"
                        type="number"
                        step="0.01"
                        value={formData.hourly_rate}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="deductions">Deductions</Label>
                    <Input
                      id="deductions"
                      type="number"
                      step="0.01"
                      value={formData.deductions}
                      onChange={(e) => setFormData({ ...formData, deductions: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {formData.total_hours > 0 && formData.hourly_rate > 0 && (
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between text-sm">
                        <span>Gross Pay:</span>
                        <span>${(formData.total_hours * formData.hourly_rate).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Deductions:</span>
                        <span>-${formData.deductions.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Net Pay:</span>
                        <span>${(formData.total_hours * formData.hourly_rate - formData.deductions).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {previewWorkingHours.length > 0 && (
                    <Collapsible open={isWorkingHoursPreviewOpen} onOpenChange={setIsWorkingHoursPreviewOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Working Hours Preview ({previewWorkingHours.length} entries)
                          </span>
                          {isWorkingHoursPreviewOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <div className="border rounded-lg p-4">
                          <div className="max-h-40 overflow-y-auto space-y-2">
                            {previewWorkingHours.map((wh) => (
                              <div key={wh.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                <div>
                                  <span className="font-medium">{new Date(wh.date).toLocaleDateString()}</span>
                                  <span className="text-gray-600 ml-2">
                                    {wh.clients?.company || 'N/A'} - {wh.projects?.name || 'N/A'}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div>{wh.total_hours}h × ${wh.hourly_rate}/hr</div>
                                  <div className="font-medium">${(wh.total_hours * (wh.hourly_rate || 0)).toFixed(2)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Creating..." : "Create Payroll"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Generate for Employees with Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Employees with Approved Hours
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Payroll
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Payroll Record</DialogTitle>
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
                      <Label htmlFor="pay_period_start">Period Start</Label>
                      <Input
                        id="pay_period_start"
                        type="date"
                        value={formData.pay_period_start}
                        onChange={(e) => setFormData({ ...formData, pay_period_start: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="pay_period_end">Period End</Label>
                      <Input
                        id="pay_period_end"
                        type="date"
                        value={formData.pay_period_end}
                        onChange={(e) => setFormData({ ...formData, pay_period_end: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="total_hours">Total Hours (Auto-calculated)</Label>
                      <Input
                        id="total_hours"
                        type="number"
                        step="0.5"
                        value={formData.total_hours}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hourly_rate">Average Hourly Rate (Auto-calculated)</Label>
                      <Input
                        id="hourly_rate"
                        type="number"
                        step="0.01"
                        value={formData.hourly_rate}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="deductions">Deductions</Label>
                    <Input
                      id="deductions"
                      type="number"
                      step="0.01"
                      value={formData.deductions}
                      onChange={(e) => setFormData({ ...formData, deductions: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {formData.total_hours > 0 && formData.hourly_rate > 0 && (
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between text-sm">
                        <span>Gross Pay:</span>
                        <span>${(formData.total_hours * formData.hourly_rate).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Deductions:</span>
                        <span>-${formData.deductions.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Net Pay:</span>
                        <span>${(formData.total_hours * formData.hourly_rate - formData.deductions).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Creating..." : "Create Payroll"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {profilesWithHours.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No employees have approved working hours available
              </p>
            ) : (
              profilesWithHours.map((profile) => {
                const profileHours = workingHours.filter(wh => wh.profile_id === profile.id);
                const totalHours = profileHours.reduce((sum, wh) => sum + wh.total_hours, 0);
                const avgRate = profileHours.length > 0 
                  ? profileHours.reduce((sum, wh) => sum + (wh.hourly_rate || 0), 0) / profileHours.length
                  : 0;
                
                return (
                  <div key={profile.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{profile.full_name}</div>
                      <div className="text-sm text-gray-600">
                        {profile.role} - {totalHours.toFixed(1)}h available at avg ${avgRate.toFixed(2)}/hr
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generatePayrollForProfile(profile.id)}
                    >
                      Generate
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
