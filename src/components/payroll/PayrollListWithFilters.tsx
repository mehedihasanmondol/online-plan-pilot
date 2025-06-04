
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, Eye, DollarSign, Filter } from "lucide-react";
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
  const [dateShortcut, setDateShortcut] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Date shortcuts logic
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
      case 'january':
        return {
          start: new Date(currentYear, 0, 1).toISOString().split('T')[0],
          end: new Date(currentYear, 0, 31).toISOString().split('T')[0]
        };
      case 'february':
        return {
          start: new Date(currentYear, 1, 1).toISOString().split('T')[0],
          end: new Date(currentYear, 1, 28).toISOString().split('T')[0]
        };
      case 'march':
        return {
          start: new Date(currentYear, 2, 1).toISOString().split('T')[0],
          end: new Date(currentYear, 2, 31).toISOString().split('T')[0]
        };
      case 'april':
        return {
          start: new Date(currentYear, 3, 1).toISOString().split('T')[0],
          end: new Date(currentYear, 3, 30).toISOString().split('T')[0]
        };
      case 'may':
        return {
          start: new Date(currentYear, 4, 1).toISOString().split('T')[0],
          end: new Date(currentYear, 4, 31).toISOString().split('T')[0]
        };
      case 'june':
        return {
          start: new Date(currentYear, 5, 1).toISOString().split('T')[0],
          end: new Date(currentYear, 5, 30).toISOString().split('T')[0]
        };
      case 'july':
        return {
          start: new Date(currentYear, 6, 1).toISOString().split('T')[0],
          end: new Date(currentYear, 6, 31).toISOString().split('T')[0]
        };
      case 'august':
        return {
          start: new Date(currentYear, 7, 1).toISOString().split('T')[0],
          end: new Date(currentYear, 7, 31).toISOString().split('T')[0]
        };
      case 'september':
        return {
          start: new Date(currentYear, 8, 1).toISOString().split('T')[0],
          end: new Date(currentYear, 8, 30).toISOString().split('T')[0]
        };
      case 'october':
        return {
          start: new Date(currentYear, 9, 1).toISOString().split('T')[0],
          end: new Date(currentYear, 9, 31).toISOString().split('T')[0]
        };
      case 'november':
        return {
          start: new Date(currentYear, 10, 1).toISOString().split('T')[0],
          end: new Date(currentYear, 10, 30).toISOString().split('T')[0]
        };
      case 'december':
        return {
          start: new Date(currentYear, 11, 1).toISOString().split('T')[0],
          end: new Date(currentYear, 11, 31).toISOString().split('T')[0]
        };
      case 'this-year':
        return {
          start: new Date(currentYear, 0, 1).toISOString().split('T')[0],
          end: new Date(currentYear, 11, 31).toISOString().split('T')[0]
        };
      default:
        return { start: "", end: "" };
    }
  };

  const handleDateShortcut = (shortcut: string) => {
    setDateShortcut(shortcut);
    if (shortcut === "all") {
      setStartDate("");
      setEndDate("");
    } else {
      const { start, end } = getDateShortcut(shortcut);
      setStartDate(start);
      setEndDate(end);
    }
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
        
        {/* Enhanced Date Filter Section */}
        <div className="space-y-4">
          {/* First Row: Date Shortcuts, Date Pickers, and Filter Button */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="date-shortcut">Quick Date Filter</Label>
              <Select value={dateShortcut} onValueChange={handleDateShortcut}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="last-week">Last Week</SelectItem>
                  <SelectItem value="current-week">Current Week</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="january">January</SelectItem>
                  <SelectItem value="february">February</SelectItem>
                  <SelectItem value="march">March</SelectItem>
                  <SelectItem value="april">April</SelectItem>
                  <SelectItem value="may">May</SelectItem>
                  <SelectItem value="june">June</SelectItem>
                  <SelectItem value="july">July</SelectItem>
                  <SelectItem value="august">August</SelectItem>
                  <SelectItem value="september">September</SelectItem>
                  <SelectItem value="october">October</SelectItem>
                  <SelectItem value="november">November</SelectItem>
                  <SelectItem value="december">December</SelectItem>
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
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateShortcut("custom");
                }}
              />
            </div>

            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateShortcut("custom");
                }}
              />
            </div>

            <Button 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>

          {/* Second Row: Search and Status Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
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
