import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { storageService } from '../../services/storage';
import { Employee, AttendanceRecord, Payslip, HolidayRecord } from '../../types/solar';
import { attendanceBelongsToEmployee } from '../../utils/employeeMatching';
import { getCurrentGPSPosition } from '../../services/gps';
import { EmployeeModal } from '../hrms/EmployeeModal';
import { AttendanceModal } from '../hrms/AttendanceModal';
import { DeleteConfirmDialog } from '../hrms/DeleteConfirmDialog';
import { PayslipGeneratorModal } from '../hrms/PayslipGeneratorModal';
import { PayslipViewModal } from '../hrms/PayslipViewModal';
import { HolidayModal } from '../hrms/HolidayModal';
import { HolidayCalendarView } from '../hrms/HolidayCalendarView';
import { HolidayManagementView } from '../hrms/HolidayManagementView';
import {
  MapPin,
  Clock,
  Calendar,
  Plus,
  FileSpreadsheet,
  Phone,
  Mail,
  Search,
  Pencil,
  Trash2,
  UserPlus,
  UserCheck,
  Building,
  DollarSign,
  FileText,
  Printer,
  Eye,
  Calculator,
  Receipt,
  MinusCircle,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Key
} from 'lucide-react';

export const HrmsView: React.FC = () => {
  const { showToast, openImportExportModal, triggerRefresh, refreshTrigger } = useApp();
  const { currentUser } = useAuth();

  const isAdmin = Boolean(
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'HR Manager'
  );

  const [activeTab, setActiveTab] = useState<
    'EMPLOYEES' | 'ATTENDANCE' | 'PAYROLL' | 'HOLIDAYS' | 'HOLIDAY_MANAGEMENT'
  >('EMPLOYEES');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPunching, setIsPunching] = useState(false);
  const [localUpdateCounter, setLocalUpdateCounter] = useState(0);

  // Modal states
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceToEdit, setAttendanceToEdit] = useState<AttendanceRecord | null>(null);

  // Payslip states
  const [selectedCycle, setSelectedCycle] = useState<string>('September 2026');
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<'ALL' | 'GENERATED' | 'PENDING'>('ALL');
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [employeeForPayslip, setEmployeeForPayslip] = useState<Employee | null>(null);
  const [payslipToEdit, setPayslipToEdit] = useState<Payslip | null>(null);
  const [payslipToView, setPayslipToView] = useState<Payslip | null>(null);

  // Holiday states
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayToEdit, setHolidayToEdit] = useState<HolidayRecord | null>(null);

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'EMPLOYEE' | 'ATTENDANCE' | 'PAYSLIP' | 'HOLIDAY';
    id: string;
    title: string;
    description: string;
    details: { label: string; value: string }[];
  }>({
    isOpen: false,
    type: 'EMPLOYEE',
    id: '',
    title: '',
    description: '',
    details: []
  });

  // Listen for storage updates across tabs or services
  useEffect(() => {
    const handleStorageUpdate = () => {
      setLocalUpdateCounter(prev => prev + 1);
    };
    window.addEventListener('solarpulse_storage_updated', handleStorageUpdate);
    return () => {
      window.removeEventListener('solarpulse_storage_updated', handleStorageUpdate);
    };
  }, []);

  const employees = useMemo(() => {
    return storageService.getEmployees();
  }, [refreshTrigger, localUpdateCounter]);

  const attendance = useMemo(() => {
    return storageService.getAttendance();
  }, [refreshTrigger, localUpdateCounter]);

  const payslips = useMemo(() => {
    return storageService.getPayslips();
  }, [refreshTrigger, localUpdateCounter]);

  const holidays = useMemo(() => {
    return storageService.getHolidays();
  }, [refreshTrigger, localUpdateCounter]);

  // Map each employee to their payslip for the selectedCycle
  const employeePayrollRows = useMemo(() => {
    return employees.map(emp => {
      const payslip = payslips.find(
        p => p.employeeId === emp.id && p.month.toLowerCase() === selectedCycle.toLowerCase()
      );
      // Count attendance days present
      const daysPresent = attendance.filter(
        a => attendanceBelongsToEmployee(a, emp) && a.status !== 'ABSENT'
      ).length;

      return {
        employee: emp,
        payslip,
        daysPresent: Math.max(daysPresent, 24) // realistic working days
      };
    });
  }, [employees, payslips, selectedCycle, attendance]);

  // Filter payroll rows
  const filteredPayrollRows = useMemo(() => {
    return employeePayrollRows.filter(row => {
      const matchesSearch =
        row.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.employee.designation.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (payrollStatusFilter === 'GENERATED') {
        return Boolean(row.payslip);
      }
      if (payrollStatusFilter === 'PENDING') {
        return !row.payslip;
      }
      return true;
    });
  }, [employeePayrollRows, searchTerm, payrollStatusFilter]);

  // Aggregate metrics for selected cycle
  const payrollSummary = useMemo(() => {
    const activeCyclePayslips = payslips.filter(
      p => p.month.toLowerCase() === selectedCycle.toLowerCase()
    );

    const totalBaseSalary = employees.reduce((sum, e) => sum + e.salaryMonthly, 0);
    const totalOvertime = activeCyclePayslips.reduce((sum, p) => sum + (p.overtimeAmount || 0), 0);
    const totalExpenses = activeCyclePayslips.reduce((sum, p) => sum + (p.totalAdditionalExpenses || 0), 0);
    const totalDeductions = activeCyclePayslips.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);
    const totalNetPay = activeCyclePayslips.reduce((sum, p) => sum + (p.netPay || 0), 0);

    return {
      totalEmployees: employees.length,
      generatedCount: activeCyclePayslips.length,
      totalBaseSalary,
      totalOvertime,
      totalExpenses,
      totalDeductions,
      totalNetPay
    };
  }, [employees, payslips, selectedCycle]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.currentSiteLocation && e.currentSiteLocation.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [employees, searchTerm]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter(a =>
      a.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.siteLocation && a.siteLocation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.siteProjectTitle && a.siteProjectTitle.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [attendance, searchTerm]);

  // Quick Live GPS Punch
  const handlePunchAttendance = async () => {
    setIsPunching(true);
    try {
      const gps = await getCurrentGPSPosition();

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        date: now.toISOString().slice(0, 10),
        checkInTime: timeStr,
        checkInGps: `${gps.latitude}, ${gps.longitude}`,
        gpsCheckIn: {
          latitude: gps.latitude,
          longitude: gps.longitude,
          locationName: gps.locationName
        },
        siteLocation: gps.locationName,
        status: 'PRESENT'
      };

      storageService.recordAttendance(newRecord);
      showToast(`Punch In recorded at ${timeStr} with GPS coordinates (${gps.latitude}°, ${gps.longitude}°)`, 'success');
      triggerRefresh();
      setLocalUpdateCounter(c => c + 1);
    } finally {
      setIsPunching(false);
    }
  };

  // Employee Handlers
  const handleOpenAddEmployee = () => {
    setEmployeeToEdit(null);
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEmployeeToEdit(emp);
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = (emp: Employee) => {
    const isEdit = Boolean(employeeToEdit);
    try {
      storageService.saveEmployee(emp);
      const loginMsg = emp.loginEnabled
        ? ` (ERP Login: ${emp.systemRole || 'Active'})`
        : ' (ERP Login: Disabled)';
      showToast(
        isEdit
          ? `Employee ${emp.name} (${emp.employeeCode}) updated${loginMsg}`
          : `Employee ${emp.name} (${emp.employeeCode}) registered${loginMsg}`,
        'success'
      );
      triggerRefresh();
      setLocalUpdateCounter(c => c + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save employee';
      showToast(msg, 'error');
      throw err;
    }
  };

  const handleOpenDeleteEmployee = (emp: Employee) => {
    setDeleteDialog({
      isOpen: true,
      type: 'EMPLOYEE',
      id: emp.id,
      title: `Delete Employee: ${emp.name}`,
      description: `Are you sure you want to delete ${emp.name} (${emp.employeeCode}) from the employee directory? This removes them from active operations. Historical field attendance logs will be retained for statutory audit compliance.`,
      details: [
        { label: 'Name', value: emp.name },
        { label: 'Code', value: emp.employeeCode },
        { label: 'Department', value: emp.department },
        { label: 'Designation', value: emp.designation },
        { label: 'Monthly Salary', value: `₹${emp.salaryMonthly.toLocaleString('en-IN')}` }
      ]
    });
  };

  // Attendance Handlers
  const handleOpenAddAttendance = () => {
    setAttendanceToEdit(null);
    setIsAttendanceModalOpen(true);
  };

  const handleOpenEditAttendance = (rec: AttendanceRecord) => {
    setAttendanceToEdit(rec);
    setIsAttendanceModalOpen(true);
  };

  const handleSaveAttendance = (rec: AttendanceRecord) => {
    const isEdit = Boolean(attendanceToEdit);
    storageService.saveAttendanceRecord(rec);
    showToast(
      isEdit ? `Attendance record for ${rec.employeeName} updated` : `Field check-in recorded for ${rec.employeeName}`,
      'success'
    );
    triggerRefresh();
    setLocalUpdateCounter(c => c + 1);
  };

  const handleOpenDeleteAttendance = (rec: AttendanceRecord) => {
    setDeleteDialog({
      isOpen: true,
      type: 'ATTENDANCE',
      id: rec.id,
      title: 'Delete Attendance Log',
      description: `Are you sure you want to delete the attendance check-in record for ${rec.employeeName} on ${rec.date}?`,
      details: [
        { label: 'Employee', value: rec.employeeName },
        { label: 'Date', value: rec.date },
        { label: 'Check-In Time', value: rec.checkInTime },
        { label: 'Status', value: rec.status },
        { label: 'Site Location', value: rec.siteLocation || 'General Site' }
      ]
    });
  };

  // Confirm Delete Handler
  const handleConfirmDelete = () => {
    if (deleteDialog.type === 'EMPLOYEE') {
      storageService.deleteEmployee(deleteDialog.id);
      showToast('Employee deleted from directory', 'success');
    } else if (deleteDialog.type === 'ATTENDANCE') {
      storageService.deleteAttendanceRecord(deleteDialog.id);
      showToast('Attendance record deleted successfully', 'success');
    } else if (deleteDialog.type === 'PAYSLIP') {
      storageService.deletePayslip(deleteDialog.id);
      showToast('Payslip record deleted successfully', 'success');
    } else if (deleteDialog.type === 'HOLIDAY') {
      storageService.deleteHoliday(deleteDialog.id);
      showToast('Holiday record deleted successfully', 'success');
    }
    setDeleteDialog(prev => ({ ...prev, isOpen: false }));
    triggerRefresh();
    setLocalUpdateCounter(c => c + 1);
  };

  // Holiday Handlers
  const handleOpenAddHoliday = () => {
    setHolidayToEdit(null);
    setIsHolidayModalOpen(true);
  };

  const handleOpenEditHoliday = (holiday: HolidayRecord) => {
    setHolidayToEdit(holiday);
    setIsHolidayModalOpen(true);
  };

  const handleSaveHoliday = (holiday: HolidayRecord) => {
    storageService.saveHoliday(holiday);
    setLocalUpdateCounter(c => c + 1);
    triggerRefresh();
    showToast(
      holidayToEdit
        ? `Holiday "${holiday.name}" updated successfully.`
        : `Holiday "${holiday.name}" added to official calendar.`,
      'success'
    );
  };

  const handleOpenDeleteHoliday = (holiday: HolidayRecord) => {
    setDeleteDialog({
      isOpen: true,
      type: 'HOLIDAY',
      id: holiday.id,
      title: `Delete Holiday "${holiday.name}"?`,
      description: `Are you sure you want to permanently remove this holiday from the schedule?`,
      details: [
        { label: 'Holiday Name', value: holiday.name },
        { label: 'Date', value: holiday.date },
        { label: 'Classification', value: holiday.type },
        { label: 'Rule', value: holiday.isOptional ? 'Optional / Floating' : 'Mandatory Paid' }
      ]
    });
  };

  const handleResetStandardHolidays = () => {
    storageService.resetStandardHolidays();
    setLocalUpdateCounter(c => c + 1);
    triggerRefresh();
    showToast('Standard 2026 holiday schedule restored successfully.', 'success');
  };

  // Payslip Handlers
  const handleOpenGeneratePayslip = (employee?: Employee) => {
    setEmployeeForPayslip(employee || employees[0] || null);
    setPayslipToEdit(null);
    setIsPayslipModalOpen(true);
  };

  const handleOpenEditPayslip = (payslip: Payslip) => {
    const emp = employees.find(e => e.id === payslip.employeeId) || null;
    setEmployeeForPayslip(emp);
    setPayslipToEdit(payslip);
    setIsPayslipModalOpen(true);
  };

  const handleOpenViewPayslip = (payslip: Payslip) => {
    setPayslipToView(payslip);
  };

  const handleSavePayslip = (payslip: Payslip) => {
    storageService.savePayslip(payslip);
    setLocalUpdateCounter(c => c + 1);
    triggerRefresh();
    showToast(
      payslipToEdit
        ? `Payslip ${payslip.payslipNumber} updated successfully.`
        : `Payslip ${payslip.payslipNumber} generated for ${payslip.employeeName}.`,
      'success'
    );
  };

  const handleOpenDeletePayslip = (payslip: Payslip) => {
    setDeleteDialog({
      isOpen: true,
      type: 'PAYSLIP',
      id: payslip.id,
      title: `Delete Payslip ${payslip.payslipNumber}?`,
      description: `Are you sure you want to delete the payslip voucher for ${payslip.employeeName} for ${payslip.month}?`,
      details: [
        { label: 'Employee', value: payslip.employeeName },
        { label: 'Period', value: payslip.month },
        { label: 'Gross Earnings', value: `₹${payslip.grossEarnings.toLocaleString('en-IN')}` },
        { label: 'Net Payable', value: `₹${payslip.netPay.toLocaleString('en-IN')}` }
      ]
    });
  };

  const getStatusBadge = (status: Employee['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN FIELD':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'ON LEAVE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'TERMINATED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getAttendanceStatusBadge = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'FIELD VISIT':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'LATE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'HALF DAY':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'ABSENT':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              Human Capital & Field Ops
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Field Workforce, GPS Punch-in & Attendance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            HRMS & Field Operations
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Employee Button */}
          <button
            type="button"
            onClick={handleOpenAddEmployee}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-amber-100/80 hover:bg-amber-200/80 border border-amber-300/80 rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-amber-800" />
            <span>Add Employee</span>
          </button>

          {/* Add Attendance Record Button */}
          <button
            type="button"
            onClick={handleOpenAddAttendance}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span>Record Attendance</span>
          </button>

          {/* Quick GPS Punch In */}
          <button
            type="button"
            onClick={handlePunchAttendance}
            disabled={isPunching}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            <span>{isPunching ? 'Verifying GPS...' : 'Punch In with Live GPS'}</span>
          </button>

          {/* Add Holiday button if Admin and on holiday tabs */}
          {isAdmin && (activeTab === 'HOLIDAYS' || activeTab === 'HOLIDAY_MANAGEMENT') && (
            <button
              type="button"
              onClick={handleOpenAddHoliday}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-amber-100/80 hover:bg-amber-200/80 border border-amber-300/80 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-800" />
              <span>Add Holiday</span>
            </button>
          )}

          {/* Excel Hub */}
          <button
            type="button"
            onClick={() => openImportExportModal('Employees')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Excel Hub</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('EMPLOYEES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'EMPLOYEES' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Team Directory ({employees.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ATTENDANCE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily GPS Attendance ({attendance.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PAYROLL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PAYROLL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Salary Register
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HOLIDAYS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'HOLIDAYS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-amber-700" />
            <span>Holiday Calendar</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('HOLIDAY_MANAGEMENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'HOLIDAY_MANAGEMENT' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
              <span>Manage Holidays</span>
            </button>
          )}
        </div>

        {(activeTab === 'EMPLOYEES' || activeTab === 'ATTENDANCE') && (
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === 'EMPLOYEES'
                  ? 'Search employee, role, code, site...'
                  : 'Search employee, date, location...'
              }
              className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>
        )}
      </div>

      {/* TAB 1: EMPLOYEES */}
      {activeTab === 'EMPLOYEES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredEmployees.length} of {employees.length} team members
            </span>
            <button
              type="button"
              onClick={handleOpenAddEmployee}
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Employee</span>
            </button>
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto mb-3">
                <UserPlus className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">No Employees Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchTerm ? 'No staff matched your search filter.' : 'Your team directory is currently empty.'}
              </p>
              <button
                type="button"
                onClick={handleOpenAddEmployee}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register First Employee</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map(e => (
                <div
                  key={e.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-amber-300 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Code, Department, Status, and Action Buttons */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
                          {e.employeeCode}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          {e.department}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadge(e.status)}`}>
                          {e.status}
                        </span>

                        {/* Edit Employee Action */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditEmployee(e)}
                          aria-label={`Edit ${e.name}`}
                          title="Edit Employee"
                          className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Employee Action */}
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteEmployee(e)}
                          aria-label={`Delete ${e.name}`}
                          title="Delete Employee"
                          className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Employee Profile Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 overflow-hidden">
                        {e.photoUrl ? (
                          <img
                            src={e.photoUrl}
                            alt={e.name}
                            className="w-full h-full object-cover"
                            onError={(ev) => {
                              // Fallback on broken images
                              (ev.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{e.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base text-slate-900 truncate">{e.name}</h3>
                        <p className="text-xs text-slate-500 font-medium truncate">{e.designation}</p>
                      </div>
                    </div>

                    {/* Contact & Location Details */}
                    <div className="space-y-1.5 mt-4 text-xs text-slate-600">
                      <p className="flex items-center gap-2 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{e.phone}</span>
                      </p>
                      <p className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{e.email}</span>
                      </p>
                      <p className="flex items-center gap-2 truncate">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Joined: {e.joiningDate}</span>
                      </p>
                      {e.currentSiteLocation && (
                        <p className="flex items-center gap-2 truncate text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">{e.currentSiteLocation}</span>
                        </p>
                      )}
                      <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                        {e.loginEnabled ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200" title={`ERP Access: ${e.systemRole || 'Active'}`}>
                            <Key className="w-2.5 h-2.5" />
                            <span>ERP: {e.systemRole || 'User'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200" title="No ERP Login account assigned">
                            <span>No ERP Access</span>
                          </span>
                        )}
                        {e.accountStatus === 'DISABLED' && e.loginEnabled && (
                          <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            Suspended
                          </span>
                        )}
                        {Boolean(e.documents && e.documents.length > 0) && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200"
                            title={`${e.documents?.length} HR Document${(e.documents?.length || 0) > 1 ? 's' : ''} attached`}
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>{e.documents?.length} Doc{(e.documents?.length || 0) > 1 ? 's' : ''}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Compensation & Edit Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      <span>Monthly Pay</span>
                    </span>
                    <span className="font-bold text-slate-900">₹{e.salaryMonthly.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ATTENDANCE */}
      {activeTab === 'ATTENDANCE' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-900">GPS & Field Attendance Logs</span>
              <p className="text-[11px] text-slate-500">
                Live geotagged site check-ins, time tracking, and verification
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddAttendance}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Field Check-In</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">GPS Geotag</th>
                  <th className="py-3 px-4">Site Location Verified</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No attendance records found matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                            {a.employeeName.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{a.employeeName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{a.date}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{a.checkInTime}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {a.checkOutTime ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{a.checkOutTime}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">In Field</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${getAttendanceStatusBadge(a.status)}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>
                            {typeof a.checkInGps === 'object' && a.checkInGps !== null
                              ? `${a.checkInGps.latitude?.toFixed(4)}°, ${a.checkInGps.longitude?.toFixed(4)}°`
                              : typeof a.checkInGps === 'string'
                                ? a.checkInGps
                                : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <div>
                          <span>{a.siteLocation || 'General Site'}</span>
                          {a.siteProjectTitle && (
                            <p className="text-[10px] text-slate-500 truncate">{a.siteProjectTitle}</p>
                          )}
                          {Boolean(a.fuelExpense?.totalKmDriven) && (
                            <div className="pt-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                <span>🚗 {a.fuelExpense?.totalKmDriven} km mileage</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditAttendance(a)}
                            aria-label={`Edit attendance for ${a.employeeName}`}
                            title="Edit Attendance Record"
                            className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteAttendance(a)}
                            aria-label={`Delete attendance for ${a.employeeName}`}
                            title="Delete Attendance Record"
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAYROLL */}
      {activeTab === 'PAYROLL' && (
        <div className="space-y-4">
          {/* Payroll Cycle Control Header */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Payroll Cycle & Monthly Salary Register
                </span>
                <p className="text-[11px] text-slate-500">
                  Fixed master base salaries, variable overtime, site expense claims, and statutory deductions
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1 sm:pt-0">
                <span className="text-xs font-bold text-slate-500">Period:</span>
                <select
                  value={selectedCycle}
                  onChange={e => setSelectedCycle(e.target.value)}
                  className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 focus:ring-2 focus:ring-amber-500 text-slate-800"
                >
                  <option value="September 2026">September 2026</option>
                  <option value="October 2026">October 2026</option>
                  <option value="August 2026">August 2026</option>
                  <option value="July 2026">July 2026</option>
                  <option value="June 2026">June 2026</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status filter buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setPayrollStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    payrollStatusFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({employeePayrollRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPayrollStatusFilter('GENERATED')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    payrollStatusFilter === 'GENERATED'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Slips Generated ({payrollSummary.generatedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPayrollStatusFilter('PENDING')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    payrollStatusFilter === 'PENDING'
                      ? 'bg-white text-amber-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending ({employeePayrollRows.length - payrollSummary.generatedCount})
                </button>
              </div>

              {/* Top Generate Button */}
              <button
                type="button"
                onClick={() => handleOpenGeneratePayslip()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Generate Payslip</span>
              </button>
            </div>
          </div>

          {/* Payroll KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Fixed Base Payroll</span>
              <span className="text-sm font-bold text-slate-800">₹{payrollSummary.totalBaseSalary.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Master rates</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-0.5">Overtime Amount</span>
              <span className="text-sm font-bold text-emerald-700">+₹{payrollSummary.totalOvertime.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Variable earnings</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-sky-600 block mb-0.5">Approved Expenses</span>
              <span className="text-sm font-bold text-sky-700">+₹{payrollSummary.totalExpenses.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Travel & site claims</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-rose-600 block mb-0.5">Total Deductions</span>
              <span className="text-sm font-bold text-rose-700">-₹{payrollSummary.totalDeductions.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">PF, TDS & statutory</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/30">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-0.5">Total Net Disbursed</span>
              <span className="text-sm font-black text-emerald-800">₹{payrollSummary.totalNetPay.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">{payrollSummary.generatedCount} vouchers</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Cycle Completion</span>
              <span className="text-sm font-bold text-slate-900">
                {payrollSummary.generatedCount} / {payrollSummary.totalEmployees}
              </span>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-1.5 rounded-full"
                  style={{
                    width: `${Math.round((payrollSummary.generatedCount / (payrollSummary.totalEmployees || 1)) * 100)}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Comprehensive Payroll Register Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department & Role</th>
                    <th className="py-3 px-4">Fixed Base Salary</th>
                    <th className="py-3 px-4">Overtime (₹)</th>
                    <th className="py-3 px-4">Expenses (₹)</th>
                    <th className="py-3 px-4">Deductions (₹)</th>
                    <th className="py-3 px-4">Gross Earnings (₹)</th>
                    <th className="py-3 px-4">Net Payable (₹)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayrollRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-400">
                        No employee payroll records found matching your filter for {selectedCycle}.
                      </td>
                    </tr>
                  ) : (
                    filteredPayrollRows.map(row => {
                      const emp = row.employee;
                      const slip = row.payslip;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Employee */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs shrink-0">
                                {emp.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{emp.name}</span>
                                <span className="font-mono text-[10px] text-slate-400">{emp.employeeCode}</span>
                              </div>
                            </div>
                          </td>

                          {/* Department & Role */}
                          <td className="py-3.5 px-4 text-slate-600">
                            <span className="font-medium text-slate-800 block">{emp.department}</span>
                            <span className="text-[10px] text-slate-400">{emp.designation}</span>
                          </td>

                          {/* Fixed Base Salary (Read-only from employee record) */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800 block">
                              ₹{emp.salaryMonthly.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400">Fixed Base</span>
                          </td>

                          {/* Overtime */}
                          <td className="py-3.5 px-4">
                            {slip && slip.overtimeAmount > 0 ? (
                              <div>
                                <span className="font-semibold text-emerald-700">
                                  +₹{slip.overtimeAmount.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {slip.overtimeType === 'CALCULATED'
                                    ? `${slip.overtimeHours ?? 0}h @ ₹${slip.overtimeRatePerHour ?? 0}`
                                    : 'Direct'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>

                          {/* Additional Expenses */}
                          <td className="py-3.5 px-4">
                            {slip && slip.totalAdditionalExpenses > 0 ? (
                              <div>
                                <span className="font-semibold text-sky-700">
                                  +₹{slip.totalAdditionalExpenses.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {slip.additionalExpenses.length} item(s)
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>

                          {/* Deductions */}
                          <td className="py-3.5 px-4">
                            {slip && slip.totalDeductions > 0 ? (
                              <div>
                                <span className="font-semibold text-rose-700">
                                  -₹{slip.totalDeductions.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {slip.deductions.length} item(s)
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>

                          {/* Gross Earnings */}
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {slip ? (
                              <span>₹{slip.grossEarnings.toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">₹{emp.salaryMonthly.toLocaleString('en-IN')} (Est.)</span>
                            )}
                          </td>

                          {/* Net Payable */}
                          <td className="py-3.5 px-4">
                            {slip ? (
                              <span className="font-black text-slate-900 text-sm">
                                ₹{slip.netPay.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="font-medium text-slate-400 text-xs">
                                ₹{emp.salaryMonthly.toLocaleString('en-IN')} (Pending)
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {slip ? (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                                  slip.status === 'PAID'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {slip.status}
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                PENDING
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            {slip ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenViewPayslip(slip)}
                                  title="View and Print Payslip Voucher"
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-amber-700" />
                                  <span>View Slip</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPayslip(slip)}
                                  title="Edit Payslip Breakdown"
                                  className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeletePayslip(slip)}
                                  title="Delete Payslip"
                                  className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenGeneratePayslip(emp)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Generate Slip</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HOLIDAY CALENDAR */}
      {activeTab === 'HOLIDAYS' && (
        <HolidayCalendarView
          holidays={holidays}
          userDepartment={currentUser?.department}
          isAdmin={isAdmin}
          onNavigateToManagement={() => setActiveTab('HOLIDAY_MANAGEMENT')}
        />
      )}

      {/* TAB 5: MANAGE HOLIDAYS (ADMIN ONLY) */}
      {activeTab === 'HOLIDAY_MANAGEMENT' && (
        <HolidayManagementView
          holidays={holidays}
          isAdmin={isAdmin}
          onAddHoliday={handleOpenAddHoliday}
          onEditHoliday={handleOpenEditHoliday}
          onDeleteHoliday={handleOpenDeleteHoliday}
          onResetStandardHolidays={handleResetStandardHolidays}
        />
      )}

      {/* Add / Edit Employee Modal */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSave={handleSaveEmployee}
        employeeToEdit={employeeToEdit}
        existingEmployees={employees}
      />

      {/* Add / Edit Attendance Modal */}
      <AttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        onSave={handleSaveAttendance}
        recordToEdit={attendanceToEdit}
        employees={employees}
      />

      {/* Add / Edit Holiday Modal */}
      {isHolidayModalOpen && (
        <HolidayModal
          isOpen={isHolidayModalOpen}
          onClose={() => {
            setIsHolidayModalOpen(false);
            setHolidayToEdit(null);
          }}
          onSave={handleSaveHoliday}
          holidayToEdit={holidayToEdit}
          currentUserName={currentUser?.name || 'HR Administrator'}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        title={deleteDialog.title}
        description={deleteDialog.description}
        details={deleteDialog.details}
        confirmLabel="Delete Permanently"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Payslip Generator & Editor Modal */}
      {isPayslipModalOpen && (
        <PayslipGeneratorModal
          isOpen={isPayslipModalOpen}
          onClose={() => {
            setIsPayslipModalOpen(false);
            setPayslipToEdit(null);
          }}
          onSave={handleSavePayslip}
          employee={employeeForPayslip}
          existingPayslip={payslipToEdit}
          allEmployees={employees}
        />
      )}

      {/* Payslip View & Print Voucher Modal */}
      {payslipToView && (
        <PayslipViewModal
          isOpen={Boolean(payslipToView)}
          onClose={() => setPayslipToView(null)}
          payslip={payslipToView}
          onEdit={(slip) => handleOpenEditPayslip(slip)}
        />
      )}
    </div>
  );
};
