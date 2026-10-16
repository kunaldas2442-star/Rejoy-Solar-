import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth, ROLE_DEFINITIONS } from '../../context/AuthContext';
import { storageService } from '../../services/storage';
import { Employee, UserRole } from '../../types/solar';
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit2,
  Mail,
  Briefcase,
  Navigation,
  RefreshCw,
  X
} from 'lucide-react';

interface EmployeeFormData {
  name: string;
  email: string;
  code: string;
  phone: string;
  department: string;
  designation: string;
  role: UserRole;
  isFieldWorker: boolean;
  loginEnabled: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  tempPassword?: string;
}

export const UserManagementView: React.FC = () => {
  const { showToast, triggerRefresh } = useApp();
  const { currentUser } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>(() => storageService.getEmployees());
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [fieldWorkerFilter, setFieldWorkerFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Available employee roles (excludes Customer role)
  const employeeRoleDefinitions = useMemo(() => {
    return ROLE_DEFINITIONS.filter(r => r.role !== 'Customer');
  }, []);

  // Helper to get next employee code
  const getNextEmployeeCode = (list: Employee[]) => {
    const empCount = list.filter(e => e.systemRole !== 'Customer').length;
    return `EMP${String(empCount + 1).padStart(3, '0')}`;
  };

  // Initial form values
  const defaultEmployeeForm: EmployeeFormData = {
    name: '',
    email: '',
    code: getNextEmployeeCode(employees),
    department: 'Operations',
    designation: 'Solar Engineer',
    role: 'Site Survey Engineer',
    phone: '+91 98000 00000',
    isFieldWorker: true,
    loginEnabled: true,
    status: 'ACTIVE',
    tempPassword: 'User@12345'
  };

  const [formData, setFormData] = useState<EmployeeFormData>(defaultEmployeeForm);

  const reloadEmployees = () => {
    setEmployees(storageService.getEmployees());
  };

  // Filtered employees (internal staff / system users)
  const filteredUsers = useMemo(() => {
    return employees.filter(emp => {
      // Exclude customer accounts if any exist in the employee list
      if (emp.systemRole === 'Customer' || emp.assignedRole === 'Customer') {
        return false;
      }

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q) ||
        (emp.designation || '').toLowerCase().includes(q) ||
        (emp.department || '').toLowerCase().includes(q) ||
        (emp.systemRole || '').toLowerCase().includes(q);

      const matchesRole =
        roleFilter === 'ALL' || (emp.systemRole || emp.assignedRole) === roleFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && emp.status === 'ACTIVE' && emp.accountStatus !== 'DISABLED') ||
        (statusFilter === 'DISABLED' && (emp.accountStatus === 'DISABLED' || emp.status === 'INACTIVE'));

      const isFw = Boolean(
        emp.isFieldWorker ??
          [
            'Site Survey Engineer',
            'Site Inspector',
            'Civil Team',
            'Structure Team',
            'Installation Team',
            'Electrical Team',
            'Technician'
          ].includes(emp.systemRole || '')
      );

      const matchesFieldWorker =
        fieldWorkerFilter === 'ALL' ||
        (fieldWorkerFilter === 'YES' && isFw) ||
        (fieldWorkerFilter === 'NO' && !isFw);

      return matchesSearch && matchesRole && matchesStatus && matchesFieldWorker;
    });
  }, [employees, searchTerm, roleFilter, statusFilter, fieldWorkerFilter]);

  // Status stats
  const stats = useMemo(() => {
    const nonCustomerEmployees = employees.filter(
      e => e.systemRole !== 'Customer' && e.assignedRole !== 'Customer'
    );
    const total = nonCustomerEmployees.length;
    const active = nonCustomerEmployees.filter(
      e => e.status === 'ACTIVE' && e.accountStatus !== 'DISABLED'
    ).length;
    const fieldWorkers = nonCustomerEmployees.filter(e =>
      Boolean(
        e.isFieldWorker ??
          [
            'Site Survey Engineer',
            'Site Inspector',
            'Civil Team',
            'Structure Team',
            'Installation Team',
            'Electrical Team',
            'Technician'
          ].includes(e.systemRole || '')
      )
    ).length;

    return { total, active, fieldWorkers };
  }, [employees]);

  // Toggle user activation / deactivation
  const handleToggleStatus = (emp: Employee) => {
    if (emp.systemRole === 'Admin' && emp.id === 'emp-1') {
      showToast('The primary Admin account cannot be disabled.', 'error');
      return;
    }

    const isCurrentlyActive = emp.accountStatus !== 'DISABLED' && emp.status !== 'INACTIVE';
    const newStatus = isCurrentlyActive ? 'DISABLED' : 'ACTIVE';

    const updated = employees.map(e => {
      if (e.id === emp.id) {
        return {
          ...e,
          accountStatus: newStatus as any,
          loginEnabled: !isCurrentlyActive,
          status: isCurrentlyActive ? ('INACTIVE' as any) : ('ACTIVE' as any),
          updatedAt: new Date().toISOString()
        };
      }
      return e;
    });

    storageService.saveEmployees(updated);
    setEmployees(updated);
    triggerRefresh();
    showToast(
      `Employee ${emp.name} account ${isCurrentlyActive ? 'deactivated' : 'activated'} successfully`,
      isCurrentlyActive ? 'warning' : 'success'
    );
  };

  // Open Create Modal for Employee
  const handleOpenCreate = () => {
    setEditingEmployee(null);
    setFormData({
      ...defaultEmployeeForm,
      code: getNextEmployeeCode(employees)
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      code: emp.employeeCode,
      department: emp.department || 'Operations',
      designation: emp.designation || 'Solar Engineer',
      role: (emp.systemRole || emp.assignedRole || 'Site Survey Engineer') as UserRole,
      phone: emp.phone || '',
      isFieldWorker: Boolean(
        emp.isFieldWorker ??
          [
            'Site Survey Engineer',
            'Site Inspector',
            'Civil Team',
            'Structure Team',
            'Installation Team',
            'Electrical Team',
            'Technician'
          ].includes(emp.systemRole || '')
      ),
      loginEnabled: emp.loginEnabled ?? true,
      status: emp.accountStatus === 'DISABLED' || emp.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  // Submit User Create / Edit
  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanCode = formData.code.trim();

    // 1. Name validation
    if (!cleanName || cleanName.length < 2) {
      showToast('Please provide a valid employee name.', 'error');
      return;
    }

    // 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    // 3. Code validation
    if (!cleanCode) {
      showToast('Please provide an Employee ID / Code.', 'error');
      return;
    }

    // 4. Duplicate checks
    const duplicateEmail = employees.find(
      emp => emp.id !== editingEmployee?.id && emp.email.trim().toLowerCase() === cleanEmail
    );
    if (duplicateEmail) {
      showToast(
        `A user with email "${cleanEmail}" already exists (${duplicateEmail.name}).`,
        'error'
      );
      return;
    }

    const duplicateCode = employees.find(
      emp => emp.id !== editingEmployee?.id && emp.employeeCode.trim().toUpperCase() === cleanCode.toUpperCase()
    );
    if (duplicateCode) {
      showToast(
        `A user with code "${cleanCode}" already exists (${duplicateCode.name}).`,
        'error'
      );
      return;
    }

    // 5. Department validation
    if (!formData.department.trim()) {
      showToast('Please specify a department for this employee.', 'error');
      return;
    }

    const finalRole: UserRole = formData.role;
    const finalDept = formData.department.trim();
    const finalDesignation = formData.designation.trim() || (formData.role as string);

    if (editingEmployee) {
      // Update existing record
      const updated = employees.map(emp => {
        if (emp.id === editingEmployee.id) {
          return {
            ...emp,
            name: cleanName,
            email: cleanEmail,
            employeeCode: cleanCode,
            phone: formData.phone.trim(),
            department: finalDept,
            designation: finalDesignation,
            systemRole: finalRole,
            assignedRole: finalRole,
            isFieldWorker: formData.isFieldWorker,
            loginEnabled: formData.loginEnabled,
            status: formData.status === 'ACTIVE' ? ('ACTIVE' as const) : ('INACTIVE' as const),
            accountStatus: formData.status === 'ACTIVE' ? ('ACTIVE' as const) : ('DISABLED' as const),
            updatedAt: new Date().toISOString()
          };
        }
        return emp;
      });

      const updatedEmp = updated.find(emp => emp.id === editingEmployee.id);
      if (updatedEmp) {
        storageService.saveEmployee(updatedEmp);
      } else {
        storageService.saveEmployees(updated);
      }
      setEmployees(storageService.getEmployees());
      showToast(`Employee ${cleanName} updated successfully`, 'success');
    } else {
      // Create new record
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        employeeCode: cleanCode,
        name: cleanName,
        email: cleanEmail,
        phone: formData.phone.trim() || '+91 98000 00000',
        department: finalDept,
        designation: finalDesignation,
        systemRole: finalRole,
        assignedRole: finalRole,
        isFieldWorker: formData.isFieldWorker,
        loginEnabled: formData.loginEnabled,
        status: formData.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        accountStatus: formData.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED',
        joiningDate: new Date().toISOString().split('T')[0],
        salaryMonthly: 50000,
        accountCreatedAt: new Date().toISOString(),
        accountCreatedBy: currentUser?.name || 'Admin',
        createdAt: new Date().toISOString()
      };

      storageService.saveEmployee(newEmp);
      setEmployees(storageService.getEmployees());
      showToast(`Employee ${newEmp.name} created successfully`, 'success');
    }

    triggerRefresh();
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              System Administration
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Access Control & Employee Directory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            User Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage employee access, roles, departments, system credentials, and operational permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={reloadEmployees}
            className="p-2.5 text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-2xs cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Add Employee button */}
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Employee</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Employees</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{stats.total}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Staff & system users</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600">Active Accounts</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{stats.active}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Can authenticate</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600">Field Engineers</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-700">{stats.fieldWorkers}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">GPS location tracked</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, employee code, department, role..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="ALL">All Roles</option>
            {employeeRoleDefinitions.map(r => (
              <option key={r.role} value={r.role}>
                {r.role}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="DISABLED">Disabled Only</option>
          </select>

          {/* Field Worker Filter */}
          <select
            value={fieldWorkerFilter}
            onChange={e => setFieldWorkerFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="ALL">All Personnel</option>
            <option value="YES">Field Tracked Only</option>
            <option value="NO">Non-Field / Office</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Employee & Code</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role / Permissions</th>
                <th className="py-3 px-4">Department & Designation</th>
                <th className="py-3 px-4 text-center">Field GPS</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600">No employees match your search criteria</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try adjusting filters or adding a new employee</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(emp => {
                  const roleDef = ROLE_DEFINITIONS.find(
                    r => r.role === (emp.systemRole || emp.assignedRole)
                  );
                  const isFw = Boolean(
                    emp.isFieldWorker ??
                      [
                        'Site Survey Engineer',
                        'Site Inspector',
                        'Civil Team',
                        'Structure Team',
                        'Installation Team',
                        'Electrical Team',
                        'Technician'
                      ].includes(emp.systemRole || '')
                  );
                  const isActive = emp.accountStatus !== 'DISABLED' && emp.status !== 'INACTIVE';
                  const isRootAdmin = emp.systemRole === 'Admin' && emp.id === 'emp-1';

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center border shrink-0 bg-slate-100 text-slate-700 border-slate-200">
                            {emp.photoUrl ? (
                              <img
                                src={emp.photoUrl}
                                alt={emp.name}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              emp.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{emp.name}</span>
                            <span className="text-[11px] font-mono text-slate-500 mt-0.5 block">
                              {emp.employeeCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{emp.email}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                            roleDef?.badgeColor || 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {emp.systemRole === 'Admin' && <ShieldCheck className="w-3 h-3" />}
                          {emp.systemRole || emp.assignedRole || 'Team Member'}
                        </span>
                      </td>

                      {/* Department & Designation */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <div>
                          <span className="text-slate-700 block">{emp.department || 'Operations'}</span>
                          {emp.designation && (
                            <span className="text-[10px] text-slate-400 block">{emp.designation}</span>
                          )}
                        </div>
                      </td>

                      {/* Field Worker */}
                      <td className="py-3.5 px-4 text-center">
                        {isFw ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Navigation className="w-3 h-3 text-amber-600" />
                            <span>GPS Tracked</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(emp)}
                            disabled={isRootAdmin}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isRootAdmin
                                ? 'opacity-30 cursor-not-allowed text-slate-400'
                                : isActive
                                ? 'text-rose-500 hover:bg-rose-50 hover:text-rose-700'
                                : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800'
                            }`}
                            title={
                              isRootAdmin
                                ? 'Root Admin cannot be disabled'
                                : isActive
                                ? 'Deactivate User Account'
                                : 'Activate User Account'
                            }
                          >
                            {isActive ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200/80 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl border bg-indigo-50 border-indigo-200 text-indigo-700">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingEmployee ? `Edit Employee: ${editingEmployee.name}` : 'Add New Employee'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assign employee role, credentials, department and field worker flags
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="space-y-4 mt-5">
              {/* Row 1: Name and Employee Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Employee ID / Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. EMP015"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Row 2: Email and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Work Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. name@rejoysolar.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98250 11223"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              {/* Row 3: Role and Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => {
                      const newRole = e.target.value as UserRole;
                      const roleDef = ROLE_DEFINITIONS.find(r => r.role === newRole);
                      const isFwRole = [
                        'Site Survey Engineer',
                        'Site Inspector',
                        'Civil Team',
                        'Structure Team',
                        'Installation Team',
                        'Electrical Team',
                        'Technician'
                      ].includes(newRole);
                      setFormData({
                        ...formData,
                        role: newRole,
                        department: roleDef?.department || formData.department,
                        isFieldWorker: isFwRole
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  >
                    {employeeRoleDefinitions.map(r => (
                      <option key={r.role} value={r.role}>
                        {r.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Operations, Engineering"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              {/* Row 4: Job Designation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Job Designation
                </label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={e => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g. Lead Site Survey Engineer"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                />
              </div>

              {/* Password field for new accounts */}
              {!editingEmployee && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial Login Password
                  </label>
                  <input
                    type="text"
                    value={formData.tempPassword}
                    onChange={e => setFormData({ ...formData, tempPassword: e.target.value })}
                    placeholder="User@12345"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    The employee will use this password on the login screen
                  </span>
                </div>
              )}

              {/* Operational Toggles */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                {/* Field Worker toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFieldWorker}
                    onChange={e => setFormData({ ...formData, isFieldWorker: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Field Worker (Live GPS Tracking)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Enable real-time location tracking on the Admin Live Tracking map
                    </span>
                  </div>
                </label>

                {/* Login Enabled toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.loginEnabled}
                    onChange={e => setFormData({ ...formData, loginEnabled: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Enable ERP Login
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Allow this employee to sign into the system with their credentials
                    </span>
                  </div>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {editingEmployee ? 'Save Employee' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
