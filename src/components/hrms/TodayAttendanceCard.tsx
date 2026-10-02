import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storage';
import { AttendanceRecord, DailyFuelExpense } from '../../types/solar';
import { attendanceBelongsToEmployee, findEmployeeForUser } from '../../utils/employeeMatching';
import {
  Play,
  Square,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
  AlertCircle,
  RotateCcw,
  ArrowRight,
  Sun,
  ShieldCheck,
  Check,
  Fuel,
  Gauge,
  Camera,
  UploadCloud,
  Trash2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  ExternalLink,
  X
} from 'lucide-react';

interface TodayAttendanceCardProps {
  className?: string;
  onPunchSuccess?: (type: 'CHECK_IN' | 'CHECK_OUT', record: AttendanceRecord) => void;
}

// Helper to compute duration string like "8h 15m" or "45m"
function calculateWorkDuration(
  checkInTimeStr: string,
  checkOutTimeStr?: string,
  dateStr?: string
): { text: string; hours: number } {
  try {
    const today = dateStr || new Date().toISOString().slice(0, 10);

    const parseTime = (timeStr: string): Date => {
      const d = new Date(`${today}T00:00:00`);
      const match = timeStr.match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
      if (!match) return new Date();
      let hour = parseInt(match[1], 10);
      const min = parseInt(match[2], 10);
      const ampm = match[3] ? match[3].toUpperCase() : null;
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      d.setHours(hour, min, 0, 0);
      return d;
    };

    const inDate = parseTime(checkInTimeStr);
    const outDate = checkOutTimeStr ? parseTime(checkOutTimeStr) : new Date();

    let diffMs = outDate.getTime() - inDate.getTime();
    if (diffMs < 0) diffMs = Math.abs(diffMs);

    const totalMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    let text = '';
    if (hours === 0) {
      text = `${mins}m`;
    } else if (mins === 0) {
      text = `${hours}h`;
    } else {
      text = `${hours}h ${mins}m`;
    }

    const decimalHours = parseFloat((totalMinutes / 60).toFixed(2));
    return { text, hours: decimalHours };
  } catch (_e) {
    return { text: '8h 00m', hours: 8 };
  }
}

