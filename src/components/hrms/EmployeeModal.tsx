import React, { useState, useEffect, useRef } from 'react';
import { Employee, UserRole, UserProfile, EmployeeDocument, EmployeeDocumentCategory } from '../../types/solar';
import {
  X,
  UserPlus,
  Save,
  AlertCircle,
  Building2,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Image,
  MapPin,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  FileText,
  UploadCloud,
  Download,
  ExternalLink,
  Trash2,
  FileCheck
} from 'lucide-react';
import { validateEmployee, DuplicateRecordError } from '../../services/validation';
import { provisionEmployeeAccount, updateEmployeeAccount } from '../../services/adminAuthService';
import { useAuth, DEMO_DEFAULT_PASSWORD } from '../../context/AuthContext';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void | Promise<void>;
  employeeToEdit?: Employee | null;
  existingEmployees: Employee[];
}

const DEPARTMENTS: Employee['department'][] = [
  'Management',
  'Sales',
  'Engineering',
  'Civil',
  'Structure',
  'Electrical',
  'Operations',
  'Finance',
  'HR',
  'Service',
  'Installation'
];

const STATUSES: Employee['status'][] = [
  'ACTIVE',
  'ON LEAVE',
  'IN FIELD',
  'TERMINATED'
];

const SYSTEM_ROLES: { role: UserRole; description: string }[] = [
  { role: 'Admin', description: 'Complete system access, user management, financial approvals & administrative control' },
  { role: 'Project Manager', description: 'Gantt schedules, milestone tracking, resource & stage execution' },
  { role: 'Site Survey Engineer', description: 'Site audits, solar radiance, roof load & shadow analysis' },
  { role: 'Site Inspector', description: 'Site quality inspections, installation audits, safety compliance & stage sign-offs' },
  { role: 'Sales Manager', description: 'Pipeline analytics, commercial quoting & team targets' },
  { role: 'Sales Executive', description: 'Lead capture, site feasibility & customer proposals' },
  { role: 'Electrical Team', description: 'Single line diagrams, HT/LT panels, string cabling & inverters' },
  { role: 'Installation Team', description: 'Module mounting, module leveling & field mechanical arrays' },
  { role: 'Structure Team', description: 'Civil foundation, MMS fabrication & wind shear compliance' },
  { role: 'Civil Team', description: 'Pedestal casting, roof penetrations & civil structural safety' },
  { role: 'Accountant', description: 'Tally synchronization, GST billing, milestone receipts & expenses' },
  { role: 'HR Manager', description: 'Attendance logs, employee onboarding & monthly payroll cycles' },
  { role: 'Service Manager', description: 'O&M warranty tickets, inverter alarms & AMC contracts' },
  { role: 'Technician', description: 'Field diagnostics, string testing & preventive maintenance' }
];

function getDefaultSystemRole(dept: string, desig: string): UserRole {
  const d = (dept || '').toLowerCase();
  const title = (desig || '').toLowerCase();
  if (title.includes('director') || title.includes('admin')) return 'Admin';
  if (d === 'management' || d === 'administration') return 'Admin';
  if (title.includes('inspector') || title.includes('quality') || title.includes('audit')) return 'Site Inspector';
  if (d === 'sales') {
    return title.includes('manager') ? 'Sales Manager' : 'Sales Executive';
  }
  if (d === 'engineering') return 'Site Survey Engineer';
  if (d === 'electrical') return 'Electrical Team';
  if (d === 'installation') return 'Installation Team';
  if (d === 'structure') return 'Structure Team';
  if (d === 'civil') return 'Civil Team';
  if (d === 'finance') return 'Accountant';
  if (d === 'hr') return 'HR Manager';
  if (d === 'service') {
    return title.includes('manager') ? 'Service Manager' : 'Technician';
  }
  if (d === 'operations') return 'Project Manager';
  return 'Project Manager';
}

function generateSecurePassword(): string {
  return DEMO_DEFAULT_PASSWORD;
}

