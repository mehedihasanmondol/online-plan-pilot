
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BankAccount, BankTransaction, Client, Project, Profile } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

export const BankBalance = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBankAccounts();
    fetchTransactions();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setBankAccounts(data as BankAccount[]);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bank accounts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select(`
          *,
          clients (company),
          projects (name),
          profiles (full_name),
          bank_accounts (bank_name, account_number)
        `)
        .order('date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTransactions(data as BankTransaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const calculateTotalBalance = () => {
    return bankAccounts.reduce((total, account) => {
      const accountTransactions = transactions.filter(t => t.bank_account_id === account.id);
      const balance = accountTransactions.reduce((sum, transaction) => {
        return transaction.type === 'deposit' 
          ? sum + transaction.amount 
          : sum - transaction.amount;
      }, account.opening_balance);
      return total + balance;
    }, 0);
  };

  const getTotalDeposits = () => {
    return transactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalWithdrawals = () => {
    return transactions
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bank Balance Overview</h1>
          <p className="text-gray-600">Monitor account balances and transaction history</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${calculateTotalBalance().toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {bankAccounts.length} account{bankAccounts.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Deposits</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${getTotalDeposits().toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter(t => t.type === 'deposit').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Withdrawals</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${getTotalWithdrawals().toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter(t => t.type === 'withdrawal').length} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts ({bankAccounts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bankAccounts.map((account) => {
              const accountTransactions = transactions.filter(t => t.bank_account_id === account.id);
              const currentBalance = accountTransactions.reduce((sum, transaction) => {
                return transaction.type === 'deposit' 
                  ? sum + transaction.amount 
                  : sum - transaction.amount;
              }, account.opening_balance);

              return (
                <div key={account.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{account.bank_name}</h3>
                      <p className="text-sm text-gray-600">
                        {account.account_holder_name} • ****{account.account_number.slice(-4)}
                      </p>
                      {account.bsb_code && (
                        <p className="text-xs text-gray-500">BSB: {account.bsb_code}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        ${currentBalance.toFixed(2)}
                      </div>
                      {account.is_primary && (
                        <Badge variant="default" className="mt-1">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Account</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{transaction.description}</div>
                      {transaction.clients && (
                        <div className="text-sm text-gray-600">Client: {transaction.clients.company}</div>
                      )}
                      {transaction.projects && (
                        <div className="text-sm text-gray-600">Project: {transaction.projects.name}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{transaction.category}</td>
                    <td className="py-3 px-4">
                      <Badge variant={transaction.type === 'deposit' ? 'default' : 'outline'}>
                        {transaction.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-medium ${
                        transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {transaction.bank_accounts?.bank_name || 'N/A'}
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
