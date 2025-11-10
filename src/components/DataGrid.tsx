import { useState } from 'react';
import { Search, Filter, Edit, Trash2, Ban, CheckCircle, Eye, MoreVertical, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Mail, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface DataGridColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataGridProps {
  data: any[];
  columns: DataGridColumn[];
  onView?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onToggleStatus?: (row: any) => void;
  onApprove?: (row: any) => void;
  onUnapprove?: (row: any) => void;
  onReject?: (row: any) => void;
  onBlacklist?: (row: any) => void;
  onContact?: (row: any) => void;
  searchPlaceholder?: string;
  filterOptions?: { key: string; label: string; values: { value: string; label: string }[] }[];
  rowsPerPage?: number;
  emptyMessage?: string;
}

export function DataGrid({
  data,
  columns,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  onApprove,
  onUnapprove,
  onReject,
  onBlacklist,
  onContact,
  searchPlaceholder = 'Search...',
  filterOptions = [],
  rowsPerPage = 10,
  emptyMessage = 'No data available',
}: DataGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Apply filters and search
  let filteredData = data.filter(row => {
    // Search filter
    const searchMatch = searchTerm === '' || Object.values(row).some(value => {
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Apply all active filters
    const filterMatch = Object.entries(filters).every(([key, value]) => {
      if (!value || value === 'all') return true;
      return String(row[key]).toLowerCase() === value.toLowerCase();
    });

    return searchMatch && filterMatch;
  });

  // Apply sorting
  if (sortConfig) {
    filteredData = [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle strings
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Pagination
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setCurrentPage(1); // Reset to first page
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 h-12"
              />
            </div>

            {/* Filters */}
            {filterOptions.map((filter) => (
              <Select
                key={filter.key}
                value={filters[filter.key] || 'all'}
                onValueChange={(value) => handleFilterChange(filter.key, value)}
              >
                <SelectTrigger className="w-full md:w-48 h-12">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <SelectValue placeholder={filter.label} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {filter.label}</SelectItem>
                  {filter.values.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>

          {/* Active Filters Display */}
          {Object.entries(filters).some(([_, value]) => value && value !== 'all') && (
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600">Active filters:</span>
              {Object.entries(filters).map(([key, value]) => {
                if (!value || value === 'all') return null;
                const filter = filterOptions.find(f => f.key === key);
                const option = filter?.values.find(v => v.value === value);
                return (
                  <Badge key={key} variant="secondary" className="gap-1">
                    {filter?.label}: {option?.label}
                    <button
                      onClick={() => handleFilterChange(key, 'all')}
                      className="ml-1 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({});
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="h-6 text-xs"
              >
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-gray-600">
          Showing {paginatedData.length > 0 ? startIndex + 1 : 0}-
          {Math.min(startIndex + rowsPerPage, filteredData.length)} of {filteredData.length} results
        </p>
      </div>

      {/* Data Table */}
      <Card className="overflow-visible">
        <CardContent className="p-0 overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="text-left p-4 text-sm text-gray-700"
                    >
                      {column.sortable !== false ? (
                        <button
                          onClick={() => handleSort(column.key)}
                          className="flex items-center hover:text-gray-900 transition-colors"
                        >
                          {column.label}
                          {getSortIcon(column.key)}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                  {(onView || onEdit || onDelete || onToggleStatus || onApprove || onUnapprove || onReject || onBlacklist || onContact) && (
                    <th className="text-right p-4 text-sm text-gray-700">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="text-center p-12 text-gray-500"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, index) => (
                    <tr
                      key={row.id || index}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      {columns.map((column) => (
                        <td key={column.key} className="p-4">
                          {column.render
                            ? column.render(row[column.key], row)
                            : row[column.key]}
                        </td>
                      ))}
                      {(onView || onEdit || onDelete || onToggleStatus || onApprove || onUnapprove || onReject || onBlacklist || onContact) && (
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="inline-flex items-center justify-center h-8 w-8 p-0 rounded-md hover:bg-gray-100 transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={5}>
                              {onView && (
                                <DropdownMenuItem onClick={() => onView(row)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                              )}
                              {onEdit && (
                                <DropdownMenuItem onClick={() => onEdit(row)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {/* Show Approve for pending providers */}
                              {onApprove && (row.verificationStatus === 'pending' || row.verificationStatus === 'rejected') && (
                                <DropdownMenuItem onClick={() => onApprove(row)}>
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                  Approve
                                </DropdownMenuItem>
                              )}
                              {/* Show Unapprove for approved providers */}
                              {onUnapprove && row.verificationStatus === 'approved' && (
                                <DropdownMenuItem onClick={() => onUnapprove(row)}>
                                  <XCircle className="w-4 h-4 mr-2 text-orange-600" />
                                  Unapprove
                                </DropdownMenuItem>
                              )}
                              {onReject && row.verificationStatus === 'pending' && (
                                <DropdownMenuItem onClick={() => onReject(row)}>
                                  <Ban className="w-4 h-4 mr-2 text-red-600" />
                                  Reject
                                </DropdownMenuItem>
                              )}
                              {onContact && (
                                <DropdownMenuItem onClick={() => onContact(row)}>
                                  <Mail className="w-4 h-4 mr-2" />
                                  Contact
                                </DropdownMenuItem>
                              )}
                              {onBlacklist && row.verificationStatus !== 'blacklisted' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => onBlacklist(row)}
                                    className="text-red-600"
                                  >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Blacklist
                                  </DropdownMenuItem>
                                </>
                              )}
                              {onToggleStatus && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => onToggleStatus(row)}>
                                    <Ban className="w-4 h-4 mr-2" />
                                    {row.status === 'active' ? 'Deactivate' : 'Activate'}
                                  </DropdownMenuItem>
                                </>
                              )}
                              {onDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => onDelete(row)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page}>...</span>;
                  }
                  return null;
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
