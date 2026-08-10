import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  FileText,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Users as UsersIcon,
  UserCheck,
  Clock,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { useEmployees, useDeleteEmployee, useUpdateEmployeeStatus } from '@/hooks/useApi';
import { EmployeeForm } from '@/app/components/employee/forms/EmployeeForm';
import { EmployeeDetailView } from '@/app/components/admin/EmployeeDetailView';
import type { User, EmployeeProfile } from '@/services/api';
import { usePermission } from '@/hooks/usePermission';
import {
  DEPARTMENTS,
  EMPLOYMENT_TYPES,
  ACCOUNT_STATUSES,
} from '@/app/components/employee/forms/EmployeeForm';

interface EmployeeRow {
  id: number;
  user: User;
  employee: EmployeeProfile;
}

interface DeleteConfirmState {
  id: number;
  name: string;
  isOpen: boolean;
}

export function EmployeesManager() {
  const { hasPermission, userPermissions } = usePermission();
  const canCreate = hasPermission('employees', 'create') || hasPermission('users', 'create');
  const canEdit = hasPermission('employees', 'update') || hasPermission('users', 'update');
  const canDelete = hasPermission('employees', 'delete') || hasPermission('users', 'delete');
  const isSuperAdmin = userPermissions?.role === 'super_admin' || userPermissions?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'employee_id' | 'department' | 'status' | 'start_date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<EmployeeRow | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ id: 0, name: '', isOpen: false });
  const [deactivateConfirm, setDeactivateConfirm] = useState<DeleteConfirmState>({ id: 0, name: '', isOpen: false });

  const { data: employees = [], isLoading, error, refetch } = useEmployees();
  const deleteEmployeeMutation = useDeleteEmployee();
  const updateStatusMutation = useUpdateEmployeeStatus();

  const filteredEmployees = useMemo(() => {
    let result = [...employees];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((emp) =>
        (emp.user?.name || '').toLowerCase().includes(query) ||
        (emp.employee?.employee_id || '').toLowerCase().includes(query) ||
        (emp.user?.email || '').toLowerCase().includes(query) ||
        (emp.user?.phone || '').toLowerCase().includes(query) ||
        (emp.employee?.title || '').toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((emp) => emp.employee?.status === statusFilter || emp.employee?.account_status === statusFilter);
    }

    if (departmentFilter !== 'all') {
      result = result.filter((emp) => emp.employee?.department === departmentFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter((emp) => emp.employee?.employment_type === typeFilter);
    }

    result.sort((a, b) => {
      const getVal = (emp: EmployeeRow, key: string): string => {
        switch (key) {
          case 'name':
            return emp.user?.name || '';
          case 'employee_id':
            return emp.employee?.employee_id || '';
          case 'department':
            return emp.employee?.department || '';
          case 'status':
            return emp.employee?.status || '';
          case 'start_date':
            return emp.employee?.start_date || '';
          default:
            return emp.user?.name || '';
        }
      };
      const aVal = getVal(a, sortBy).toLowerCase();
      const bVal = getVal(b, sortBy).toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [employees, searchQuery, statusFilter, departmentFilter, typeFilter, sortBy, sortOrder]);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredEmployees.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredEmployees, currentPage]);

  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'onboarding':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'terminated':
      case 'off-duty':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Active',
      onboarding: 'Onboarding',
      suspended: 'Suspended',
      terminated: 'Terminated',
      'off-duty': 'Off Duty',
    };
    return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  // Handlers
  const handleAddEmployee = () => {
    if (!canCreate) {
      toast.error('You do not have permission to add employees');
      return;
    }
    setFormMode('add');
    setEditingEmployee(null);
    setFormDialogOpen(true);
  };

  const handleEditEmployee = (emp: EmployeeRow) => {
    if (!canEdit) {
      toast.error('You do not have permission to edit employees');
      return;
    }
    setFormMode('edit');
    setEditingEmployee(emp);
    setFormDialogOpen(true);
  };

  const handleViewProfile = (emp: EmployeeRow) => {
    setViewingEmployee(emp);
    setDetailDrawerOpen(true);
  };

  const handleDeactivate = (emp: EmployeeRow) => {
    if (!canDelete) {
      toast.error('You do not have permission to deactivate employees');
      return;
    }
    setDeactivateConfirm({ id: emp.employee?.id || emp.user.id, name: emp.user?.name || '', isOpen: true });
  };

  const handleDelete = (emp: EmployeeRow) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete employees');
      return;
    }
    setDeleteConfirm({ id: emp.employee?.id || emp.user.id, name: emp.user?.name || '', isOpen: true });
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column as any);
      setSortOrder('asc');
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await api.exportEmployeesCsv(
        statusFilter !== 'all' ? statusFilter : undefined,
        departmentFilter !== 'all' ? departmentFilter : undefined,
        searchQuery || undefined
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees_export_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export CSV');
    }
  };

  const handleExportPdf = () => {
    toast.info('PDF export will be available when the server generates the report');
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (formMode === 'add') {
        const response = await api.registerEmployee(data);
        if (response.success) {
          toast.success(`Employee ${data.name} created successfully`);
          refetch();
        } else {
          toast.error(response.message || 'Failed to create employee');
        }
      } else if (formMode === 'edit' && editingEmployee) {
        const response = await api.updateEmployee(editingEmployee.employee?.id || editingEmployee.user.id, data);
        if (response.success) {
          toast.success(`Employee ${data.name} updated successfully`);
          refetch();
        } else {
          toast.error(response.message || 'Failed to update employee');
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error. Please try again.');
    } finally {
      setFormDialogOpen(false);
      setEditingEmployee(null);
    }
  };

  const handleConfirmDeactivate = async () => {
    try {
      const response = await api.deactivateEmployee(deleteConfirm.id);
      if (response.success) {
        toast.success(`${deactivateConfirm.name} has been deactivated`);
        refetch();
      } else {
        toast.error(response.message || 'Failed to deactivate employee');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to deactivate employee');
    } finally {
      setDeactivateConfirm({ id: 0, name: '', isOpen: false });
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await deleteEmployeeMutation.mutateAsync(deleteConfirm.id);
      if (response.success) {
        toast.success(`${deleteConfirm.name} has been deleted`);
      } else {
        toast.error(response.message || 'Failed to delete employee');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete employee');
    } finally {
      setDeleteConfirm({ id: 0, name: '', isOpen: false });
    }
  };

  const closeFormDialog = () => {
    setFormDialogOpen(false);
    setEditingEmployee(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Employee Management</h1>
          <p className="text-slate-600">Loading employee data...</p>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-slate-200 rounded"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Employee Management</h1>
          <p className="text-red-600">Failed to load employees: {String(error)}</p>
        </div>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const activeCount = employees.filter((e) => e.employee?.account_status === 'active' || e.employee?.status === 'active').length;
  const onboardingCount = employees.filter((e) => e.employee?.account_status === 'onboarding').length;
  const suspendedCount = employees.filter((e) => e.employee?.account_status === 'suspended' || e.employee?.status === 'suspended').length;
  const terminatedCount = employees.filter((e) => e.employee?.account_status === 'terminated' || e.employee?.status === 'terminated').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Employee Management</h1>
          <p className="text-slate-600">Manage your organization's employee records, departments, and roles</p>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && (
            <Button onClick={handleAddEmployee}>
              <UsersIcon className="h-4 w-4 mr-2" />
              + Add Employee
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-sm text-slate-600">Total Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <p className="text-sm text-slate-600">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{onboardingCount}</div>
            <p className="text-sm text-slate-600">Onboarding</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{suspendedCount}</div>
            <p className="text-sm text-slate-600">Suspended</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-600">{terminatedCount}</div>
            <p className="text-sm text-slate-600">Terminated</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, ID, email, phone, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Search employees"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
                <SelectItem value="off-duty">Off Duty</SelectItem>
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {EMPLOYMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Employees</CardTitle>
              <CardDescription>
                {filteredEmployees.length} employees found (page {currentPage} of {totalPages})
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8">
              <UsersIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No employees found matching your search</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setDepartmentFilter('all'); setTypeFilter('all'); }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('name')}
                        className="font-semibold"
                      >
                        Employee
                        {sortBy === 'name' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('start_date')}
                        className="font-semibold"
                      >
                        Start Date
                        {sortBy === 'start_date' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('status')}
                        className="font-semibold"
                      >
                        Status
                        {sortBy === 'status' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.map((emp) => {
                    const empUser: User = emp.user || { id: 0, name: '', email: '', role: 'employee', is_active: true, created_at: '', updated_at: '' };
                    const empProfile: EmployeeProfile = emp.employee || {
                      id: emp.user?.id || 0,
                      user_id: emp.user?.id || 0,
                      employee_id: '',
                      location: '',
                      specialties: [],
                      rating: 0,
                      total_services: 0,
                      status: 'active',
                      created_at: '',
                      updated_at: '',
                    };
                    const displayStatus = empProfile.account_status || empProfile.status || 'active';

                    return (
                      <TableRow key={empProfile.id || empUser.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="bg-slate-200 border rounded-full w-10 h-10 flex items-center justify-center">
                              <span className="text-sm font-bold text-slate-700">
                                {getInitials(empUser.name)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{empUser.name}</p>
                              <p className="text-xs text-slate-500">{empUser.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {empProfile.employee_id || `ID: ${empProfile.id}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {empProfile.department || 'Unassigned'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{empProfile.title || '-'}</TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {empProfile.employment_type
                            ? EMPLOYMENT_TYPES.find((t) => t.value === empProfile.employment_type)?.label || empProfile.employment_type
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {empProfile.start_date
                            ? new Date(empProfile.start_date).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(displayStatus)}>
                            {getStatusLabel(displayStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewProfile(emp)}
                              aria-label={`View profile for ${empUser.name}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditEmployee(emp)}
                                aria-label={`Edit ${empUser.name}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}

                            {canDelete && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeactivate(emp)}
                                  aria-label={`Deactivate ${empUser.name}`}
                                >
                                  <UserCheck className="h-4 w-4 text-yellow-500" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" aria-label={`More actions for ${empUser.name}`}>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(emp)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Permanently
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                aria-label={`Page ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Employee Form Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'add' ? 'Add New Employee' : 'Edit Employee'}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'add'
                ? 'Fill in the employee details to create a new employee record.'
                : 'Update the employee information below.'}
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm
            mode={formMode}
            employeeId={editingEmployee?.employee?.id || editingEmployee?.user?.id}
            initialData={editingEmployee ? { user: editingEmployee.user, employee: editingEmployee.employee } : undefined}
            onSubmit={handleFormSubmit}
            onCancel={closeFormDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog
        open={deactivateConfirm.isOpen}
        onOpenChange={(open) => {
          if (!open) setDeactivateConfirm({ id: 0, name: '', isOpen: false });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate <strong>{deactivateConfirm.name}</strong> and set their account to suspended.
              They will lose access to the system immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeactivate}
              disabled={deleteEmployeeMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {deleteEmployeeMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              Deactivate Employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm({ id: 0, name: '', isOpen: false });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{' '}
              <strong>{deleteConfirm.name}</strong> and remove all associated
              records. This includes all employee profile data, assignments, and documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteEmployeeMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteEmployeeMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Employee Detail View Drawer */}
      {viewingEmployee && (
        <EmployeeDetailView
          employee={viewingEmployee}
          open={detailDrawerOpen}
          onClose={() => {
            setDetailDrawerOpen(false);
            setViewingEmployee(null);
          }}
        />
      )}
    </div>
  );
}
