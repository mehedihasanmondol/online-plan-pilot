
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, DollarSign, Calendar, User, Building, Clock, FileText, CreditCard } from "lucide-react";
import { Payroll, Profile, BankAccount, WorkingHour } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PayrollDetailsDialogProps {
  payroll: Payroll | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PayrollDetailsDialog = ({ 
  payroll, 
  isOpen, 
  onClose
}: PayrollDetailsDialogProps) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileBankAccount, setProfileBankAccount] = useState<BankAccount | null>(null);
  const [paymentBankAccount, setPaymentBankAccount] = useState<BankAccount | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
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
      // Fetch profile details
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', payroll.profile_id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch profile's primary bank account
      const { data: profileBankData, error: profileBankError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('profile_id', payroll.profile_id)
        .eq('is_primary', true)
        .single();

      if (!profileBankError && profileBankData) {
        setProfileBankAccount(profileBankData);
      }

      // Fetch payment bank account if payroll was paid
      if (payroll.bank_account_id) {
        const { data: paymentBankData, error: paymentBankError } = await supabase
          .from('bank_accounts')
          .select('*')
          .eq('id', payroll.bank_account_id)
          .single();

        if (!paymentBankError && paymentBankData) {
          setPaymentBankAccount(paymentBankData);
        }
      }

      // Fetch working hours for the pay period
      const { data: hoursData, error: hoursError } = await supabase
        .from('working_hours')
        .select(`
          *,
          clients!working_hours_client_id_fkey (id, name, company, email, phone, status, created_at, updated_at),
          projects!working_hours_project_id_fkey (id, name)
        `)
        .eq('profile_id', payroll.profile_id)
        .gte('date', payroll.pay_period_start)
        .lte('date', payroll.pay_period_end)
        .eq('status', 'approved')
        .order('date', { ascending: true });

      if (hoursError) throw hoursError;
      setWorkingHours(hoursData || []);

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
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleDownload = () => {
    const content = generatePayrollContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip-${profile?.full_name?.replace(/\s+/g, '-')}-${payroll?.pay_period_start}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Payslip downloaded successfully"
    });
  };

  const generatePayrollContent = () => {
    if (!payroll || !profile) return '';
    
    return `
PAYSLIP
=======

Company: Your Company Name
Pay Period: ${new Date(payroll.pay_period_start).toLocaleDateString()} - ${new Date(payroll.pay_period_end).toLocaleDateString()}
Pay Date: ${new Date().toLocaleDateString()}
Payslip ID: ${payroll.id}

EMPLOYEE INFORMATION
--------------------
Name: ${profile.full_name}
Email: ${profile.email}
Role: ${profile.role}
Employment Type: ${profile.employment_type}
${profile.phone ? `Phone: ${profile.phone}` : ''}
${profile.full_address ? `Address: ${profile.full_address}` : ''}

PAYMENT DETAILS
---------------
Total Hours: ${payroll.total_hours}
Hourly Rate: $${payroll.hourly_rate.toFixed(2)}
Gross Pay: $${payroll.gross_pay.toFixed(2)}
Deductions: $${payroll.deductions.toFixed(2)}
Net Pay: $${payroll.net_pay.toFixed(2)}

EMPLOYEE BANK ACCOUNT
--------------------
${profileBankAccount ? `
Bank Name: ${profileBankAccount.bank_name}
Account Number: ${profileBankAccount.account_number}
Account Holder: ${profileBankAccount.account_holder_name}
${profileBankAccount.bsb_code ? `BSB Code: ${profileBankAccount.bsb_code}` : ''}
` : 'No bank account information available'}

${paymentBankAccount ? `
PAYMENT BANK ACCOUNT
-------------------
Paid From: ${paymentBankAccount.bank_name}
Account: ${paymentBankAccount.account_number}
Account Holder: ${paymentBankAccount.account_holder_name}
` : ''}

WORKING HOURS BREAKDOWN
-----------------------
${workingHours.map(wh => `
Date: ${new Date(wh.date).toLocaleDateString()}
Client: ${wh.clients?.company || 'N/A'}
Project: ${wh.projects?.name || 'N/A'}
Hours: ${wh.total_hours}h
Rate: $${wh.hourly_rate}/hr
Amount: $${(wh.total_hours * (wh.hourly_rate || 0)).toFixed(2)}
${wh.notes ? `Notes: ${wh.notes}` : ''}
`).join('\n')}

Status: ${payroll.status.toUpperCase()}
Generated: ${new Date().toLocaleDateString()}

Employee Signature: _________________     Date: _________________

---
This is an automatically generated payslip.
`;
  };

  if (!payroll) {
    return null;
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex justify-center items-center h-32">
            <div className="text-lg">Loading payroll details...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Payslip - {profile?.full_name}
            </DialogTitle>
            <div className="flex gap-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={isPrinting}
              >
                <Printer className="h-4 w-4 mr-2" />
                {isPrinting ? 'Preparing...' : 'Print'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 print:space-y-2" id="payroll-content">
          {/* PAGE 1 - SUMMARY */}
          <div className="print-page">
            {/* Header */}
            <div className="text-center border-b-2 border-gray-800 pb-2 print:pb-1">
              <h1 className="text-2xl font-bold text-gray-800 print:text-lg">PAYSLIP</h1>
              <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-1 text-xs text-gray-600">
                <div>Pay Period: {new Date(payroll.pay_period_start).toLocaleDateString()} - {new Date(payroll.pay_period_end).toLocaleDateString()}</div>
                <div>Pay Date: {new Date().toLocaleDateString()}</div>
                <div>Payslip ID: {payroll.id.slice(0, 8)}</div>
              </div>
            </div>

            {/* Employee Information */}
            <Card className="print:shadow-none print:border mt-3">
              <CardHeader className="pb-2 print:pb-1">
                <CardTitle className="flex items-center gap-2 text-base print:text-sm">
                  <User className="h-4 w-4" />
                  Employee Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2 print:gap-1 text-sm print:text-xs">
                <div>
                  <div className="text-xs text-gray-600">Full Name</div>
                  <div className="font-medium">{profile?.full_name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Email</div>
                  <div className="font-medium">{profile?.email}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Role</div>
                  <div className="font-medium capitalize">{profile?.role}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Employment Type</div>
                  <div className="font-medium capitalize">{profile?.employment_type}</div>
                </div>
                {profile?.phone && (
                  <div>
                    <div className="text-xs text-gray-600">Phone</div>
                    <div className="font-medium">{profile.phone}</div>
                  </div>
                )}
                {profile?.full_address && (
                  <div className="md:col-span-2">
                    <div className="text-xs text-gray-600">Address</div>
                    <div className="font-medium">{profile.full_address}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card className="print:shadow-none print:border mt-3">
              <CardHeader className="pb-2 print:pb-1">
                <CardTitle className="flex items-center gap-2 text-base print:text-sm">
                  <DollarSign className="h-4 w-4" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 print:gap-1 mb-3">
                  <div className="text-center p-2 bg-blue-50 rounded print:bg-gray-50">
                    <div className="text-xs text-gray-600">Total Hours</div>
                    <div className="text-lg font-bold text-blue-600 print:text-sm">{payroll.total_hours}</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded print:bg-gray-50">
                    <div className="text-xs text-gray-600">Hourly Rate</div>
                    <div className="text-lg font-bold text-green-600 print:text-sm">${payroll.hourly_rate.toFixed(2)}</div>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded print:bg-gray-50">
                    <div className="text-xs text-gray-600">Gross Pay</div>
                    <div className="text-lg font-bold text-purple-600 print:text-sm">${payroll.gross_pay.toFixed(2)}</div>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded print:bg-gray-50">
                    <div className="text-xs text-gray-600">Net Pay</div>
                    <div className="text-lg font-bold text-orange-600 print:text-sm">${payroll.net_pay.toFixed(2)}</div>
                  </div>
                </div>
                
                <Separator className="my-2" />
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gross Pay</span>
                    <span className="font-medium">${payroll.gross_pay.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Total Deductions</span>
                    <span className="font-medium">-${payroll.deductions.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Net Pay</span>
                    <span className="text-green-600">${payroll.net_pay.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank Accounts - Compact Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {/* Employee Bank Account */}
              {profileBankAccount && (
                <Card className="print:shadow-none print:border">
                  <CardHeader className="pb-2 print:pb-1">
                    <CardTitle className="flex items-center gap-2 text-base print:text-sm">
                      <Building className="h-4 w-4" />
                      Employee Bank Account
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    <div>
                      <span className="text-gray-600">Bank:</span> {profileBankAccount.bank_name}
                    </div>
                    <div>
                      <span className="text-gray-600">Account:</span> {profileBankAccount.account_number}
                    </div>
                    <div>
                      <span className="text-gray-600">Holder:</span> {profileBankAccount.account_holder_name}
                    </div>
                    {profileBankAccount.bsb_code && (
                      <div>
                        <span className="text-gray-600">BSB:</span> {profileBankAccount.bsb_code}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Payment Bank Account */}
              {paymentBankAccount && (
                <Card className="print:shadow-none print:border">
                  <CardHeader className="pb-2 print:pb-1">
                    <CardTitle className="flex items-center gap-2 text-base print:text-sm">
                      <CreditCard className="h-4 w-4" />
                      Payment Bank Account
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    <div>
                      <span className="text-gray-600">Bank:</span> {paymentBankAccount.bank_name}
                    </div>
                    <div>
                      <span className="text-gray-600">Account:</span> {paymentBankAccount.account_number}
                    </div>
                    <div>
                      <span className="text-gray-600">Holder:</span> {paymentBankAccount.account_holder_name}
                    </div>
                    {paymentBankAccount.bsb_code && (
                      <div>
                        <span className="text-gray-600">BSB:</span> {paymentBankAccount.bsb_code}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Working Hours Summary */}
            {workingHours.length > 0 && (
              <Card className="print:shadow-none print:border mt-3">
                <CardHeader className="pb-2 print:pb-1">
                  <CardTitle className="flex items-center gap-2 text-base print:text-sm">
                    <Clock className="h-4 w-4" />
                    Working Hours Summary ({workingHours.length} entries)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-40 overflow-y-auto print:max-h-none">
                    <div className="space-y-1">
                      {workingHours.map((wh, index) => (
                        <div key={wh.id} className={`text-xs p-2 rounded ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} print:bg-white print:border-b print:border-gray-200`}>
                          <div className="flex justify-between items-center">
                            <div className="flex gap-4">
                              <span className="font-medium">{new Date(wh.date).toLocaleDateString()}</span>
                              <span>{wh.clients?.company || 'N/A'}</span>
                              <span>{wh.projects?.name || 'N/A'}</span>
                            </div>
                            <div className="flex gap-2 text-right">
                              <span>{wh.total_hours}h</span>
                              <span className="font-medium">${(wh.total_hours * (wh.hourly_rate || 0)).toFixed(2)}</span>
                            </div>
                          </div>
                          {wh.notes && (
                            <div className="text-gray-600 mt-1">{wh.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-gray-300 text-xs font-bold">
                      <div className="flex justify-between">
                        <span>TOTAL:</span>
                        <div className="flex gap-2">
                          <span>{workingHours.reduce((sum, wh) => sum + wh.total_hours, 0)}h</span>
                          <span>${workingHours.reduce((sum, wh) => sum + (wh.total_hours * (wh.hourly_rate || 0)), 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status and Signature */}
            <Card className="print:shadow-none print:border mt-3">
              <CardContent className="pt-4 print:pt-2">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-xs text-gray-600">Payment Status</div>
                    <div className={`text-sm font-bold capitalize ${
                      payroll.status === 'paid' 
                        ? 'text-green-600' 
                        : payroll.status === 'approved'
                        ? 'text-blue-600'
                        : 'text-yellow-600'
                    }`}>
                      {payroll.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600">Generated On</div>
                    <div className="text-sm font-medium">{new Date(payroll.created_at).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Signature Section */}
                <Separator className="mb-3" />
                <div className="space-y-2">
                  <div className="text-center text-xs font-medium text-gray-700">
                    Employee Acknowledgment
                  </div>
                  <div className="flex justify-between items-end pt-4">
                    <div className="text-center">
                      <div className="border-b border-gray-400 w-40 mb-1"></div>
                      <div className="text-xs text-gray-600">Employee Signature</div>
                    </div>
                    <div className="text-center">
                      <div className="border-b border-gray-400 w-24 mb-1"></div>
                      <div className="text-xs text-gray-600">Date</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="mt-4 text-center text-xs text-gray-500 border-t pt-2">
              <p>This is a computer-generated payslip. Please verify all details and contact HR for any discrepancies.</p>
              <p className="mt-1">Employee copy - retain for your records</p>
            </div>
          </div>
        </div>

        <style>{`
          @media print {
            body { 
              margin: 0; 
              font-size: 10px;
              line-height: 1.2;
            }
            
            .dialog-content {
              box-shadow: none !important;
              border: none !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0.25rem !important;
            }
            
            button, .print\\:hidden {
              display: none !important;
            }
            
            .dialog-header {
              display: none !important;
            }
            
            .print-page {
              min-height: 100vh;
              page-break-inside: avoid;
            }
            
            .text-2xl { font-size: 1.2rem !important; }
            .text-lg { font-size: 0.95rem !important; }
            .text-base { font-size: 0.85rem !important; }
            .text-sm { font-size: 0.8rem !important; }
            .text-xs { font-size: 0.7rem !important; }
            
            .space-y-4 > * + * { margin-top: 0.5rem !important; }
            .space-y-3 > * + * { margin-top: 0.4rem !important; }
            .space-y-2 > * + * { margin-top: 0.3rem !important; }
            .space-y-1 > * + * { margin-top: 0.2rem !important; }
            
            .bg-blue-50, .bg-green-50, .bg-purple-50, .bg-orange-50 {
              background-color: #f5f5f5 !important;
            }
            
            .p-4 { padding: 0.5rem !important; }
            .p-3 { padding: 0.4rem !important; }
            .p-2 { padding: 0.3rem !important; }
            .py-2 { padding-top: 0.3rem !important; padding-bottom: 0.3rem !important; }
            .px-2 { padding-left: 0.3rem !important; padding-right: 0.3rem !important; }
            .pt-4 { padding-top: 0.5rem !important; }
            .pb-2 { padding-bottom: 0.3rem !important; }
            .mt-3 { margin-top: 0.4rem !important; }
            .mt-4 { margin-top: 0.5rem !important; }
            .mb-3 { margin-bottom: 0.4rem !important; }
            .mb-4 { margin-bottom: 0.5rem !important; }
            
            .gap-4 { gap: 0.5rem !important; }
            .gap-3 { gap: 0.4rem !important; }
            .gap-2 { gap: 0.3rem !important; }
            .gap-1 { gap: 0.2rem !important; }
            
            @page {
              margin: 0.5cm;
              size: A4;
            }
            
            .max-h-40 {
              max-height: none !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};
