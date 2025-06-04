
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign, Calendar, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Payroll, Profile, WorkingHour } from "@/types/database";
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
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generatePayroll = async () => {
    if (!selectedProfile || !startDate || !endDate) {
      toast({
        title: "Missing Information",
        description: "Please select a profile and date range",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get profile details
      const profile = profiles.find(p => p.id === selectedProfile);
      if (!profile) throw new Error("Profile not found");

      // Get working hours for the period
      const periodWorkingHours = workingHours.filter(wh => 
        wh.profile_id === selectedProfile &&
        wh.date >= startDate &&
        wh.date <= endDate &&
        wh.status === 'approved'
      );

      if (periodWorkingHours.length === 0) {
        toast({
          title: "No Working Hours",
          description: "No approved working hours found for this period",
          variant: "destructive"
        });
        return;
      }

      const totalHours = periodWorkingHours.reduce((sum, wh) => sum + Number(wh.total_hours), 0);
      const hourlyRate = profile.hourly_rate || 0;
      const grossPay = totalHours * hourlyRate;
      const deductions = grossPay * 0.1; // 10% deduction
      const netPay = grossPay - deductions;

      // Create payroll record
      const { error } = await supabase
        .from('payroll')
        .insert({
          profile_id: selectedProfile,
          pay_period_start: startDate,
          pay_period_end: endDate,
          total_hours: totalHours,
          hourly_rate: hourlyRate,
          gross_pay: grossPay,
          deductions: deductions,
          net_pay: netPay,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payroll generated successfully"
      });

      // Clear form
      setSelectedProfile("");
      setStartDate("");
      setEndDate("");
      onRefresh();
    } catch (error) {
      console.error('Error generating payroll:', error);
      toast({
        title: "Error",
        description: "Failed to generate payroll",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Employees with Approved Hours Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Employees with Approved Hours
            </CardTitle>
            <Button onClick={() => setSelectedProfile("")} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Payroll
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profilesWithHours.map((profile) => {
              const profileHours = workingHours.filter(wh => wh.profile_id === profile.id);
              const totalHours = profileHours.reduce((sum, wh) => sum + Number(wh.total_hours), 0);
              
              return (
                <div key={profile.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{profile.full_name}</h3>
                    <Badge variant="secondary">{profile.role}</Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {totalHours}h total
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      ${profile.hourly_rate || 0}/hr
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => setSelectedProfile(profile.id)}
                  >
                    Generate Payroll
                  </Button>
                </div>
              );
            })}
          </div>
          
          {profilesWithHours.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No employees with approved working hours found.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Generate Form */}
      {selectedProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Payroll</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="profile">Employee</Label>
                <ProfileSelector
                  profiles={profilesWithHours}
                  selectedProfileId={selectedProfile}
                  onProfileSelect={setSelectedProfile}
                />
              </div>

              <div>
                <Label htmlFor="start-date">Pay Period Start</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="end-date">Pay Period End</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setSelectedProfile("")}
              >
                Cancel
              </Button>
              <Button
                onClick={generatePayroll}
                disabled={loading}
              >
                {loading ? "Generating..." : "Generate Payroll"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