export const TodayAttendanceCard: React.FC<TodayAttendanceCardProps> = ({
  className = '',
  onPunchSuccess
}) => {
  const { currentUser, currentRole } = useAuth();
  const { triggerRefresh, showToast, refreshTrigger } = useApp();

  // Strictly do not show on Admin Dashboard or for Admin users
  if (currentRole === 'Admin' || currentUser?.role === 'Admin') {
    return null;
  }

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'IN' | 'OUT' | null>(null);
  const [currentTimeText, setCurrentTimeText] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Formatted date string for humans
  const todayReadable = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  // Fetch employee directory & resolve current user to their HR employee record
  const employees = useMemo(() => {
    return storageService.getEmployees();
  }, [refreshTrigger]);

  const matchedEmployee = useMemo(() => {
    return findEmployeeForUser(currentUser, employees);
  }, [currentUser, employees]);

  // Fetch today's record for this user from storage
  const attendanceList = useMemo(() => {
    return storageService.getAttendance();
  }, [refreshTrigger]);

  const todayRecord = useMemo(() => {
    const userId = currentUser?.id;
    const userName = currentUser?.name;
    return attendanceList.find(a => {
      if (a.date !== todayStr) return false;
      if (matchedEmployee && attendanceBelongsToEmployee(a, matchedEmployee)) return true;
      if (userId && (a.employeeId === userId || a.authUid === userId)) return true;
      if (userName && a.employeeName.trim().toLowerCase() === userName.trim().toLowerCase()) return true;
      return false;
    }) || null;
  }, [attendanceList, matchedEmployee, currentUser, todayStr]);

  // Derived state:
  // 1. 'NOT_STARTED': no check-in today
  // 2. 'WORKING': checked in, but not checked out
  // 3. 'COMPLETED': checked out today
  const attendanceState: 'NOT_STARTED' | 'WORKING' | 'COMPLETED' = useMemo(() => {
    if (!todayRecord || !todayRecord.checkInTime) {
      return 'NOT_STARTED';
    }
    if (todayRecord.checkInTime && !todayRecord.checkOutTime) {
      return 'WORKING';
    }
    return 'COMPLETED';
  }, [todayRecord]);

  // Live elapsed time ticker when in 'WORKING' state
  const [elapsedDurationText, setElapsedDurationText] = useState('');

  // Daily Fuel / Mileage Log state
  const [initialOdo, setInitialOdo] = useState<string>('');
  const [finalOdo, setFinalOdo] = useState<string>('');
  const [initialOdoImg, setInitialOdoImg] = useState<string>('');
  const [initialOdoImgName, setInitialOdoImgName] = useState<string>('');
  const [finalOdoImg, setFinalOdoImg] = useState<string>('');
  const [finalOdoImgName, setFinalOdoImgName] = useState<string>('');
  const [isFuelSectionOpen, setIsFuelSectionOpen] = useState<boolean>(true);
  const [previewModalImg, setPreviewModalImg] = useState<{ url: string; title: string } | null>(null);
  const [fuelError, setFuelError] = useState<string | null>(null);

  // Sync state with today's attendance record
  useEffect(() => {
    if (todayRecord?.fuelExpense) {
      const fe = todayRecord.fuelExpense;
      setInitialOdo(fe.initialOdometerReading !== undefined ? String(fe.initialOdometerReading) : '');
      setFinalOdo(fe.finalOdometerReading !== undefined ? String(fe.finalOdometerReading) : '');
      setInitialOdoImg(fe.initialOdometerImageUrl || '');
      setInitialOdoImgName(fe.initialOdometerImageName || '');
      setFinalOdoImg(fe.finalOdometerImageUrl || '');
      setFinalOdoImgName(fe.finalOdometerImageName || '');
    } else {
      setInitialOdo('');
      setFinalOdo('');
      setInitialOdoImg('');
      setInitialOdoImgName('');
      setFinalOdoImg('');
      setFinalOdoImgName('');
    }
    setFuelError(null);
  }, [todayRecord]);

  // Real-time calculation of KM driven
  const calculatedKm = useMemo(() => {
    const init = parseFloat(initialOdo);
    const fin = parseFloat(finalOdo);
    if (!isNaN(init) && !isNaN(fin) && fin >= init) {
      return parseFloat((fin - init).toFixed(1));
    }
    return null;
  }, [initialOdo, finalOdo]);

  // Handle uploading / capturing odometer photo
  const handleUploadOdoPhoto = (e: React.ChangeEvent<HTMLInputElement>, type: 'INITIAL' | 'FINAL') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFuelError('Photo exceeds the 5 MB limit. Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (type === 'INITIAL') {
        setInitialOdoImg(dataUrl);
        setInitialOdoImgName(file.name);
      } else {
        setFinalOdoImg(dataUrl);
        setFinalOdoImgName(file.name);
      }
      setFuelError(null);
    };
    reader.onerror = () => {
      setFuelError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Direct save/update for fuel log
  const handleSaveFuelLog = () => {
    if (!todayRecord) {
      showToast('Please start work first before logging fuel readings.', 'info');
      return;
    }

    const init = initialOdo.trim() ? parseFloat(initialOdo) : undefined;
    const fin = finalOdo.trim() ? parseFloat(finalOdo) : undefined;

    if (init !== undefined && fin !== undefined && fin < init) {
      setFuelError('Final odometer reading cannot be less than initial reading.');
      return;
    }

    const kmDriven = (init !== undefined && fin !== undefined && fin >= init)
      ? parseFloat((fin - init).toFixed(1))
      : undefined;

    const fuelExpense: DailyFuelExpense = {
      initialOdometerReading: init,
      finalOdometerReading: fin,
      totalKmDriven: kmDriven,
      initialOdometerImageUrl: initialOdoImg || undefined,
      initialOdometerImageName: initialOdoImgName || undefined,
      finalOdometerImageUrl: finalOdoImg || undefined,
      finalOdometerImageName: finalOdoImgName || undefined,
      submittedAt: todayRecord.fuelExpense?.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const canonicalEmpId = matchedEmployee?.id || todayRecord.employeeId || currentUser?.id || 'emp-user';
    const canonicalEmpName = matchedEmployee?.name || todayRecord.employeeName || currentUser?.name || 'Solar Team Member';
    const canonicalEmpCode = matchedEmployee?.employeeCode || todayRecord.employeeCode || currentUser?.employeeId;
    const canonicalEmpEmail = matchedEmployee?.email || todayRecord.employeeEmail || currentUser?.email;
    const authUid = todayRecord.authUid || currentUser?.id;

    const updated: AttendanceRecord = {
      ...todayRecord,
      employeeId: canonicalEmpId,
      employeeName: canonicalEmpName,
      authUid,
      employeeCode: canonicalEmpCode,
      employeeEmail: canonicalEmpEmail,
      fuelExpense
    };

    storageService.saveAttendanceRecord(updated);
    triggerRefresh();
    setFuelError(null);
    showToast(
      kmDriven !== undefined
        ? `Daily fuel log saved: ${kmDriven} km recorded for payroll reimbursement! 🚗`
        : 'Daily odometer readings saved!',
      'success'
    );
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeText(
        now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
      );

      if (attendanceState === 'WORKING' && todayRecord?.checkInTime) {
        const { text } = calculateWorkDuration(todayRecord.checkInTime, undefined, todayStr);
        setElapsedDurationText(text);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [attendanceState, todayRecord, todayStr]);

  // Geolocation acquisition handler
  const acquireLocation = useCallback(async (): Promise<{
    latitude: number;
    longitude: number;
    locationName: string;
  }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        // Fallback site fix if browser does not support geolocation
        resolve({
          latitude: 22.9868,
          longitude: 72.3789,
          locationName: 'Central Solar EPC Site (GPS Simulated Fix)'
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          const lat = parseFloat(position.coords.latitude.toFixed(5));
          const lng = parseFloat(position.coords.longitude.toFixed(5));
          resolve({
            latitude: lat,
            longitude: lng,
            locationName: `Site Lat: ${position.coords.latitude.toFixed(4)}°, Lng: ${position.coords.longitude.toFixed(4)}°`
          });
        },
        error => {
          console.warn('Geolocation capture notice:', error.message);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 9000,
          maximumAge: 30000
        }
      );
    });
  }, []);

  // Trigger Punch In
  const handleStartWork = async (useFallbackCoordinates = false) => {
    if (attendanceState !== 'NOT_STARTED') return; // Prevent duplicate punches

    setIsLocating(true);
    setLocationError(null);
    setPendingAction('IN');

    try {
      let gpsCoords = {
        latitude: 22.9868,
        longitude: 72.3789,
        locationName: 'Ahmedabad Solar Operations Hub'
      };

      if (!useFallbackCoordinates) {
        try {
          gpsCoords = await acquireLocation();
        } catch (_err) {
          setIsLocating(false);
          setLocationError(
            'We couldn’t find your location. Please turn on your device GPS or grant location permission.'
          );
          return;
        }
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

      const init = initialOdo.trim() ? parseFloat(initialOdo) : undefined;
      const fuelExpense: DailyFuelExpense | undefined = (init !== undefined || initialOdoImg) ? {
        initialOdometerReading: init,
        initialOdometerImageUrl: initialOdoImg || undefined,
        initialOdometerImageName: initialOdoImgName || undefined,
        submittedAt: new Date().toISOString()
      } : undefined;

      const canonicalEmpId = matchedEmployee?.id || currentUser?.id || 'emp-user';
      const canonicalEmpName = matchedEmployee?.name || currentUser?.name || 'Solar Team Member';
      const canonicalEmpCode = matchedEmployee?.employeeCode || currentUser?.employeeId;
      const canonicalEmpEmail = matchedEmployee?.email || currentUser?.email;

      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        employeeId: canonicalEmpId,
        employeeName: canonicalEmpName,
        authUid: currentUser?.id,
        employeeCode: canonicalEmpCode,
        employeeEmail: canonicalEmpEmail,
        date: todayStr,
        checkInTime: timeStr,
        checkInGps: `${gpsCoords.latitude}, ${gpsCoords.longitude}`,
        gpsCheckIn: {
          latitude: gpsCoords.latitude,
          longitude: gpsCoords.longitude,
          locationName: gpsCoords.locationName
        },
        siteLocation: gpsCoords.locationName || 'Live GPS Punch In',
        status: 'PRESENT',
        fuelExpense
      };

      storageService.saveAttendanceRecord(newRecord);
      triggerRefresh();
      setIsLocating(false);
      setLocationError(null);
      setPendingAction(null);

      showToast(`Started work at ${timeStr}! Have a safe & productive shift. 🚀`, 'success');
      if (onPunchSuccess) onPunchSuccess('CHECK_IN', newRecord);
    } catch (err: any) {
      setIsLocating(false);
      setLocationError('Unable to record start time. Please try again.');
    }
  };

  // Trigger Punch Out
  const handleFinishWork = async (useFallbackCoordinates = false) => {
    if (attendanceState !== 'WORKING' || !todayRecord) return; // Prevent duplicate or invalid punches

    setIsLocating(true);
    setLocationError(null);
    setPendingAction('OUT');

    try {
      let gpsCoords = {
        latitude: 22.9868,
        longitude: 72.3789,
        locationName: 'Ahmedabad Solar Operations Hub'
      };

      if (!useFallbackCoordinates) {
        try {
          gpsCoords = await acquireLocation();
        } catch (_err) {
          setIsLocating(false);
          setLocationError(
            'We couldn’t find your location. Please turn on your device GPS or grant location permission.'
          );
          return;
        }
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

      const { text: durationText, hours: decimalHours } = calculateWorkDuration(
        todayRecord.checkInTime,
        timeStr,
        todayStr
      );

      const init = initialOdo.trim() ? parseFloat(initialOdo) : todayRecord.fuelExpense?.initialOdometerReading;
      const fin = finalOdo.trim() ? parseFloat(finalOdo) : undefined;
      const kmDriven = (init !== undefined && fin !== undefined && fin >= init)
        ? parseFloat((fin - init).toFixed(1))
        : todayRecord.fuelExpense?.totalKmDriven;

      const fuelExpense: DailyFuelExpense | undefined = (init !== undefined || fin !== undefined || initialOdoImg || finalOdoImg) ? {
        ...todayRecord.fuelExpense,
        initialOdometerReading: init,
        initialOdometerImageUrl: initialOdoImg || todayRecord.fuelExpense?.initialOdometerImageUrl,
        initialOdometerImageName: initialOdoImgName || todayRecord.fuelExpense?.initialOdometerImageName,
        finalOdometerReading: fin,
        finalOdometerImageUrl: finalOdoImg || todayRecord.fuelExpense?.finalOdometerImageUrl,
        finalOdometerImageName: finalOdoImgName || todayRecord.fuelExpense?.finalOdometerImageName,
        totalKmDriven: kmDriven,
        updatedAt: new Date().toISOString()
      } : todayRecord.fuelExpense;

      const canonicalEmpId = matchedEmployee?.id || todayRecord.employeeId || currentUser?.id || 'emp-user';
      const canonicalEmpName = matchedEmployee?.name || todayRecord.employeeName || currentUser?.name || 'Solar Team Member';
      const canonicalEmpCode = matchedEmployee?.employeeCode || todayRecord.employeeCode || currentUser?.employeeId;
      const canonicalEmpEmail = matchedEmployee?.email || todayRecord.employeeEmail || currentUser?.email;
      const authUid = todayRecord.authUid || currentUser?.id;

      const updatedRecord: AttendanceRecord = {
        ...todayRecord,
        employeeId: canonicalEmpId,
        employeeName: canonicalEmpName,
        authUid,
        employeeCode: canonicalEmpCode,
        employeeEmail: canonicalEmpEmail,
        checkOutTime: timeStr,
        checkOutGps: `${gpsCoords.latitude}, ${gpsCoords.longitude}`,
        gpsCheckOut: {
          latitude: gpsCoords.latitude,
          longitude: gpsCoords.longitude,
          locationName: gpsCoords.locationName
        },
        totalHours: decimalHours,
        totalDurationText: durationText,
        fuelExpense
      };

      storageService.saveAttendanceRecord(updatedRecord);
      triggerRefresh();
      setIsLocating(false);
      setLocationError(null);
      setPendingAction(null);

      showToast(`All done! You worked ${durationText} 🎉`, 'success');
      if (onPunchSuccess) onPunchSuccess('CHECK_OUT', updatedRecord);
    } catch (_err) {
      setIsLocating(false);
      setLocationError('Unable to record finish time. Please try again.');
    }
  };

  // Work completed duration for display in state 3
  const finalDurationText = useMemo(() => {
    if (!todayRecord || !todayRecord.checkInTime || !todayRecord.checkOutTime) return '8h 00m';
    if (todayRecord.totalDurationText) return todayRecord.totalDurationText;
    const { text } = calculateWorkDuration(
      todayRecord.checkInTime,
      todayRecord.checkOutTime,
      todayRecord.date
    );
    return text;
  }, [todayRecord]);

  return (
    <div
      className={`bg-white rounded-3xl p-5 sm:p-7 border-2 border-slate-200/90 shadow-sm transition-all relative overflow-hidden ${className}`}
    >
      {/* Decorative top accent line */}
      <div
        className={`absolute top-0 left-0 right-0 h-2 ${
          attendanceState === 'NOT_STARTED'
            ? 'bg-emerald-500'
            : attendanceState === 'WORKING'
            ? 'bg-amber-500'
            : 'bg-emerald-600'
        }`}
      />

      {/* Header section with identity and current date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Sun className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Today's Attendance
              </h2>
              <p className="text-xs text-slate-500 font-medium">{todayReadable}</p>
            </div>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="self-start sm:self-auto">
          {attendanceState === 'NOT_STARTED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Not Started Yet</span>
            </span>
          )}

          {attendanceState === 'WORKING' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Working Now ⚡</span>
            </span>
          )}

          {attendanceState === 'COMPLETED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Shift Completed</span>
            </span>
          )}
        </div>
      </div>

      {/* 2-Step Visual: 1. Start Work → 2. Finish Work */}
      <div className="bg-slate-50 rounded-2xl p-3 sm:p-3.5 border border-slate-200 mb-6 select-none">
        <div className="flex items-center justify-between gap-2">
          {/* Step 1: Start Work */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                attendanceState === 'NOT_STARTED'
                  ? 'bg-green-600 text-white shadow-xs'
                  : 'bg-green-100 text-green-800 border border-green-300'
              }`}
            >
              {attendanceState === 'NOT_STARTED' ? '1' : <Check className="w-4 h-4 stroke-[3]" />}
            </div>
            <span
              className={`text-sm sm:text-base font-bold truncate ${
                attendanceState === 'NOT_STARTED' ? 'text-green-700' : 'text-slate-700'
              }`}
            >
              1. Start Work
            </span>
          </div>

          {/* Stepper Arrow */}
          <div className="px-2 text-slate-400 shrink-0 font-bold text-sm sm:text-base">
            →
          </div>

          {/* Step 2: Finish Work */}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end sm:justify-start">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                attendanceState === 'COMPLETED'
                  ? 'bg-green-600 text-white shadow-xs'
                  : attendanceState === 'WORKING'
                  ? 'bg-orange-500 text-white shadow-xs animate-bounce'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {attendanceState === 'COMPLETED' ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
            </div>
            <span
              className={`text-sm sm:text-base font-bold truncate ${
                attendanceState === 'WORKING'
                  ? 'text-orange-600'
                  : attendanceState === 'COMPLETED'
                  ? 'text-slate-700'
                  : 'text-slate-400'
              }`}
            >
              2. Finish Work
            </span>
          </div>
        </div>
      </div>

      {/* Location Finding Loading State */}
      {isLocating && (
        <div className="p-6 sm:p-8 bg-amber-50 border-2 border-dashed border-amber-300 rounded-3xl flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in zoom-in-95">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 animate-ping absolute inset-0" />
            <div className="w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 relative z-10">
              <MapPin className="w-8 h-8 animate-bounce" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Finding your location…
            </h3>
          </div>
        </div>
      )}

      {/* Location Error State with "Try again" Option */}
      {!isLocating && locationError && (
        <div className="p-5 sm:p-6 bg-rose-50 border-2 border-rose-200 rounded-3xl space-y-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-2xl shrink-0 mt-0.5">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-rose-900">{locationError}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => {
                if (pendingAction === 'IN') handleStartWork(false);
                else if (pendingAction === 'OUT') handleFinishWork(false);
              }}
              className="w-full sm:w-auto px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try again</span>
            </button>

            <button
              onClick={() => {
                if (pendingAction === 'IN') handleStartWork(true);
                else if (pendingAction === 'OUT') handleFinishWork(true);
              }}
              className="w-full sm:w-auto px-5 py-3.5 bg-white text-slate-700 hover:bg-slate-100 font-bold text-sm rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-amber-600" />
              <span>Use site location</span>
            </button>
          </div>
        </div>
      )}

      {/* ONE LARGE ACTION AT A TIME (Only shown when not loading location or handling error) */}
      {!isLocating && !locationError && (
        <>
          {/* STATE 1: Before Work (One Big Green Button "Start Work" ▶) */}
          {attendanceState === 'NOT_STARTED' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handleStartWork(false)}
                className="w-full min-h-[76px] sm:min-h-[84px] bg-green-600 hover:bg-green-500 active:scale-[0.98] text-white font-black text-2xl sm:text-3xl rounded-2xl shadow-xl shadow-green-600/30 flex items-center justify-center gap-3 transition-all cursor-pointer border-2 border-green-500"
              >
                <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current translate-x-0.5" />
                <span>Start Work</span>
              </button>
            </div>
          )}

          {/* STATE 2: After Punching In (Show "Started at 9:00 AM" and One Big Orange Button "Finish Work" ■) */}
          {attendanceState === 'WORKING' && todayRecord && (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50/80 border-2 border-orange-200 rounded-2xl text-center">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Started at <span className="text-orange-600 font-mono">{todayRecord.checkInTime}</span>
                </span>
              </div>

              {/* Big Orange "Finish Work" Button with ■ Icon */}
              <button
                type="button"
                onClick={() => handleFinishWork(false)}
                className="w-full min-h-[76px] sm:min-h-[84px] bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-black text-2xl sm:text-3xl rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-center gap-3 transition-all cursor-pointer border-2 border-orange-400"
              >
                <Square className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                <span>Finish Work</span>
              </button>
            </div>
          )}

          {/* STATE 3: After Punching Out (Success message: "All done! You worked 8h 15m 🎉") */}
          {attendanceState === 'COMPLETED' && todayRecord && (
            <div className="space-y-4">
              <div className="p-6 sm:p-8 bg-emerald-50 border-2 border-emerald-300 rounded-3xl text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-600/25">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
                  All done! You worked {finalDurationText} 🎉
                </h3>

                <div className="text-xs sm:text-sm font-semibold text-emerald-800">
                  Started {todayRecord.checkInTime} • Finished {todayRecord.checkOutTime}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* Daily Fuel Expenses & Mileage Reimbursement Log                           */}
      {/* ========================================================================= */}
      <div className="mt-6 pt-5 border-t border-slate-200 select-none">
        <div className="bg-linear-to-b from-amber-50/50 to-orange-50/20 rounded-2xl border border-amber-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Fuel className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>Daily Fuel & Mileage Log</span>
                  {calculatedKm !== null && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                      <span>🚗 {calculatedKm} km driven</span>
                    </span>
                  )}
                  {todayRecord?.fuelExpense?.totalKmDriven && calculatedKm === null && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                      <span>🚗 {todayRecord.fuelExpense.totalKmDriven} km recorded</span>
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Record vehicle odometer readings with photo verification for HR travel reimbursement.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFuelSectionOpen(!isFuelSectionOpen)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-amber-100/50 rounded-lg transition-colors cursor-pointer"
              aria-label={isFuelSectionOpen ? 'Collapse Fuel Log' : 'Expand Fuel Log'}
            >
              {isFuelSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isFuelSectionOpen && (
            <div className="space-y-4 pt-1 animate-in fade-in">
              {/* Odometer Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Morning / Initial Odometer Card */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-amber-600" />
                      <span>Start of Shift (Morning)</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Start Odo</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Initial Reading (km)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={initialOdo}
                      onChange={e => {
                        setInitialOdo(e.target.value);
                        setFuelError(null);
                      }}
                      placeholder="e.g. 14210"
                      className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Initial Photo upload / preview */}
                  <div>
                    <span className="block text-[11px] font-medium text-slate-600 mb-1">
                      Start Odometer Photo
                    </span>
                    {initialOdoImg ? (
                      <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setPreviewModalImg({ url: initialOdoImg, title: 'Start Odometer Photo' })}
                          className="flex items-center gap-2 text-left min-w-0 group cursor-pointer"
                        >
                          <img
                            src={initialOdoImg}
                            alt="Start Odometer"
                            className="w-9 h-9 object-cover rounded-lg border border-slate-200 group-hover:opacity-80 transition-opacity shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-800 truncate block group-hover:text-amber-600 transition-colors">
                              {initialOdoImgName || 'start_odometer.jpg'}
                            </span>
                            <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>View Photo</span>
                            </span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInitialOdoImg('');
                            setInitialOdoImgName('');
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          aria-label="Remove start photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-slate-300 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/50 rounded-xl text-xs font-semibold text-slate-600 hover:text-amber-800 transition-colors cursor-pointer">
                        <Camera className="w-3.5 h-3.5 text-amber-600" />
                        <span>Upload Morning Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleUploadOdoPhoto(e, 'INITIAL')}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Evening / Final Odometer Card */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-orange-600" />
                      <span>End of Shift (Evening)</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">End Odo</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Final Reading (km)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={finalOdo}
                      onChange={e => {
                        setFinalOdo(e.target.value);
                        setFuelError(null);
                      }}
                      placeholder="e.g. 14258"
                      className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Final Photo upload / preview */}
                  <div>
                    <span className="block text-[11px] font-medium text-slate-600 mb-1">
                      End Odometer Photo
                    </span>
                    {finalOdoImg ? (
                      <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setPreviewModalImg({ url: finalOdoImg, title: 'End Odometer Photo' })}
                          className="flex items-center gap-2 text-left min-w-0 group cursor-pointer"
                        >
                          <img
                            src={finalOdoImg}
                            alt="End Odometer"
                            className="w-9 h-9 object-cover rounded-lg border border-slate-200 group-hover:opacity-80 transition-opacity shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-800 truncate block group-hover:text-amber-600 transition-colors">
                              {finalOdoImgName || 'end_odometer.jpg'}
                            </span>
                            <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>View Photo</span>
                            </span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFinalOdoImg('');
                            setFinalOdoImgName('');
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          aria-label="Remove end photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-slate-300 hover:border-orange-400 bg-slate-50 hover:bg-orange-50/50 rounded-xl text-xs font-semibold text-slate-600 hover:text-orange-800 transition-colors cursor-pointer">
                        <Camera className="w-3.5 h-3.5 text-orange-600" />
                        <span>Upload Evening Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleUploadOdoPhoto(e, 'FINAL')}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {fuelError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{fuelError}</span>
                </div>
              )}

              {/* Dynamic Calculation Strip & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-amber-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">
                    {calculatedKm !== null ? (
                      <span className="text-slate-900 font-medium">
                        Total Distance: <strong className="font-mono text-emerald-700 text-sm">{calculatedKm} km</strong>
                        <span className="text-slate-400 ml-2">(@ ₹5.00/km standard: ~₹{Math.round(calculatedKm * 5)})</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">
                        Enter both initial and final odometer readings to calculate daily mileage.
                      </span>
                    )}
                  </span>
                </div>

                {todayRecord && (
                  <button
                    type="button"
                    onClick={handleSaveFuelLog}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer self-end sm:self-auto shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Fuel Log</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Odometer Photo Preview Modal */}
      {previewModalImg && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>{previewModalImg.title}</span>
              </h4>
              <button
                type="button"
                onClick={() => setPreviewModalImg(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Close photo preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-900/5 max-h-[70vh] overflow-auto">
              <img
                src={previewModalImg.url}
                alt={previewModalImg.title}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="p-3 bg-white border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setPreviewModalImg(null)}
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
