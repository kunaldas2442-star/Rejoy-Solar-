import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Employee, Payslip, AdditionalExpenseItem, DeductionItem } from '../../types/solar';
import { storageService } from '../../services/storage';
import { attendanceBelongsToEmployee } from '../../utils/employeeMatching';
import {
  X,
  FileText,
  Save,
  Plus,
  Trash2,
  Lock,
  Clock,
  Receipt,
  MinusCircle,
  AlertCircle,
  Sparkles,
  Calculator,
  Calendar,
  Building,
  Briefcase,
  DollarSign,
  CheckCircle2,
  Fuel,
  Gauge,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from 'lucide-react';

interface PayslipGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payslip: Payslip) => void;
  employee: Employee | null;
  existingPayslip?: Payslip | null;
  allEmployees: Employee[];
}

interface EditableExpenseItem {
  id: string;
  description: string;
  amount: number | string;
}

interface EditableDeductionItem {
  id: string;
  description: string;
  amount: number | string;
}

const COMMON_EXPENSE_PRESETS = [
  'Sanand Site Allowance',
  'Travel & Fuel Reimbursement',
  'Food & Outstation Allowance',
  'Tools & PPE Safety Reimbursement',
  'Mobile & Internet Reimbursement',
  'Field Performance Incentive'
];

const COMMON_DEDUCTION_PRESETS = [
  'Provident Fund (PF Employee)',
  'TDS Income Tax Withholding',
  'Professional Tax (PT)',
  'Advance Salary Recovery',
  'Unpaid Leave Deduction',
  'Loan Recovery'
];

const MONTH_OPTIONS = [
  'September 2026',
  'October 2026',
  'August 2026',
  'July 2026',
  'June 2026',
  'May 2026'
];

