import { AttendanceRecord, Employee, UserProfile } from '../types/solar';

/**
 * Determines whether an attendance record belongs to a selected Employee.
 *
 * Implements a single, strongly-typed employee-identity matching strategy supporting
 * valid identity mappings in strict priority order:
 *
 * 1. attendance.employeeId === employee.id
 * 2. attendance.employeeId === employee.authUid, when authUid exists
 * 3. attendance.employeeId === employee.employeeCode, when needed for older records
 * 4. A normalized email or employee-code match only when those values are available in the attendance data
 * 5. Name matching only as a carefully documented backward-compatible fallback for legacy records,
 *    using normalized trim/lowercase comparison
 */
export function attendanceBelongsToEmployee(
  attendance: AttendanceRecord,
  employee: Employee
): boolean {
  if (!attendance || !employee) return false;

  const attEmpId = (attendance.employeeId || '').trim();
  const empId = (employee.id || '').trim();

  // 1. Primary stable ID: attendance.employeeId === employee.id
  if (attEmpId && empId && attEmpId === empId) {
    return true;
  }

  // 2. Authentication UID: attendance.employeeId === employee.authUid, when authUid exists
  const empAuthUid = (employee.authUid || '').trim();
  if (empAuthUid) {
    if (attEmpId && attEmpId === empAuthUid) {
      return true;
    }
  }

  // Also support attendance.authUid === employee.authUid or attendance.authUid === employee.id
  const attAuthUid = (attendance.authUid || '').trim();
  if (attAuthUid) {
    if (empAuthUid && attAuthUid === empAuthUid) {
      return true;
    }
    if (empId && attAuthUid === empId) {
      return true;
    }
  }

  // 3. Employee Code as employeeId: attendance.employeeId === employee.employeeCode (older records)
  const empCode = (employee.employeeCode || '').trim().toUpperCase();
  if (attEmpId && empCode && attEmpId.toUpperCase() === empCode) {
    return true;
  }

  // 4. Normalized email or employee-code match only when those values are available in the attendance data
  const attCode = (attendance.employeeCode || '').trim().toUpperCase();
  if (attCode && empCode && attCode === empCode) {
    return true;
  }

  const attEmail = (attendance.employeeEmail || '').trim().toLowerCase();
  const empEmail = (employee.email || '').trim().toLowerCase();
  if (attEmail && empEmail && attEmail === empEmail) {
    return true;
  }

  // If attendance.employeeId was stored as an email address in legacy punch logs
  if (attEmpId && attEmpId.includes('@') && empEmail) {
    if (attEmpId.toLowerCase() === empEmail) {
      return true;
    }
  }

  // 5. Name matching only as a carefully documented backward-compatible fallback for legacy records,
  // using normalized trim/lowercase comparison.
  // Note: Names are not guaranteed to be unique across a growing organization,
  // so this comparison is strictly evaluated as a final legacy fallback after all stable IDs.
  const attName = (attendance.employeeName || '').trim().toLowerCase();
  const empName = (employee.name || '').trim().toLowerCase();
  if (attName && empName && attName === empName) {
    return true;
  }

  return false;
}

/**
 * Filter an array of attendance records for a specific employee using the canonical identity matching strategy.
 */
export function filterAttendanceForEmployee(
  attendanceList: AttendanceRecord[],
  employee: Employee
): AttendanceRecord[] {
  if (!attendanceList || !employee) return [];
  return attendanceList.filter(record => attendanceBelongsToEmployee(record, employee));
}

/**
 * Resolves the HR Employee master record associated with a currently logged-in user profile.
 * Supports ID, authUid, employeeCode, email, and persona role mappings.
 */
export function findEmployeeForUser(
  user: UserProfile | null | undefined,
  employees: Employee[]
): Employee | undefined {
  if (!user || !employees || employees.length === 0) return undefined;

  const userId = (user.id || '').trim();
  const userEmail = (user.email || '').trim().toLowerCase();
  const userEmpCode = (user.employeeId || '').trim().toUpperCase();
  const userName = (user.name || '').trim().toLowerCase();

  // 1. Direct ID match: user.id === employee.id
  if (userId) {
    const byId = employees.find(e => e.id && e.id.trim() === userId);
    if (byId) return byId;
  }

  // 2. Auth UID match: user.id === employee.authUid
  if (userId) {
    const byAuthUid = employees.find(e => e.authUid && e.authUid.trim() === userId);
    if (byAuthUid) return byAuthUid;
  }

  // 3. Employee Code match: user.employeeId === employee.employeeCode
  if (userEmpCode) {
    const byCode = employees.find(
      e => e.employeeCode && e.employeeCode.trim().toUpperCase() === userEmpCode
    );
    if (byCode) return byCode;
  }

  // 4. Normalized Email match
  if (userEmail) {
    const byEmail = employees.find(
      e => e.email && e.email.trim().toLowerCase() === userEmail
    );
    if (byEmail) return byEmail;
  }

  // 5. Normalized Name match
  if (userName) {
    const byName = employees.find(
      e => e.name && e.name.trim().toLowerCase() === userName
    );
    if (byName) return byName;
  }

  // 6. Role-based fallback for standard predefined demo accounts
  if (user.role) {
    const byRole = employees.find(
      e => (e.systemRole === user.role || e.assignedRole === user.role) && e.status !== 'TERMINATED'
    );
    if (byRole) return byRole;
  }

  return undefined;
}
