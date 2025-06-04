import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, DollarSign, User, FileText, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Payroll, WorkingHour } from "@/types/database";

interface PayrollDetailsDialogProps {
  payroll: Payroll | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PayrollDetailsDialog = ({ payroll, isOpen, onClose }: PayrollDetailsDialogProps) => {
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (payroll && isOpen) {
      fetchWorkingHours();
    }
  }, [payroll, isOpen]);

  const fetchWorkingHours = async () => {
    if (!payroll) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('working_hours')
        .select(`
          *,
          clients!working_hours_client_id_fkey (id, name, company),
          projects!working_hours_project_id_fkey (id, name)
        `)
        .eq('profile_id', payroll.profile_id)
        .gte('date', payroll.pay_period_start)
        .lte('date', payroll.pay_period_end)
        .order('date', { ascending: true });

      if (error) throw error;
      
      // Transform the data to match WorkingHour type
      const transformedData = (data || []).map(wh => ({
        ...wh,
        clients: wh.clients ? {
          ...wh.clients,
          email: '',
          status: 'active' as const,
          phone: null,
          created_at: '',
          updated_at: ''
        } : undefined,
        projects: wh.projects
      }));
      
      setWorkingHours(transformedData as WorkingHour[]);
    } catch (error) {
      console.error('Error fetching working hours:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!payroll) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payroll Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Employee:</span>
              <div>
                <User className="h-4 w-4 inline-block mr-1" />
                {payroll.profiles?.full_name || 'Unknown'}
              </div>
            </div>
            <div>
              <span className="font-medium">Role:</span>
              <div>{payroll.profiles?.role || 'N/A'}</div>
            </div>
            <div>
              <span className="font-medium">Period:</span>
              <div>
                <Calendar className="h-4 w-4 inline-block mr-1" />
                {new Date(payroll.pay_period_start).toLocaleDateString()} - {new Date(payroll.pay_period_end).toLocaleDateString()}
              </div>
            </div>
            <div>
              <span className="font-medium">Status:</span>
              <div>
                <Badge variant={
                  payroll.status === "paid" ? "default" : 
                  payroll.status === "approved" ? "secondary" : "outline"
                }>
                  {payroll.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Total Hours:</span>
              <div>
                <Clock className="h-4 w-4 inline-block mr-1" />
                {payroll.total_hours} hours
              </div>
            </div>
            <div>
              <span className="font-medium">Hourly Rate:</span>
              <div>
                <DollarSign className="h-4 w-4 inline-block mr-1" />
                ${payroll.hourly_rate.toFixed(2)}/hour
              </div>
            </div>
            <div>
              <span className="font-medium">Gross Pay:</span>
              <div>
                <DollarSign className="h-4 w-4 inline-block mr-1" />
                ${payroll.gross_pay.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="font-medium">Deductions:</span>
              <div>
                <DollarSign className="h-4 w-4 inline-block mr-1" />
                ${payroll.deductions.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="font-medium">Net Pay:</span>
              <div>
                <DollarSign className="h-4 w-4 inline-block mr-1" />
                ${payroll.net_pay.toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-2">Working Hours</h4>
            {loading ? (
              <div className="text-center">Loading working hours...</div>
            ) : workingHours.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 p-2">Date</th>
                      <th className="border border-gray-200 p-2">Client</th>
                      <th className="border border-gray-200 p-2">Project</th>
                      <th className="border border-gray-200 p-2">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workingHours.map((hour) => (
                      <tr key={hour.id}>
                        <td className="border border-gray-200 p-2">{new Date(hour.date).toLocaleDateString()}</td>
                        <td className="border border-gray-200 p-2">{hour.clients?.company || 'N/A'}</td>
                        <td className="border border-gray-200 p-2">{hour.projects?.name || 'N/A'}</td>
                        <td className="border border-gray-200 p-2">{hour.total_hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center">No working hours found for this payroll period.</div>
            )}
          </div>
        </div>

        <Button onClick={onClose} className="w-full">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
};
