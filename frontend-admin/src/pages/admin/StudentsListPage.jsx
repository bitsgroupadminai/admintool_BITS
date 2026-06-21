import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { AdminListBuilder } from '@/components/ui/AdminListBuilder';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConfirm } from '@/components/ui/confirm-context';
import { generatePassword } from '@/utils/password';
import { userApi } from '@/api/user.api';
import {
  PROGRAMME_PRESETS,
  STUDENT_ACCOUNT_OPTIONS,
  STUDENT_IMPORT_REQUIRED_COLUMNS,
  STUDENT_IMPORT_TEMPLATE,
  STUDENT_PAGE_SIZE_OPTIONS,
  STUDENT_STATUS_OPTIONS,
} from '@/constants/studentManagement.constants';

const studentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().optional(),
  programmeName: z.string().min(2, 'Enter a programme name'),
});

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  programmeName: '',
};

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

export function StudentsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [showImportDrawer, setShowImportDrawer] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const confirm = useConfirm();

  const query = useMemo(() => {
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = Number.parseInt(searchParams.get('limit') || '10', 10);
    return {
      page: Number.isNaN(page) ? 1 : page,
      limit: Number.isNaN(limit) ? 10 : limit,
      search: searchParams.get('search') || '',
      programme: searchParams.get('programme') || '',
      status: searchParams.get('status') || '',
      mustChangePassword: searchParams.get('mustChangePassword') || '',
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    };
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: EMPTY_FORM,
  });

  const updateQuery = useCallback(
    (patch) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === '') {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await userApi.listStudents(query);
      setStudents(data.data.students);
      setPagination(data.data.pagination ?? DEFAULT_PAGINATION);
    } catch (err) {
      toast.error(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadProgrammes = useCallback(async () => {
    try {
      const { data } = await userApi.listProgrammes();
      setProgrammes(data.data.programmes);
    } catch (err) {
      toast.error(err.message || 'Failed to load programmes');
    }
  }, []);

  const programmeOptions = useMemo(() => {
    const names = new Set([
      ...programmes.map((programme) => programme.name),
      ...PROGRAMME_PRESETS,
    ]);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [programmes]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    loadProgrammes();
  }, [loadProgrammes]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const onSubmit = async (values) => {
    if (!values.password || values.password.length < 8) {
      toast.error('Temporary password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      const matchedProgramme = programmes.find(
        (programme) => programme.name.toLowerCase() === values.programmeName.trim().toLowerCase(),
      );
      await userApi.createStudent({
        name: values.name,
        email: values.email,
        password: values.password,
        programmeName: values.programmeName,
        offeringId: matchedProgramme?.id,
      });
      toast.success('Student account created');
      reset(EMPTY_FORM);
      setShowCreateDrawer(false);
      updateQuery({ page: 1 });
      await loadStudents();
    } catch (err) {
      toast.error(err.message || 'Failed to create student');
    } finally {
      setSubmitting(false);
    }
  };

  const onEditSubmit = async (values) => {
    if (!editingStudent) return;
    setSubmitting(true);
    try {
      const matchedProgramme = programmes.find(
        (programme) => programme.name.toLowerCase() === values.programmeName.trim().toLowerCase(),
      );
      const payload = {
        name: values.name,
        email: values.email,
        programmeName: values.programmeName,
        offeringId: matchedProgramme?.id,
      };
      if (values.password) payload.password = values.password;
      await userApi.updateStudent(editingStudent.id, payload);
      toast.success('Student account updated');
      reset(EMPTY_FORM);
      setEditingStudent(null);
      await loadStudents();
    } catch (err) {
      toast.error(err.message || 'Failed to update student');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (student) => {
    setEditingStudent(student);
    reset({
      name: student.name,
      email: student.email,
      password: '',
      programmeName: student.programmeName ?? '',
    });
  };

  const handleDelete = async (student) => {
    const ok = await confirm({
      title: `Delete ${student.name}?`,
      description:
        'This will deactivate the student account and remove their access to the student portal.',
      confirmLabel: 'Delete student',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await userApi.deactivateStudent(student.id);
      toast.success('Student account deleted');
      await loadStudents();
    } catch (err) {
      toast.error(err.message || 'Failed to delete student');
    }
  };

  const onImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const { data } = await userApi.importStudents(file);
      const result = data.data.import;
      setImportResult(result);
      toast.success(`Imported ${result.created} of ${result.total} students`);
      updateQuery({ page: 1 });
      await loadStudents();
    } catch (err) {
      toast.error(err.message || 'Failed to import students');
    } finally {
      setImporting(false);
    }
  };

  const handleSortChange = (sortBy) => {
    updateQuery({
      sortBy,
      sortOrder: query.sortBy === sortBy && query.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    });
  };

  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    STUDENT_IMPORT_TEMPLATE,
  )}`;

  const columns = [
    {
      key: 'name',
      label: 'Student',
      sortable: true,
      render: (student) => (
        <div>
          <p className="font-semibold text-[#052E1C]">{student.name}</p>
          <p className="mt-0.5 text-xs text-[#4B6358]">{student.email}</p>
        </div>
      ),
    },
    {
      key: 'enrolledProgrammeName',
      label: 'Programme',
      sortable: true,
      render: (student) => (
        <span className="font-medium text-[#052E1C]">
          {student.programmeName ?? 'No programme'}
        </span>
      ),
    },
    {
      key: 'enrollmentStatus',
      label: 'Status',
      sortable: true,
      render: (student) => <Badge variant="outline">{student.enrollmentStatus}</Badge>,
    },
    {
      key: 'mustChangePassword',
      label: 'Account',
      render: (student) =>
        student.mustChangePassword ? (
          <Badge variant="outline">First login pending</Badge>
        ) : (
          <span className="text-sm font-medium text-[#0A6640]">Ready</span>
        ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (student) => new Date(student.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      cellClassName: 'text-right',
      render: (student) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => openEdit(student)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#C4E8D4] bg-white text-[#0A6640] transition hover:bg-[#F0FAF5]"
            title="Edit student"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(student)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500 transition hover:bg-red-50"
            title="Delete student"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981]">
              Student Access
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[#052E1C] sm:text-3xl">
              Students
            </h1>
            <p className="mt-1.5 text-sm text-[#4B6358]">
              Create enrolled student accounts and manage student portal access.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowImportDrawer(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#C4E8D4] bg-white px-4 py-2.5 text-sm font-semibold text-[#0A6640] transition-all duration-200 hover:border-[#6EE7B7] hover:bg-[#F0FAF5] sm:w-auto"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Import batch
            </button>
            <button
              type="button"
              onClick={() => setShowCreateDrawer(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A6640] to-[#084F31] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] transition-all duration-300 hover:from-[#084F31] hover:to-[#052E1C] hover:shadow-[0_4px_16px_rgba(10,102,64,0.36)] sm:w-auto sm:px-5"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Add student
            </button>
          </div>
        </div>

        <Drawer
          open={showCreateDrawer}
          title="Create student account"
          description="Add an already admitted student and issue temporary login credentials."
          onClose={() => {
            setShowCreateDrawer(false);
            reset(EMPTY_FORM);
          }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-[#4B6358]">
                Full name
              </Label>
              <Input id="name" {...register('name')} placeholder="Student full name" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-[#4B6358]">
                Email
              </Label>
              <Input id="email" type="email" {...register('email')} placeholder="student@example.edu" />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="programmeName" className="text-xs font-semibold uppercase tracking-wide text-[#4B6358]">
                Programme
              </Label>
              <Input
                id="programmeName"
                {...register('programmeName')}
                list="student-programmes"
                placeholder="Type or choose programme name"
              />
              <datalist id="student-programmes">
                {programmeOptions.map((programme) => (
                  <option key={programme} value={programme} />
                ))}
              </datalist>
              <p className="text-xs text-[#6B7280]">
                Choose a configured programme or type another programme/course name.
              </p>
              {errors.programmeName && <p className="text-xs text-red-500">{errors.programmeName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-[#4B6358]">
                  Temporary password
                </Label>
                <button
                  type="button"
                  onClick={() => setValue('password', generatePassword())}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A6640]"
                >
                  <RefreshCw className="h-3 w-3" />
                  Generate
                </button>
              </div>
              <Input id="password" type="text" {...register('password')} placeholder="Minimum 8 characters" />
            </div>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button type="submit" disabled={submitting}>
                <UserPlus className="h-4 w-4" />
                {submitting ? 'Creating...' : 'Create student'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateDrawer(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Drawer>

        <Drawer
          open={Boolean(editingStudent)}
          title="Edit student account"
          description="Update student details, programme, or issue a new temporary password."
          onClose={() => {
            setEditingStudent(null);
            reset(EMPTY_FORM);
          }}
        >
          <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-semibold uppercase tracking-wide text-[#4B6358]">
                Full name
              </Label>
              <Input id="edit-name" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email" className="text-xs font-semibold uppercase tracking-wide text-[#4B6358]">
                Email
              </Label>
              <Input id="edit-email" type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-programmeName" className="text-xs font-semibold uppercase tracking-wide text-[#4B6358]">
                Programme
              </Label>
              <Input id="edit-programmeName" {...register('programmeName')} list="student-programmes-edit" />
              <datalist id="student-programmes-edit">
                {programmeOptions.map((programme) => (
                  <option key={programme} value={programme} />
                ))}
              </datalist>
              {errors.programmeName && <p className="text-xs text-red-500">{errors.programmeName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="edit-password" className="text-xs font-semibold uppercase tracking-wide text-[#4B6358]">
                  New temporary password
                </Label>
                <button
                  type="button"
                  onClick={() => setValue('password', generatePassword())}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A6640]"
                >
                  <RefreshCw className="h-3 w-3" />
                  Generate
                </button>
              </div>
              <Input id="edit-password" type="text" {...register('password')} placeholder="Leave blank to keep current password" />
            </div>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditingStudent(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Drawer>

        <Drawer
          open={showImportDrawer}
          title="Instant batch admission"
          description="Upload CSV/XLSX to create student portal accounts in one pass."
          onClose={() => setShowImportDrawer(false)}
        >
          <div className="space-y-5">
            <a
              href={templateHref}
              download="student-import-template.csv"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#C4E8D4] bg-white px-4 text-sm font-semibold text-[#0A6640] transition-colors hover:bg-[#F0FAF5]"
            >
              <Download className="h-4 w-4" />
              Download CSV template
            </a>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#B6DFC8] bg-[#F0FAF5]/70 px-5 py-10 text-center transition hover:border-[#6EE7B7] hover:bg-[#EDFAF3]">
              <Upload className="h-9 w-9 text-[#0A6640]" />
              <span className="mt-3 text-sm font-semibold text-[#052E1C]">
                {importing ? 'Importing students...' : 'Upload CSV or XLSX'}
              </span>
              <span className="mt-1 max-w-sm text-xs leading-relaxed text-[#4B6358]">
                Required columns: {STUDENT_IMPORT_REQUIRED_COLUMNS}. Programme/course names are
                matched automatically when configured. Each successful row creates a
                ready-to-login student account.
              </span>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={onImport}
                disabled={importing}
                className="sr-only"
              />
            </label>

            {importResult && (
              <div className="rounded-2xl border border-[#E2EEE8] bg-white p-4">
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="font-semibold text-[#052E1C]">{importResult.created} created</span>
                  <span className="text-[#4B6358]">{importResult.failed} failed</span>
                  <span className="text-[#6B7280]">{importResult.total} rows</span>
                </div>
                <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
                  {importResult.results.map((row) => (
                    <div
                      key={`${row.row}-${row.email}`}
                      className="flex items-start gap-2 rounded-xl bg-[#F9FCFB] px-3 py-2 text-xs"
                    >
                      {row.status === 'created' ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0A6640]" />
                      ) : (
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium text-[#052E1C]">
                          Row {row.row}: {row.email || 'No email'}
                        </p>
                        <p className="text-[#4B6358]">{row.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Drawer>

        <AdminListBuilder
          title="Enrolled students"
          description="Search, filter, sort, and paginate active student portal accounts."
          searchValue={query.search}
          onSearchChange={(value) => updateQuery({ search: value, page: 1 })}
          searchPlaceholder="Search by name or email"
          filters={[
            {
              key: 'programme',
              type: 'text',
              value: query.programme,
              placeholder: 'Filter programme',
              datalistId: 'student-programme-filter',
              onChange: (value) => updateQuery({ programme: value, page: 1 }),
              options: programmeOptions.map((programme) => ({ value: programme, label: programme })),
            },
            {
              key: 'status',
              value: query.status,
              onChange: (value) => updateQuery({ status: value, page: 1 }),
              options: STUDENT_STATUS_OPTIONS,
            },
            {
              key: 'mustChangePassword',
              value: query.mustChangePassword,
              onChange: (value) => updateQuery({ mustChangePassword: value, page: 1 }),
              options: STUDENT_ACCOUNT_OPTIONS,
            },
          ]}
          columns={columns}
          rows={students}
          getRowKey={(student) => student.id}
          loading={loading}
          emptyTitle="No students found"
          emptyDescription="Try adjusting filters or create the first student account."
          pagination={pagination}
          sort={{ sortBy: query.sortBy, sortOrder: query.sortOrder }}
          onSortChange={handleSortChange}
          onPageChange={(page) => updateQuery({ page })}
          onLimitChange={(limit) => updateQuery({ limit, page: 1 })}
          pageSizeOptions={STUDENT_PAGE_SIZE_OPTIONS}
        />
      </div>
    </AdminLayout>
  );
}
