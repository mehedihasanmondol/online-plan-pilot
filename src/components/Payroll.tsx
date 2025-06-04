
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, Calendar, FileText, Clock, User, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Payroll as PayrollType, Profile, WorkingHour, BankAccount } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { PayrollDetailsView } from "@/components/payroll/PayrollDetailsView";
import { BankSelectionDialog } from "@/components/payroll/BankSelectionDialog";
import { PayrollListWithFilters } from "@/components/payroll/PayrollListWithFilters";
import { PayrollManagement } from "@/components/salary/PayrollManagement";

export const PayrollComponent = () => {
  const [payrolls, setPayrolls] = useState<PayrollType[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [profilesWithHours, setProfilesWithHours] = useState<Profile[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayrollForView, setSelectedPayrollForView] = useState<PayrollType | null>(null);
  const [showPayrollDetails, setShowPayrollDetails] = useState(false);
  const [showBankSelectionDialog, setShowBankSelectionDialog] = useState(false);
  const [selectedPayrollForPayment, setSelectedPayrollForPayment] = useState<PayrollType | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayrolls();
    fetchProfiles();
    fetchWorkingHours();
    fetchBankAccounts();
  }, []);

  const fetchPayrolls = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll')
        .select(`
          *,
          profiles!payroll_profile_id_fkey (id, full_name, role, hourly_rate)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const payrollData = (data || []).map(payroll => ({
        ...payroll,
        profiles: Array.isArray(payroll.profiles) ? payroll.profiles[0] : payroll.profiles
      }));
      
      setPayrolls(payrollData as PayrollType[]);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payroll records",
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

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .is('profile_id', null)
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
        .select(`
          *,
          profiles!working_hours_profile_id_fkey (id, full_name, role),
          clients!working_hours_client_id_fkey (id, name, company),
          projects!working_hours_project_id_fkey (id, name)
        `)
        .eq('status', 'approved')
        .order('date', { ascending: false });

      if (error) throw error;
      setWorkingHours(data as WorkingHour[]);
      
      const profileIds = [...new Set(data.map(wh => wh.profile_id))];
      const profilesWithApprovedHours = profiles.filter(p => profileIds.includes(p.id));
      setProfilesWithHours(profilesWithApprovedHours);
    } catch (error) {
      console.error('Error fetching working hours:', error);
    }
  };

  useEffect(() => {
    if (profiles.length > 0 && workingHours.length > 0) {
      const profileIds = [...new Set(workingHours.map(wh => wh.profile_id))];
      const profilesWithApprovedHours = profiles.filter(p => profileIds.includes(p.id));
      setProfilesWithHours(profilesWithApprovedHours);
    }
  }, [profiles, workingHours]);

  const handleMarkAsPaid = (payroll: PayrollType) => {
    setSelectedPayrollForPayment(payroll);
    setShowBankSelectionDialog(true);
  };

  const handleConfirmPayment = async (bankAccountId: string) => {
    if (!selectedPayrollForPayment) return;

    setLoading(true);
    try {
      const payroll = selectedPayrollForPayment;

      // Get bank account details
      const { data: bankAccount, error: bankError } = await supabase
        .from('bank_accounts')
        .select('opening_balance')
        .eq('id', bankAccountId)
        .single();

      if (bankError) throw bankError;

      // Get current balance by calculating all transactions
      const { data: transactions, error: transError } = await supabase
        .from('bank_transactions')
        .select('amount, type')
        .eq('bank_account_id', bankAccountId);

      if (transError) throw transError;

      const currentBalance = bankAccount.opening_balance + 
        transactions.reduce((sum, t) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0);

      if (currentBalance < payroll.net_pay) {
        toast({
          title: "Insufficient Balance",
          description: "Bank account does not have sufficient balance for this payment",
          variant: "destructive"
        });
        return;
      }

      // Create withdrawal transaction
      const { error: transactionError } = await supabase
        .from('bank_transactions')
        .insert({
          description: `Salary payment for ${payroll.profiles?.full_name} (${payroll.pay_period_start} - ${payroll.pay_period_end})`,
          amount: payroll.net_pay,
          type: 'withdrawal',
          category: 'salary',
          date: new Date().toISOString().split('T')[0],
          profile_id: payroll.profile_id,
          bank_account_id: bankAccountId
        });

      if (transactionError) throw transactionError;

      // Update payroll status and bank account
      const { error } = await supabase
        .from('payroll')
        .update({ 
          status: 'paid',
          bank_account_id: bankAccountId 
        })
        .eq('id', payroll.id);

      if (error) throw error;

      // Send notification for payment
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          title: 'Salary Payment Processed',
          message: `Your salary for period ${payroll.pay_period_start} to ${payroll.pay_period_end} has been paid. Amount: $${payroll.net_pay.toFixed(2)}`,
          type: 'salary_paid',
          recipient_profile_id: payroll.profile_id,
          related_id: payroll.id,
          action_type: 'none',
          priority: 'high'
        });

      if (notificationError) console.error('Failed to send notification:', notificationError);

      toast({ 
        title: "Success", 
        description: "Payment processed successfully" 
      });
      
      setShowBankSelectionDialog(false);
      setSelectedPayrollForPayment(null);
      fetchPayrolls();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePayrollStatus = async (id: string, status: 'approved') => {
    try {
      const { error } = await supabase
        .from('payroll')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast({ 
        title: "Success", 
        description: `Payroll ${status} successfully` 
      });
      fetchPayrolls();
    } catch (error) {
      console.error('Error updating payroll status:', error);
      toast({
        title: "Error",
        description: "Failed to update payroll status",
        variant: "destructive"
      });
    }
  };

  const handleViewPayroll = (payroll: PayrollType) => {
    setSelectedPayrollForView(payroll);
    setShowPayrollDetails(true);
  };

  const refreshData = () => {
    fetchPayrolls();
    fetchWorkingHours();
  };

  if (loading && payrolls.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600">Manage employee payroll and payments</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Payroll</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${payrolls.reduce((sum, p) => sum + p.gross_pay, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            <Calendar className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {payrolls.filter(p => p.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
            <FileText className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {payrolls.filter(p => p.status === 'approved').length}
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
              {payrolls.filter(p => p.status === 'paid').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Quick Generate and Payroll Records */}
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Quick Generate Payroll</TabsTrigger>
          <TabsTrigger value="records">Payroll Records</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Employees with Approved Hours
              </CardTitle>
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
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <PayrollManagement 
            payrolls={payrolls}
            profiles={profiles}
            onRefresh={refreshData}
          />
        </TabsContent>

        <TabsContent value="records" className="space-y-6">
          <PayrollListWithFilters
            payrolls={payrolls}
            onViewPayroll={handleViewPayroll}
            onMarkAsPaid={handleMarkAsPaid}
            onApprove={(id) => updatePayrollStatus(id, "approved")}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      {/* Enhanced Payroll Details Dialog */}
      <PayrollDetailsView
        payroll={selectedPayrollForView}
        isOpen={showPayrollDetails}
        onClose={() => setShowPayrollDetails(false)}
      />

      {/* Bank Selection Dialog */}
      <BankSelectionDialog
        isOpen={showBankSelectionDialog}
        onClose={() => setShowBankSelectionDialog(false)}
        onConfirm={handleConfirmPayment}
        payroll={selectedPayrollForPayment}
        bankAccounts={bankAccounts}
        loading={loading}
      />
    </div>
  );
};
