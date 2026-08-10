import { useState } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Briefcase,
  Shield,
  FileText,
  Download,
  Trash2,
  Loader2,
  Building,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from '@/app/components/ui/alert-dialog';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { useEmployeeDocuments, useDeleteDocument } from '@/hooks/useApi';
import { usePermission } from '@/hooks/usePermission';
import type { User, EmployeeProfile, EmployeeDocument } from '@/services/api';
import {
  EMPLOYMENT_TYPES,
  ACCOUNT_STATUSES,
  PAY_FREQUENCIES,
  HEALTH_PLAN_TIERS,
  DOC_TYPES,
} from '@/app/components/employee/forms/EmployeeForm';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/app/components/ui/sheet';

interface EmployeeDetailViewProps {
  employee: {
    id: number;
    user: User;
    employee: EmployeeProfile;
  };
  open: boolean;
  onClose: () => void;
}

interface DeleteDocConfirm {
  id: number;
  name: string;
  isOpen: boolean;
}

export function EmployeeDetailView({ employee, open, onClose }: EmployeeDetailViewProps) {
  const { hasPermission } = usePermission();
  const canEditCompensation = hasPermission('employees', 'update') || hasPermission('users', 'update');
  const empUser = employee.user;
  const empProfile = employee.employee;

  const { data: documents = [], isLoading: docsLoading, refetch: refetchDocs } = useEmployeeDocuments(empProfile.id || employee.id);
  const deleteDocumentMutation = useDeleteDocument();
  const [deleteDocConfirm, setDeleteDocConfirm] = useState<DeleteDocConfirm>({
    id: 0,
    name: '',
    isOpen: false,
  });

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

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
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

  const displayStatus = empProfile.account_status || empProfile.status || 'active';

  const handleDownloadDoc = async (doc: EmployeeDocument) => {
    try {
      const blob = await api.downloadEmployeeDocument(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name || doc.document_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloading "${doc.document_name}"`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download document');
    }
  };

  const handleDeleteDoc = (doc: EmployeeDocument) => {
    setDeleteDocConfirm({ id: doc.id, name: doc.document_name, isOpen: true });
  };

  const confirmDeleteDoc = async () => {
    try {
      const response = await deleteDocumentMutation.mutateAsync({
        employeeId: empProfile.id || employee.id,
        docId: deleteDocConfirm.id,
      });
      if (response.success) {
        toast.success(`Document "${deleteDocConfirm.name}" deleted`);
        refetchDocs();
      } else {
        toast.error(response.message || 'Failed to delete document');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete document');
    } finally {
      setDeleteDocConfirm({ id: 0, name: '', isOpen: false });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-slate-900 text-white text-xl">
                  {getInitials(empUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <SheetTitle className="text-xl">{empUser.name}</SheetTitle>
                <p className="text-sm text-slate-500">{empProfile.title || 'Employee'}</p>
                <Badge className={getStatusColor(displayStatus)} variant="outline">
                  {getStatusLabel(displayStatus)}
                </Badge>
              </div>
            </div>
          </SheetHeader>

          <div className="py-6">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="compensation">Compensation</TabsTrigger>
                <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
                <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-500">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-sm text-slate-600">{empUser.email}</p>
                      </div>
                    </div>
                    {empUser.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="font-medium">Phone</p>
                          <p className="text-sm text-slate-600">{empUser.phone}</p>
                        </div>
                      </div>
                    )}
                    {empUser.address && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="font-medium">Address</p>
                          <p className="text-sm text-slate-600">{empUser.address}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-medium">Hired On</p>
                        <p className="text-sm text-slate-600">
                          {empProfile.hired_at
                            ? new Date(empProfile.hired_at).toLocaleDateString()
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="employment" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-500">Employment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-medium">Department</p>
                        <p className="text-sm text-slate-600">{empProfile.department || 'Unassigned'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Job Title</p>
                        <p className="text-sm text-slate-600">{empProfile.title || 'Not specified'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Employment Type</p>
                        <p className="text-sm text-slate-600">
                          {EMPLOYMENT_TYPES.find((t) => t.value === empProfile.employment_type)?.label || empProfile.employment_type || '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-medium">Work Location</p>
                        <p className="text-sm text-slate-600">{empProfile.location || 'Not specified'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Manager</p>
                        <p className="text-sm text-slate-600">
                          {empProfile.manager_id ? `Manager ID: ${empProfile.manager_id}` : 'No manager assigned'}
                        </p>
                      </div>
                    </div>
                    {empProfile.specialties && empProfile.specialties.length > 0 && (
                      <div className="flex flex-wrap items-start gap-2 pt-2">
                        <span className="text-sm font-medium text-slate-500">Specialties:</span>
                        {empProfile.specialties.map((spec) => (
                          <Badge key={spec} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Rating</p>
                        <p className="text-sm text-slate-600">{empProfile.rating ? empProfile.rating.toFixed(1) : '0.0'}/5</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Total Services</p>
                        <p className="text-sm text-slate-600">{empProfile.total_services || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="compensation" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-500">Compensation & Benefits</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!canEditCompensation && (
                      <p className="text-xs text-slate-500 mb-2">
                        You do not have permission to edit compensation. Contact an admin.
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-medium">Base Salary</p>
                        <p className="text-sm text-slate-600">
                          {empProfile.base_salary ? `KES ${Number(empProfile.base_salary).toLocaleString()}` : '-'}
                        </p>
                      </div>
                    </div>
                    {empProfile.hourly_rate && (
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="font-medium">Hourly Rate</p>
                          <p className="text-sm text-slate-600">
                            KES {Number(empProfile.hourly_rate).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Pay Frequency</p>
                        <p className="text-sm text-slate-600">
                          {PAY_FREQUENCIES.find((f) => f.value === empProfile.pay_frequency)?.label || empProfile.pay_frequency || '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Building className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-medium">Bank</p>
                        <p className="text-sm text-slate-600">
                          {empProfile.bank_name ? `${empProfile.bank_name} (${empProfile.bank_account_number})` : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-medium">Health Plan</p>
                        <p className="text-sm text-slate-600">
                          {HEALTH_PLAN_TIERS.find((t) => t.value === empProfile.health_plan_tier)?.label || empProfile.health_plan_tier || '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="onboarding" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-500">Onboarding / Offboarding</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-medium">Account Status</p>
                        <Badge className={getStatusColor(empProfile.account_status || 'active')}>
                          {getStatusLabel(empProfile.account_status || 'active')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Employment Status</p>
                        <p className="text-sm text-slate-600">{empProfile.status || 'active'}</p>
                      </div>
                    </div>
                    {empProfile.exit_notes && (
                      <div className="flex items-start gap-3">
                        <FileText className="h-4 w-4 text-slate-400 mt-0.5" />
                        <div>
                          <p className="font-medium">Exit Notes</p>
                          <p className="text-sm text-slate-600">{empProfile.exit_notes}</p>
                        </div>
                      </div>
                    )}
                      {empProfile.offboarding_checklist_completed && (
                      <div className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-700">
                          Offboarding checklist completed
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-500">HR Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {docsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        <span className="ml-2 text-sm text-slate-600">Loading documents...</span>
                      </div>
                    ) : documents.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No documents uploaded for this employee</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-slate-400" />
                                <p className="font-medium text-sm">{doc.document_name}</p>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                <span>
                                  {doc.doc_type
                                    ? DOC_TYPES.find((d) => d.value === doc.doc_type)?.label || doc.doc_type
                                    : 'Unknown'}
                                </span>
                                {doc.file_size && (
                                  <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                                )}
                                {doc.is_verified && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                    Verified
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadDoc(doc)}
                                aria-label={`Download ${doc.document_name}`}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDoc(doc)}
                                aria-label={`Delete ${doc.document_name}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Document Confirmation */}
      <AlertDialog
        open={deleteDocConfirm.isOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteDocConfirm({ id: 0, name: '', isOpen: false });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You are about to permanently delete{' '}
              <strong>{deleteDocConfirm.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteDoc}
              disabled={deleteDocumentMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteDocumentMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