export const PayslipGeneratorModal: React.FC<PayslipGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  employee: initialEmployee,
  existingPayslip,
  allEmployees
}) => {
  const isEditing = Boolean(existingPayslip);

  // Settings
  const settings = storageService.getSettings();
  const currencySymbol = settings.currencySymbol || '₹';

  // Selected employee state (in case user opened modal directly)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    initialEmployee?.id || existingPayslip?.employeeId || allEmployees[0]?.id || ''
  );

  const currentEmployee = useMemo(() => {
    return allEmployees.find(e => e.id === selectedEmployeeId) || initialEmployee || allEmployees[0];
  }, [allEmployees, selectedEmployeeId, initialEmployee]);

  // Form states
  const [salaryMonth, setSalaryMonth] = useState<string>('September 2026');
  const [status, setStatus] = useState<Payslip['status']>('GENERATED');
  const [paymentMode, setPaymentMode] = useState<Payslip['paymentMode']>('NEFT/RTGS Bank Transfer');
  const [bankReferenceNo, setBankReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Overtime states (store as number | string to allow fluid decimal typing)
  const [overtimeType, setOvertimeType] = useState<'CALCULATED' | 'DIRECT'>('CALCULATED');
  const [overtimeHours, setOvertimeHours] = useState<number | string>(0);
  const [overtimeRatePerHour, setOvertimeRatePerHour] = useState<number | string>(0);
  const [isOvertimeRateManuallyEdited, setIsOvertimeRateManuallyEdited] = useState<boolean>(false);
  const [directOvertimeAmount, setDirectOvertimeAmount] = useState<number | string>(0);

  // Additional expenses
  const [additionalExpenses, setAdditionalExpenses] = useState<EditableExpenseItem[]>([]);

  // Deductions
  const [deductions, setDeductions] = useState<EditableDeductionItem[]>([]);

  // Daily Fuel / Mileage Sync state
  const [reimbursementRatePerKm, setReimbursementRatePerKm] = useState<number | string>(5.0);
  const [isViewingFuelBreakdown, setIsViewingFuelBreakdown] = useState<boolean>(false);
  const [fuelPreviewModalImg, setFuelPreviewModalImg] = useState<{ url: string; title: string } | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track modal open/session state to initialize form without resetting on user dropdown selection
  const prevSessionRef = useRef<{
    isOpen: boolean;
    payslipId?: string;
    initialEmpId?: string;
  }>({ isOpen: false });

  // Month attendance logs matching currentEmployee and salaryMonth
  const monthNameToNumber: Record<string, string> = useMemo(() => ({
    january: '01',
    february: '02',
    march: '03',
    april: '04',
    may: '05',
    june: '06',
    july: '07',
    august: '08',
    september: '09',
    october: '10',
    november: '11',
    december: '12'
  }), []);

  const monthAttendanceLogs = useMemo(() => {
    if (!currentEmployee || !salaryMonth) return [];
    const [mName, year] = salaryMonth.split(' ');
    const monthNum = monthNameToNumber[mName?.toLowerCase() || ''];
    const prefix = monthNum && year ? `${year}-${monthNum}` : '';

    const allAttendance = storageService.getAttendance();
    return allAttendance.filter(a => {
      const isEmp = attendanceBelongsToEmployee(a, currentEmployee);
      const isMonth = prefix ? a.date.startsWith(prefix) : true;
      return isEmp && isMonth;
    });
  }, [currentEmployee, salaryMonth, monthNameToNumber, isOpen]);

  const fuelAttendanceRecords = useMemo(() => {
    return monthAttendanceLogs.filter(a => a.fuelExpense && (a.fuelExpense.totalKmDriven || 0) > 0);
  }, [monthAttendanceLogs]);

  const totalFuelKmInMonth = useMemo(() => {
    return fuelAttendanceRecords.reduce(
      (sum, a) => sum + (a.fuelExpense?.totalKmDriven || 0),
      0
    );
  }, [fuelAttendanceRecords]);

  // Suggested default hourly rate based on base salary: base / 26 working days / 8 hours
  const suggestedHourlyRate = useMemo(() => {
    if (!currentEmployee) return 200;
    const rate = Math.round(currentEmployee.salaryMonthly / (26 * 8));
    return Math.max(rate, 100);
  }, [currentEmployee]);

  // Handle employee change in create mode: update selected employee and suggested overtime rate (if not manually edited)
  const handleEmployeeChange = (newEmpId: string) => {
    setSelectedEmployeeId(newEmpId);

    if (!isEditing && !isOvertimeRateManuallyEdited) {
      const newEmp = allEmployees.find(e => e.id === newEmpId);
      if (newEmp) {
        const newRate = Math.max(Math.round(newEmp.salaryMonthly / (26 * 8)), 100);
        setOvertimeRatePerHour(newRate);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      prevSessionRef.current = { isOpen: false };
      return;
    }

    const prev = prevSessionRef.current;
    const isNewlyOpened = !prev.isOpen;
    const isDifferentPayslip = existingPayslip?.id !== prev.payslipId;
    const isDifferentInitialEmp = initialEmployee?.id !== prev.initialEmpId;

    // Only re-initialize if the modal was just opened or opened for a different payslip / initial employee
    if (isNewlyOpened || isDifferentPayslip || isDifferentInitialEmp) {
      prevSessionRef.current = {
        isOpen: true,
        payslipId: existingPayslip?.id,
        initialEmpId: initialEmployee?.id
      };

      if (existingPayslip) {
        setSelectedEmployeeId(existingPayslip.employeeId);
        setSalaryMonth(existingPayslip.month || 'September 2026');
        setStatus(existingPayslip.status || 'GENERATED');
        setPaymentMode(existingPayslip.paymentMode || 'NEFT/RTGS Bank Transfer');
        setBankReferenceNo(existingPayslip.bankReferenceNo || '');
        setNotes(existingPayslip.notes || '');

        setOvertimeType(existingPayslip.overtimeType || 'CALCULATED');
        setOvertimeHours(existingPayslip.overtimeHours ?? 0);

        const matchedEmp = allEmployees.find(e => e.id === existingPayslip.employeeId);
        const defaultRate = matchedEmp ? Math.max(Math.round(matchedEmp.salaryMonthly / (26 * 8)), 100) : 200;
        setOvertimeRatePerHour(existingPayslip.overtimeRatePerHour ?? defaultRate);
        setIsOvertimeRateManuallyEdited(existingPayslip.overtimeRatePerHour !== undefined);
        setDirectOvertimeAmount(existingPayslip.overtimeAmount ?? 0);

        setAdditionalExpenses(
          existingPayslip.additionalExpenses && existingPayslip.additionalExpenses.length > 0
            ? existingPayslip.additionalExpenses.map(item => ({ ...item }))
            : []
        );

        setDeductions(
          existingPayslip.deductions && existingPayslip.deductions.length > 0
            ? existingPayslip.deductions.map(item => ({ ...item }))
            : []
        );
      } else {
        const defaultEmp = initialEmployee || allEmployees[0];
        const targetEmpId = defaultEmp?.id || '';
        setSelectedEmployeeId(targetEmpId);
        setSalaryMonth('September 2026');
        setStatus('GENERATED');
        setPaymentMode('NEFT/RTGS Bank Transfer');
        setBankReferenceNo('');
        setNotes('');

        setOvertimeType('CALCULATED');
        setOvertimeHours(0);

        const matchedEmp = allEmployees.find(e => e.id === targetEmpId);
        const defaultRate = matchedEmp ? Math.max(Math.round(matchedEmp.salaryMonthly / (26 * 8)), 100) : 200;
        setOvertimeRatePerHour(defaultRate);
        setIsOvertimeRateManuallyEdited(false);
        setDirectOvertimeAmount(0);

        // Clean empty rows by default or 1 starter row
        setAdditionalExpenses([]);
        setDeductions([
          { id: `ded-${Date.now()}-1`, description: 'Provident Fund (PF Employee)', amount: 1800 }
        ]);
      }
      setErrors({});
    }
  }, [isOpen, existingPayslip, initialEmployee, allEmployees]);

  // Real-time calculations with support for exact float / decimal values
  const fixedBaseSalary = currentEmployee ? currentEmployee.salaryMonthly : 0;

  const numOvertimeHours = parseFloat(String(overtimeHours)) || 0;
  const numOvertimeRate = parseFloat(String(overtimeRatePerHour)) || 0;
  const numDirectOvertime = parseFloat(String(directOvertimeAmount)) || 0;

  const effectiveOvertimeSalary =
    overtimeType === 'CALCULATED'
      ? Math.round(numOvertimeHours * numOvertimeRate * 100) / 100
      : Math.round(numDirectOvertime * 100) / 100;

  const totalAdditionalExpenses = Math.round(
    additionalExpenses.reduce(
      (sum, item) => sum + (parseFloat(String(item.amount)) || 0),
      0
    ) * 100
  ) / 100;

  const totalDeductions = Math.round(
    deductions.reduce(
      (sum, item) => sum + (parseFloat(String(item.amount)) || 0),
      0
    ) * 100
  ) / 100;

  // Transparent calculation rules:
  // Gross Earnings = Fixed Base Salary + Overtime Salary + Total Additional Expenses
  // Net Pay = Gross Earnings - Total Deductions
  const grossEarnings = Math.round((fixedBaseSalary + effectiveOvertimeSalary + totalAdditionalExpenses) * 100) / 100;
  const netPay = Math.max(0, Math.round((grossEarnings - totalDeductions) * 100) / 100);

  const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return val.toLocaleString('en-IN', {
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    });
  };

  if (!isOpen || !currentEmployee) return null;

  // Handlers for Additional Expenses
  const handleAddExpense = (presetDesc?: string) => {
    setAdditionalExpenses(prev => [
      ...prev,
      {
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        description: presetDesc || '',
        amount: ''
      }
    ]);
  };

  const handleUpdateExpense = (id: string, field: 'description' | 'amount', value: string | number) => {
    setAdditionalExpenses(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveExpense = (id: string) => {
    setAdditionalExpenses(prev => prev.filter(item => item.id !== id));
  };

  const handleSyncFuelReimbursement = () => {
    if (totalFuelKmInMonth <= 0) return;

    const rateNum = parseFloat(String(reimbursementRatePerKm)) || 0;
    const amount = Math.round(totalFuelKmInMonth * rateNum * 100) / 100;
    const desc = `Daily Fuel & Mileage Reimbursement (${totalFuelKmInMonth} km @ ${currencySymbol}${rateNum}/km)`;

    setAdditionalExpenses(prev => {
      const existingIndex = prev.findIndex(item =>
        item.description.toLowerCase().includes('fuel') ||
        item.description.toLowerCase().includes('mileage')
      );

      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = {
          ...copy[existingIndex],
          description: desc,
          amount
        };
        return copy;
      } else {
        return [
          ...prev,
          {
            id: `exp-fuel-${Date.now()}`,
            description: desc,
            amount
          }
        ];
      }
    });
  };

  // Handlers for Deductions
  const handleAddDeduction = (presetDesc?: string) => {
    setDeductions(prev => [
      ...prev,
      {
        id: `ded-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        description: presetDesc || '',
        amount: ''
      }
    ]);
  };

  const handleUpdateDeduction = (id: string, field: 'description' | 'amount', value: string | number) => {
    setDeductions(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveDeduction = (id: string) => {
    setDeductions(prev => prev.filter(item => item.id !== id));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!salaryMonth.trim()) {
      newErrors.salaryMonth = 'Salary period / month is required.';
    }

    if (overtimeType === 'CALCULATED') {
      if (numOvertimeHours < 0) newErrors.overtimeHours = 'Overtime hours cannot be negative.';
      if (numOvertimeRate < 0) newErrors.overtimeRatePerHour = 'Overtime rate cannot be negative.';
    } else {
      if (numDirectOvertime < 0) newErrors.directOvertimeAmount = 'Overtime amount cannot be negative.';
    }

    // Check that any added expense item has a description
    for (const exp of additionalExpenses) {
      const amt = parseFloat(String(exp.amount)) || 0;
      if (!exp.description.trim() && amt > 0) {
        newErrors.expenses = 'All additional expense line items must have a description.';
        break;
      }
      if (amt < 0) {
        newErrors.expenses = 'Expense amounts must be positive numbers.';
        break;
      }
    }

    // Check that any added deduction has a description
    for (const ded of deductions) {
      const amt = parseFloat(String(ded.amount)) || 0;
      if (!ded.description.trim() && amt > 0) {
        newErrors.deductions = 'All deduction line items must have a description.';
        break;
      }
      if (amt < 0) {
        newErrors.deductions = 'Deduction amounts must be positive numbers.';
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payslipId = existingPayslip
        ? existingPayslip.id
        : `pay-${salaryMonth.replace(/\s+/g, '').toLowerCase()}-${currentEmployee.id}`;

      const payslipNum = existingPayslip
        ? existingPayslip.payslipNumber
        : `PAY-${salaryMonth.replace(/\s+/g, '').toUpperCase()}-${currentEmployee.employeeCode}`;

      // Filter out blank empty rows with zero amounts and preserve full float precision
      const cleanExpenses: AdditionalExpenseItem[] = additionalExpenses
        .filter(e => e.description.trim().length > 0 && (parseFloat(String(e.amount)) || 0) > 0)
        .map(e => ({
          id: e.id,
          description: e.description.trim(),
          amount: Math.round((parseFloat(String(e.amount)) || 0) * 100) / 100
        }));

      const cleanDeductions: DeductionItem[] = deductions
        .filter(d => d.description.trim().length > 0 && (parseFloat(String(d.amount)) || 0) > 0)
        .map(d => ({
          id: d.id,
          description: d.description.trim(),
          amount: Math.round((parseFloat(String(d.amount)) || 0) * 100) / 100
        }));

      const finalPayslip: Payslip = {
        id: payslipId,
        payslipNumber: payslipNum,
        employeeId: currentEmployee.id,
        employeeCode: currentEmployee.employeeCode,
        employeeName: currentEmployee.name,
        department: currentEmployee.department,
        designation: currentEmployee.designation,
        month: salaryMonth,
        generatedDate: existingPayslip?.generatedDate || new Date().toISOString().slice(0, 10),

        // Fixed base salary from employee - strictly read-only, employee record remains untouched!
        baseSalary: fixedBaseSalary,

        // Variable overtime
        overtimeType,
        overtimeHours: overtimeType === 'CALCULATED' ? numOvertimeHours : undefined,
        overtimeRatePerHour: overtimeType === 'CALCULATED' ? numOvertimeRate : undefined,
        overtimeAmount: effectiveOvertimeSalary,

        // Additional expenses
        additionalExpenses: cleanExpenses,
        totalAdditionalExpenses,

        // Deductions
        deductions: cleanDeductions,
        totalDeductions,

        // Transparent calculations
        grossEarnings,
        netPay,

        status,
        paymentDate: status === 'PAID' ? new Date().toISOString().slice(0, 10) : undefined,
        paymentMode,
        bankReferenceNo: bankReferenceNo.trim() || undefined,
        notes: notes.trim() || undefined
      };

      onSave(finalPayslip);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payslip-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shadow-2xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 id="payslip-modal-title" className="font-bold text-base text-slate-900">
                {isEditing ? `Edit Payslip: ${existingPayslip?.payslipNumber}` : 'Generate Monthly Payslip & Salary Voucher'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Configure fixed base earnings, variable overtime, site reimbursements, and statutory deductions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {Object.keys(errors).length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Please check the required fields:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-rose-700">
                  {Object.values(errors).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Section 1: Employee Details & Salary Period */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-amber-600" />
                <span>Employee & Payroll Period</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Cycle: <strong className="text-slate-800">{salaryMonth}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Employee Selection */}
              <div className="sm:col-span-2">
                <label htmlFor="employee-select" className="block text-[11px] font-bold text-slate-700 mb-1">
                  Employee Details
                </label>
                {!isEditing && allEmployees.length > 1 ? (
                  <select
                    id="employee-select"
                    aria-label="Select Employee"
                    value={selectedEmployeeId}
                    onChange={e => handleEmployeeChange(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    {allEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeCode}) — {emp.designation} [{emp.department}]
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                        {currentEmployee.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900">{currentEmployee.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {currentEmployee.employeeCode} • {currentEmployee.designation} ({currentEmployee.department})
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {currentEmployee.status}
                    </span>
                  </div>
                )}
              </div>

              {/* Salary Month */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Salary Period / Month <span className="text-rose-500">*</span></span>
                </label>
                <select
                  value={salaryMonth}
                  onChange={e => setSalaryMonth(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-amber-500"
                >
                  {MONTH_OPTIONS.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Fixed Earnings (Base Monthly Salary) */}
          <div className="bg-white rounded-xl p-4 border border-amber-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Fixed Earnings (Base Monthly Salary)</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                Read-Only • Fixed Master Rate
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Pre-filled from the employee record. As per company policy, this fixed base salary is non-editable during payslip generation to preserve master employment contracts.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-slate-500">Basic Monthly Pay</span>
                  <p className="text-xs font-bold text-slate-800">{currentEmployee.designation}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-900">{currencySymbol}{formatCurrency(fixedBaseSalary)}</span>
                  <p className="text-[10px] text-slate-400">Fixed Base</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-slate-500">Suggested Hourly Rate</span>
                  <p className="text-[10px] text-slate-400">Calculated as Base / 26 days / 8 hrs</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">{currencySymbol}{suggestedHourlyRate} / hr</span>
                  {!isEditing && overtimeType === 'CALCULATED' && (parseFloat(String(overtimeRatePerHour)) || 0) !== suggestedHourlyRate && (
                    <button
                      type="button"
                      onClick={() => {
                        setOvertimeRatePerHour(suggestedHourlyRate);
                        setIsOvertimeRateManuallyEdited(false);
                      }}
                      className="text-[10px] font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                      title="Apply suggested rate to overtime calculation"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Variable Earnings — Overtime */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Variable Earnings — Overtime Amount</span>
                </span>
                <p className="text-[11px] text-slate-500">
                  Choose between automated calculation (Hours × Rate) or direct manual overtime amount. All decimals and fractional hours are supported.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setOvertimeType('CALCULATED')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    overtimeType === 'CALCULATED'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hours & Hourly Rate
                </button>
                <button
                  type="button"
                  onClick={() => setOvertimeType('DIRECT')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    overtimeType === 'DIRECT'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Direct Amount
                </button>
              </div>
            </div>

            {/* Overtime Controls */}
            {overtimeType === 'CALCULATED' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Overtime Hours (hrs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={overtimeHours}
                    onChange={e => setOvertimeHours(e.target.value)}
                    placeholder="e.g. 15.5"
                    className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Hourly Overtime Rate ({currencySymbol} / hr)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={overtimeRatePerHour}
                    onChange={e => {
                      setIsOvertimeRateManuallyEdited(true);
                      setOvertimeRatePerHour(e.target.value);
                    }}
                    placeholder={String(suggestedHourlyRate)}
                    className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-col justify-center p-2.5 bg-white rounded-xl border border-emerald-200 text-right">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Calculated Overtime Salary</span>
                  <span className="text-base font-black text-emerald-800">
                    {currencySymbol}{formatCurrency(effectiveOvertimeSalary)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({overtimeHours || 0} hrs × {currencySymbol}{overtimeRatePerHour || 0})
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:w-1/2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Direct Overtime Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={directOvertimeAmount}
                    onChange={e => setDirectOvertimeAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="w-full sm:w-1/2 p-2.5 bg-white rounded-xl border border-emerald-200 text-right">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Effective Overtime Salary</span>
                  <span className="text-base font-black text-emerald-800 block">
                    {currencySymbol}{formatCurrency(effectiveOvertimeSalary)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Variable Earnings — Additional Expenses / Reimbursements */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-sky-600" />
                  <span>Additional Expenses & Approved Reimbursements</span>
                </span>
                <p className="text-[11px] text-slate-500">
                  Multiple line items with reason and amount (travel, site allowance, fuel, food, tools, incentive). Supports decimal amounts.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleAddExpense()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense Line</span>
              </button>
            </div>

            {/* Attendance Fuel / Mileage Reimbursement Sync Card */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Fuel className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <span>Daily Fuel & Mileage Attendance Sync</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                        {totalFuelKmInMonth} km Logged
                      </span>
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      Calculated from daily field odometer readings submitted by {currentEmployee.name} for {salaryMonth}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {totalFuelKmInMonth > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsViewingFuelBreakdown(!isViewingFuelBreakdown)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>{isViewingFuelBreakdown ? 'Hide Trips' : `View ${fuelAttendanceRecords.length} Trip${fuelAttendanceRecords.length !== 1 ? 's' : ''}`}</span>
                      {isViewingFuelBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={totalFuelKmInMonth <= 0}
                    onClick={handleSyncFuelReimbursement}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Apply {currencySymbol}{formatCurrency(Math.round(totalFuelKmInMonth * (parseFloat(String(reimbursementRatePerKm)) || 0) * 100) / 100)} to Payslip</span>
                  </button>
                </div>
              </div>

              {/* Rate Configuration & Quick Metrics */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-amber-200/70 text-xs">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-700">
                    Reimbursement Rate:
                  </label>
                  <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-amber-300">
                    <span className="font-semibold text-slate-500 text-[11px]">{currencySymbol}</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={reimbursementRatePerKm}
                      onChange={e => setReimbursementRatePerKm(e.target.value)}
                      className="w-16 text-xs font-mono font-bold text-slate-900 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400 font-semibold">/ km</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    ({totalFuelKmInMonth} km × {currencySymbol}{reimbursementRatePerKm || 0} = <strong className="text-amber-900 font-bold">{currencySymbol}{formatCurrency(Math.round(totalFuelKmInMonth * (parseFloat(String(reimbursementRatePerKm)) || 0) * 100) / 100)}</strong>)
                  </span>
                </div>

                {totalFuelKmInMonth === 0 && (
                  <span className="text-[11px] text-slate-400 italic">
                    No mileage submissions found in attendance records for this month.
                  </span>
                )}
              </div>

              {/* Detailed Day-by-Day Breakdown */}
              {isViewingFuelBreakdown && totalFuelKmInMonth > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-200/60 overflow-x-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead>
                      <tr className="border-b border-amber-200 text-slate-500 font-bold">
                        <th className="pb-1.5 font-bold">Date</th>
                        <th className="pb-1.5 font-bold">Site / Location</th>
                        <th className="pb-1.5 font-bold">Start Odo</th>
                        <th className="pb-1.5 font-bold">End Odo</th>
                        <th className="pb-1.5 font-bold">KM Driven</th>
                        <th className="pb-1.5 font-bold text-right">Fuel Claim</th>
                        <th className="pb-1.5 font-bold text-center">Photos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100/60">
                      {fuelAttendanceRecords.map(rec => {
                        const km = rec.fuelExpense?.totalKmDriven || 0;
                        const dayCost = Math.round(km * (parseFloat(String(reimbursementRatePerKm)) || 0) * 100) / 100;
                        return (
                          <tr key={rec.id} className="hover:bg-amber-100/30">
                            <td className="py-1.5 font-mono text-slate-700">{rec.date}</td>
                            <td className="py-1.5 text-slate-600 truncate max-w-[150px]">
                              {rec.siteLocation || rec.siteProjectTitle || 'Field Visit'}
                            </td>
                            <td className="py-1.5 font-mono text-slate-700">
                              {rec.fuelExpense?.initialOdometerReading !== undefined
                                ? `${rec.fuelExpense.initialOdometerReading.toLocaleString('en-IN')} km`
                                : '-'}
                            </td>
                            <td className="py-1.5 font-mono text-slate-700">
                              {rec.fuelExpense?.finalOdometerReading !== undefined
                                ? `${rec.fuelExpense.finalOdometerReading.toLocaleString('en-IN')} km`
                                : '-'}
                            </td>
                            <td className="py-1.5 font-mono font-bold text-emerald-800">
                              {km} km
                            </td>
                            <td className="py-1.5 font-mono font-bold text-slate-900 text-right">
                              {currencySymbol}{formatCurrency(dayCost)}
                            </td>
                            <td className="py-1.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {rec.fuelExpense?.initialOdometerImageUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setFuelPreviewModalImg({
                                      url: rec.fuelExpense!.initialOdometerImageUrl!,
                                      title: `Start Odometer (${rec.date})`
                                    })}
                                    className="p-1 rounded-md text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                                    title="View Start Odometer Photo"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {rec.fuelExpense?.finalOdometerImageUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setFuelPreviewModalImg({
                                      url: rec.fuelExpense!.finalOdometerImageUrl!,
                                      title: `End Odometer (${rec.date})`
                                    })}
                                    className="p-1 rounded-md text-orange-700 hover:bg-orange-100 transition-colors cursor-pointer"
                                    title="View End Odometer Photo"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {!rec.fuelExpense?.initialOdometerImageUrl && !rec.fuelExpense?.finalOdometerImageUrl && (
                                  <span className="text-[10px] text-slate-400">None</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Add Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quick Suggestions:</span>
              {COMMON_EXPENSE_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddExpense(preset)}
                  className="text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 border border-slate-200 hover:border-sky-300 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                >
                  + {preset}
                </button>
              ))}
            </div>

            {/* Expense Rows */}
            {additionalExpenses.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                <p className="text-xs text-slate-500">
                  No additional expense or reimbursement line items added for this cycle.
                </p>
                <button
                  type="button"
                  onClick={() => handleAddExpense()}
                  className="mt-2 text-xs font-bold text-sky-600 hover:text-sky-700 underline cursor-pointer"
                >
                  + Add first expense item
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {additionalExpenses.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl"
                  >
                    <span className="text-[11px] font-bold text-slate-400 w-5 text-center">
                      #{index + 1}
                    </span>
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => handleUpdateExpense(item.id, 'description', e.target.value)}
                      placeholder="e.g. Travel & Fuel Allowance Sanand Site"
                      className="flex-1 text-xs border border-slate-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-sky-500"
                    />
                    <div className="relative w-36">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">{currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.amount}
                        onChange={e => handleUpdateExpense(item.id, 'amount', e.target.value)}
                        placeholder="0"
                        className="w-full text-xs font-mono font-bold pl-6 pr-2.5 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-sky-500 text-right"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExpense(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove expense row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center justify-between p-2.5 bg-sky-50/50 rounded-xl border border-sky-100 text-xs">
                  <span className="font-bold text-sky-900">Total Additional Expenses:</span>
                  <span className="font-black text-sky-900 text-sm">
                    {currencySymbol}{formatCurrency(totalAdditionalExpenses)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Deductions */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <MinusCircle className="w-4 h-4 text-rose-600" />
                  <span>Deductions (Statutory & Adjustments)</span>
                </span>
                <p className="text-[11px] text-slate-500">
                  Optional multiple deduction items (PF/ESI, TDS tax, advance recovery, unpaid leave, loan recovery). Supports decimal amounts.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleAddDeduction()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Deduction</span>
              </button>
            </div>

            {/* Quick Deduction Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quick Suggestions:</span>
              {COMMON_DEDUCTION_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddDeduction(preset)}
                  className="text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 hover:border-rose-300 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                >
                  + {preset}
                </button>
              ))}
            </div>

            {/* Deduction Rows */}
            {deductions.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                <p className="text-xs text-slate-500">
                  No deductions applied for this cycle (zero deductions).
                </p>
                <button
                  type="button"
                  onClick={() => handleAddDeduction()}
                  className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                >
                  + Add deduction row
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {deductions.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl"
                  >
                    <span className="text-[11px] font-bold text-slate-400 w-5 text-center">
                      #{index + 1}
                    </span>
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => handleUpdateDeduction(item.id, 'description', e.target.value)}
                      placeholder="e.g. Provident Fund (PF Contribution)"
                      className="flex-1 text-xs border border-slate-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-rose-500"
                    />
                    <div className="relative w-36">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">{currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.amount}
                        onChange={e => handleUpdateDeduction(item.id, 'amount', e.target.value)}
                        placeholder="0"
                        className="w-full text-xs font-mono font-bold pl-6 pr-2.5 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-rose-500 text-right"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeduction(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove deduction row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center justify-between p-2.5 bg-rose-50/50 rounded-xl border border-rose-100 text-xs">
                  <span className="font-bold text-rose-900">Total Deductions:</span>
                  <span className="font-black text-rose-900 text-sm">
                    -{currencySymbol}{formatCurrency(totalDeductions)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Transparent Salary Summary Card (Calculation Rules) */}
          <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Transparent Salary Calculation Summary
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {salaryMonth} • {currentEmployee.employeeCode}
              </span>
            </div>

            {/* Formula Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Fixed Base Salary</span>
                <span className="text-base font-bold text-white">{currencySymbol}{formatCurrency(fixedBaseSalary)}</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">Master Fixed</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Overtime Earnings</span>
                <span className="text-base font-bold text-emerald-400">+{currencySymbol}{formatCurrency(effectiveOvertimeSalary)}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {overtimeType === 'CALCULATED' ? `${overtimeHours || 0} hrs @ ${currencySymbol}${overtimeRatePerHour || 0}/hr` : 'Direct input'}
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Additional Expenses</span>
                <span className="text-base font-bold text-sky-400">+{currencySymbol}{formatCurrency(totalAdditionalExpenses)}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{additionalExpenses.length} approved item(s)</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Deductions</span>
                <span className="text-base font-bold text-rose-400">-{currencySymbol}{formatCurrency(totalDeductions)}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{deductions.length} deduction(s)</span>
              </div>
            </div>

            {/* Calculation Bottom Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-700/60 bg-black/20 -mx-4 -mb-4 p-4 rounded-b-2xl">
              <div>
                <span className="text-[11px] text-slate-300 block">
                  Gross Earnings = Base ({currencySymbol}{formatCurrency(fixedBaseSalary)}) + Overtime ({currencySymbol}{formatCurrency(effectiveOvertimeSalary)}) + Expenses ({currencySymbol}{formatCurrency(totalAdditionalExpenses)})
                </span>
                <span className="text-xs font-bold text-amber-200">
                  Gross Earnings: {currencySymbol}{formatCurrency(grossEarnings)}
                </span>
              </div>

              <div className="text-right sm:border-l sm:border-slate-700 sm:pl-5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 block">
                  Net Pay Payable (Gross - Deductions)
                </span>
                <span className="text-2xl font-black text-emerald-400 tracking-tight">
                  {currencySymbol}{formatCurrency(netPay)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 7: Payment Details & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Payslip Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Payslip['status'])}
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="GENERATED">GENERATED (Approved, Ready to Disburse)</option>
                <option value="PAID">PAID (Disbursed via Bank Transfer)</option>
                <option value="DRAFT">DRAFT (Under Review)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Disbursement Mode
              </label>
              <select
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value as Payslip['paymentMode'])}
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="NEFT/RTGS Bank Transfer">NEFT/RTGS Bank Transfer</option>
                <option value="UPI">UPI Direct Corporate</option>
                <option value="Cheque">Company Account Payee Cheque</option>
                <option value="Cash">Cash Voucher</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bank / UTR Reference No.
              </label>
              <input
                type="text"
                value={bankReferenceNo}
                onChange={e => setBankReferenceNo(e.target.value)}
                placeholder="e.g. HDFC2026090812345"
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Update Payslip' : 'Generate Payslip Voucher'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Odometer Photo Verification Preview Modal */}
      {fuelPreviewModalImg && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>{fuelPreviewModalImg.title}</span>
              </h4>
              <button
                type="button"
                onClick={() => setFuelPreviewModalImg(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Close photo preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-900/5 max-h-[70vh] overflow-auto">
              <img
                src={fuelPreviewModalImg.url}
                alt={fuelPreviewModalImg.title}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="p-3 bg-white border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setFuelPreviewModalImg(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
