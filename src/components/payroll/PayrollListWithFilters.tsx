
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, Eye, DollarSign } from "lucide-react";
import type { Payroll } from "@/types/database";

interface PayrollListWithFiltersProps {
  payrolls: Payroll[];
  onViewPayroll: (payroll: Payroll) => void;
  onMarkAsPaid: (payroll: Payroll) => void;
  onApprove: (payrollId: string) => void;
  loading: boolean;
}

export const PayrollListWithFilters = ({ 
  payrolls, 
  onViewPayroll, 
  onMarkAsPaid, 
  onApprove, 
  loading 
}: PayrollListWithFiltersProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateShortcut, setDateShortcut] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Generate month options from current month back to January
  const getMonthOptions = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const options = [];
    for (let i = currentMonth; i >= 0; i--) {
      options.push({
        value: months[i].toLowerCase(),
        label: months[i]
      });
    }
    return options;
  };

  // Date shortcuts
  const getDateShortcut = (shortcut: string) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    switch (shortcut) {
      case 'last-week':
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);
        return {
          start: lastWeek.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0]
        };
      case 'current-week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        return {
          start: startOfWeek.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0]
        };
      case 'last-month':
        const lastMonth = new Date(currentYear, currentMonth - 1, 1);
        const lastMonthEnd = new Date(currentYear, currentMonth, 0);
        return {
          start: lastMonth.toISOString().split('T')[0],
          end: lastMonthEnd.toISOString().split('T')[0]
        };
      case 'this-year':
        return {
          start: new Date(currentYear, 0, 1).toISOString().split('T')[0],
          end: new Date(currentYear, 11, 31).toISOString().split('T')[0]
        };
      default:
        // Handle specific months
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const monthIndex = monthNames.indexOf(shortcut);
        if (monthIndex !== -1) {
          return {
            start: new Date(currentYear, monthIndex, 1).toISOString().split('T')[0],
            end: new Date(currentYear, monthIndex + 1, 0).toISOString().split('T')[0]
          };
        }
        return { start: "", end: "" };
    }
  };

  const handleDateShortcut = (shortcut: string) => {
    const { start, end } = getDateShortcut(shortcut);
    setStartDate(start);
    setEndDate(end);
    setDateShortcut(shortcut);
  };

  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
    setDateShortcut("");
  };

  // Filter and search payrolls
  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((payroll) => {
      const matchesSearch = payroll.profiles?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || payroll.status === statusFilter;
      
      const matchesDateRange = 
        (!startDate || payroll.pay_period_start >= startDate) &&
        (!endDate || payroll.pay_period_end <= endDate);

      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [payrolls, searchTerm, statusFilter, startDate, endDate]);

  // Pagination
  const totalPages = Math.ceil(filteredPayrolls.length / itemsPerPage);
  const paginatedPayrolls = filteredPayrolls.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startDate, endDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll Records</CardTitle>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="date-shortcut">Date Shortcut</Label>
            <Select value={dateShortcut} onValueChange={handleDateShortcut}>
              <SelectTrigger>
                <SelectValue placeholder="Select shortcut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="current-week">Current Week</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                {getMonthOptions().map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
                <SelectItem value="this-year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="search">Search Employee</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(startDate || endDate || dateShortcut) && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={clearDateFilter}>
              Clear Date Filter
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Results summary */}
          <div className="text-sm text-gray-600">
            Showing {paginatedPayrolls.length} of {filteredPayrolls.length} records
          </div>

          {/* Payroll list */}
          {paginatedPayrolls.map((payroll) => (
            <div key={payroll.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-lg">{payroll.profiles?.full_name || 'Unknown'}</h3>
                    <Badge variant={
                      payroll.status === "paid" ? "default" : 
                      payroll.status === "approved" ? "secondary" : "outline"
                    }>
                      {payroll.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(payroll.pay_period_start).toLocaleDateString()} - {new Date(payroll.pay_period_end).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Net: ${payroll.net_pay.toLocaleString()}
                    </div>
                    <div>
                      Hours: {payroll.total_hours}h @ ${payroll.hourly_rate}/hr
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewPayroll(payroll)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  
                  {payroll.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onApprove(payroll.id)}
                      disabled={loading}
                    >
                      Approve
                    </Button>
                  )}
                  
                  {payroll.status === "approved" && (
                    <Button
                      size="sm"
                      onClick={() => onMarkAsPaid(payroll)}
                      disabled={loading}
                    >
                      Mark Paid
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredPayrolls.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No payroll records found matching your criteria.
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              <span className="flex items-center px-3 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
