import React, { useMemo } from 'react';
import { AttendanceRecord, Employee } from '../../types/solar';
import { attendanceBelongsToEmployee } from '../../utils/employeeMatching';
import { ReportFilterState, ReportCategoryMeta } from '../../types/reports';
import { exportToCSV } from '../../services/exportImport';
import { ReportFilterBar } from './ReportFilterBar';
import { CalendarCheck, MapPin, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';

const CHART_COLORS = [
  '#10b981', // Present (Emerald)
  '#3b82f6', // Field Visit (Blue)
  '#f59e0b', // Late (Amber)
  '#f97316', // Half Day (Orange)
  '#ef4444'  // Absent (Rose/Red)
];

interface MonthlyAttendanceReportProps {
  attendance: AttendanceRecord[];
  employees: Employee[];
  filters: ReportFilterState;
  onFilterChange: (updated: Partial<ReportFilterState>) => void;
  onFilterReset: () => void;
  meta: ReportCategoryMeta;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const MonthlyAttendanceReport: React.FC<MonthlyAttendanceReportProps> = ({
  attendance,
  employees,
  filters,
  onFilterChange,
  onFilterReset,
  meta,
  showToast
}) => {
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(e => map.set(e.id, e));
    return map;
  }, [employees]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter(rec => {
      const emp = employeeMap.get(rec.employeeId) || employees.find(e => attendanceBelongsToEmployee(rec, e));

      // Date filter
      if (filters.fromDate && rec.date < filters.fromDate) return false;
      if (filters.toDate && rec.date > filters.toDate) return false;

      // Name / Code / Location filter
      if (filters.name.trim()) {
        const query = filters.name.toLowerCase();
        const empName = (rec.employeeName || emp?.name || '').toLowerCase();
        const empCode = (emp?.employeeCode || '').toLowerCase();
        const loc = (rec.siteLocation || '').toLowerCase();
        const siteTitle = (rec.siteProjectTitle || '').toLowerCase();
        if (!empName.includes(query) && !empCode.includes(query) && !loc.includes(query) && !siteTitle.includes(query)) {
          return false;
        }
      }

      // Status filter
      if (filters.status && filters.status !== 'ALL') {
        if (rec.status !== filters.status) return false;
      }

      return true;
    });
  }, [attendance, filters, employeeMap]);

  // Aggregate KPIs
  const presentCount = filteredAttendance.filter(a => a.status === 'PRESENT').length;
  const fieldVisitCount = filteredAttendance.filter(a => a.status === 'FIELD VISIT').length;
  const lateOrHalfCount = filteredAttendance.filter(a => a.status === 'LATE' || a.status === 'HALF DAY').length;
  const absentCount = filteredAttendance.filter(a => a.status === 'ABSENT').length;

  // Status breakdown for chart
  const chartData = useMemo(() => {
    const map: Record<string, number> = {
      PRESENT: 0,
      'FIELD VISIT': 0,
      LATE: 0,
      'HALF DAY': 0,
      ABSENT: 0
    };
    filteredAttendance.forEach(a => {
      if (map[a.status] !== undefined) {
        map[a.status] += 1;
      }
    });
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [filteredAttendance]);

  const attendanceStatusShare = useMemo(() => {
    return chartData
      .map(d => ({ name: d.status, value: d.count }))
      .filter(d => d.value > 0);
  }, [chartData]);

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Employee Code',
      'Employee Name',
      'Department',
      'Status',
      'Check In Time',
      'Check Out Time',
      'Site / Location',
      'Project Title'
    ];
    const rows = filteredAttendance.map(rec => {
      const emp = employeeMap.get(rec.employeeId);
      return [
        rec.date,
        emp?.employeeCode || 'N/A',
        rec.employeeName || emp?.name || 'N/A',
        emp?.department || 'Operations',
        rec.status,
        rec.checkInTime || 'N/A',
        rec.checkOutTime || 'N/A',
        rec.siteLocation || 'HQ',
        rec.siteProjectTitle || '-'
      ];
    });
    exportToCSV(`SolarPulse_Attendance_Report_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    showToast('Attendance report exported to CSV', 'success');
  };

  const getStatusBadge = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'FIELD VISIT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'LATE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'HALF DAY':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ABSENT':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar
        filters={filters}
        onChange={onFilterChange}
        onReset={onFilterReset}
        onExportCSV={handleExportCSV}
        onPrint={() => window.print()}
        categoryMeta={meta}
        totalCount={attendance.length}
        filteredCount={filteredAttendance.length}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Present Logs</span>
            <span className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {presentCount} Logs
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Office & plant check-ins</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Field Visits</span>
            <span className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <MapPin className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">
            {fieldVisitCount} Visits
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Customer roof & ground site logs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Late / Half Day</span>
            <span className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">
            {lateOrHalfCount} Incidents
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Attendance deviations noted</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Absences Recorded</span>
            <span className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">
            {absentCount} Days
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Unexcused or leave absences</p>
        </div>
      </div>

      {/* Donut Chart: Attendance Status Share */}
      {attendanceStatusShare.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Attendance Status Share</h3>
          <p className="text-xs text-slate-500 mb-4">Proportion of logs across present, field visits, late arrivals, and leaves</p>
          <div className="h-64 sm:h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceStatusShare}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {attendanceStatusShare.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [val, 'Logs Count']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Attendance Log Register</h3>
            <p className="text-xs text-slate-500 mt-0.5">Daily timekeeping and field visit site tracking</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
            {filteredAttendance.length} Logs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Check In</th>
                <th className="py-3 px-4">Check Out</th>
                <th className="py-3 px-4">Site / Location</th>
                <th className="py-3 px-4">Project Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CalendarCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No attendance records found matching filters</p>
                  </td>
                </tr>
              ) : (
                filteredAttendance.map(rec => {
                  const emp = employeeMap.get(rec.employeeId);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-900">{rec.date}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {rec.employeeName || emp?.name || 'Unknown'}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {emp?.employeeCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{emp?.department || '-'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border ${getStatusBadge(
                            rec.status
                          )}`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">{rec.checkInTime || '-'}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">{rec.checkOutTime || '-'}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{rec.siteLocation || 'Office HQ'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] truncate max-w-[180px]">
                        {rec.siteProjectTitle || '-'}
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
  );
};
