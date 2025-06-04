
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DollarSign, User, FileText, Printer, Download, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Payroll, WorkingHour, BankAccount } from "@/types/database";

interface PayrollDetailsViewProps {
  payroll: Payroll | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PayrollDetailsView = ({ payroll, isOpen, onClose }: PayrollDetailsViewProps) => {
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (payroll && isOpen) {
      fetchWorkingHours();
      fetchBankAccount();
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

  const fetchBankAccount = async () => {
    if (!payroll?.profiles?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('profile_id', payroll.profiles.id)
        .eq('is_primary', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setBankAccount(data);
    } catch (error) {
      console.error('Error fetching bank account:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payslip - ${payroll?.profiles?.full_name}</title>
            <style>
              @media print { 
                body { margin: 0; }
                .page-break { page-break-before: always; }
              }
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .summary { margin-bottom: 30px; }
              .working-hours { margin-top: 30px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
            </style>
          </head>
          <body>
            ${document.querySelector('.payroll-details-content')?.outerHTML || ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!payroll) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Payslip Details
            </DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="payroll-details-content">
          {/* Page 1: Summary */}
          <div className="space-y-6">
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold">PAYSLIP</h1>
              <p className="text-gray-600">Pay Period: {new Date(payroll.pay_period_start).toLocaleDateString()} - {new Date(payroll.pay_period_end).toLocaleDateString()}</p>
            </div>

            {/* Employee Information */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Employee Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span>{payroll.profiles?.full_name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Role:</span>
                    <span>{payroll.profiles?.role || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Employee ID:</span>
                    <span>{payroll.profiles?.id.slice(0, 8) || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <Badge variant={
                      payroll.status === "paid" ? "default" : 
                      payroll.status === "approved" ? "secondary" : "outline"
                    }>
                      {payroll.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Payment Date:</span>
                    <span>{payroll.status === 'paid' ? new Date().toLocaleDateString() : 'Pending'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings Summary */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Earnings Summary</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Hours:</span>
                      <span className="font-medium">{payroll.total_hours} hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hourly Rate:</span>
                      <span className="font-medium">${payroll.hourly_rate.toFixed(2)}/hour</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gross Pay:</span>
                      <span className="font-medium">${payroll.gross_pay.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Deductions:</span>
                      <span className="font-medium text-red-600">-${payroll.deductions.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Net Pay:</span>
                      <span className="text-green-600">${payroll.net_pay.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            {bankAccount && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Details
                </h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Bank Name:</span>
                        <span className="font-medium">{bankAccount.bank_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Account Holder:</span>
                        <span className="font-medium">{bankAccount.account_holder_name}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Account Number:</span>
                        <span className="font-medium">****{bankAccount.account_number.slice(-4)}</span>
                      </div>
                      {bankAccount.bsb_code && (
                        <div className="flex justify-between">
                          <span>BSB Code:</span>
                          <span className="font-medium">{bankAccount.bsb_code}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Page 2: Working Hours Details */}
          <div className="page-break mt-8">
            <div className="text-center border-b pb-4 mb-6">
              <h2 className="text-xl font-bold">WORKING HOURS BREAKDOWN</h2>
              <p className="text-gray-600">{payroll.profiles?.full_name} - {new Date(payroll.pay_period_start).toLocaleDateString()} to {new Date(payroll.pay_period_end).toLocaleDateString()}</p>
            </div>

            {loading ? (
              <div className="text-center py-8">Loading working hours...</div>
            ) : workingHours.length > 0 ? (
              <div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Client</th>
                      <th className="p-2 text-left">Project</th>
                      <th className="p-2 text-center">Start Time</th>
                      <th className="p-2 text-center">End Time</th>
                      <th className="p-2 text-center">Hours</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workingHours.map((hour) => (
                      <tr key={hour.id} className="border-b">
                        <td className="p-2">{new Date(hour.date).toLocaleDateString()}</td>
                        <td className="p-2">{hour.clients?.company || 'N/A'}</td>
                        <td className="p-2">{hour.projects?.name || 'N/A'}</td>
                        <td className="p-2 text-center">{hour.start_time}</td>
                        <td className="p-2 text-center">{hour.end_time}</td>
                        <td className="p-2 text-center">{hour.total_hours}</td>
                        <td className="p-2 text-right">${(hour.hourly_rate || 0).toFixed(2)}</td>
                        <td className="p-2 text-right">${(hour.total_hours * (hour.hourly_rate || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={5} className="p-2 text-right">Total:</td>
                      <td className="p-2 text-center">{workingHours.reduce((sum, wh) => sum + wh.total_hours, 0)} hrs</td>
                      <td className="p-2 text-right">-</td>
                      <td className="p-2 text-right">${workingHours.reduce((sum, wh) => sum + (wh.total_hours * (wh.hourly_rate || 0)), 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>

                {workingHours.some(wh => wh.notes) && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-2">Notes:</h4>
                    <div className="space-y-1 text-sm">
                      {workingHours.filter(wh => wh.notes).map((hour) => (
                        <div key={hour.id}>
                          <span className="font-medium">{new Date(hour.date).toLocaleDateString()}:</span> {hour.notes}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No working hours found for this payroll period.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 print:hidden">
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
