
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Download, Printer, Calendar, DollarSign, Clock, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Payroll, WorkingHour, BankAccount } from "@/types/database";

interface PayrollDetailsDialogProps {
  payroll: Payroll | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ExtendedWorkingHour extends Omit<WorkingHour, 'clients' | 'projects'> {
  clients: {
    id: string;
    name: string;
    company: string;
  } | null;
  projects: {
    id: string;
    name: string;
  } | null;
}

export const PayrollDetailsDialog = ({ payroll, isOpen, onClose }: PayrollDetailsDialogProps) => {
  const [workingHours, setWorkingHours] = useState<ExtendedWorkingHour[]>([]);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(false);

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
          clients!working_hours_client_id_fkey (id, name, company),
          projects!working_hours_project_id_fkey (id, name)
        `)
        .eq('profile_id', payroll.profile_id)
        .gte('date', payroll.pay_period_start)
        .lte('date', payroll.pay_period_end)
        .eq('status', 'approved');

      if (hoursError) throw hoursError;
      setWorkingHours(hoursData as ExtendedWorkingHour[]);

      // Fetch bank account details if available
      if (payroll.bank_account_id) {
        const { data: bankData, error: bankError } = await supabase
          .from('bank_accounts')
          .select('*')
          .eq('id', payroll.bank_account_id)
          .single();

        if (bankError) throw bankError;
        setBankAccount(bankData);
      }
    } catch (error) {
      console.error('Error fetching payroll details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a new window for download/print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML());
      printWindow.document.close();
      printWindow.print();
    }
  };

  const generatePrintHTML = () => {
    if (!payroll) return '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payroll Details - ${payroll.profiles?.full_name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .section h3 { border-bottom: 2px solid #333; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .page-break { page-break-before: always; }
            .total { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Payroll Statement</h1>
            <h2>${payroll.profiles?.full_name}</h2>
            <p>Pay Period: ${new Date(payroll.pay_period_start).toLocaleDateString()} - ${new Date(payroll.pay_period_end).toLocaleDateString()}</p>
          </div>

          <div class="section">
            <h3>Summary</h3>
            <table>
              <tr><td>Total Hours</td><td>${payroll.total_hours}</td></tr>
              <tr><td>Hourly Rate</td><td>$${payroll.hourly_rate.toFixed(2)}</td></tr>
              <tr><td>Gross Pay</td><td>$${payroll.gross_pay.toFixed(2)}</td></tr>
              <tr><td>Deductions</td><td>$${payroll.deductions.toFixed(2)}</td></tr>
              <tr class="total"><td>Net Pay</td><td>$${payroll.net_pay.toFixed(2)}</td></tr>
            </table>
          </div>

          ${bankAccount ? `
          <div class="section">
            <h3>Bank Details</h3>
            <table>
              <tr><td>Bank</td><td>${bankAccount.bank_name}</td></tr>
              <tr><td>Account Number</td><td>${bankAccount.account_number}</td></tr>
              <tr><td>Account Holder</td><td>${bankAccount.account_holder_name}</td></tr>
            </table>
          </div>
          ` : ''}

          <div class="page-break"></div>

          <div class="section">
            <h3>Working Hours Details</h3>
            <table>
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
                    <td>$${wh.payable_amount.toFixed(2)}</td>
                  </tr>
                `).join('')}
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle>Payroll Details</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 print:space-y-4">
          {/* Header Section */}
          <div className="text-center border-b pb-4 print:pb-2">
            <h2 className="text-2xl font-bold print:text-xl">Payroll Statement</h2>
            <h3 className="text-xl text-gray-600 print:text-lg">{payroll.profiles?.full_name}</h3>
            <p className="text-sm text-gray-500">
              Pay Period: {new Date(payroll.pay_period_start).toLocaleDateString()} - {new Date(payroll.pay_period_end).toLocaleDateString()}
            </p>
          </div>

          {/* Summary Section */}
          <Card className="print:shadow-none print:border">
            <CardHeader className="pb-3 print:pb-2">
              <CardTitle className="flex items-center gap-2 text-lg print:text-base">
                <DollarSign className="h-5 w-5 text-green-600" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 print:gap-2">
              <div className="space-y-2 print:space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Hours:</span>
                  <span className="font-medium">{payroll.total_hours}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Hourly Rate:</span>
                  <span className="font-medium">${payroll.hourly_rate.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2 print:space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Gross Pay:</span>
                  <span className="font-medium">${payroll.gross_pay.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Deductions:</span>
                  <span className="font-medium text-red-600">-${payroll.deductions.toFixed(2)}</span>
                </div>
              </div>
              <Separator className="col-span-2" />
              <div className="col-span-2 flex justify-between text-lg font-bold print:text-base">
                <span>Net Pay:</span>
                <span className="text-green-600">${payroll.net_pay.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          {bankAccount && (
            <Card className="print:shadow-none print:border">
              <CardHeader className="pb-3 print:pb-2">
                <CardTitle className="flex items-center gap-2 text-lg print:text-base">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Bank Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 print:gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Bank:</span>
                  <div className="font-medium">{bankAccount.bank_name}</div>
                </div>
                <div>
                  <span className="text-gray-600">Account Number:</span>
                  <div className="font-medium">{bankAccount.account_number}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Account Holder:</span>
                  <div className="font-medium">{bankAccount.account_holder_name}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Working Hours Details */}
          <div className="print:page-break-before print:pt-4">
            <Card className="print:shadow-none print:border">
              <CardHeader className="pb-3 print:pb-2">
                <CardTitle className="flex items-center gap-2 text-lg print:text-base">
                  <Clock className="h-5 w-5 text-purple-600" />
                  Working Hours Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading...</div>
                ) : (
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
                            <td className="py-2 print:py-1 text-right">{wh.total_hours}</td>
                            <td className="py-2 print:py-1 text-right">${(wh.hourly_rate || 0).toFixed(2)}</td>
                            <td className="py-2 print:py-1 text-right font-medium">${wh.payable_amount.toFixed(2)}</td>
                          </tr>
                        ))}
                        {workingHours.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-4 text-gray-500">
                              No working hours found for this period
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
