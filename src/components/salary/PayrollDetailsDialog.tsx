
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Calendar, Clock, DollarSign, User, Building2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Payroll, WorkingHour, BankAccount } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

interface PayrollDetailsDialogProps {
  payroll: Payroll | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PayrollDetailsDialog = ({ payroll, isOpen, onClose }: PayrollDetailsDialogProps) => {
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (payroll && isOpen) {
      fetchPayrollDetails();
    }
  }, [payroll, isOpen]);

  const fetchPayrollDetails = async () => {
    if (!payroll) return;
    
    setLoading(true);
    try {
      // Fetch working hours for this payroll period
      const { data: hoursData, error: hoursError } = await supabase
        .from('working_hours')
        .select(`
          *,
          clients (id, name, company),
          projects (id, name)
        `)
        .eq('profile_id', payroll.profile_id)
        .gte('date', payroll.pay_period_start)
        .lte('date', payroll.pay_period_end)
        .eq('status', 'approved')
        .order('date');

      if (hoursError) throw hoursError;
      setWorkingHours(hoursData || []);

      // Fetch primary bank account for profile
      const { data: bankData, error: bankError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('profile_id', payroll.profile_id)
        .eq('is_primary', true)
        .single();

      if (bankError && bankError.code !== 'PGRST116') {
        console.error('Error fetching bank account:', bankError);
      } else {
        setBankAccount(bankData);
      }

    } catch (error) {
      console.error('Error fetching payroll details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payroll details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a new window with the payroll details for printing/saving as PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintableHTML());
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const generatePrintableHTML = () => {
    if (!payroll) return '';

    const totalEarnings = workingHours.reduce((sum, wh) => sum + (wh.total_hours * (wh.hourly_rate || 0)), 0);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payroll Details - ${payroll.profiles?.full_name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f5f5f5; font-weight: bold; }
            .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
            .total { font-weight: bold; font-size: 14px; }
            @media print { 
              body { margin: 0; } 
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <!-- Page 1: Summary -->
          <div class="header">
            <h1>PAYROLL STATEMENT</h1>
            <p>Pay Period: ${new Date(payroll.pay_period_start).toLocaleDateString()} - ${new Date(payroll.pay_period_end).toLocaleDateString()}</p>
          </div>

          <div class="grid">
            <div class="section">
              <h3>Employee Information</h3>
              <p><strong>Name:</strong> ${payroll.profiles?.full_name || 'N/A'}</p>
              <p><strong>Role:</strong> ${payroll.profiles?.role || 'N/A'}</p>
              <p><strong>Email:</strong> ${payroll.profiles?.email || 'N/A'}</p>
            </div>

            <div class="section">
              <h3>Bank Account Details</h3>
              ${bankAccount ? `
                <p><strong>Bank:</strong> ${bankAccount.bank_name}</p>
                <p><strong>Account:</strong> ${bankAccount.account_number}</p>
                <p><strong>Holder:</strong> ${bankAccount.account_holder_name}</p>
              ` : '<p>No bank account on file</p>'}
            </div>
          </div>

          <div class="summary">
            <h3>Pay Summary</h3>
            <table class="table">
              <tr><td>Total Hours Worked</td><td>${payroll.total_hours}</td></tr>
              <tr><td>Average Hourly Rate</td><td>$${payroll.hourly_rate.toFixed(2)}</td></tr>
              <tr><td>Gross Pay</td><td>$${payroll.gross_pay.toFixed(2)}</td></tr>
              <tr><td>Deductions</td><td>$${payroll.deductions.toFixed(2)}</td></tr>
              <tr class="total"><td>Net Pay</td><td>$${payroll.net_pay.toFixed(2)}</td></tr>
            </table>
          </div>

          <div style="page-break-before: always;">
            <!-- Page 2: Working Hours Details -->
            <div class="header">
              <h2>WORKING HOURS BREAKDOWN</h2>
              <p>Pay Period: ${new Date(payroll.pay_period_start).toLocaleDateString()} - ${new Date(payroll.pay_period_end).toLocaleDateString()}</p>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Hours</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${workingHours.map(wh => `
                  <tr>
                    <td>${new Date(wh.date).toLocaleDateString()}</td>
                    <td>${wh.clients?.company || 'N/A'}</td>
                    <td>${wh.projects?.name || 'N/A'}</td>
                    <td>${wh.total_hours}</td>
                    <td>$${(wh.hourly_rate || 0).toFixed(2)}</td>
                    <td>$${(wh.total_hours * (wh.hourly_rate || 0)).toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr class="total">
                  <td colspan="3"><strong>Total</strong></td>
                  <td><strong>${workingHours.reduce((sum, wh) => sum + wh.total_hours, 0)}</strong></td>
                  <td></td>
                  <td><strong>$${totalEarnings.toFixed(2)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;
  };

  if (!payroll) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle>Payroll Details</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 print:space-y-4">
          {/* Header */}
          <div className="text-center print:mb-8">
            <h1 className="text-2xl font-bold print:text-xl">PAYROLL STATEMENT</h1>
            <p className="text-gray-600 print:text-black">
              Pay Period: {new Date(payroll.pay_period_start).toLocaleDateString()} - {new Date(payroll.pay_period_end).toLocaleDateString()}
            </p>
          </div>

          {/* Employee and Bank Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
            <Card className="print:border print:shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg print:text-base">
                  <User className="h-5 w-5" />
                  Employee Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 print:space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium">Name:</span>
                  <span>{payroll.profiles?.full_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Role:</span>
                  <span>{payroll.profiles?.role || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Email:</span>
                  <span className="text-sm">{payroll.profiles?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge variant={payroll.status === 'paid' ? 'default' : 'secondary'} className="print:border print:text-black">
                    {payroll.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="print:border print:shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg print:text-base">
                  <CreditCard className="h-5 w-5" />
                  Bank Account Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 print:space-y-1">
                {bankAccount ? (
                  <>
                    <div className="flex justify-between">
                      <span className="font-medium">Bank:</span>
                      <span>{bankAccount.bank_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Account:</span>
                      <span>{bankAccount.account_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Holder:</span>
                      <span className="text-sm">{bankAccount.account_holder_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">BSB:</span>
                      <span>{bankAccount.bsb_code || 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 print:text-black">No bank account on file</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pay Summary */}
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg print:text-base">
                <DollarSign className="h-5 w-5" />
                Pay Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 print:gap-2">
                <div className="space-y-3 print:space-y-2">
                  <div className="flex justify-between">
                    <span>Total Hours:</span>
                    <span className="font-medium">{payroll.total_hours}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hourly Rate:</span>
                    <span className="font-medium">${payroll.hourly_rate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gross Pay:</span>
                    <span className="font-medium">${payroll.gross_pay.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-3 print:space-y-2">
                  <div className="flex justify-between">
                    <span>Deductions:</span>
                    <span className="font-medium text-red-600 print:text-black">${payroll.deductions.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold print:text-base">
                    <span>Net Pay:</span>
                    <span className="text-green-600 print:text-black">${payroll.net_pay.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Working Hours Breakdown */}
          <Card className="print:border print:shadow-none print:page-break-before">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg print:text-base">
                <Clock className="h-5 w-5" />
                Working Hours Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading working hours...</p>
              ) : workingHours.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 print:py-1">Date</th>
                        <th className="text-left py-2 print:py-1">Client</th>
                        <th className="text-left py-2 print:py-1">Project</th>
                        <th className="text-right py-2 print:py-1">Hours</th>
                        <th className="text-right py-2 print:py-1">Rate</th>
                        <th className="text-right py-2 print:py-1">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workingHours.map((wh) => (
                        <tr key={wh.id} className="border-b border-gray-100">
                          <td className="py-2 print:py-1">{new Date(wh.date).toLocaleDateString()}</td>
                          <td className="py-2 print:py-1">{wh.clients?.company || 'N/A'}</td>
                          <td className="py-2 print:py-1">{wh.projects?.name || 'N/A'}</td>
                          <td className="text-right py-2 print:py-1">{wh.total_hours}</td>
                          <td className="text-right py-2 print:py-1">${(wh.hourly_rate || 0).toFixed(2)}</td>
                          <td className="text-right py-2 print:py-1">${(wh.total_hours * (wh.hourly_rate || 0)).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 font-bold">
                        <td colSpan={3} className="py-2 print:py-1">Total</td>
                        <td className="text-right py-2 print:py-1">
                          {workingHours.reduce((sum, wh) => sum + wh.total_hours, 0)}
                        </td>
                        <td></td>
                        <td className="text-right py-2 print:py-1">
                          ${workingHours.reduce((sum, wh) => sum + (wh.total_hours * (wh.hourly_rate || 0)), 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 print:text-black">No working hours found for this pay period</p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