const DOCUMENT_CATEGORIES: EmployeeDocumentCategory[] = [
  'Offer Letter',
  'Termination Letter',
  'Employment Contract',
  'ID Proof',
  'Address Proof',
  'Certificate',
  'Salary Document',
  'Other'
];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg',
  'image/png'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function isFileTypeAllowed(file: File): boolean {
  if (file.type && ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return true;
  }
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some(ext => name.endsWith(ext));
}

function getMimeType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.doc')) return 'application/msword';
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUploadDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return isoString;
  }
}

function getCategoryBadgeClass(category: EmployeeDocumentCategory): string {
  switch (category) {
    case 'Offer Letter':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Termination Letter':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'Employment Contract':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'ID Proof':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'Address Proof':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    case 'Certificate':
      return 'bg-teal-50 text-teal-800 border-teal-200';
    case 'Salary Document':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Other':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getFileIcon(mimeType: string, fileName: string) {
  if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(fileName)) {
    return <Image className="w-4 h-4 text-sky-600 shrink-0" />;
  }
  if (mimeType === 'application/pdf' || /\.pdf$/i.test(fileName)) {
    return <FileText className="w-4 h-4 text-rose-600 shrink-0" />;
  }
  return <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  employeeToEdit,
  existingEmployees
}) => {
  const { currentUser } = useAuth();
  const isEditing = Boolean(employeeToEdit);

  const [formData, setFormData] = useState({
    name: '',
    employeeCode: '',
    department: 'Engineering' as Employee['department'],
    designation: '',
    phone: '',
    email: '',
    joiningDate: new Date().toISOString().slice(0, 10),
    salaryMonthly: 45000,
    status: 'ACTIVE' as Employee['status'],
    photoUrl: '',
    currentSiteLocation: ''
  });

  // ERP Login Account state
  const [loginEnabled, setLoginEnabled] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [systemRole, setSystemRole] = useState<UserRole>('Site Survey Engineer');
  const [accountStatus, setAccountStatus] = useState<'ACTIVE' | 'DISABLED' | 'PENDING'>('ACTIVE');
  
  // Ephemeral password fields (NEVER persisted to Employee or localStorage)
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [shouldResetPassword, setShouldResetPassword] = useState<boolean>(false);
  const [passwordGeneratedTip, setPasswordGeneratedTip] = useState<string | null>(null);

  // HR Documents state
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [docCategory, setDocCategory] = useState<EmployeeDocumentCategory>('Offer Letter');
  const [docNotes, setDocNotes] = useState<string>('');
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employeeToEdit) {
      setFormData({
        name: employeeToEdit.name || '',
        employeeCode: employeeToEdit.employeeCode || '',
        department: employeeToEdit.department || 'Engineering',
        designation: employeeToEdit.designation || '',
        phone: employeeToEdit.phone || '',
        email: employeeToEdit.email || '',
        joiningDate: employeeToEdit.joiningDate || new Date().toISOString().slice(0, 10),
        salaryMonthly: employeeToEdit.salaryMonthly ?? 45000,
        status: employeeToEdit.status || 'ACTIVE',
        photoUrl: employeeToEdit.photoUrl || '',
        currentSiteLocation: employeeToEdit.currentSiteLocation || ''
      });

      // Populate ERP account fields
      setLoginEnabled(employeeToEdit.loginEnabled ?? true);
      setLoginEmail(employeeToEdit.email || '');
      setSystemRole(
        employeeToEdit.systemRole ||
        employeeToEdit.assignedRole ||
        getDefaultSystemRole(employeeToEdit.department, employeeToEdit.designation)
      );
      setAccountStatus(employeeToEdit.accountStatus || 'ACTIVE');
      setShouldResetPassword(false);

      // Populate documents
      setDocuments(Array.isArray(employeeToEdit.documents) ? [...employeeToEdit.documents] : []);
    } else {
      // Suggest next employee code
      const nextNum = existingEmployees.length + 101;
      setFormData({
        name: '',
        employeeCode: `EMP-${nextNum}`,
        department: 'Engineering',
        designation: '',
        phone: '+91 ',
        email: '',
        joiningDate: new Date().toISOString().slice(0, 10),
        salaryMonthly: 45000,
        status: 'ACTIVE',
        photoUrl: '',
        currentSiteLocation: ''
      });

      setLoginEnabled(true);
      setLoginEmail('');
      setSystemRole('Site Survey Engineer');
      setAccountStatus('ACTIVE');
      setShouldResetPassword(false);
      setDocuments([]);
    }

    // Set default demo password for new employee or clear for edit
    if (!employeeToEdit) {
      setPassword(DEMO_DEFAULT_PASSWORD);
      setConfirmPassword(DEMO_DEFAULT_PASSWORD);
    } else {
      setPassword('');
      setConfirmPassword('');
    }
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordGeneratedTip(null);
    setDocCategory('Offer Letter');
    setDocNotes('');
    setUploadErrors([]);
    setErrors({});
  }, [employeeToEdit, isOpen, existingEmployees.length]);

  // Keep login email in sync with corporate email if login email hasn't been manually diverged
  const handleEmailChange = (newEmail: string) => {
    setFormData(prev => ({ ...prev, email: newEmail }));
    if (!loginEmail || loginEmail === formData.email) {
      setLoginEmail(newEmail);
    }
  };

  // Suggest matching system role when department changes
  const handleDepartmentChange = (newDept: Employee['department']) => {
    setFormData(prev => ({ ...prev, department: newDept }));
    if (!employeeToEdit?.systemRole) {
      setSystemRole(getDefaultSystemRole(newDept, formData.designation));
    }
  };

  const handleGeneratePassword = () => {
    const generated = generateSecurePassword();
    setPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    setPasswordGeneratedTip(`Password generated: ${generated}. Copy this credential and share it with the employee.`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentErrors: string[] = [];
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!isFileTypeAllowed(file)) {
        currentErrors.push(`"${file.name}" has an unsupported format. Please upload PDF, DOC, DOCX, JPG, or PNG files only.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        currentErrors.push(`"${file.name}" exceeds the 5 MB file size limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setIsUploading(true);
      try {
        const readPromises = validFiles.map(file => {
          return new Promise<EmployeeDocument>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              const newDoc: EmployeeDocument = {
                id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                name: file.name.replace(/\.[^/.]+$/, '') || file.name,
                category: docCategory,
                fileName: file.name,
                mimeType: getMimeType(file),
                fileSize: file.size,
                fileUrl: dataUrl,
                uploadedAt: new Date().toISOString(),
                uploadedBy: currentUser?.name || 'HR Administrator',
                notes: docNotes.trim() || undefined
              };
              resolve(newDoc);
            };
            reader.onerror = () => {
              reject(new Error(`Failed to read file: ${file.name}`));
            };
            reader.readAsDataURL(file);
          });
        });

        const newDocs = await Promise.all(readPromises);
        setDocuments(prev => [...prev, ...newDocs]);
        setDocNotes('');
      } catch (err) {
        currentErrors.push(err instanceof Error ? err.message : 'Failed to read uploaded file(s).');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }

    setUploadErrors(currentErrors);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleViewDocument = (doc: EmployeeDocument) => {
    const isImage = doc.mimeType.startsWith('image/');
    const isPdf = doc.mimeType === 'application/pdf' || doc.fileName.toLowerCase().endsWith('.pdf');

    if (isImage || isPdf) {
      try {
        if (doc.fileUrl.startsWith('data:')) {
          const parts = doc.fileUrl.split(',');
          const mime = parts[0]?.match(/:(.*?);/)?.[1] || doc.mimeType;
          const base64Data = parts[1];
          if (base64Data) {
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Uint8Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const blob = new Blob([byteNumbers], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not open blob URL, falling back to direct link', err);
      }
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // DOC, DOCX, or other files: trigger file download
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required.';
    }

    const trimmedCode = formData.employeeCode.trim();
    if (!trimmedCode) {
      newErrors.employeeCode = 'Employee code is required.';
    }

    if (!formData.designation.trim()) {
      newErrors.designation = 'Designation/role is required.';
    }

    const trimmedPhone = formData.phone.trim();
    if (!trimmedPhone || trimmedPhone.replace(/\D/g, '').length < 8) {
      newErrors.phone = 'Valid contact phone number is required (at least 8 digits).';
    }

    const trimmedEmail = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address (e.g. name@company.com).';
    }

    if (!formData.joiningDate) {
      newErrors.joiningDate = 'Joining date is required.';
    }

    if (formData.salaryMonthly < 0 || isNaN(formData.salaryMonthly)) {
      newErrors.salaryMonthly = 'Salary must be a non-negative number.';
    }

    // ERP Account Validation
    if (loginEnabled) {
      const cleanLoginEmail = (loginEmail || formData.email).trim();
      if (!cleanLoginEmail) {
        newErrors.loginEmail = 'Login email is required when ERP login is enabled.';
      } else if (!emailRegex.test(cleanLoginEmail)) {
        newErrors.loginEmail = 'Please provide a valid login email address.';
      }

      // Password requirement logic:
      // For a new employee or if reset password is opted in edit mode:
      const needsPassword = !isEditing || !employeeToEdit?.authUid || shouldResetPassword;
      if (needsPassword) {
        if (!password) {
          newErrors.password = 'A temporary password (min 6 characters) is required for ERP login.';
        } else if (password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters long.';
        }

        if (password !== confirmPassword) {
          newErrors.confirmPassword = 'Password and confirm password do not match.';
        }
      }
    }

    // Duplicate validation across code, phone, and email
    const dupCheck = validateEmployee(
      {
        name: formData.name,
        employeeCode: formData.employeeCode,
        phone: formData.phone,
        email: formData.email
      },
      existingEmployees,
      employeeToEdit?.id
    );

    if (!dupCheck.valid && dupCheck.field) {
      newErrors[dupCheck.field] = dupCheck.message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const activeLoginEmail = (loginEmail || formData.email).trim();

    try {
      let linkedAuthUid = employeeToEdit?.authUid;

      // Provision or update ERP credentials if login is enabled
      if (loginEnabled) {
        const isNewAuth = !employeeToEdit?.authUid || !isEditing;
        if (isNewAuth) {
          const provisionResult = await provisionEmployeeAccount({
            email: activeLoginEmail,
            password: password,
            displayName: formData.name.trim(),
            systemRole: systemRole,
            employeeCode: formData.employeeCode.trim()
          });
          linkedAuthUid = provisionResult.uid;
        } else if (shouldResetPassword && password) {
          await updateEmployeeAccount({
            uid: employeeToEdit.authUid,
            password: password
          });
        }

        // Cache user profile for fast lookup upon login
        if (linkedAuthUid) {
          const userProfile: UserProfile = {
            id: linkedAuthUid,
            name: formData.name.trim(),
            email: activeLoginEmail.toLowerCase(),
            role: systemRole,
            phone: formData.phone.trim(),
            department: formData.department,
            designation: formData.designation.trim(),
            assignedProjects: []
          };
          localStorage.setItem(`solarpulse_user_profile_${linkedAuthUid}`, JSON.stringify(userProfile));
        }
      } else if (employeeToEdit?.authUid) {
        // If login was disabled for an existing user, disable their account
        await updateEmployeeAccount({
          uid: employeeToEdit.authUid,
          disabled: true
        });
      }

      // CRITICAL SECURITY REQUIREMENT:
      // Clear all password variables from component state immediately
      setPassword('');
      setConfirmPassword('');

      // Build safe final employee model with NO PLAINTEXT PASSWORD
      const finalEmployee: Employee = {
        id: employeeToEdit ? employeeToEdit.id : `emp-${Date.now()}`,
        name: formData.name.trim(),
        employeeCode: formData.employeeCode.trim().toUpperCase(),
        department: formData.department,
        designation: formData.designation.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        joiningDate: formData.joiningDate,
        salaryMonthly: Number(formData.salaryMonthly),
        status: formData.status,
        photoUrl: formData.photoUrl.trim() || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        currentSiteLocation: formData.currentSiteLocation.trim() || undefined,

        // Safe account linkage fields only
        loginEnabled: loginEnabled,
        authUid: linkedAuthUid,
        systemRole: systemRole,
        accountStatus: loginEnabled ? accountStatus : 'DISABLED',
        accountCreatedAt: employeeToEdit?.accountCreatedAt || (loginEnabled ? new Date().toISOString() : undefined),
        accountCreatedBy: employeeToEdit?.accountCreatedBy || (loginEnabled ? (currentUser?.name || 'System Administrator') : undefined),

        // HR Documents
        documents: documents,

        updatedAt: new Date().toISOString()
      };

      await onSave(finalEmployee);
      onClose();
    } catch (err: unknown) {
      // Clear password variables even on error
      setPassword('');
      setConfirmPassword('');

      if (err instanceof DuplicateRecordError) {
        setErrors(prev => ({ ...prev, [err.field]: err.message }));
      } else if (err instanceof Error) {
        setErrors(prev => ({ ...prev, general: err.message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
              {isEditing ? <Briefcase className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 id="employee-modal-title" className="font-bold text-base text-slate-900">
                {isEditing ? `Edit Employee: ${employeeToEdit?.name}` : 'Register New Solar EPC Employee'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isEditing ? 'Update workforce profile, operational role, and ERP login' : 'Add team member to internal HR directory and site operations'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {Object.keys(errors).length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Please correct the following issues:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-rose-700">
                  {Object.values(errors).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Row 1: Name & Employee Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Vikramaditya Rathore"
                className={`w-full text-xs border rounded-xl p-2.5 bg-white transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                  errors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Employee Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.employeeCode}
                onChange={e => setFormData({ ...formData, employeeCode: e.target.value })}
                placeholder="e.g. EMP-109"
                className={`w-full text-xs border rounded-xl p-2.5 font-mono uppercase bg-white transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                  errors.employeeCode ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {errors.employeeCode && <p className="text-[11px] text-rose-600 mt-1">{errors.employeeCode}</p>}
            </div>
          </div>

          {/* Row 2: Department & Designation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Department <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={formData.department}
                onChange={e => handleDepartmentChange(e.target.value as Employee['department'])}
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>Designation <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={e => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Lead Site Survey Engineer"
                className={`w-full text-xs border rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                  errors.designation ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {errors.designation && <p className="text-[11px] text-rose-600 mt-1">{errors.designation}</p>}
            </div>
          </div>

          {/* Row 3: Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Phone Number <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98250 11223"
                className={`w-full text-xs border rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                  errors.phone ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {errors.phone && <p className="text-[11px] text-rose-600 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Corporate Email <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => handleEmailChange(e.target.value)}
                placeholder="vikram@solarpulse.com"
                className={`w-full text-xs border rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                  errors.email ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {errors.email && <p className="text-[11px] text-rose-600 mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Row 4: Joining Date, Salary, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Joining Date <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="date"
                required
                value={formData.joiningDate}
                onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>Monthly Salary (₹) <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={formData.salaryMonthly}
                onChange={e => setFormData({ ...formData, salaryMonthly: parseFloat(e.target.value) || 0 })}
                className={`w-full text-xs border rounded-xl p-2.5 font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                  errors.salaryMonthly ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {errors.salaryMonthly && <p className="text-[11px] text-rose-600 mt-1">{errors.salaryMonthly}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                HR Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as Employee['status'] })}
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                {STATUSES.map(st => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION: ERP Login Account & Role-Based Permissions                      */}
          {/* ========================================================================= */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="p-4 rounded-xl border border-amber-200 bg-linear-to-b from-amber-50/40 to-slate-50/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>ERP Login Account & Credentials</span>
                      {employeeToEdit?.authUid && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Linked Account</span>
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Provision employee sign-in access with role-based dashboard permissions
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={loginEnabled}
                    onChange={e => setLoginEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  <span className="ml-2.5 text-xs font-bold text-slate-800">
                    {loginEnabled ? 'Login Enabled' : 'Login Disabled'}
                  </span>
                </label>
              </div>

              {loginEnabled && (
                <div className="pt-3 border-t border-amber-200/60 space-y-3.5 animate-in fade-in">
                  {/* Login Email & System Role */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-amber-600" />
                        <span>ERP Sign-in Email <span className="text-rose-500">*</span></span>
                      </label>
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        placeholder="employee@solarpulse.com"
                        className={`w-full text-xs border rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                          errors.loginEmail ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                        }`}
                      />
                      {errors.loginEmail && <p className="text-[11px] text-rose-600 mt-1">{errors.loginEmail}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-600" />
                        <span>Assigned System Role <span className="text-rose-500">*</span></span>
                      </label>
                      <select
                        value={systemRole}
                        onChange={e => setSystemRole(e.target.value as UserRole)}
                        className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        {SYSTEM_ROLES.map(({ role }) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 mt-1 truncate">
                        {SYSTEM_ROLES.find(r => r.role === systemRole)?.description}
                      </p>
                    </div>
                  </div>

                  {/* Account Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ERP Account Status
                      </label>
                      <select
                        value={accountStatus}
                        onChange={e => setAccountStatus(e.target.value as 'ACTIVE' | 'DISABLED' | 'PENDING')}
                        className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="ACTIVE">ACTIVE (Authorized to Sign In)</option>
                        <option value="PENDING">PENDING (Onboarding In Progress)</option>
                        <option value="DISABLED">DISABLED (Access Suspended)</option>
                      </select>
                    </div>

                    {isEditing && employeeToEdit?.authUid && (
                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={shouldResetPassword}
                            onChange={e => {
                              setShouldResetPassword(e.target.checked);
                              if (!e.target.checked) {
                                setPassword('');
                                setConfirmPassword('');
                                setPasswordGeneratedTip(null);
                              }
                            }}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          <span>Reset / Update Login Password</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Password Provisioning Block */}
                  {(!isEditing || !employeeToEdit?.authUid || shouldResetPassword) && (
                    <div className="p-3.5 bg-white rounded-xl border border-amber-200/80 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-amber-600" />
                          <span>{isEditing ? 'Enter New Password' : 'Set Initial Temporary Password'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Generate Secure Password</span>
                        </button>
                      </div>

                      {passwordGeneratedTip && (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 font-mono flex items-center justify-between">
                          <span>{passwordGeneratedTip}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Password <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="••••••••"
                              autoComplete="new-password"
                              className={`w-full text-xs border rounded-xl p-2.5 pr-8 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                                errors.password ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          {errors.password && <p className="text-[11px] text-rose-600 mt-1">{errors.password}</p>}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Confirm Password <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={e => setConfirmPassword(e.target.value)}
                              placeholder="••••••••"
                              autoComplete="new-password"
                              className={`w-full text-xs border rounded-xl p-2.5 pr-8 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                                errors.confirmPassword ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          {errors.confirmPassword && (
                            <p className="text-[11px] text-rose-600 mt-1">{errors.confirmPassword}</p>
                          )}
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500">
                        Minimum 6 characters. The password will be authenticated securely via Firebase Auth and is never saved in plaintext.
                      </p>
                    </div>
                  )}

                  {isEditing && employeeToEdit?.authUid && !shouldResetPassword && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">Password is securely configured</p>
                        <p className="text-[11px] text-slate-500">Existing passwords are encrypted and never shown. To change credentials, check &ldquo;Reset / Update Login Password&rdquo; above.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Row 5: Optional Current Site Location & Photo URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Current Site / Base Location <span className="text-[10px] text-slate-400 font-normal">(Optional)</span></span>
              </label>
              <input
                type="text"
                value={formData.currentSiteLocation}
                onChange={e => setFormData({ ...formData, currentSiteLocation: e.target.value })}
                placeholder="e.g. Sanand Solar Park 50MW Site"
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-slate-400" />
                <span>Photo / Avatar URL <span className="text-[10px] text-slate-400 font-normal">(Optional)</span></span>
              </label>
              <input
                type="url"
                value={formData.photoUrl}
                onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION: HR Documents & Records                                          */}
          {/* ========================================================================= */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="p-4 rounded-xl border border-blue-200 bg-linear-to-b from-blue-50/40 to-slate-50/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>HR Documents</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 inline-flex items-center gap-1">
                        <span>{documents.length} {documents.length === 1 ? 'Record' : 'Records'}</span>
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Upload employee-related HR records, including offer letters, termination letters, contracts, and supporting documents.
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Controls Box */}
              <div className="p-3.5 bg-white rounded-xl border border-blue-200/80 shadow-2xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Document Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={docCategory}
                      onChange={e => setDocCategory(e.target.value as EmployeeDocumentCategory)}
                      className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {DOCUMENT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Short Note / Remarks <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={docNotes}
                      onChange={e => setDocNotes(e.target.value)}
                      placeholder="e.g. Signed joining agreement, PAN copy, degree"
                      className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Upload Trigger Input */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="hr-employee-documents-upload"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  <label
                    htmlFor="hr-employee-documents-upload"
                    className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/20 hover:bg-blue-50/50 rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-xs group-hover:text-blue-800">
                      <UploadCloud className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{isUploading ? 'Reading selected file(s)...' : 'Choose File(s) or Drag & Drop to Upload'}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Accepts PDF, DOC, DOCX, JPG, and PNG files up to 5 MB each.
                    </p>
                  </label>
                </div>

                {/* Inline Upload Errors */}
                {uploadErrors.length > 0 && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-700">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Document Upload Notice:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700 pl-1">
                      {uploadErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Uploaded Documents List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 px-0.5">
                  <span>Attached Documents ({documents.length})</span>
                </div>

                {documents.length === 0 ? (
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                    No HR documents attached yet. Select a category above and choose files to upload.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {documents.map((doc) => {
                      const isWordDoc = doc.fileName.toLowerCase().endsWith('.doc') || doc.fileName.toLowerCase().endsWith('.docx') || doc.mimeType.includes('word');
                      return (
                        <div
                          key={doc.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                              {getFileIcon(doc.mimeType, doc.fileName)}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(doc.category)}`}>
                                  {doc.category}
                                </span>
                                <span className="text-xs font-bold text-slate-900 truncate max-w-[220px]" title={doc.fileName}>
                                  {doc.fileName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                                <span>{formatUploadDate(doc.uploadedAt)}</span>
                                <span>•</span>
                                <span>{formatFileSize(doc.fileSize)}</span>
                                {doc.uploadedBy && (
                                  <>
                                    <span>•</span>
                                    <span>Uploaded by {doc.uploadedBy}</span>
                                  </>
                                )}
                              </div>
                              {doc.notes && (
                                <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-md px-2 py-1 mt-1 font-sans">
                                  <span className="font-semibold text-slate-500">Note: </span>
                                  {doc.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleViewDocument(doc)}
                              aria-label={`${isWordDoc ? 'Download' : 'View'} ${doc.fileName}`}
                              title={isWordDoc ? 'Download Document' : 'View Document'}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                            >
                              {isWordDoc ? <Download className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                              <span>{isWordDoc ? 'Download' : 'View'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveDocument(doc.id)}
                              aria-label={`Remove ${doc.fileName}`}
                              title="Remove Document"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? (loginEnabled ? 'Configuring ERP Login...' : 'Saving Employee...')
                  : (isEditing ? 'Update Employee' : 'Register Employee')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
