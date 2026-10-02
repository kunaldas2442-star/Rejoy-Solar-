import {
  SolarProject,
  ProjectAssignmentRole,
  ProjectUserAssignment,
  Customer,
  Lead,
  ProjectStage,
  PaymentRecord,
  ExpenseRecord,
  Employee,
  AttendanceRecord,
  Payslip,
  HolidayRecord,
  HolidayType,
  ServiceTicket,
  AMCContract,
  AppNotification,
  SystemSettings,
  SiteSurveyData,
  Quotation,
  WorkflowStageKey,
  StageStatus,
  LeadStatus,
  ProductItem,
  Vendor,
  PurchaseOrder,
  PurchaseItem,
  PurchaseLineItem,
  PurchaseDeliveryReceipt,
  DeliveryReceiptItem,
  BillOfMaterials,
  BOMItem,
  SalesInvoice,
  InvoiceLineItem,
  StockMovement,
  Warehouse,
  StockAuditRecord,
  UserRole
} from '../types/solar';
import { SystemAclConfig, AclAuditLogEntry } from '../types/acl';
import { DEFAULT_SYSTEM_ACL_CONFIG } from './aclDefaults';
import { buildStandardWorkflowStages, WorkflowProgressLevel } from './workflowStages';
import {
  validateCustomer,
  validateProduct,
  validateVendor,
  validateEmployee,
  validateBOM,
  validatePurchaseOrder,
  validatePOLineItems,
  validatePOLineItem,
  assertValid,
  DuplicateRecordError
} from './validation';
import { REFERENCE_5KW_QUOTATION } from '../utils/quotationDefaults';

export {
  DuplicateRecordError,
  validateCustomer,
  validateProduct,
  validateVendor,
  validateEmployee,
  validateBOM,
  validatePurchaseOrder,
  validatePOLineItems,
  validatePOLineItem
};

const STORAGE_KEYS = {
  LEADS: 'solar_erp_leads_v2',
  CUSTOMERS: 'solar_erp_customers_v2',
  PROJECTS: 'solar_erp_projects_v2',
  PAYMENTS: 'solar_erp_payments_v2',
  EXPENSES: 'solar_erp_expenses_v2',
  EMPLOYEES: 'solar_erp_employees_v2',
  ATTENDANCE: 'solar_erp_attendance_v2',
  PAYSLIPS: 'solar_erp_payslips_v2',
  HOLIDAYS: 'solar_erp_holidays_v2',
  SERVICE_TICKETS: 'solar_erp_service_tickets_v2',
  AMC_CONTRACTS: 'solar_erp_amc_contracts_v2',
  NOTIFICATIONS: 'solar_erp_notifications_v2',
  SETTINGS: 'solar_erp_settings_v2',
  SURVEYS: 'solar_erp_surveys_v2',
  QUOTATIONS: 'solar_erp_quotations_v2',
  PRODUCTS: 'solar_erp_products_v2',
  VENDORS: 'solar_erp_vendors_v2',
  PURCHASE_ORDERS: 'solar_erp_purchase_orders_v2',
  BOMS: 'solar_erp_boms_v2',
  SALES_INVOICES: 'solar_erp_sales_invoices_v2',
  STOCK_MOVEMENTS: 'solar_erp_stock_movements_v2',
  ACL_CONFIG: 'solar_erp_acl_config_v2',
  ACL_AUDIT_LOGS: 'solar_erp_acl_audit_logs_v2',
  WAREHOUSES: 'solar_erp_warehouses_v2',
  STOCK_AUDITS: 'solar_erp_stock_audits_v2',
};

const initialWarehouses: Warehouse[] = [
  {
    id: 'wh-1',
    name: 'Central Solar Logistics Hub - Pune',
    code: 'WH-PUN-01',
    address: 'Plot 42, MIDC Bhosari Industrial Area',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411026',
    contactPerson: 'Rajesh Shinde',
    contactPhone: '+91 98230 11223',
    email: 'pune.hub@rejoysolar.com',
    capacitySqFt: 25000,
    status: 'ACTIVE',
    isDefault: true,
    notes: 'Primary bonded central warehouse stocking Tier-1 modules, string inverters, and heavy aluminium structures.',
    createdAt: '2026-07-01T08:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  {
    id: 'wh-2',
    name: 'North India Distribution Hub - Gurugram',
    code: 'WH-GGN-02',
    address: 'Shed 18, Sector 37 Pace City II',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122001',
    contactPerson: 'Vikram Malhotra',
    contactPhone: '+91 98112 44556',
    email: 'delhi.depot@rejoysolar.com',
    capacitySqFt: 18000,
    status: 'ACTIVE',
    isDefault: false,
    notes: 'Regional logistics depot servicing Delhi-NCR, Rajasthan, Punjab, and Uttar Pradesh commercial rooftop sites.',
    createdAt: '2026-07-15T09:00:00Z',
    updatedAt: '2026-09-10T11:00:00Z'
  },
  {
    id: 'wh-3',
    name: 'South Regional Depot - Bengaluru',
    code: 'WH-BLR-03',
    address: 'Phase 2, Peenya Industrial Area',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560058',
    contactPerson: 'Karthik Subramanian',
    contactPhone: '+91 98450 77889',
    email: 'blr.depot@rejoysolar.com',
    capacitySqFt: 15000,
    status: 'ACTIVE',
    isDefault: false,
    notes: 'Catering to Karnataka and Tamil Nadu industrial ground mounts, DC cabling reels, and switchgear.',
    createdAt: '2026-08-01T08:30:00Z',
    updatedAt: '2026-09-15T14:00:00Z'
  }
];

const initialStockAudits: StockAuditRecord[] = [
  {
    id: 'audit-1',
    auditNumber: 'AUD-2026-001',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    auditDate: '2026-09-15',
    auditedBy: 'Sanjay Deshmukh (Quality Auditor)',
    status: 'COMPLETED',
    notes: 'Quarterly comprehensive physical verification of solar modules and inverters.',
    itemsAudited: 12,
    discrepanciesFound: 1,
    netAdjustmentValue: -10200,
    createdAt: '2026-09-15T16:30:00Z'
  },
  {
    id: 'audit-2',
    auditNumber: 'AUD-2026-002',
    warehouseId: 'wh-2',
    warehouseName: 'North India Distribution Hub - Gurugram',
    auditDate: '2026-09-20',
    auditedBy: 'Deepak Verma (Store Incharge)',
    status: 'COMPLETED',
    notes: 'Biannual hardware count, mounting rails, and DC isolators reconciliation.',
    itemsAudited: 10,
    discrepanciesFound: 0,
    netAdjustmentValue: 0,
    createdAt: '2026-09-20T17:00:00Z'
  }
];

const initialAclAuditLogs: AclAuditLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '2026-09-18T10:30:00Z',
    changedBy: 'Vikram Patel (Admin)',
    targetRole: 'Project Manager',
    action: 'UPDATE_PERMISSIONS',
    summary: 'Granted stage closure sign-off and BOM customization authority'
  },
  {
    id: 'log-2',
    timestamp: '2026-09-15T14:15:00Z',
    changedBy: 'Ananya Sharma (Admin)',
    targetRole: 'Site Survey Engineer',
    action: 'UPDATE_PERMISSIONS',
    summary: 'Restricted financial ledger view; verified GPS upload permission'
  },
  {
    id: 'log-3',
    timestamp: '2026-09-10T09:00:00Z',
    changedBy: 'Vikram Patel (Admin)',
    targetRole: 'Admin',
    action: 'RESET_ROLE',
    summary: 'Initialized baseline Solar EPC security matrix across all 15 operational tiers'
  }
];

// Initial realistic data
const initialEmployees: Employee[] = [
  {
    id: 'emp-1',
    authUid: 'demo-usr-1',
    employeeCode: 'EMP001',
    name: 'Vikram Patel',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    department: 'Administration',
    designation: 'Managing Director & Admin',
    phone: '+91 98250 11223',
    email: 'admin@rejoysolar.com',
    joiningDate: '2021-01-15',
    salaryMonthly: 180000,
    status: 'ACTIVE',
    loginEnabled: true,
    systemRole: 'Admin',
    isFieldWorker: false,
    accountStatus: 'ACTIVE',
    accountCreatedAt: '2021-01-15T10:00:00Z',
    accountCreatedBy: 'System Init'
  },
  {
    id: 'emp-2',
    authUid: 'demo-usr-4',
    employeeCode: 'EMP002',
    name: 'Amit Sharma',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    department: 'Operations',
    designation: 'Senior Project Manager',
    phone: '+91 98251 22334',
    email: 'projectmanager@rejoysolar.com',
    joiningDate: '2021-04-01',
    salaryMonthly: 95000,
    status: 'ACTIVE',
    loginEnabled: true,
    systemRole: 'Project Manager',
    isFieldWorker: false,
    accountStatus: 'ACTIVE',
    accountCreatedAt: '2021-04-01T10:00:00Z',
    accountCreatedBy: 'System Init'
  },
  {
    id: 'emp-3',
    authUid: 'demo-usr-5',
    employeeCode: 'EMP003',
    name: 'Rajesh Kumar',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    department: 'Engineering',
    designation: 'Lead Site Survey Engineer',
    phone: '+91 98252 33445',
    email: 'survey@rejoysolar.com',
    joiningDate: '2022-02-10',
    salaryMonthly: 65000,
    status: 'IN FIELD',
    currentSiteLocation: 'Sanand Industrial Estate, Plot 42',
    loginEnabled: true,
    systemRole: 'Site Survey Engineer',
    isFieldWorker: true,
    accountStatus: 'ACTIVE',
    accountCreatedAt: '2022-02-10T10:00:00Z',
    accountCreatedBy: 'System Init'
  },
  {
    id: 'emp-4',
    authUid: 'demo-usr-2',
    employeeCode: 'EMP004',
    name: 'Priya Verma',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
    department: 'Sales',
    designation: 'Sales Manager - Commercial & Industrial',
    phone: '+91 98253 44556',
    email: 'salesmanager@rejoysolar.com',
    joiningDate: '2021-08-15',
    salaryMonthly: 75000,
    status: 'ACTIVE',
    loginEnabled: true,
    systemRole: 'Sales Manager',
    isFieldWorker: false,
    accountStatus: 'ACTIVE',
    accountCreatedAt: '2021-08-15T10:00:00Z',
    accountCreatedBy: 'System Init'
  },
  {
    id: 'emp-5',
    authUid: 'demo-usr-3',
    employeeCode: 'EMP005',
    name: 'Rahul Mehta',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150',
    department: 'Sales',
    designation: 'Solar Sales Executive',
    phone: '+91 98254 55667',
    email: 'sales@rejoysolar.com',
    joiningDate: '2023-03-01',
    salaryMonthly: 45000,
    status: 'ACTIVE',
    loginEnabled: true,
    systemRole: 'Sales Executive',
    isFieldWorker: false,
    accountStatus: 'ACTIVE',
    accountCreatedAt: '2023-03-01T10:00:00Z',
    accountCreatedBy: 'System Init'
  },
  {
    id: 'emp-6',
    authUid: 'demo-usr-8',
    employeeCode: 'EMP006',
    name: 'Dinesh Yadav',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150',
    department: 'Structure',
    designation: 'Structure Fabrication Lead',
    phone: '+91 98255 66778',
    email: 'structure@rejoysolar.com',
    joiningDate: '2022-06-15',
    salaryMonthly: 48000,
    status: 'IN FIELD',
    loginEnabled: true,
    systemRole: 'Structure Team',
    isFieldWorker: true,
    accountStatus: 'ACTIVE',
    accountCreatedAt: '2022-06-15T10:00:00Z',
    accountCreatedBy: 'System Init'
  },
  {
    id: 'emp-7',
    authUid: 'demo-usr-9',
    employeeCode: 'EMP007',
    name: 'Manoj Tiwari',
    photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150',
    department: 'Installation',
    designation: 'Solar Module Installation Lead',
    phone: '+91 98256 77889',
    email: 'installation@rejoysolar.com',
    joiningDate: '2022-09-01',
    salaryMonthly: 46000,
    status: 'IN FIELD',
    loginEnabled: true,
    systemRole: 'Installation Team',
    isFieldWorker: true,
    accountStatus: 'ACTIVE',
    accountCreatedAt: '2022-09-01T10:00:00Z',
    accountCreatedBy: 'System Init'
  },
  {
    id: 'emp-8',
    authUid: 'demo-usr-10',
    employeeCode: 'EMP008',
    name: 'Ankit Joshi',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150',
    department: 'Electrical',
    designation: 'Senior Electrical Engineer (LT/HT)',
    phone: '+91 98257 88990',
    email: 'electrical@rejoysolar.com',
    joiningDate: '2021-11-20',
    salaryMonthly: 62000,
    status: 'ACTIVE',
    loginEnabled: true,
    systemRole: 'Electrical Team',
    isFieldWorker: true,
    accountStatus: 'ACTIVE',
    accountCreatedAt: '2021-11-20T10:00:00Z',
    accountCreatedBy: 'System Init'
  },
  {
    id: 'emp-9',
    authUid: 'demo-usr-11',
    employeeCode: 'EMP009',
    name: 'Sneha Kulkarni',
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150',
    department: 'Finance',
    designation: 'Chief Accountant & Tally Specialist',
    phone: '+91 98258 99001',
    email: 'accountant@rejoysolar.com',
    joiningDate: '2021-03-10',
    salaryMonthly: 68000,
    status: 'ACTIVE',
    loginEnabled: true,
    systemRole: 'Accountant',
    isFieldWorker: false,
    accountStatus: 'ACTIVE',
    accountCreatedAt: '2021-03-10T10:00:00Z',
    accountCreatedBy: 'System Init'
  },
  {
    id: 'emp-10',
    authUid: 'demo-usr-14',
    employeeCode: 'EMP010',
    name: 'Neha Gupta',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
    department: 'HR',
    designation: 'HR & Admin Manager',
    phone: '+91 98259 00112',
    email: 'hr@rejoysolar.com',
    joiningDate: '2022-01-05',
    salaryMonthly: 58000,
    status: 'ACTIVE',
    loginEnabled: true,
    systemRole: 'HR Manager',
    isFieldWorker: false,
    accountStatus: 'ACTIVE',
    accountCreatedAt: '2022-01-05T10:00:00Z',
    accountCreatedBy: 'System Init'
  },
  {
    id: 'emp-11',
    authUid: 'demo-usr-12',
    employeeCode: 'EMP011',
    name: 'Rohit Verma',
    photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150',
    department: 'Service',
    designation: 'Service Manager',
    phone: '+91 98260 11223',
    email: 'service@rejoysolar.com',
    joiningDate: '2022-08-12',
    salaryMonthly: 52000,
    status: 'ACTIVE',
    loginEnabled: true,
    systemRole: 'Service Manager',
    isFieldWorker: false,
    accountStatus: 'ACTIVE',
    accountCreatedAt: '2022-08-12T10:00:00Z',
    accountCreatedBy: 'System Init'
  },
  {
    id: 'emp-12',
    authUid: 'demo-usr-13',
    employeeCode: 'EMP012',
    name: 'Ketan Solanki',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    department: 'Service',
    designation: 'Field Service Technician',
    phone: '+91 98261 22334',
    email: 'technician@rejoysolar.com',
    joiningDate: '2023-01-10',
    salaryMonthly: 38000,
    status: 'IN FIELD',
    loginEnabled: true,
    systemRole: 'Technician',
    isFieldWorker: true,
    accountStatus: 'ACTIVE',
    accountCreatedAt: '2023-01-10T10:00:00Z',
    accountCreatedBy: 'System Init'
  },
  {
    id: 'emp-13',
    authUid: 'demo-usr-6',
    employeeCode: 'EMP013',
    name: 'Hardik Shah',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150',
    department: 'Engineering',
    designation: 'Senior Site Inspector & Quality Auditor',
    phone: '+91 98262 33445',
    email: 'inspector@rejoysolar.com',
    joiningDate: '2022-04-18',
    salaryMonthly: 55000,
    status: 'IN FIELD',
    loginEnabled: true,
    systemRole: 'Site Inspector',
    isFieldWorker: true,
    accountStatus: 'ACTIVE',
    accountCreatedAt: '2022-04-18T10:00:00Z',
    accountCreatedBy: 'System Init'
  },
  {
    id: 'emp-14',
    authUid: 'demo-usr-7',
    employeeCode: 'EMP014',
    name: 'Suresh Patel',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150',
    department: 'Civil',
    designation: 'Civil Foundations Lead',
    phone: '+91 98263 44556',
    email: 'civil@rejoysolar.com',
    joiningDate: '2022-05-10',
    salaryMonthly: 47000,
    status: 'IN FIELD',
    loginEnabled: true,
    systemRole: 'Civil Team',
    isFieldWorker: true,
    accountStatus: 'ACTIVE',
    accountCreatedAt: '2022-05-10T10:00:00Z',
    accountCreatedBy: 'System Init'
  }
];

const initialCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'ABC Industries Ltd.',
    companyName: 'ABC Heavy Engineering Private Limited',
    customerType: 'Industrial',
    phone: '+91 98795 44321',
    email: 'customer@rejoysolar.com',
    siteAddress: 'Plot No. 42-45, GIDC Industrial Estate, Sanand',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '382110',
    gstNumber: '24AAACA1234F1Z5',
    electricityConsumerNo: 'SAN-HT-99210',
    sanctionedLoadKw: 150,
    status: 'ACTIVE',
    activeProjectId: 'proj-1',
    createdAt: '2026-08-10T09:00:00Z',
    updatedAt: '2026-09-06T14:30:00Z'
  },
  {
    id: 'cust-2',
    name: 'Zenith Textiles Mills',
    companyName: 'Zenith Spinning & Weaving Ltd.',
    customerType: 'Industrial',
    phone: '+91 98240 88776',
    email: 'planthead@zenithtextiles.com',
    siteAddress: 'Survey No. 118, NH-48, Sachin',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '394230',
    gstNumber: '24AAACZ5678G2Z4',
    electricityConsumerNo: 'SUR-HT-44812',
    sanctionedLoadKw: 350,
    status: 'ACTIVE',
    activeProjectId: 'proj-2',
    createdAt: '2026-07-15T11:00:00Z',
    updatedAt: '2026-09-05T16:00:00Z'
  },
  {
    id: 'cust-3',
    name: 'Apex Super Specialty Hospital',
    companyName: 'Apex Healthcare Foundation',
    customerType: 'Commercial',
    phone: '+91 98255 12345',
    email: 'admin@apexhospital.org',
    siteAddress: 'Ring Road, Near Judges Bungalow, Bodakdev',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380054',
    gstNumber: '24AABCA9012H3Z1',
    electricityConsumerNo: 'AHM-LT-55421',
    sanctionedLoadKw: 60,
    status: 'ACTIVE',
    activeProjectId: 'proj-3',
    createdAt: '2026-08-20T10:30:00Z',
    updatedAt: '2026-09-04T12:00:00Z'
  },
  {
    id: 'cust-4',
    name: 'GreenTech Logistics Hub',
    companyName: 'GreenTech Warehousing LLP',
    customerType: 'Commercial',
    phone: '+91 97277 65432',
    email: 'operations@greentechlogistics.in',
    siteAddress: 'Warehousing Zone, Changodar',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '382213',
    gstNumber: '24AAAFG3456J4Z7',
    electricityConsumerNo: 'CHN-HT-12345',
    sanctionedLoadKw: 80,
    status: 'COMPLETED',
    activeProjectId: 'proj-4',
    createdAt: '2026-05-10T08:00:00Z',
    updatedAt: '2026-08-28T17:00:00Z'
  },
  {
    id: 'cust-5',
    name: 'Sunrise Cold Storage & Agro',
    companyName: 'Sunrise Agri Infrastructure Pvt Ltd',
    customerType: 'Agricultural',
    phone: '+91 98980 11998',
    email: 'info@sunrisecoldstorage.com',
    siteAddress: 'Mahuva Highway, Talaja Road',
    city: 'Bhavnagar',
    state: 'Gujarat',
    pincode: '364140',
    gstNumber: '24AAACS7890K5Z9',
    electricityConsumerNo: 'BHV-HT-88712',
    sanctionedLoadKw: 120,
    status: 'ACTIVE',
    activeProjectId: 'proj-5',
    createdAt: '2026-07-01T09:15:00Z',
    updatedAt: '2026-09-02T11:45:00Z'
  }
];

const initialLeads: Lead[] = [
  {
    id: 'lead-1',
    customerName: 'Shree Ram Plastics',
    companyName: 'Shree Ram Polyfilms Pvt Ltd',
    phone: '+91 98251 77123',
    email: 'purchase@shreeramfilms.com',
    address: 'Phase IV, Vatva GIDC',
    city: 'Ahmedabad',
    solarCapacityKw: 80,
    estimatedValue: 3800000,
    source: 'Website',
    assignedSalespersonId: 'emp-4',
    assignedSalespersonName: 'Priya Verma',
    status: 'QUALIFIED',
    notes: 'Power bill is ₹2.2L/month. High daytime load. Requested site survey scheduling.',
    nextFollowUpDate: '2026-09-09',
    createdAt: '2026-09-03T10:00:00Z',
    updatedAt: '2026-09-06T11:00:00Z'
  },
  {
    id: 'lead-2',
    customerName: 'Kalyan Packaging Solutions',
    companyName: 'Kalyan Corrugators LLP',
    phone: '+91 97129 33445',
    email: 'kalyan.pack@gmail.com',
    address: 'Plot 18, Halol Industrial Area',
    city: 'Vadodara',
    solarCapacityKw: 150,
    estimatedValue: 7200000,
    source: 'Referral',
    assignedSalespersonId: 'emp-5',
    assignedSalespersonName: 'Rahul Mehta',
    status: 'SITE SURVEY',
    notes: 'Survey assigned to Rajesh Kumar. Rooftop is tin-shed. Shadow analysis needed for adjacent chimney.',
    nextFollowUpDate: '2026-09-08',
    createdAt: '2026-09-01T14:30:00Z',
    updatedAt: '2026-09-05T17:15:00Z'
  },
  {
    id: 'lead-3',
    customerName: 'Silver Oak Elite Villas Society',
    companyName: 'Silver Oak Resident Welfare Association',
    phone: '+91 99099 44556',
    email: 'rwa.silveroak@yahoo.com',
    address: 'Off SG Highway, Gota',
    city: 'Ahmedabad',
    solarCapacityKw: 35,
    estimatedValue: 1850000,
    source: 'Direct Call',
    assignedSalespersonId: 'emp-5',
    assignedSalespersonName: 'Rahul Mehta',
    status: 'PROPOSAL',
    notes: 'Common utility meter. Submitted proposal with 540W Mono PERC bifacial modules.',
    nextFollowUpDate: '2026-09-10',
    createdAt: '2026-08-25T16:00:00Z',
    updatedAt: '2026-09-04T09:30:00Z'
  },
  {
    id: 'lead-4',
    customerName: 'Navkar Diamond Tools',
    companyName: 'Navkar Precision Tools Corp',
    phone: '+91 98254 99002',
    email: 'navkardiamond@rediffmail.com',
    address: 'Katargam GIDC',
    city: 'Surat',
    solarCapacityKw: 50,
    estimatedValue: 2450000,
    source: 'Exhibition',
    assignedSalespersonId: 'emp-4',
    assignedSalespersonName: 'Priya Verma',
    status: 'NEGOTIATION',
    notes: 'Quotation sent. Customer asked for 5% discount on turnkey EPC and 5-year AMC inclusion.',
    nextFollowUpDate: '2026-09-07',
    createdAt: '2026-08-18T11:20:00Z',
    updatedAt: '2026-09-06T15:00:00Z'
  },
  {
    id: 'lead-5',
    customerName: 'Balaji Cold Chain Logistics',
    companyName: 'Balaji Agro Cold Storage',
    phone: '+91 98242 11889',
    email: 'balajicold@gmail.com',
    address: 'Deesa Road, Chhapi',
    city: 'Palanpur',
    solarCapacityKw: 200,
    estimatedValue: 9500000,
    source: 'Agent',
    assignedSalespersonId: 'emp-4',
    assignedSalespersonName: 'Priya Verma',
    status: 'NEW',
    notes: 'Inquiry received via agent commission network. 200 kW ground mount + rooftop mix.',
    nextFollowUpDate: '2026-09-07',
    createdAt: '2026-09-07T03:30:00Z',
    updatedAt: '2026-09-07T03:30:00Z'
  }
];

// Modular workflow stages imported from ./workflowStages

const initialProjects: SolarProject[] = [
  {
    id: 'proj-1',
    projectCode: 'SOL-2026-001',
    customerId: 'cust-1',
    customerName: 'ABC Industries Ltd.',
    title: '100 kW Rooftop Solar Project',
    capacityKw: 100,
    totalValue: 5000000,
    status: 'INSTALLATION',
    currentStageKey: 'solar_installation',
    completionPercentage: 68,
    projectManagerId: 'emp-2',
    projectManagerName: 'Amit Sharma',
    assignedUsers: [
      {
        id: 'asgn-1-1',
        projectId: 'proj-1',
        userId: 'emp-3',
        userName: 'Rajesh Kumar',
        userEmail: 'rajesh.kumar@solarpulse.com',
        employeeCode: 'EMP003',
        role: 'Site Survey Engineer',
        department: 'Engineering',
        assignedAt: '2026-08-10T10:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Conducted detailed structural load calculation, drone 3D rooftop survey, and obstruction mapping.',
        isActive: true
      },
      {
        id: 'asgn-1-2',
        projectId: 'proj-1',
        userId: 'emp-3',
        userName: 'Rajesh Kumar',
        userEmail: 'rajesh.kumar@solarpulse.com',
        employeeCode: 'EMP003',
        role: 'Civil Team',
        department: 'Civil',
        assignedAt: '2026-08-11T11:00:00Z',
        assignedBy: 'System Admin',
        notes: 'RCC foundation curing, pedestal waterproofing, and anchor pull-out test sign-off.',
        isActive: true
      },
      {
        id: 'asgn-1-3',
        projectId: 'proj-1',
        userId: 'emp-6',
        userName: 'Dinesh Yadav',
        userEmail: 'dinesh.yadav@solarpulse.com',
        employeeCode: 'EMP006',
        role: 'Structure Team',
        department: 'Structure',
        assignedAt: '2026-08-12T09:30:00Z',
        assignedBy: 'System Admin',
        notes: 'Supervising 22° south-facing HDG structure fabrication and torque tightening.',
        isActive: true
      },
      {
        id: 'asgn-1-4',
        projectId: 'proj-1',
        userId: 'emp-7',
        userName: 'Manoj Tiwari',
        userEmail: 'manoj.tiwari@solarpulse.com',
        employeeCode: 'EMP007',
        role: 'Installation Team',
        department: 'Installation',
        assignedAt: '2026-08-15T08:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Overseeing Waaree 540Wp Mono PERC bifacial module clamping and safety harness compliance.',
        isActive: true
      },
      {
        id: 'asgn-1-5',
        projectId: 'proj-1',
        userId: 'emp-8',
        userName: 'Ankit Joshi',
        userEmail: 'ankit.joshi@solarpulse.com',
        employeeCode: 'EMP008',
        role: 'Electrical Team',
        department: 'Electrical',
        assignedAt: '2026-08-16T14:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Sungrow 110CX string inverter termination, DCDB/ACDB breaker panels, and chemical earth pits.',
        isActive: true
      },
      {
        id: 'asgn-1-6',
        projectId: 'proj-1',
        userId: 'emp-12',
        userName: 'Ketan Solanki',
        userEmail: 'ketan.solanki@solarpulse.com',
        employeeCode: 'EMP012',
        role: 'Technician',
        department: 'Service',
        assignedAt: '2026-08-18T10:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Pre-commissioning insulation resistance testing, string VOC measurement, and cable dressing.',
        isActive: true
      },
      {
        id: 'asgn-1-7',
        projectId: 'proj-1',
        userId: 'emp-5',
        userName: 'Rahul Mehta',
        userEmail: 'rahul.mehta@solarpulse.com',
        employeeCode: 'EMP005',
        role: 'Sales Executive',
        department: 'Sales',
        assignedAt: '2026-08-08T16:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Client account relationship and industrial EPC contract coordinator.',
        isActive: true
      }
    ],
    siteAddress: 'Plot No. 42-45, GIDC Industrial Estate, Sanand, Ahmedabad',
    city: 'Ahmedabad',
    startDate: '2026-08-12',
    expectedCompletionDate: '2026-09-18',
    stages: buildStandardWorkflowStages('proj-1', 100, '68_PERCENT'),
    notes: 'Premium commercial rooftop installation with 540W Mono PERC Bifacial modules and Sungrow 100kW Inverter. Client requires early commissioning before month-end billing cycle.',
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-09-06T17:00:00Z'
  },
  {
    id: 'proj-2',
    projectCode: 'SOL-2026-002',
    customerId: 'cust-2',
    customerName: 'Zenith Textiles Mills',
    title: '250 kW High Tension Rooftop Solar',
    capacityKw: 250,
    totalValue: 11800000,
    status: 'CIVIL & STRUCTURE',
    currentStageKey: 'structure_fabrication',
    completionPercentage: 35,
    projectManagerId: 'emp-2',
    projectManagerName: 'Amit Sharma',
    assignedUsers: [
      {
        id: 'asgn-2-1',
        projectId: 'proj-2',
        userId: 'emp-3',
        userName: 'Rajesh Kumar',
        userEmail: 'rajesh.kumar@solarpulse.com',
        employeeCode: 'EMP003',
        role: 'Site Survey Engineer',
        department: 'Engineering',
        assignedAt: '2026-08-14T11:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Detailed roof load audit for spinning mill shed.',
        isActive: true
      },
      {
        id: 'asgn-2-2',
        projectId: 'proj-2',
        userId: 'emp-3',
        userName: 'Rajesh Kumar',
        userEmail: 'rajesh.kumar@solarpulse.com',
        employeeCode: 'EMP003',
        role: 'Civil Team',
        department: 'Civil',
        assignedAt: '2026-08-15T12:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Structural steel foundation casting and roof member bracing.',
        isActive: true
      },
      {
        id: 'asgn-2-3',
        projectId: 'proj-2',
        userId: 'emp-6',
        userName: 'Dinesh Yadav',
        userEmail: 'dinesh.yadav@solarpulse.com',
        employeeCode: 'EMP006',
        role: 'Structure Team',
        department: 'Structure',
        assignedAt: '2026-08-16T10:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Heavy duty C-channel structure fabrication for 250 kW plant.',
        isActive: true
      },
      {
        id: 'asgn-2-4',
        projectId: 'proj-2',
        userId: 'emp-8',
        userName: 'Ankit Joshi',
        userEmail: 'ankit.joshi@solarpulse.com',
        employeeCode: 'EMP008',
        role: 'Electrical Team',
        department: 'Electrical',
        assignedAt: '2026-08-18T15:00:00Z',
        assignedBy: 'System Admin',
        notes: 'High tension 11kV evacuation and transformer synchronization design.',
        isActive: true
      },
      {
        id: 'asgn-2-5',
        projectId: 'proj-2',
        userId: 'emp-4',
        userName: 'Priya Verma',
        userEmail: 'priya.verma@solarpulse.com',
        employeeCode: 'EMP004',
        role: 'Sales Executive',
        department: 'Sales',
        assignedAt: '2026-08-12T14:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Commercial sales lead and PPA contract specialist.',
        isActive: true
      }
    ],
    siteAddress: 'Survey No. 118, NH-48, Sachin, Surat',
    city: 'Surat',
    startDate: '2026-08-15',
    expectedCompletionDate: '2026-10-05',
    stages: buildStandardWorkflowStages('proj-2', 250, 'STAGE_4'),
    notes: 'Textile spinning mill rooftop. Structural load reinforcement underway.',
    createdAt: '2026-08-14T11:00:00Z',
    updatedAt: '2026-09-05T16:00:00Z'
  },
  {
    id: 'proj-3',
    projectCode: 'SOL-2026-003',
    customerId: 'cust-3',
    customerName: 'Apex Super Specialty Hospital',
    title: '40 kW Hospital Solar & Emergency Backup Interlock',
    capacityKw: 40,
    totalValue: 2150000,
    status: 'DESIGN & APPROVALS',
    currentStageKey: 'customer_confirmation',
    completionPercentage: 20,
    projectManagerId: 'emp-2',
    projectManagerName: 'Amit Sharma',
    assignedUsers: [
      {
        id: 'asgn-3-1',
        projectId: 'proj-3',
        userId: 'emp-3',
        userName: 'Rajesh Kumar',
        userEmail: 'rajesh.kumar@solarpulse.com',
        employeeCode: 'EMP003',
        role: 'Site Survey Engineer',
        department: 'Engineering',
        assignedAt: '2026-08-21T09:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Completed survey of hospital terrace and generator interlock layout.',
        isActive: true
      },
      {
        id: 'asgn-3-2',
        projectId: 'proj-3',
        userId: 'emp-8',
        userName: 'Ankit Joshi',
        userEmail: 'ankit.joshi@solarpulse.com',
        employeeCode: 'EMP008',
        role: 'Electrical Team',
        department: 'Electrical',
        assignedAt: '2026-08-22T10:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Zero export and DG synchronization design.',
        isActive: true
      },
      {
        id: 'asgn-3-3',
        projectId: 'proj-3',
        userId: 'emp-5',
        userName: 'Rahul Mehta',
        userEmail: 'rahul.mehta@solarpulse.com',
        employeeCode: 'EMP005',
        role: 'Sales Executive',
        department: 'Sales',
        assignedAt: '2026-08-20T14:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Hospital administration coordinator.',
        isActive: true
      }
    ],
    siteAddress: 'Ring Road, Bodakdev, Ahmedabad',
    city: 'Ahmedabad',
    startDate: '2026-08-22',
    expectedCompletionDate: '2026-09-28',
    stages: buildStandardWorkflowStages('proj-3', 40, 'STAGE_2'),
    notes: 'Hospital load requires zero export interlock until Discom meter arrives.',
    createdAt: '2026-08-21T09:00:00Z',
    updatedAt: '2026-09-04T12:00:00Z'
  },
  {
    id: 'proj-4',
    projectCode: 'SOL-2026-004',
    customerId: 'cust-4',
    customerName: 'GreenTech Logistics Hub',
    title: '50 kW Warehouse Solar PV Plant',
    capacityKw: 50,
    totalValue: 2600000,
    status: 'COMPLETED',
    currentStageKey: 'service_amc',
    completionPercentage: 100,
    projectManagerId: 'emp-2',
    projectManagerName: 'Amit Sharma',
    assignedUsers: [
      {
        id: 'asgn-4-1',
        projectId: 'proj-4',
        userId: 'emp-3',
        userName: 'Rajesh Kumar',
        userEmail: 'rajesh.kumar@solarpulse.com',
        employeeCode: 'EMP003',
        role: 'Site Survey Engineer',
        department: 'Engineering',
        assignedAt: '2026-06-25T10:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Initial warehouse roof assessment and shadow study.',
        isActive: true
      },
      {
        id: 'asgn-4-2',
        projectId: 'proj-4',
        userId: 'emp-7',
        userName: 'Manoj Tiwari',
        userEmail: 'manoj.tiwari@solarpulse.com',
        employeeCode: 'EMP007',
        role: 'Installation Team',
        department: 'Installation',
        assignedAt: '2026-07-05T09:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Installation lead for trapezoidal sheet mounting clamps.',
        isActive: true
      },
      {
        id: 'asgn-4-3',
        projectId: 'proj-4',
        userId: 'emp-8',
        userName: 'Ankit Joshi',
        userEmail: 'ankit.joshi@solarpulse.com',
        employeeCode: 'EMP008',
        role: 'Electrical Team',
        department: 'Electrical',
        assignedAt: '2026-07-15T11:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Commissioning of dual 25kW solar inverters.',
        isActive: true
      },
      {
        id: 'asgn-4-4',
        projectId: 'proj-4',
        userId: 'emp-11',
        userName: 'Rohit Verma',
        userEmail: 'rohit.verma@solarpulse.com',
        employeeCode: 'EMP011',
        role: 'Service Manager',
        department: 'Service',
        assignedAt: '2026-08-29T10:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Active Gold AMC contract manager and quarterly inspection coordinator.',
        isActive: true
      },
      {
        id: 'asgn-4-5',
        projectId: 'proj-4',
        userId: 'emp-12',
        userName: 'Ketan Solanki',
        userEmail: 'ketan.solanki@solarpulse.com',
        employeeCode: 'EMP012',
        role: 'Technician',
        department: 'Service',
        assignedAt: '2026-08-29T11:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Regular panel wash cycle and thermal hotspot inspection.',
        isActive: true
      }
    ],
    siteAddress: 'Warehousing Zone, Changodar, Ahmedabad',
    city: 'Ahmedabad',
    startDate: '2026-07-01',
    expectedCompletionDate: '2026-08-25',
    actualCompletionDate: '2026-08-29',
    stages: buildStandardWorkflowStages('proj-4', 50, 'COMPLETED'),
    notes: 'Commissioned on 29 Aug 2026. Generating ~220 units daily. Gold AMC active.',
    createdAt: '2026-06-25T10:00:00Z',
    updatedAt: '2026-08-30T10:00:00Z'
  },
  {
    id: 'proj-5',
    projectCode: 'SOL-2026-005',
    customerId: 'cust-5',
    customerName: 'Sunrise Cold Storage & Agro',
    title: '75 kW Cold Storage Solar PV Plant',
    capacityKw: 75,
    totalValue: 3950000,
    status: 'DELAYED',
    currentStageKey: 'meter_synchronisation',
    completionPercentage: 58,
    projectManagerId: 'emp-2',
    projectManagerName: 'Amit Sharma',
    assignedUsers: [
      {
        id: 'asgn-5-1',
        projectId: 'proj-5',
        userId: 'emp-3',
        userName: 'Rajesh Kumar',
        userEmail: 'rajesh.kumar@solarpulse.com',
        employeeCode: 'EMP003',
        role: 'Site Survey Engineer',
        department: 'Engineering',
        assignedAt: '2026-07-05T08:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Puff panel roof safety survey and walk-way path planning.',
        isActive: true
      },
      {
        id: 'asgn-5-2',
        projectId: 'proj-5',
        userId: 'emp-6',
        userName: 'Dinesh Yadav',
        userEmail: 'dinesh.yadav@solarpulse.com',
        employeeCode: 'EMP006',
        role: 'Structure Team',
        department: 'Structure',
        assignedAt: '2026-07-12T09:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Non-penetrating clamp structure mounting.',
        isActive: true
      },
      {
        id: 'asgn-5-3',
        projectId: 'proj-5',
        userId: 'emp-7',
        userName: 'Manoj Tiwari',
        userEmail: 'manoj.tiwari@solarpulse.com',
        employeeCode: 'EMP007',
        role: 'Installation Team',
        department: 'Installation',
        assignedAt: '2026-07-20T10:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Solar module placement and string looping.',
        isActive: true
      },
      {
        id: 'asgn-5-4',
        projectId: 'proj-5',
        userId: 'emp-8',
        userName: 'Ankit Joshi',
        userEmail: 'ankit.joshi@solarpulse.com',
        employeeCode: 'EMP008',
        role: 'Electrical Team',
        department: 'Electrical',
        assignedAt: '2026-07-25T14:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Discom bi-directional meter coordination & CEIG liaison.',
        isActive: true
      },
      {
        id: 'asgn-5-5',
        projectId: 'proj-5',
        userId: 'emp-12',
        userName: 'Ketan Solanki',
        userEmail: 'ketan.solanki@solarpulse.com',
        employeeCode: 'EMP012',
        role: 'Technician',
        department: 'Service',
        assignedAt: '2026-08-01T11:00:00Z',
        assignedBy: 'System Admin',
        notes: 'Field earthing verification and meter cabinet wiring.',
        isActive: true
      }
    ],
    siteAddress: 'Mahuva Highway, Talaja Road, Bhavnagar',
    city: 'Bhavnagar',
    startDate: '2026-07-10',
    expectedCompletionDate: '2026-08-30',
    stages: buildStandardWorkflowStages('proj-5', 75, 'DELAYED'),
    notes: 'Delayed due to Discom bi-directional meter test certificate backlog at sub-division.',
    createdAt: '2026-07-05T08:00:00Z',
    updatedAt: '2026-09-06T18:00:00Z'
  }
];

const initialPayments: PaymentRecord[] = [
  {
    id: 'pay-1',
    receiptNumber: 'RCPT-2026-001',
    projectId: 'proj-1',
    customerId: 'cust-1',
    customerName: 'ABC Industries Ltd.',
    milestone: 'Advance',
    amount: 2000000,
    status: 'PAID',
    dueDate: '2026-08-15',
    paidDate: '2026-08-16',
    paymentMode: 'Bank NEFT/RTGS',
    transactionReference: 'HDFC-RTGS-9821034',
    notes: 'Advance 40% received upon agreement signing',
    tallySyncStatus: 'SYNCED',
    tallyReference: 'TALLY-VCH-8821'
  },
  {
    id: 'pay-2',
    receiptNumber: 'RCPT-2026-002',
    projectId: 'proj-1',
    customerId: 'cust-1',
    customerName: 'ABC Industries Ltd.',
    milestone: 'Installation',
    amount: 2000000,
    status: 'PAID',
    dueDate: '2026-09-04',
    paidDate: '2026-09-05',
    paymentMode: 'Bank NEFT/RTGS',
    transactionReference: 'ICICI-RTGS-1102938',
    notes: 'Second milestone 40% released upon structure & module delivery at site',
    tallySyncStatus: 'SYNCED',
    tallyReference: 'TALLY-VCH-8904'
  },
  {
    id: 'pay-3',
    receiptNumber: 'RCPT-2026-003',
    projectId: 'proj-1',
    customerId: 'cust-1',
    customerName: 'ABC Industries Ltd.',
    milestone: 'Final Handover',
    amount: 1000000,
    status: 'PENDING',
    dueDate: '2026-09-20',
    notes: 'Final 20% balance payable upon Net Metering sync & handover certificate',
    tallySyncStatus: 'NOT SYNCED'
  },
  {
    id: 'pay-4',
    receiptNumber: 'RCPT-2026-004',
    projectId: 'proj-2',
    customerId: 'cust-2',
    customerName: 'Zenith Textiles Mills',
    milestone: 'Advance',
    amount: 4000000,
    status: 'PAID',
    dueDate: '2026-08-20',
    paidDate: '2026-08-21',
    paymentMode: 'Bank NEFT/RTGS',
    transactionReference: 'SBI-RTGS-5542109',
    notes: 'Advance 35% milestone',
    tallySyncStatus: 'SYNCED',
    tallyReference: 'TALLY-VCH-8833'
  },
  {
    id: 'pay-5',
    receiptNumber: 'RCPT-2026-005',
    projectId: 'proj-4',
    customerId: 'cust-4',
    customerName: 'GreenTech Logistics Hub',
    milestone: 'Advance',
    amount: 1300000,
    status: 'PAID',
    dueDate: '2026-07-05',
    paidDate: '2026-07-06',
    paymentMode: 'Bank NEFT/RTGS',
    tallySyncStatus: 'SYNCED'
  },
  {
    id: 'pay-6',
    receiptNumber: 'RCPT-2026-006',
    projectId: 'proj-4',
    customerId: 'cust-4',
    customerName: 'GreenTech Logistics Hub',
    milestone: 'Final Handover',
    amount: 1300000,
    status: 'PAID',
    dueDate: '2026-08-29',
    paidDate: '2026-08-30',
    paymentMode: 'Bank NEFT/RTGS',
    tallySyncStatus: 'SYNCED'
  },
  {
    id: 'pay-7',
    receiptNumber: 'RCPT-2026-007',
    projectId: 'proj-5',
    customerId: 'cust-5',
    customerName: 'Sunrise Cold Storage & Agro',
    milestone: 'Installation',
    amount: 1500000,
    status: 'OVERDUE',
    dueDate: '2026-08-25',
    notes: 'Payment delayed by client pending Discom inspection clearance',
    tallySyncStatus: 'NOT SYNCED'
  }
];

const initialExpenses: ExpenseRecord[] = [
  {
    id: 'exp-1',
    expenseNumber: 'EXP-2026-081',
    projectId: 'proj-1',
    projectCode: 'SOL-2026-001',
    vendorName: 'Waaree Energies Ltd',
    category: 'Material - Solar Panels',
    amount: 1850000,
    date: '2026-08-25',
    paymentMode: 'Bank NEFT/RTGS',
    referenceNo: 'WAA-INV-44910',
    notes: '185 units of 540W Mono PERC Bifacial Solar PV Modules',
    tallySyncStatus: 'SYNCED'
  },
  {
    id: 'exp-2',
    expenseNumber: 'EXP-2026-082',
    projectId: 'proj-1',
    projectCode: 'SOL-2026-001',
    vendorName: 'Sungrow Power India Pvt Ltd',
    category: 'Material - Inverter',
    amount: 620000,
    date: '2026-08-28',
    paymentMode: 'Bank NEFT/RTGS',
    referenceNo: 'SG-INV-9921',
    notes: '1x 100kW SG100CX 3-Phase Multi-MPPT Inverter',
    tallySyncStatus: 'SYNCED'
  },
  {
    id: 'exp-3',
    expenseNumber: 'EXP-2026-083',
    projectId: 'proj-1',
    projectCode: 'SOL-2026-001',
    vendorName: 'Shreeji Galvanizers & Steel',
    category: 'Structure Steel',
    amount: 420000,
    date: '2026-08-24',
    paymentMode: 'Bank RTGS',
    referenceNo: 'SGS-00219',
    notes: 'Hot Dip Galvanized Solar Mounting Structure 80 micron HDG',
    tallySyncStatus: 'SYNCED'
  },
  {
    id: 'exp-4',
    expenseNumber: 'EXP-2026-084',
    projectId: 'proj-1',
    projectCode: 'SOL-2026-001',
    vendorName: 'Gujarat ReadyMix Concrete Co.',
    category: 'Civil Raw Materials',
    amount: 145000,
    date: '2026-08-21',
    paymentMode: 'Bank Cheque',
    referenceNo: 'RMC-CHQ-104',
    notes: 'M25 ready-mix concrete for roof pedestals',
    tallySyncStatus: 'SYNCED'
  },
  {
    id: 'exp-5',
    expenseNumber: 'EXP-2026-085',
    projectId: 'proj-1',
    projectCode: 'SOL-2026-001',
    vendorName: 'Polycab India Ltd',
    category: 'Material - Cables & BOS',
    amount: 310000,
    date: '2026-09-02',
    paymentMode: 'Bank NEFT',
    referenceNo: 'POLY-8812',
    notes: 'Solar DC 4 sq mm cable 1500m + 3.5C x 95 sq mm XLPE Aluminium AC cable',
    tallySyncStatus: 'NOT SYNCED'
  }
];

const initialAttendance: AttendanceRecord[] = [
  {
    id: 'att-1',
    employeeId: 'emp-3',
    authUid: 'demo-usr-5',
    employeeCode: 'EMP003',
    employeeEmail: 'survey@rejoysolar.com',
    employeeName: 'Rajesh Kumar',
    date: '2026-09-07',
    checkInTime: '09:05 AM',
    checkOutTime: '06:15 PM',
    gpsCheckIn: {
      latitude: 22.9868,
      longitude: 72.3789,
      locationName: 'Sanand GIDC Plot 42 (ABC Industries Site)'
    },
    siteProjectId: 'proj-1',
    siteProjectTitle: '100 kW Rooftop Solar - ABC Industries',
    status: 'FIELD VISIT',
    fuelExpense: {
      initialOdometerReading: 14210,
      finalOdometerReading: 14258,
      totalKmDriven: 48,
      initialOdometerImageName: 'odometer_start_07sep.jpg',
      finalOdometerImageName: 'odometer_end_07sep.jpg',
      submittedAt: '2026-09-07T09:05:00Z',
      updatedAt: '2026-09-07T18:15:00Z'
    }
  },
  {
    id: 'att-2',
    employeeId: 'emp-7',
    authUid: 'demo-usr-9',
    employeeCode: 'EMP007',
    employeeEmail: 'installation@rejoysolar.com',
    employeeName: 'Manoj Tiwari',
    date: '2026-09-07',
    checkInTime: '08:50 AM',
    checkOutTime: '05:45 PM',
    gpsCheckIn: {
      latitude: 22.9869,
      longitude: 72.3790,
      locationName: 'Sanand GIDC Plot 42 (ABC Industries Site)'
    },
    siteProjectId: 'proj-1',
    siteProjectTitle: '100 kW Rooftop Solar - ABC Industries',
    status: 'FIELD VISIT',
    fuelExpense: {
      initialOdometerReading: 28400,
      finalOdometerReading: 28435,
      totalKmDriven: 35,
      initialOdometerImageName: 'odometer_morning.jpg',
      finalOdometerImageName: 'odometer_evening.jpg',
      submittedAt: '2026-09-07T08:50:00Z',
      updatedAt: '2026-09-07T17:45:00Z'
    }
  },
  {
    id: 'att-3',
    employeeId: 'emp-2',
    authUid: 'demo-usr-4',
    employeeCode: 'EMP002',
    employeeEmail: 'projectmanager@rejoysolar.com',
    employeeName: 'Amit Sharma',
    date: '2026-09-07',
    checkInTime: '09:15 AM',
    status: 'PRESENT'
  },
  {
    id: 'att-4',
    employeeId: 'emp-9',
    authUid: 'demo-usr-11',
    employeeCode: 'EMP009',
    employeeEmail: 'accountant@rejoysolar.com',
    employeeName: 'Sneha Kulkarni',
    date: '2026-09-07',
    checkInTime: '09:30 AM',
    status: 'PRESENT'
  },
  {
    id: 'att-5',
    employeeId: 'emp-4',
    authUid: 'demo-usr-2',
    employeeCode: 'EMP004',
    employeeEmail: 'salesmanager@rejoysolar.com',
    employeeName: 'Priya Verma',
    date: '2026-09-07',
    checkInTime: '09:10 AM',
    status: 'PRESENT'
  }
];

const initialPayslips: Payslip[] = [
  {
    id: 'pay-202609-emp-3',
    payslipNumber: 'PAY-202609-EMP003',
    employeeId: 'emp-3',
    employeeCode: 'EMP003',
    employeeName: 'Rajesh Kumar',
    department: 'Engineering',
    designation: 'Project Engineer & Commissioning Specialist',
    month: 'September 2026',
    generatedDate: '2026-09-08',
    baseSalary: 55000,
    overtimeType: 'CALCULATED',
    overtimeHours: 14,
    overtimeRatePerHour: 300,
    overtimeAmount: 4200,
    additionalExpenses: [
      { id: 'exp-1', description: 'Sanand Site Commute & Fuel Allowance', amount: 2500 },
      { id: 'exp-2', description: 'HT Substation Tools & PPE Reimbursement', amount: 1800 }
    ],
    totalAdditionalExpenses: 4300,
    deductions: [
      { id: 'ded-1', description: 'Provident Fund (PF Employee Share)', amount: 1800 },
      { id: 'ded-2', description: 'TDS Withholding Tax', amount: 2500 }
    ],
    totalDeductions: 4300,
    grossEarnings: 63500,
    netPay: 59200,
    status: 'GENERATED',
    paymentMode: 'NEFT/RTGS Bank Transfer',
    bankReferenceNo: 'HDFC26090888910'
  },
  {
    id: 'pay-202609-emp-8',
    payslipNumber: 'PAY-202609-EMP008',
    employeeId: 'emp-8',
    employeeCode: 'EMP008',
    employeeName: 'Ankit Joshi',
    department: 'Electrical',
    designation: 'Senior Electrical Engineer (LT/HT)',
    month: 'September 2026',
    generatedDate: '2026-09-05',
    baseSalary: 62000,
    overtimeType: 'DIRECT',
    overtimeAmount: 6000,
    additionalExpenses: [
      { id: 'exp-3', description: 'Morbi Industrial Field Travel Allowance', amount: 3500 },
      { id: 'exp-4', description: 'Food & Outstation Lodging Allowance', amount: 2200 }
    ],
    totalAdditionalExpenses: 5700,
    deductions: [
      { id: 'ded-3', description: 'PF Statutory Contribution', amount: 2100 },
      { id: 'ded-4', description: 'Professional Tax (Gujarat)', amount: 200 }
    ],
    totalDeductions: 2300,
    grossEarnings: 73700,
    netPay: 71400,
    status: 'PAID',
    paymentDate: '2026-09-07',
    paymentMode: 'NEFT/RTGS Bank Transfer',
    bankReferenceNo: 'ICIC26090712390'
  }
];

const initialHolidays: HolidayRecord[] = [
  {
    id: 'hol-1',
    name: 'Republic Day',
    date: '2026-01-26',
    type: 'NATIONAL',
    description: 'Celebration of the Constitution of India coming into effect. Mandatory national paid holiday.',
    isOptional: false,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-2',
    name: 'Holi (Dhulandi)',
    date: '2026-03-03',
    type: 'FESTIVAL',
    description: 'Festival of colors and arrival of spring. Closed for all corporate offices and installation sites.',
    isOptional: false,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-3',
    name: 'Eid-ul-Fitr',
    date: '2026-03-20',
    type: 'FESTIVAL',
    description: 'Islamic festival marking the culmination of Ramadan holy month. Subject to moon sighting.',
    isOptional: false,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-4',
    name: 'Good Friday',
    date: '2026-04-03',
    type: 'FESTIVAL',
    description: 'Christian holy day commemorating the crucifixion of Jesus Christ.',
    isOptional: true,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-5',
    name: 'Dr. B.R. Ambedkar Jayanti',
    date: '2026-04-14',
    type: 'NATIONAL',
    description: 'Birth anniversary of Dr. Bhimrao Ramji Ambedkar, father of the Indian Constitution.',
    isOptional: false,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-6',
    name: 'Gujarat Gaurav Din / Labour Day',
    date: '2026-05-01',
    type: 'REGIONAL',
    description: 'Gujarat State Foundation Day & International Workers Day recognition.',
    isOptional: false,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-7',
    name: 'Bakrid (Eid-ul-Adha)',
    date: '2026-05-27',
    type: 'FESTIVAL',
    description: 'Feast of the Sacrifice. Floating optional holiday for eligible workforce.',
    isOptional: true,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-8',
    name: 'World Environment & Solar Day',
    date: '2026-06-05',
    type: 'COMPANY',
    description: 'SolarPulse special corporate day honoring green solar energy innovation, clean tech, and team sustainability.',
    isOptional: false,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-9',
    name: 'Independence Day',
    date: '2026-08-15',
    type: 'NATIONAL',
    description: 'India Independence Day flag hoisting ceremony followed by holiday.',
    isOptional: false,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-10',
    name: 'Raksha Bandhan',
    date: '2026-08-28',
    type: 'FESTIVAL',
    description: 'Celebration of bond between brothers and sisters. Optional holiday.',
    isOptional: true,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-11',
    name: 'Janmashtami (Lord Krishna Birth)',
    date: '2026-09-04',
    type: 'FESTIVAL',
    description: 'Celebration of the birth of Lord Krishna. Official holiday across Western India operations.',
    isOptional: false,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-12',
    name: 'Ganesh Chaturthi',
    date: '2026-09-14',
    type: 'FESTIVAL',
    description: 'Vinayaka Chaturthi celebration & office sthapana pooja.',
    isOptional: false,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-13',
    name: 'Mahatma Gandhi Jayanti',
    date: '2026-10-02',
    type: 'NATIONAL',
    description: 'Birth anniversary of Mahatma Gandhi. Mandatory national public holiday.',
    isOptional: false,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-14',
    name: 'Dussehra (Vijayadashami)',
    date: '2026-10-20',
    type: 'FESTIVAL',
    description: 'Triumph of light over darkness. Closed for all offices and manufacturing yards.',
    isOptional: false,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-15',
    name: 'SolarPulse Annual Foundation Day',
    date: '2026-11-01',
    type: 'COMPANY',
    description: 'SolarPulse Corporate Foundation Day and Annual Employee Excellence Awards celebration.',
    isOptional: false,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-16',
    name: 'Diwali (Deepavali & Lakshmi Puja)',
    date: '2026-11-08',
    type: 'FESTIVAL',
    description: 'Grand festival of lights. Mandatory paid holiday for all corporate, project, and warehouse units.',
    isOptional: false,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-17',
    name: 'Gujarati New Year (Bestu Varas)',
    date: '2026-11-09',
    type: 'REGIONAL',
    description: 'Vikram Samvat 2083 New Year celebrations and chopda pujan across Gujarat branches.',
    isOptional: false,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-18',
    name: 'Bhai Dooj',
    date: '2026-11-10',
    type: 'FESTIVAL',
    description: 'Celebration of brotherly bond after Diwali. Optional holiday.',
    isOptional: true,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-19',
    name: 'Guru Nanak Jayanti',
    date: '2026-11-24',
    type: 'FESTIVAL',
    description: 'Gurpurab celebrating the birth of Guru Nanak Dev Ji. Optional floating leave.',
    isOptional: true,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  },
  {
    id: 'hol-20',
    name: 'Christmas Day',
    date: '2026-12-25',
    type: 'FESTIVAL',
    description: 'Christmas celebration and year-end shutdown period begins.',
    isOptional: false,
    applicableDepartments: ['All Departments'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'HR Department'
  }
];

const initialServiceTickets: ServiceTicket[] = [
  {
    id: 'srv-1',
    ticketId: 'SRV-2026-001',
    customerId: 'cust-4',
    customerName: 'GreenTech Logistics Hub',
    projectId: 'proj-4',
    projectTitle: '50 kW Warehouse Solar PV Plant',
    issue: 'Inverter reported temporary grid undervoltage fault during 12:30 PM power dip.',
    category: 'Inverter Error / Offline',
    priority: 'MEDIUM',
    assignedTechnicianId: 'emp-11',
    assignedTechnicianName: 'Rohit Verma',
    status: 'RESOLVED',
    createdDate: '2026-09-02',
    scheduledDate: '2026-09-03',
    resolvedDate: '2026-09-03',
    notes: 'Firmware AC trip voltage threshold recalibrated to Discom line variance standard. Generating normal 48.2 kW at peak.',
    photos: []
  },
  {
    id: 'srv-2',
    ticketId: 'SRV-2026-002',
    customerId: 'cust-4',
    customerName: 'GreenTech Logistics Hub',
    projectId: 'proj-4',
    projectTitle: '50 kW Warehouse Solar PV Plant',
    issue: 'Scheduled Q3 Routine Solar Panel Dust Cleaning & Thermal Imaging Inspection',
    category: 'Panel Cleaning / Damage',
    priority: 'LOW',
    assignedTechnicianId: 'emp-11',
    assignedTechnicianName: 'Rohit Verma',
    status: 'VISIT SCHEDULED',
    createdDate: '2026-09-05',
    scheduledDate: '2026-09-12',
    notes: 'Water pressure cleaner and thermal drone team booked for Saturday visit.',
    photos: []
  }
];

const initialAMCContracts: AMCContract[] = [
  {
    id: 'amc-1',
    amcCode: 'AMC-2026-01',
    customerId: 'cust-4',
    customerName: 'GreenTech Logistics Hub',
    projectId: 'proj-4',
    projectTitle: '50 kW Warehouse Solar PV Plant',
    planName: 'Gold Preventive (4 Visits/Yr)',
    startDate: '2026-09-01',
    endDate: '2027-08-31',
    renewalDate: '2027-08-15',
    annualAmount: 48000,
    visitsCompleted: 0,
    totalVisits: 4,
    status: 'ACTIVE'
  }
];

const initialNotifications: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Site Survey Completed',
    message: 'Rajesh Kumar submitted the detailed survey report for ABC Industries.',
    type: 'SUCCESS',
    timestamp: '2026-09-06 04:30 PM',
    read: false,
    linkType: 'PROJECT',
    linkId: 'proj-1'
  },
  {
    id: 'notif-2',
    title: 'Milestone Payment Received',
    message: '₹20,00,000 received for ABC Industries (Installation Milestone).',
    type: 'INFO',
    timestamp: '2026-09-05 02:15 PM',
    read: false,
    linkType: 'PAYMENT',
    linkId: 'pay-2'
  },
  {
    id: 'notif-3',
    title: 'Project Delayed Warning',
    message: 'Sunrise Cold Storage (75 kW) is delayed on Meter Synchronisation stage.',
    type: 'WARNING',
    timestamp: '2026-09-04 11:00 AM',
    read: true,
    linkType: 'PROJECT',
    linkId: 'proj-5'
  },
  {
    id: 'notif-4',
    title: 'New Solar Lead Assigned',
    message: 'New high-value lead (200 kW Balaji Agro) assigned to Priya Verma.',
    type: 'INFO',
    timestamp: '2026-09-07 09:00 AM',
    read: false,
    linkType: 'LEAD',
    linkId: 'lead-5'
  }
];

const initialSettings: SystemSettings = {
  companyName: 'Rejoy Solar Power Pvt. Ltd.',
  companyAddress: '401-404, Solitaire Heights, SG Highway, Ahmedabad, Gujarat 380054',
  companyPhone: '+91 79 4001 8800',
  companyEmail: 'info@rejoysolar.com',
  companyGst: '24AAECS9921D1Z8',
  logoUrl: '/logo-dark.png',
  currencySymbol: '₹',
  taxRatePercent: 18,
  tallyServerUrl: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TALLY_SERVER_URL) ? import.meta.env.VITE_TALLY_SERVER_URL : '',
  tallyCompany: 'Rejoy Solar 2026-27',
  tallyStatus: 'NOT CONFIGURED',
  whatsAppStatus: 'SANDBOX_READY'
};

const initialSurveys: SiteSurveyData[] = [
  {
    id: 'surv-1',
    projectId: 'proj-1',
    customerId: 'cust-1',
    engineerId: 'emp-3',
    engineerName: 'Rajesh Kumar',
    surveyDate: '2026-08-14',
    status: 'APPROVED',
    siteAddress: 'Plot No. 42-45, GIDC Industrial Estate, Sanand, Ahmedabad',
    gps: {
      latitude: 22.9868,
      longitude: 72.3789,
      locationName: 'GIDC Sanand Phase II'
    },
    roofType: 'RCC Flat',
    roofAreaSqFt: 12500,
    shadowFreeAreaSqFt: 11000,
    shadowObstacles: 'Small parapet wall (3ft) on east, negligible shadow impact during peak 9am-4pm.',
    electricityBillNumber: 'SAN-HT-99210',
    monthlyAverageConsumptionUnits: 14500,
    sanctionedLoadKw: 150,
    tariffRatePerUnit: 8.45,
    existingStructureCondition: 'Heavy industrial RCC roof with waterproofing in great shape.',
    recommendedCapacityKw: 100,
    feasibilityScore: 'EXCELLENT',
    photos: [
      {
        id: 'sp-1',
        url: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=400',
        caption: 'South facing roof clear area',
        type: 'BEFORE',
        uploadedAt: '2026-08-14',
        uploadedBy: 'Rajesh Kumar'
      },
      {
        id: 'sp-2',
        url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&q=80&w=400',
        caption: 'Main LT switchgear panel room',
        type: 'DURING',
        uploadedAt: '2026-08-14',
        uploadedBy: 'Rajesh Kumar'
      }
    ],
    notes: 'Highly recommended for 100 kW grid-tied installation. Estimated monthly generation: 13,500 units saving ~₹1,14,000/mo.',
    reviewedBy: 'Amit Sharma (PM)',
    reviewedAt: '2026-08-15'
  }
];

const initialQuotations: Quotation[] = [
  REFERENCE_5KW_QUOTATION,
  {
    id: 'quote-1',
    quotationNumber: 'QTN-2026-0042',
    customerId: 'cust-1',
    customerName: 'ABC Industries Ltd.',
    projectId: 'proj-1',
    capacityKw: 100,
    subtotal: 4500000,
    discountAmount: 262712,
    gstPercent: 18,
    gstAmount: 762712,
    totalAmount: 5000000,
    paymentTerms: '40% Advance upon contract, 40% on material delivery at site, 20% on Net Meter commissioning.',
    warrantyDetails: '25 Years Linear Performance Warranty on Solar PV Modules. 5 Years on String Inverter.',
    termsAndConditions: 'Turnkey EPC including CEIG approval, Discom Net Meter liaison, structural calculation, installation, testing and 1 year free O&M.',
    status: 'ACCEPTED',
    validUntil: '2026-09-15',
    createdAt: '2026-08-12',
    acceptedAt: '2026-08-16',
    items: [
      { id: 'qi-1', category: 'Panels', description: 'Tier-1 Mono PERC Bifacial 540W Modules', makeModel: 'Waaree / Adani 540Wp', quantity: 185, unit: 'Nos', unitPrice: 10200, totalPrice: 1887000 },
      { id: 'qi-2', category: 'Inverter', description: '100 kW On-Grid 3-Phase String Inverter with Multi-MPPT', makeModel: 'Sungrow SG100CX', quantity: 1, unit: 'Set', unitPrice: 620000, totalPrice: 620000 },
      { id: 'qi-3', category: 'Structure', description: 'HDG 80 Micron Elevated Module Mounting Structure with 23° Tilt', makeModel: 'Hot Dip Galvanized Steel', quantity: 100, unit: 'kW', unitPrice: 4200, totalPrice: 420000 },
      { id: 'qi-4', category: 'Civil Work', description: 'RCC Pedestal Casting M25 with Anchor Bolts & Chemical Waterproofing', makeModel: 'Civil Pedestals', quantity: 28, unit: 'Pillars', unitPrice: 6000, totalPrice: 168000 },
      { id: 'qi-5', category: 'Electrical', description: 'ACDB, DCDB with SPD Type II, Earthing Pits (4 Nos) & ESE Lightning Protection', makeModel: 'ABB/L&T Breakers + Chemical Earth', quantity: 1, unit: 'Lot', unitPrice: 490000, totalPrice: 490000 },
      { id: 'qi-6', category: 'Installation', description: 'Turnkey Mechanical, Electrical, Cable Trays, Pulling & Commissioning', makeModel: 'SolarPulse Certified Engineering', quantity: 100, unit: 'kW', unitPrice: 6500, totalPrice: 650000 },
      { id: 'qi-7', category: 'Net Metering', description: 'CEIG Drawings, Discom Net Metering Liasoning & Testing', makeModel: 'Discom Standard', quantity: 1, unit: 'Job', unitPrice: 265000, totalPrice: 265000 }
    ]
  }
];

const initialProducts: ProductItem[] = [
  {
    id: 'prod-1',
    sku: 'MOD-WAA-540',
    name: 'Waaree 540Wp Mono PERC Bifacial Solar PV Module',
    category: 'Solar Panels',
    brand: 'Waaree Energies',
    specification: '540Wp Bifacial Dual Glass, 144 Half-cut Cells, IP68 Junction Box',
    unit: 'NOS',
    hsnCode: '85414011',
    unitPrice: 10200,
    sellingPrice: 12200,
    currentStock: 350,
    minStockThreshold: 80,
    location: 'Warehouse A - Bay 1',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    warehouseStocks: {
      'wh-1': 220,
      'wh-2': 90,
      'wh-3': 40
    },
    preferredVendorId: 'vnd-1',
    preferredVendorName: 'Waaree Energies Limited',
    createdAt: '2026-08-01T09:00:00Z',
    updatedAt: '2026-09-10T14:30:00Z'
  },
  {
    id: 'prod-2',
    sku: 'MOD-ADN-545',
    name: 'Adani 545Wp Mono PERC Solar Module',
    category: 'Solar Panels',
    brand: 'Adani Solar',
    specification: '545Wp High Efficiency Mono PERC, Multi-Busbar, Anodized Al Frame',
    unit: 'NOS',
    hsnCode: '85414011',
    unitPrice: 10400,
    sellingPrice: 12500,
    currentStock: 220,
    minStockThreshold: 60,
    location: 'Warehouse A - Bay 2',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    warehouseStocks: {
      'wh-1': 140,
      'wh-2': 50,
      'wh-3': 30
    },
    preferredVendorId: 'vnd-1',
    preferredVendorName: 'Waaree Energies Limited',
    createdAt: '2026-08-01T09:00:00Z',
    updatedAt: '2026-09-08T11:00:00Z'
  },
  {
    id: 'prod-3',
    sku: 'INV-SUN-110',
    name: 'Sungrow 110kW String Inverter SG110CX',
    category: 'Inverters',
    brand: 'Sungrow',
    specification: '110kW 3-Phase Multi-MPPT (9 MPPTs), AFCI Arc Fault, IP66 Outdoor',
    unit: 'NOS',
    hsnCode: '85044090',
    unitPrice: 285000,
    sellingPrice: 330000,
    currentStock: 5,
    minStockThreshold: 2,
    location: 'Warehouse B - Secure Rack 1',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    warehouseStocks: {
      'wh-1': 3,
      'wh-2': 1,
      'wh-3': 1
    },
    preferredVendorId: 'vnd-2',
    preferredVendorName: 'Sungrow Power Supply India Pvt Ltd',
    createdAt: '2026-08-02T10:00:00Z',
    updatedAt: '2026-09-12T16:00:00Z'
  },
  {
    id: 'prod-4',
    sku: 'INV-GRO-50',
    name: 'Growatt 50kW On-Grid Inverter MAC 50KTL3-X',
    category: 'Inverters',
    brand: 'Growatt',
    specification: '50kW 3-Phase, 3 MPPTs, Type II SPD AC/DC, OLED & Touch Key',
    unit: 'NOS',
    hsnCode: '85044090',
    unitPrice: 145000,
    sellingPrice: 175000,
    currentStock: 8,
    minStockThreshold: 2,
    location: 'Warehouse B - Secure Rack 2',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    warehouseStocks: {
      'wh-1': 4,
      'wh-2': 2,
      'wh-3': 2
    },
    preferredVendorId: 'vnd-2',
    preferredVendorName: 'Sungrow Power Supply India Pvt Ltd',
    createdAt: '2026-08-02T10:00:00Z',
    updatedAt: '2026-09-05T10:00:00Z'
  },
  {
    id: 'prod-5',
    sku: 'STR-HDG-15',
    name: 'Hot Dip Galvanized Solar Mounting Structure 15° Tilt',
    category: 'Mounting Structures',
    brand: 'Jindal Steel',
    specification: '80 Micron HDG Steel, 150 kmph Wind Speed Certified, 2-in-Portrait',
    unit: 'SETS',
    hsnCode: '73089090',
    unitPrice: 3800,
    sellingPrice: 4600,
    currentStock: 140,
    minStockThreshold: 40,
    location: 'Yard 1 - Heavy Steel',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    warehouseStocks: {
      'wh-1': 90,
      'wh-2': 30,
      'wh-3': 20
    },
    preferredVendorId: 'vnd-3',
    preferredVendorName: 'Jindal Aluminium & Steel Works',
    createdAt: '2026-08-03T09:30:00Z',
    updatedAt: '2026-09-11T12:00:00Z'
  },
  {
    id: 'prod-6',
    sku: 'CAB-DC-4R',
    name: 'Polycab 1C x 4 sq.mm Solar DC Cable (Red)',
    category: 'Electrical & Cables',
    brand: 'Polycab',
    specification: 'EN 50618 TUV Certified, Crosslinked Polyolefin, 1.5kV DC Rated',
    unit: 'METERS',
    hsnCode: '85444999',
    unitPrice: 46,
    sellingPrice: 58,
    currentStock: 1800,
    minStockThreshold: 400,
    location: 'Warehouse C - Cable Reel 1',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    warehouseStocks: {
      'wh-1': 1000,
      'wh-2': 500,
      'wh-3': 300
    },
    preferredVendorId: 'vnd-4',
    preferredVendorName: 'Polycab India Limited',
    createdAt: '2026-08-04T11:00:00Z',
    updatedAt: '2026-09-14T10:00:00Z'
  },
  {
    id: 'prod-7',
    sku: 'CAB-DC-4B',
    name: 'Polycab 1C x 4 sq.mm Solar DC Cable (Black)',
    category: 'Electrical & Cables',
    brand: 'Polycab',
    specification: 'EN 50618 TUV Certified, Crosslinked Polyolefin, UV Resistant',
    unit: 'METERS',
    hsnCode: '85444999',
    unitPrice: 46,
    sellingPrice: 58,
    currentStock: 1750,
    minStockThreshold: 400,
    location: 'Warehouse C - Cable Reel 2',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    warehouseStocks: {
      'wh-1': 1000,
      'wh-2': 450,
      'wh-3': 300
    },
    preferredVendorId: 'vnd-4',
    preferredVendorName: 'Polycab India Limited',
    createdAt: '2026-08-04T11:00:00Z',
    updatedAt: '2026-09-14T10:00:00Z'
  },
  {
    id: 'prod-8',
    sku: 'CAB-AC-70',
    name: 'Havells 3.5C x 70 sq.mm Al Armoured LT XLPE Cable',
    category: 'Electrical & Cables',
    brand: 'Havells',
    specification: '1.1kV Grade Aluminum Conductor, XLPE Insulated, Galvanized Steel Armoured',
    unit: 'METERS',
    hsnCode: '85444920',
    unitPrice: 390,
    sellingPrice: 490,
    currentStock: 480,
    minStockThreshold: 150,
    location: 'Warehouse C - Heavy Drums',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    warehouseStocks: {
      'wh-1': 280,
      'wh-2': 120,
      'wh-3': 80
    },
    preferredVendorId: 'vnd-4',
    preferredVendorName: 'Polycab India Limited',
    createdAt: '2026-08-04T11:00:00Z',
    updatedAt: '2026-09-15T09:00:00Z'
  },
  {
    id: 'prod-9',
    sku: 'EARTH-CH-50',
    name: 'Chemical Earthing Electrode Kit 50mm x 3m with BFC Compound',
    category: 'Electrical & Cables',
    brand: 'Truepower',
    specification: 'Pure Copper Bonded 250 Micron, 2 Bags 25kg Earth Enhancing Compound',
    unit: 'SETS',
    hsnCode: '85359090',
    unitPrice: 4500,
    sellingPrice: 5800,
    currentStock: 35,
    minStockThreshold: 10,
    location: 'Warehouse A - Bay 5',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    warehouseStocks: {
      'wh-1': 20,
      'wh-2': 10,
      'wh-3': 5
    },
    preferredVendorId: 'vnd-5',
    preferredVendorName: 'Truepower Earthings & Lightning Systems',
    createdAt: '2026-08-05T14:00:00Z',
    updatedAt: '2026-09-09T17:00:00Z'
  },
  {
    id: 'prod-10',
    sku: 'LA-ESE-107',
    name: 'Early Streamer Emission (ESE) Lightning Arrestor 107m',
    category: 'Safety & Accessories',
    brand: 'Truepower',
    specification: 'NFC 17-102 Standard Compliant, Stainless Steel 316, 107m Protection Radius',
    unit: 'NOS',
    hsnCode: '85354010',
    unitPrice: 21000,
    sellingPrice: 27500,
    currentStock: 9,
    minStockThreshold: 3,
    location: 'Warehouse B - Shelf 3',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    warehouseStocks: {
      'wh-1': 5,
      'wh-2': 2,
      'wh-3': 2
    },
    preferredVendorId: 'vnd-5',
    preferredVendorName: 'Truepower Earthings & Lightning Systems',
    createdAt: '2026-08-05T14:00:00Z',
    updatedAt: '2026-09-01T15:00:00Z'
  },
  {
    id: 'prod-11',
    sku: 'BOX-ACDB-100',
    name: 'IP65 ACDB 100kW Junction Box with Type II SPD & MCCB',
    category: 'Electrical & Cables',
    brand: 'SolarPulse Fab',
    specification: 'Polycarbonate Enclosure, 200A 4P MCCB, 40kA SPD, Digital Multifunction Meter',
    unit: 'NOS',
    hsnCode: '85371000',
    unitPrice: 29000,
    sellingPrice: 37000,
    currentStock: 6,
    minStockThreshold: 2,
    location: 'Warehouse B - Shelf 1',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    warehouseStocks: {
      'wh-1': 3,
      'wh-2': 2,
      'wh-3': 1
    },
    preferredVendorId: 'vnd-4',
    preferredVendorName: 'Polycab India Limited',
    createdAt: '2026-08-06T12:00:00Z',
    updatedAt: '2026-09-12T10:00:00Z'
  },
  {
    id: 'prod-12',
    sku: 'FAST-SS-M8',
    name: 'Stainless Steel Fasteners & Mid/End Clamps Pack M8/M10',
    category: 'Civil & Fasteners',
    brand: 'Jindal Fasteners',
    specification: 'SS 304 Grade Hex Bolts, Spring Washers, EPDM Rubber Pad Pre-assembled',
    unit: 'PACKS',
    hsnCode: '73181500',
    unitPrice: 1200,
    sellingPrice: 1600,
    currentStock: 65,
    minStockThreshold: 20,
    location: 'Warehouse A - Bin 12',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    warehouseStocks: {
      'wh-1': 40,
      'wh-2': 15,
      'wh-3': 10
    },
    preferredVendorId: 'vnd-3',
    preferredVendorName: 'Jindal Aluminium & Steel Works',
    createdAt: '2026-08-06T12:00:00Z',
    updatedAt: '2026-09-10T11:00:00Z'
  }
];

const initialVendors: Vendor[] = [
  {
    id: 'vnd-1',
    vendorCode: 'VND-001',
    name: 'Waaree Energies Limited',
    contactPerson: 'Ramesh Joshi',
    email: 'sales@waaree.com',
    phone: '+91 98200 12345',
    category: 'Solar Modules',
    gstNumber: '27AAACW1234F1Z5',
    address: '602, Western Edge I, Western Express Highway, Borivali East',
    city: 'Mumbai',
    state: 'Maharashtra',
    bankDetails: {
      bankName: 'HDFC Bank Ltd',
      accountNo: '50200012345678',
      ifsc: 'HDFC0000123'
    },
    paymentTerms: '30 Days Credit',
    rating: 5,
    status: 'ACTIVE',
    createdAt: '2026-07-15T10:00:00Z',
    updatedAt: '2026-08-20T11:00:00Z'
  },
  {
    id: 'vnd-2',
    vendorCode: 'VND-002',
    name: 'Sungrow Power Supply India Pvt Ltd',
    contactPerson: 'Pooja Rao',
    email: 'india@sungrowpower.com',
    phone: '+91 98450 67890',
    category: 'Inverters',
    gstNumber: '29AAGCS5678K1Z2',
    address: 'Plot 45, KIADB Industrial Area, Phase II, Electronic City',
    city: 'Bengaluru',
    state: 'Karnataka',
    bankDetails: {
      bankName: 'Standard Chartered Bank',
      accountNo: '23456789012345',
      ifsc: 'SCBL0036001'
    },
    paymentTerms: 'Advance 20%, Balance on Delivery',
    rating: 5,
    status: 'ACTIVE',
    createdAt: '2026-07-16T11:00:00Z',
    updatedAt: '2026-08-22T14:00:00Z'
  },
  {
    id: 'vnd-3',
    vendorCode: 'VND-003',
    name: 'Jindal Aluminium & Steel Works',
    contactPerson: 'Suresh Jindal',
    email: 'orders@jindalstructures.in',
    phone: '+91 98790 34567',
    category: 'Structures',
    gstNumber: '24AAACJ9876Q1Z9',
    address: 'Plot 112, GIDC Industrial Estate, Vatva',
    city: 'Ahmedabad',
    state: 'Gujarat',
    bankDetails: {
      bankName: 'State Bank of India',
      accountNo: '31234567890',
      ifsc: 'SBIN0001234'
    },
    paymentTerms: '15 Days Net',
    rating: 4,
    status: 'ACTIVE',
    createdAt: '2026-07-20T10:30:00Z',
    updatedAt: '2026-08-25T16:00:00Z'
  },
  {
    id: 'vnd-4',
    vendorCode: 'VND-004',
    name: 'Polycab India Limited',
    contactPerson: 'Nitin Mehta',
    email: 'solar.cables@polycab.com',
    phone: '+91 98250 89012',
    category: 'Cables & Switchgear',
    gstNumber: '24AAACP5544L1Z3',
    address: 'Polycab House, 771 Mogul Lane, Mahim West',
    city: 'Vadodara',
    state: 'Gujarat',
    bankDetails: {
      bankName: 'ICICI Bank Ltd',
      accountNo: '001105001234',
      ifsc: 'ICIC0000011'
    },
    paymentTerms: '30 Days Credit',
    rating: 5,
    status: 'ACTIVE',
    createdAt: '2026-07-22T09:00:00Z',
    updatedAt: '2026-08-28T12:00:00Z'
  },
  {
    id: 'vnd-5',
    vendorCode: 'VND-005',
    name: 'Truepower Earthings & Lightning Systems',
    contactPerson: 'Kavita Sen',
    email: 'projects@truepower.biz',
    phone: '+91 98110 54321',
    category: 'Cables & Switchgear',
    gstNumber: '07AABCT3322N1Z4',
    address: 'B-48, Okhla Industrial Area, Phase 1',
    city: 'New Delhi',
    state: 'Delhi',
    bankDetails: {
      bankName: 'Axis Bank Ltd',
      accountNo: '912020012345678',
      ifsc: 'UTIB0000123'
    },
    paymentTerms: 'Immediate Cheque',
    rating: 4,
    status: 'ACTIVE',
    createdAt: '2026-07-25T14:00:00Z',
    updatedAt: '2026-08-30T10:00:00Z'
  }
];

const initialPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-1',
    purchaseNumber: 'PO-2026-001',
    vendorId: 'vnd-1',
    vendorName: 'Waaree Energies Limited',
    purchaseDate: '2026-08-10',
    expectedDeliveryDate: '2026-08-18',
    receivedDate: '2026-08-18',
    projectId: 'proj-1',
    projectTitle: '100 kW Rooftop Solar Plant - ABC Industries',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    items: [
      {
        id: 'poi-1',
        productId: 'prod-1',
        productName: 'Waaree 540Wp Mono PERC Bifacial Solar PV Module',
        sku: 'MOD-WAA-540',
        category: 'Solar Panels',
        orderedQuantity: 200,
        receivedQuantity: 200,
        pendingQuantity: 0,
        unit: 'NOS',
        unitPrice: 10200,
        taxPercent: 12,
        taxAmount: 244800,
        totalAmount: 2284800,
        quantity: 200,
        taxRatePercent: 12,
        totalPrice: 2284800
      }
    ],
    subtotal: 2040000,
    taxAmount: 244800,
    totalAmount: 2284800,
    status: 'RECEIVED',
    paymentStatus: 'PAID',
    paymentDueDate: '2026-09-17',
    invoiceReference: 'WAA-INV-88910',
    notes: 'Dispatched directly to ABC Industries site in Sanand. Site survey verified.',
    stockUpdated: true,
    deliveryReceipts: [
      {
        id: 'grn-po1-1',
        receiptNumber: 'GRN-2026-001',
        receiptDate: '2026-08-18',
        deliveryChallanNo: 'DC-WAA-9921',
        transporterName: 'VRL Logistics (GJ-01-AX-9912)',
        receivedBy: 'Ramesh Patel (Store Incharge)',
        notes: 'Complete batch received in excellent condition. Test certificates verified.',
        createdAt: '2026-08-18T14:30:00Z',
        items: [
          {
            lineItemId: 'poi-1',
            productId: 'prod-1',
            productName: 'Waaree 540Wp Mono PERC Bifacial Solar PV Module',
            sku: 'MOD-WAA-540',
            unit: 'NOS',
            receivedQuantity: 200
          }
        ]
      }
    ],
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-08-18T16:00:00Z'
  },
  {
    id: 'po-2',
    purchaseNumber: 'PO-2026-002',
    vendorId: 'vnd-2',
    vendorName: 'Sungrow Power Supply India Pvt Ltd',
    purchaseDate: '2026-08-12',
    expectedDeliveryDate: '2026-08-20',
    receivedDate: '2026-08-20',
    projectId: 'proj-1',
    projectTitle: '100 kW Rooftop Solar Plant - ABC Industries',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    items: [
      {
        id: 'poi-2',
        productId: 'prod-3',
        productName: 'Sungrow 110kW String Inverter SG110CX',
        sku: 'INV-SUN-110',
        category: 'Inverters',
        orderedQuantity: 2,
        receivedQuantity: 2,
        pendingQuantity: 0,
        unit: 'NOS',
        unitPrice: 285000,
        taxPercent: 12,
        taxAmount: 68400,
        totalAmount: 638400,
        quantity: 2,
        taxRatePercent: 12,
        totalPrice: 638400
      }
    ],
    subtotal: 570000,
    taxAmount: 68400,
    totalAmount: 638400,
    status: 'RECEIVED',
    paymentStatus: 'PAID',
    paymentDueDate: '2026-09-10',
    invoiceReference: 'SUNG-INV-3321',
    notes: 'Includes manufacturer warranty certificates and Wi-Fi dongles.',
    stockUpdated: true,
    deliveryReceipts: [
      {
        id: 'grn-po2-1',
        receiptNumber: 'GRN-2026-002',
        receiptDate: '2026-08-20',
        deliveryChallanNo: 'DC-SUN-4410',
        transporterName: 'Safexpress',
        receivedBy: 'Ramesh Patel',
        notes: 'Both inverters unboxed and inspected.',
        createdAt: '2026-08-20T16:00:00Z',
        items: [
          {
            lineItemId: 'poi-2',
            productId: 'prod-3',
            productName: 'Sungrow 110kW String Inverter SG110CX',
            sku: 'INV-SUN-110',
            unit: 'NOS',
            receivedQuantity: 2
          }
        ]
      }
    ],
    createdAt: '2026-08-12T11:30:00Z',
    updatedAt: '2026-08-20T17:00:00Z'
  },
  {
    id: 'po-3',
    purchaseNumber: 'PO-2026-003',
    vendorId: 'vnd-4',
    vendorName: 'Polycab India Limited',
    purchaseDate: '2026-09-05',
    expectedDeliveryDate: '2026-09-22',
    projectId: 'proj-2',
    projectTitle: '50 kW Solar PV Project - Sunrise Textiles',
    warehouseId: 'wh-2',
    warehouseName: 'North India Distribution Hub - Gurugram',
    items: [
      {
        id: 'poi-3',
        productId: 'prod-6',
        productName: 'Polycab 1C x 4 sq.mm Solar DC Cable (Red)',
        sku: 'CAB-DC-4R',
        category: 'Electrical & Cables',
        orderedQuantity: 1000,
        receivedQuantity: 0,
        pendingQuantity: 1000,
        unit: 'METERS',
        unitPrice: 46,
        taxPercent: 18,
        taxAmount: 8280,
        totalAmount: 54280,
        quantity: 1000,
        taxRatePercent: 18,
        totalPrice: 54280
      },
      {
        id: 'poi-4',
        productId: 'prod-7',
        productName: 'Polycab 1C x 4 sq.mm Solar DC Cable (Black)',
        sku: 'CAB-DC-4B',
        category: 'Electrical & Cables',
        orderedQuantity: 1000,
        receivedQuantity: 0,
        pendingQuantity: 1000,
        unit: 'METERS',
        unitPrice: 46,
        taxPercent: 18,
        taxAmount: 8280,
        totalAmount: 54280,
        quantity: 1000,
        taxRatePercent: 18,
        totalPrice: 54280
      }
    ],
    subtotal: 92000,
    taxAmount: 16560,
    totalAmount: 108560,
    status: 'ORDERED',
    paymentStatus: 'PARTIALLY_PAID',
    paymentDueDate: '2026-10-05',
    notes: 'Delivery expected at regional warehouse for string distribution.',
    stockUpdated: false,
    deliveryReceipts: [],
    createdAt: '2026-09-05T14:00:00Z',
    updatedAt: '2026-09-05T14:00:00Z'
  },
  {
    id: 'po-4',
    purchaseNumber: 'PO-2026-004',
    vendorId: 'vnd-1',
    vendorName: 'Waaree Energies Limited',
    purchaseDate: '2026-09-10',
    expectedDeliveryDate: '2026-09-25',
    projectId: 'proj-2',
    projectTitle: '50 kW Solar PV Project - Sunrise Textiles',
    warehouseId: 'wh-3',
    warehouseName: 'South Regional Depot - Bengaluru',
    items: [
      {
        id: 'poi-5',
        productId: 'prod-1',
        productName: 'Waaree 540Wp Mono PERC Bifacial Solar PV Module',
        sku: 'MOD-WAA-540',
        category: 'Solar Panels',
        orderedQuantity: 92,
        receivedQuantity: 50,
        pendingQuantity: 42,
        unit: 'NOS',
        unitPrice: 10200,
        taxPercent: 12,
        taxAmount: 112608,
        totalAmount: 1051008,
        quantity: 92,
        taxRatePercent: 12,
        totalPrice: 1051008,
        notes: 'First dispatch of 50 received. 42 pending from factory.'
      }
    ],
    subtotal: 938400,
    taxAmount: 112608,
    totalAmount: 1051008,
    status: 'PARTIALLY_RECEIVED',
    paymentStatus: 'PARTIALLY_PAID',
    paymentDueDate: '2026-10-15',
    invoiceReference: 'WAA-INV-99014',
    notes: 'Partial batch shipped due to trailer space limits. Balance 42 modules scheduled for next week.',
    stockUpdated: true,
    deliveryReceipts: [
      {
        id: 'grn-po4-1',
        receiptNumber: 'GRN-2026-003',
        receiptDate: '2026-09-15',
        deliveryChallanNo: 'DC-WAA-1048',
        transporterName: 'GATI KWE (MH-04-DE-4122)',
        receivedBy: 'Ramesh Patel (Store Incharge)',
        notes: 'Initial lot of 50 panels verified against barcode list.',
        createdAt: '2026-09-15T11:00:00Z',
        items: [
          {
            lineItemId: 'poi-5',
            productId: 'prod-1',
            productName: 'Waaree 540Wp Mono PERC Bifacial Solar PV Module',
            sku: 'MOD-WAA-540',
            unit: 'NOS',
            receivedQuantity: 50
          }
        ]
      }
    ],
    createdAt: '2026-09-10T09:30:00Z',
    updatedAt: '2026-09-15T11:30:00Z'
  }
];

const initialBOMs: BillOfMaterials[] = [
  {
    id: 'bom-1',
    bomNumber: 'BOM-2026-001',
    projectId: 'proj-1',
    projectCode: 'SOL-2026-001',
    projectTitle: '100 kW Rooftop Solar Plant',
    customerName: 'ABC Industries Ltd.',
    capacityKw: 100,
    version: 'v1.2',
    warehouseId: 'wh-1',
    warehouseName: 'Central Solar Logistics Hub - Pune',
    status: 'APPROVED',
    stockAllocated: true,
    createdBy: 'Amit Sharma',
    approvedBy: 'Vikram Patel',
    approvedAt: '2026-08-16T15:00:00Z',
    notes: 'Approved based on finalized roof layout drawing Rev 3 with 23° elevated structure.',
    totalCost: 2471800,
    items: [
      {
        id: 'bomi-1',
        productId: 'prod-1',
        productName: 'Waaree 540Wp Mono PERC Bifacial Solar PV Module',
        sku: 'MOD-WAA-540',
        category: 'Solar Panels',
        requiredQty: 185,
        allocatedQty: 185,
        unit: 'NOS',
        estimatedUnitCost: 10200,
        totalCost: 1887000,
        status: 'INSTALLED'
      },
      {
        id: 'bomi-2',
        productId: 'prod-3',
        productName: 'Sungrow 110kW String Inverter SG110CX',
        sku: 'INV-SUN-110',
        category: 'Inverters',
        requiredQty: 1,
        allocatedQty: 1,
        unit: 'NOS',
        estimatedUnitCost: 285000,
        totalCost: 285000,
        status: 'ALLOCATED'
      },
      {
        id: 'bomi-3',
        productId: 'prod-5',
        productName: 'Hot Dip Galvanized Solar Mounting Structure 15° Tilt',
        sku: 'STR-HDG-15',
        category: 'Mounting Structures',
        requiredQty: 46,
        allocatedQty: 46,
        unit: 'SETS',
        estimatedUnitCost: 3800,
        totalCost: 174800,
        status: 'DISPATCHED'
      },
      {
        id: 'bomi-4',
        productId: 'prod-6',
        productName: 'Polycab 1C x 4 sq.mm Solar DC Cable (Red)',
        sku: 'CAB-DC-4R',
        category: 'Electrical & Cables',
        requiredQty: 750,
        allocatedQty: 750,
        unit: 'METERS',
        estimatedUnitCost: 46,
        totalCost: 34500,
        status: 'ALLOCATED'
      },
      {
        id: 'bomi-5',
        productId: 'prod-7',
        productName: 'Polycab 1C x 4 sq.mm Solar DC Cable (Black)',
        sku: 'CAB-DC-4B',
        category: 'Electrical & Cables',
        requiredQty: 750,
        allocatedQty: 750,
        unit: 'METERS',
        estimatedUnitCost: 46,
        totalCost: 34500,
        status: 'ALLOCATED'
      },
      {
        id: 'bomi-6',
        productId: 'prod-11',
        productName: 'IP65 ACDB 100kW Junction Box with Type II SPD & MCCB',
        sku: 'BOX-ACDB-100',
        category: 'Electrical & Cables',
        requiredQty: 1,
        allocatedQty: 1,
        unit: 'NOS',
        estimatedUnitCost: 29000,
        totalCost: 29000,
        status: 'ALLOCATED'
      },
      {
        id: 'bomi-7',
        productId: 'prod-9',
        productName: 'Chemical Earthing Electrode Kit 50mm x 3m with BFC Compound',
        sku: 'EARTH-CH-50',
        category: 'Electrical & Cables',
        requiredQty: 6,
        allocatedQty: 6,
        unit: 'SETS',
        estimatedUnitCost: 4500,
        totalCost: 27000,
        status: 'INSTALLED'
      }
    ],
    createdAt: '2026-08-14T11:00:00Z',
    updatedAt: '2026-08-16T15:00:00Z'
  },
  {
    id: 'bom-2',
    bomNumber: 'BOM-2026-002',
    projectId: 'proj-2',
    projectCode: 'SOL-2026-002',
    projectTitle: '50 kW Solar PV Project',
    customerName: 'Sunrise Textiles Ltd.',
    capacityKw: 50,
    version: 'v1.0',
    status: 'RELEASED_TO_SITE',
    stockAllocated: true,
    createdBy: 'Amit Sharma',
    approvedBy: 'Vikram Patel',
    approvedAt: '2026-09-02T10:00:00Z',
    notes: 'Released for civil & structure team fabrication.',
    totalCost: 1189200,
    items: [
      {
        id: 'bomi-201',
        productId: 'prod-2',
        productName: 'Adani 545Wp Mono PERC Solar Module',
        sku: 'MOD-ADN-545',
        category: 'Solar Panels',
        requiredQty: 92,
        allocatedQty: 92,
        unit: 'NOS',
        estimatedUnitCost: 10400,
        totalCost: 956800,
        status: 'DISPATCHED'
      },
      {
        id: 'bomi-202',
        productId: 'prod-4',
        productName: 'Growatt 50kW On-Grid Inverter MAC 50KTL3-X',
        sku: 'INV-GRO-50',
        category: 'Inverters',
        requiredQty: 1,
        allocatedQty: 1,
        unit: 'NOS',
        estimatedUnitCost: 145000,
        totalCost: 145000,
        status: 'ALLOCATED'
      },
      {
        id: 'bomi-203',
        productId: 'prod-5',
        productName: 'Hot Dip Galvanized Solar Mounting Structure 15° Tilt',
        sku: 'STR-HDG-15',
        category: 'Mounting Structures',
        requiredQty: 23,
        allocatedQty: 23,
        unit: 'SETS',
        estimatedUnitCost: 3800,
        totalCost: 87400,
        status: 'DISPATCHED'
      }
    ],
    createdAt: '2026-08-30T10:00:00Z',
    updatedAt: '2026-09-02T10:00:00Z'
  }
];

const initialSalesInvoices: SalesInvoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    invoiceType: 'TAX_INVOICE',
    customerId: 'cust-1',
    customerName: 'ABC Industries Ltd.',
    customerGst: '24AABCA1234F1Z1',
    customerAddress: 'Plot 42, GIDC Industrial Estate, Sanand, Ahmedabad',
    projectId: 'proj-1',
    projectTitle: '100 kW Rooftop Solar Plant',
    invoiceDate: '2026-08-15',
    dueDate: '2026-08-30',
    status: 'PAID',
    paymentTerms: '15 Days Net',
    notes: 'Advance milestone payment receipt #REC-001 received on 14 Aug 2026.',
    deductStock: true,
    stockDeducted: true,
    subtotal: 1250000,
    taxAmount: 150000,
    totalAmount: 1400000,
    items: [
      {
        id: 'ili-1',
        productId: 'prod-1',
        description: 'Advance Milestone 30%: Supply of 185 Nos Waaree 540Wp Bifacial Solar PV Modules',
        hsnCode: '85414011',
        quantity: 185,
        unit: 'NOS',
        unitPrice: 6756.75,
        taxRatePercent: 12,
        taxAmount: 150000,
        totalAmount: 1400000
      }
    ],
    createdAt: '2026-08-15T11:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z'
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-002',
    invoiceType: 'TAX_INVOICE',
    customerId: 'cust-2',
    customerName: 'Sunrise Textiles Ltd.',
    customerGst: '24AABCS5566G1Z2',
    customerAddress: 'Ring Road, Surat, Gujarat',
    projectId: 'proj-2',
    projectTitle: '50 kW Solar PV Project',
    invoiceDate: '2026-09-02',
    dueDate: '2026-09-17',
    status: 'ISSUED',
    paymentTerms: '15 Days Net',
    notes: 'Dispatched inverter and structural material. Milestone inspection scheduled.',
    deductStock: false,
    stockDeducted: false,
    subtotal: 850000,
    taxAmount: 102000,
    totalAmount: 952000,
    items: [
      {
        id: 'ili-2',
        productId: 'prod-4',
        description: 'Material Milestone: Supply of 50 kW On-Grid Growatt Inverter & HDG Structures',
        hsnCode: '85044090',
        quantity: 1,
        unit: 'SET',
        unitPrice: 850000,
        taxRatePercent: 12,
        taxAmount: 102000,
        totalAmount: 952000
      }
    ],
    createdAt: '2026-09-02T12:00:00Z',
    updatedAt: '2026-09-02T12:00:00Z'
  }
];

const initialStockMovements: StockMovement[] = [
  {
    id: 'sm-1',
    productId: 'prod-1',
    productName: 'Waaree 540Wp Mono PERC Bifacial Solar PV Module',
    sku: 'MOD-WAA-540',
    movementType: 'PURCHASE_RECEIPT',
    quantity: 200,
    balanceAfter: 535,
    referenceNumber: 'PO-2026-001',
    notes: 'Received from Waaree Energies Ltd.',
    timestamp: '2026-08-18T16:00:00Z',
    performedBy: 'Amit Sharma'
  },
  {
    id: 'sm-2',
    productId: 'prod-1',
    productName: 'Waaree 540Wp Mono PERC Bifacial Solar PV Module',
    sku: 'MOD-WAA-540',
    movementType: 'BOM_ALLOCATION',
    quantity: -185,
    balanceAfter: 350,
    referenceNumber: 'BOM-2026-001',
    notes: 'Allocated for ABC Industries 100kW project',
    timestamp: '2026-08-20T10:00:00Z',
    performedBy: 'Amit Sharma'
  },
  {
    id: 'sm-3',
    productId: 'prod-3',
    productName: 'Sungrow 110kW String Inverter SG110CX',
    sku: 'INV-SUN-110',
    movementType: 'PURCHASE_RECEIPT',
    quantity: 2,
    balanceAfter: 6,
    referenceNumber: 'PO-2026-002',
    notes: 'Received from Sungrow Power Supply India',
    timestamp: '2026-08-20T17:00:00Z',
    performedBy: 'Amit Sharma'
  },
  {
    id: 'sm-4',
    productId: 'prod-3',
    productName: 'Sungrow 110kW String Inverter SG110CX',
    sku: 'INV-SUN-110',
    movementType: 'BOM_ALLOCATION',
    quantity: -1,
    balanceAfter: 5,
    referenceNumber: 'BOM-2026-001',
    notes: 'Allocated for ABC Industries 100kW project',
    timestamp: '2026-08-22T11:00:00Z',
    performedBy: 'Amit Sharma'
  }
];

class StorageService {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
        return defaultValue;
      }
      return JSON.parse(stored) as T;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      window.dispatchEvent(new Event('solarpulse_storage_updated'));
    } catch (e) {
      console.error('Storage set error:', e);
    }
  }

  // --- Leads ---
  getLeads(): Lead[] {
    return this.get<Lead[]>(STORAGE_KEYS.LEADS, initialLeads);
  }

  saveLead(lead: Lead): void {
    const leads = this.getLeads();
    const index = leads.findIndex(l => l.id === lead.id);
    if (index >= 0) {
      leads[index] = { ...lead, updatedAt: new Date().toISOString() };
    } else {
      leads.unshift({ ...lead, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.set(STORAGE_KEYS.LEADS, leads);
  }

  deleteLead(id: string): void {
    const leads = this.getLeads().filter(l => l.id !== id);
    this.set(STORAGE_KEYS.LEADS, leads);
  }

  addLead(leadData: Partial<Lead> & { customerName: string; phone: string; [key: string]: any }): Lead {
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      customerName: leadData.customerName,
      companyName: leadData.companyName || leadData.customerName,
      phone: leadData.phone,
      email: leadData.email || '',
      address: leadData.address || '',
      city: leadData.city || 'Ahmedabad',
      solarCapacityKw: Number(leadData.solarCapacityKw) || 10,
      estimatedValue: Number(leadData.estimatedValue) || 450000,
      source: leadData.source || 'Direct Call',
      assignedSalespersonId: leadData.assignedSalespersonId || leadData.assignedToId || 'emp-4',
      assignedSalespersonName: leadData.assignedSalespersonName || leadData.assignedToName || 'Priya Verma',
      status: (leadData.status as LeadStatus) || 'NEW',
      notes: leadData.notes || '',
      nextFollowUpDate: leadData.nextFollowUpDate || new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.saveLead(newLead);
    return newLead;
  }

  // Convert Lead to Customer & Project
  convertLeadToCustomerAndProject(
    leadId: string,
    convertedByName?: string,
    role?: string
  ): { customer: Customer; project: SolarProject } {
    let lead = this.getLeads().find(l => l.id === leadId);
    if (!lead) {
      const customers = this.getCustomers();
      const projects = this.getProjects();
      return { customer: customers[0], project: projects[0] };
    }

    // Pre-validate customer uniqueness before modifying lead or creating project
    const customerValidation = validateCustomer(
      {
        name: lead.customerName,
        companyName: lead.companyName,
        phone: lead.phone,
        email: lead.email,
        city: lead.city
      },
      this.getCustomers()
    );
    assertValid(customerValidation);

    const customerId = `cust-${Date.now()}`;
    const projectId = `proj-${Date.now()}`;

    const newCustomer: Customer = {
      id: customerId,
      name: lead.customerName,
      companyName: lead.companyName || lead.customerName,
      customerType: 'Commercial',
      phone: lead.phone,
      email: lead.email,
      siteAddress: lead.address,
      city: lead.city,
      state: 'Gujarat',
      pincode: '380001',
      status: 'ACTIVE',
      activeProjectId: projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newProject: SolarProject = {
      id: projectId,
      projectCode: `SOL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      customerId: customerId,
      customerName: newCustomer.name,
      title: `${lead.solarCapacityKw} kW Rooftop Solar Project`,
      capacityKw: lead.solarCapacityKw,
      totalValue: lead.estimatedValue || lead.solarCapacityKw * 50000,
      status: 'SURVEY',
      currentStageKey: 'site_survey',
      completionPercentage: 0,
      progressPercentage: 0,
      location: lead.city,
      assignedUsers: [
        {
          id: `asgn-${Date.now()}-lead`,
          projectId: projectId,
          userId: 'emp-5',
          userName: convertedByName || 'Rahul Mehta',
          employeeCode: 'EMP005',
          role: 'Sales Executive',
          department: 'Sales',
          assignedAt: new Date().toISOString(),
          assignedBy: convertedByName || 'System Admin',
          notes: 'Lead conversion and client account coordination',
          isActive: true
        }
      ],
      siteAddress: lead.address,
      city: lead.city,
      startDate: new Date().toISOString().split('T')[0],
      expectedCompletionDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
      stages: buildStandardWorkflowStages(projectId, lead.solarCapacityKw, 'NEW'),
      notes: `Converted from Lead ID: ${lead.id}${convertedByName ? ` by ${convertedByName} (${role || 'Sales'})` : ''}. ${lead.notes}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update lead status to WON
    this.saveLead({ ...lead, status: 'WON' });
    this.saveCustomer(newCustomer);
    this.saveProject(newProject);

    this.addNotification({
      title: 'Lead Converted to Active Project',
      message: `${lead.customerName} converted into Customer & Project ${newProject.projectCode} (${lead.solarCapacityKw} kW). Stage 1 (Site Survey) is active.`,
      type: 'SUCCESS',
      linkType: 'PROJECT',
      linkId: projectId,
      customerId: customerId,
      projectId: projectId,
      projectName: newProject.title
    });

    return { customer: newCustomer, project: newProject };
  }

  // Create new Customer and Solar Project with strictly initialized Stage 1
  createCustomerAndProject(customerData: {
    name: string;
    companyName?: string;
    customerType?: 'Residential' | 'Commercial' | 'Industrial';
    phone: string;
    email?: string;
    siteAddress?: string;
    city?: string;
    capacityKw?: number;
    estimatedValue?: number;
  }, createdByName: string = 'System Admin', role: string = 'Admin'): { customer: Customer; project: SolarProject } {
    // Pre-validate customer uniqueness
    const customerValidation = validateCustomer(
      {
        name: customerData.name,
        companyName: customerData.companyName,
        phone: customerData.phone,
        email: customerData.email,
        city: customerData.city
      },
      this.getCustomers()
    );
    assertValid(customerValidation);

    const customerId = `cust-${Date.now()}`;
    const projectId = `proj-${Date.now()}`;
    const capacityKw = Number(customerData.capacityKw) || 10;
    const estimatedValue = Number(customerData.estimatedValue) || capacityKw * 50000;

    const newCustomer: Customer = {
      id: customerId,
      name: customerData.name,
      companyName: customerData.companyName || customerData.name,
      customerType: customerData.customerType || 'Commercial',
      phone: customerData.phone,
      email: customerData.email || '',
      siteAddress: customerData.siteAddress || '',
      city: customerData.city || 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380001',
      status: 'ACTIVE',
      activeProjectId: projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newProject: SolarProject = {
      id: projectId,
      projectCode: `SOL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      customerId: customerId,
      customerName: newCustomer.name,
      title: `${capacityKw} kW Rooftop Solar Project`,
      capacityKw: capacityKw,
      totalValue: estimatedValue,
      status: 'SURVEY',
      currentStageKey: 'site_survey',
      completionPercentage: 0,
      progressPercentage: 0,
      location: customerData.city || 'Ahmedabad',
      assignedUsers: [],
      siteAddress: customerData.siteAddress || '',
      city: customerData.city || 'Ahmedabad',
      startDate: new Date().toISOString().split('T')[0],
      expectedCompletionDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
      stages: buildStandardWorkflowStages(projectId, capacityKw, 'NEW'),
      notes: `Created by ${createdByName} (${role}). Initialized at Stage 1: Site Survey.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.saveCustomer(newCustomer);
    this.saveProject(newProject);

    this.addNotification({
      title: 'New Solar Project Initialized',
      message: `Project ${newProject.projectCode} (${capacityKw} kW) created for ${newCustomer.name}. Stage 1 (Site Survey) is active.`,
      type: 'SUCCESS',
      linkType: 'PROJECT',
      linkId: projectId,
      customerId: customerId,
      projectId: projectId,
      projectName: newProject.title
    });

    return { customer: newCustomer, project: newProject };
  }

  // --- Customers ---
  getCustomers(): Customer[] {
    return this.get<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
  }

  saveCustomer(customer: Customer): void {
    const customers = this.getCustomers();
    const validation = validateCustomer(customer, customers, customer.id);
    assertValid(validation);

    const index = customers.findIndex(c => c.id === customer.id);
    if (index >= 0) {
      customers[index] = { ...customer, updatedAt: new Date().toISOString() };
    } else {
      customers.unshift({ ...customer, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.set(STORAGE_KEYS.CUSTOMERS, customers);
  }

  // --- Projects & Workflow Automation ---
  getProjects(): SolarProject[] {
    const rawProjects = this.get<SolarProject[]>(STORAGE_KEYS.PROJECTS, initialProjects);
    let mutated = false;

    // Self-healing integrity check:
    // A stage N cannot be COMPLETED/APPROVED unless all previous stages 0..N-1 are COMPLETED/APPROVED.
    // Ensure newly initialized projects never have stages 2..16 completed.
    const sanitized = rawProjects.map(project => {
      let hasIncompletePriorStage = false;
      let stagesChanged = false;

      // Self-healing migration for multi-user project assignments:
      if (!project.assignedUsers || !Array.isArray(project.assignedUsers) || project.assignedUsers.length === 0) {
        const defaultMatch = initialProjects.find(ip => ip.id === project.id);
        if (defaultMatch?.assignedUsers && defaultMatch.assignedUsers.length > 0) {
          project.assignedUsers = JSON.parse(JSON.stringify(defaultMatch.assignedUsers));
          mutated = true;
        } else if (!project.assignedUsers) {
          project.assignedUsers = [];
          mutated = true;
        }
      }

      // Ensure administrative/finance assignments are cleaned up from project specialist lists
      if (project.assignedUsers && Array.isArray(project.assignedUsers)) {
        const beforeLen = project.assignedUsers.length;
        project.assignedUsers = project.assignedUsers.filter(
          a => a.role !== 'Accountant' && a.department !== 'Finance'
        );
        if (project.assignedUsers.length !== beforeLen) {
          mutated = true;
        }
      }

      const cleanedStages = project.stages.map((stage, idx) => {
        if (idx === 0) {
          if (stage.status !== 'COMPLETED' && stage.status !== 'APPROVED') {
            hasIncompletePriorStage = true;
          }
          return stage;
        }

        if (hasIncompletePriorStage) {
          if (stage.status === 'COMPLETED' || stage.status === 'APPROVED') {
            stagesChanged = true;
            return {
              ...stage,
              status: 'NOT STARTED' as StageStatus,
              actualEndDate: undefined,
              completedDate: undefined,
              approvedBy: undefined,
              approvalDate: undefined,
              checklist: stage.checklist.map(c => ({
                ...c,
                completed: false,
                completedAt: undefined,
                completedBy: undefined
              }))
            };
          }
        }

        if (stage.status !== 'COMPLETED' && stage.status !== 'APPROVED') {
          hasIncompletePriorStage = true;
        }

        return stage;
      });

      if (stagesChanged) {
        mutated = true;
        const completedCount = cleanedStages.filter(s => s.status === 'COMPLETED' || s.status === 'APPROVED').length;
        const completionPercentage = Math.round((completedCount / cleanedStages.length) * 100);
        return {
          ...project,
          stages: cleanedStages,
          completionPercentage,
          progressPercentage: completionPercentage
        };
      }

      return project;
    });

    if (mutated) {
      this.set(STORAGE_KEYS.PROJECTS, sanitized);
    }

    return sanitized;
  }

  getProjectById(id: string): SolarProject | undefined {
    return this.getProjects().find(p => p.id === id);
  }

  saveProject(project: SolarProject): void {
    const projects = this.getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    if (index >= 0) {
      projects[index] = { ...project, updatedAt: new Date().toISOString() };
    } else {
      projects.unshift({ ...project, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.set(STORAGE_KEYS.PROJECTS, projects);
  }

  // --- Multi-User Project Assignments ---
  getProjectAssignments(projectId: string): ProjectUserAssignment[] {
    const project = this.getProjectById(projectId);
    return project?.assignedUsers || [];
  }

  assignUserToProject(
    projectId: string,
    assignmentData: {
      userId: string;
      userName: string;
      userEmail?: string;
      employeeCode?: string;
      role: ProjectAssignmentRole;
      department: string;
      notes?: string;
      autoSyncStages?: boolean;
    },
    assignedByName: string = 'Admin'
  ): ProjectUserAssignment {
    const projects = this.getProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }

    // Explicitly validate role is an eligible project specialist role
    if (
      assignmentData.role === 'Accountant' ||
      (assignmentData.role as string) === 'Admin' ||
      (assignmentData.role as string) === 'HR Manager' ||
      (assignmentData.role as string) === 'Customer'
    ) {
      throw new Error(`Role "${assignmentData.role}" is not eligible for project specialist assignment. Only field, technical, service, or sales coordination specialists may be assigned.`);
    }

    // Explicitly validate that employee is not an excluded user (Admin, Accountant, HR Manager, Customer)
    const emp = this.getEmployees().find(e => e.id === assignmentData.userId);
    if (emp) {
      const desig = (emp.designation || '').toLowerCase().trim();
      const dept = (emp.department || '').toLowerCase().trim();
      if (
        desig.includes('director') ||
        desig === 'admin' ||
        desig.includes('admin ') ||
        desig.includes(' admin') ||
        desig.includes('administrator') ||
        desig.includes('accountant') ||
        desig.includes('finance') ||
        desig.includes('tally') ||
        desig.includes('hr manager') ||
        desig.includes('human resource') ||
        desig.includes('hr & admin') ||
        desig.includes('customer') ||
        desig.includes('client') ||
        dept === 'management' ||
        dept === 'finance' ||
        dept === 'hr' ||
        dept === 'customer' ||
        dept === 'administration' ||
        (dept === 'operations' && desig.includes('manager'))
      ) {
        throw new Error(`Cannot assign administrative or finance staff (${emp.name} - ${emp.designation}) as a project specialist.`);
      }
    }

    const project = projects[projectIndex];
    project.assignedUsers = project.assignedUsers || [];

    const newAssignment: ProjectUserAssignment = {
      id: `asgn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      userId: assignmentData.userId,
      userName: assignmentData.userName,
      userEmail: assignmentData.userEmail || '',
      employeeCode: assignmentData.employeeCode || '',
      role: assignmentData.role,
      department: assignmentData.department || 'Operations',
      assignedAt: new Date().toISOString(),
      assignedBy: assignedByName,
      notes: assignmentData.notes || '',
      isActive: true
    };

    project.assignedUsers.push(newAssignment);

    // Sync matching stages if autoSync is true (default true)
    if (assignmentData.autoSyncStages !== false) {
      project.stages = project.stages.map(stg => {
        const matchesRole =
          stg.assignedRole === assignmentData.role ||
          (assignmentData.role === 'Site Survey Engineer' && (stg.stageKey === 'site_survey' || stg.assignedRole === 'Site Survey Engineer')) ||
          (assignmentData.role === 'Civil Team' && (stg.stageKey === 'civil_work' || stg.assignedRole === 'Civil Team')) ||
          (assignmentData.role === 'Structure Team' && (stg.stageKey === 'structure_fabrication' || stg.assignedRole === 'Structure Team')) ||
          (assignmentData.role === 'Installation Team' && (stg.stageKey === 'solar_installation' || stg.assignedRole === 'Installation Team')) ||
          (assignmentData.role === 'Electrical Team' && (stg.stageKey === 'ac_side_electrical' || stg.assignedRole === 'Electrical Team')) ||
          (assignmentData.role === 'Technician' && (stg.stageKey === 'final_verification' || stg.assignedRole === 'Technician')) ||
          (assignmentData.role === 'Service Manager' && (stg.stageKey === 'service_amc' || stg.assignedRole === 'Service Manager'));

        if (matchesRole) {
          return {
            ...stg,
            assignedEmployeeId: assignmentData.userId,
            assignedEmployeeName: assignmentData.userName,
            assignedToName: assignmentData.userName,
            assignedToId: assignmentData.userId
          };
        }
        return stg;
      });
    }

    project.updatedAt = new Date().toISOString();
    projects[projectIndex] = project;
    this.set(STORAGE_KEYS.PROJECTS, projects);

    this.addNotification({
      title: 'Project Specialist Assigned',
      message: `${assignmentData.userName} assigned as ${assignmentData.role} to ${project.title} (${project.projectCode}).`,
      type: 'INFO',
      linkType: 'PROJECT',
      linkId: projectId,
      projectId: projectId,
      projectName: project.title
    });

    return newAssignment;
  }

  updateProjectUserAssignment(
    projectId: string,
    assignmentId: string,
    updates: Partial<ProjectUserAssignment>,
    autoSyncStages: boolean = true
  ): boolean {
    const projects = this.getProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return false;

    const project = projects[projectIndex];
    if (!project.assignedUsers) return false;

    const asgnIndex = project.assignedUsers.findIndex(a => a.id === assignmentId);
    if (asgnIndex === -1) return false;

    if (updates.role === 'Accountant' || (updates.role as string) === 'Admin' || (updates.role as string) === 'HR Manager' || (updates.role as string) === 'Customer') {
      throw new Error(`Role "${updates.role}" is not an eligible project specialist role.`);
    }

    const existing = project.assignedUsers[asgnIndex];
    const updated: ProjectUserAssignment = {
      ...existing,
      ...updates
    };

    project.assignedUsers[asgnIndex] = updated;

    if (autoSyncStages && updated.isActive) {
      project.stages = project.stages.map(stg => {
        if (stg.assignedRole === updated.role) {
          return {
            ...stg,
            assignedEmployeeId: updated.userId,
            assignedEmployeeName: updated.userName,
            assignedToName: updated.userName,
            assignedToId: updated.userId
          };
        }
        return stg;
      });
    }

    project.updatedAt = new Date().toISOString();
    projects[projectIndex] = project;
    this.set(STORAGE_KEYS.PROJECTS, projects);
    return true;
  }

  removeUserFromProject(projectId: string, assignmentId: string): boolean {
    const projects = this.getProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return false;

    const project = projects[projectIndex];
    if (!project.assignedUsers) return false;

    const removed = project.assignedUsers.find(a => a.id === assignmentId);
    project.assignedUsers = project.assignedUsers.filter(a => a.id !== assignmentId);
    project.updatedAt = new Date().toISOString();

    projects[projectIndex] = project;
    this.set(STORAGE_KEYS.PROJECTS, projects);

    if (removed) {
      this.addNotification({
        title: 'Project Specialist Removed',
        message: `${removed.userName} removed from ${removed.role} role in ${project.title}.`,
        type: 'WARNING',
        linkType: 'PROJECT',
        linkId: projectId,
        projectId: projectId,
        projectName: project.title
      });
    }

    return true;
  }

  // Update a single stage within a project with automatic advancement logic
  updateProjectStage(
    projectId: string,
    stageIdOrKey: string,
    updates: Partial<ProjectStage>,
    actorName: string,
    actorRole: string
  ): SolarProject | null {
    const project = this.getProjectById(projectId);
    if (!project) return null;

    const stageIndex = project.stages.findIndex(s => s.id === stageIdOrKey || s.stageKey === stageIdOrKey);
    if (stageIndex === -1) return null;

    const currentStage = project.stages[stageIndex];

    // STRICT SEQUENTIAL ENFORCEMENT:
    // A stage cannot be marked COMPLETED or APPROVED if any prior stage is incomplete
    if (updates.status === 'COMPLETED' || updates.status === 'APPROVED') {
      for (let i = 0; i < stageIndex; i++) {
        const priorStage = project.stages[i];
        if (priorStage.status !== 'COMPLETED' && priorStage.status !== 'APPROVED') {
          console.warn(`Cannot complete stage "${currentStage.title}": Prior stage "${priorStage.title}" is not finished.`);
          return project;
        }
      }
    }

    const updatedStage: ProjectStage = {
      ...currentStage,
      ...updates
    };

    // If an action took place, log activity
    if (updates.status && updates.status !== currentStage.status) {
      updatedStage.activities = [
        ...(updatedStage.activities || []),
        {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toLocaleString(),
          user: actorName,
          role: actorRole,
          action: `Stage status changed from ${currentStage.status} to ${updates.status}`,
          details: updates.comments
        }
      ];
    }

    project.stages[stageIndex] = updatedStage;

    // BUSINESS LOGIC: AUTOMATIC SEQUENTIAL ADVANCEMENT
    // If a stage is marked COMPLETED or APPROVED, unlock ONLY the immediate next stage!
    if (
      (updates.status === 'COMPLETED' || updates.status === 'APPROVED') &&
      stageIndex + 1 < project.stages.length
    ) {
      const nextStage = project.stages[stageIndex + 1];
      if (nextStage.status === 'NOT STARTED') {
        nextStage.status = 'IN PROGRESS';
        nextStage.startDate = new Date().toISOString().split('T')[0];
        nextStage.dueDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
        nextStage.activities = [
          ...(nextStage.activities || []),
          {
            id: `act-${Date.now()}-auto-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toLocaleString(),
            user: 'System Workflow Engine',
            role: 'Automation',
            action: `Automatically unlocked next stage: "${nextStage.title}" because previous stage "${updatedStage.title}" was completed.`
          }
        ];
        project.currentStageKey = nextStage.stageKey;

        // Notification
        this.addNotification({
          title: `Next Stage Unlocked: ${nextStage.title}`,
          message: `Stage "${updatedStage.title}" completed. "${nextStage.title}" is now active for ${project.customerName}.`,
          type: 'SUCCESS',
          linkType: 'PROJECT',
          linkId: project.id
        });
      }
    }

    // IF A STAGE IS REOPENED TO 'IN PROGRESS':
    // Subsequent stages (stageIndex + 1 onwards) must be reset back to NOT STARTED
    if (updates.status === 'IN PROGRESS') {
      project.currentStageKey = currentStage.stageKey;
      for (let j = stageIndex + 1; j < project.stages.length; j++) {
        if (project.stages[j].status === 'IN PROGRESS' || project.stages[j].status === 'COMPLETED' || project.stages[j].status === 'APPROVED') {
          project.stages[j].status = 'NOT STARTED';
          project.stages[j].actualEndDate = undefined;
          project.stages[j].completedDate = undefined;
          project.stages[j].approvedBy = undefined;
          project.stages[j].approvalDate = undefined;
        }
      }
    }

    // Recalculate Project Completion Percentage dynamically based on completed stages
    const totalStages = project.stages.length;
    const completedStages = project.stages.filter(s => s.status === 'COMPLETED' || s.status === 'APPROVED').length;
    project.completionPercentage = Math.round((completedStages / totalStages) * 100);
    project.progressPercentage = project.completionPercentage;

    // Project high-level status progression
    if (completedStages === totalStages) {
      project.status = 'COMPLETED';
      project.actualCompletionDate = new Date().toISOString().split('T')[0];
    } else if (project.stages.some(s => s.status === 'OVERDUE' || s.status === 'BLOCKED')) {
      project.status = 'DELAYED';
    } else if (completedStages === 0) {
      project.status = 'SURVEY';
    } else if (completedStages < 4) {
      project.status = 'DESIGN & APPROVALS';
    } else if (completedStages < 10) {
      project.status = 'CIVIL & STRUCTURE';
    } else {
      project.status = 'INSTALLATION';
    }

    this.saveProject(project);
    return project;
  }

  // Toggle checklist item within a stage
  toggleChecklistItem(
    projectId: string,
    stageIdOrKey: string,
    checkItemId: string,
    actorName: string,
    actorRole: string
  ): SolarProject | null {
    const project = this.getProjectById(projectId);
    if (!project) return null;

    const stage = project.stages.find(s => s.id === stageIdOrKey || s.stageKey === stageIdOrKey);
    if (!stage) return null;

    const item = stage.checklist.find(c => c.id === checkItemId);
    if (!item) return null;

    item.completed = !item.completed;
    item.completedAt = item.completed ? new Date().toISOString() : undefined;
    item.completedBy = item.completed ? actorName : undefined;

    stage.activities = stage.activities || [];
    stage.activities.push({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toLocaleString(),
      user: actorName,
      role: actorRole,
      action: `${item.completed ? 'Checked' : 'Unchecked'} task: "${item.title}"`
    });

    // Note: Stage completion is NOT triggered automatically by checklist toggles.
    // It requires explicit user approval / completion with validation.
    this.saveProject(project);
    return project;
  }

  // --- Payments & Invoices ---
  getPayments(): PaymentRecord[] {
    return this.get<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, initialPayments);
  }

  savePayment(payment: PaymentRecord): void {
    const payments = this.getPayments();
    const index = payments.findIndex(p => p.id === payment.id);
    if (index >= 0) {
      payments[index] = payment;
    } else {
      payments.unshift(payment);
    }
    this.set(STORAGE_KEYS.PAYMENTS, payments);
  }

  // --- Expenses ---
  getExpenses(): ExpenseRecord[] {
    return this.get<ExpenseRecord[]>(STORAGE_KEYS.EXPENSES, initialExpenses);
  }

  saveExpense(expense: ExpenseRecord): void {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => e.id === expense.id);
    if (index >= 0) {
      expenses[index] = expense;
    } else {
      expenses.unshift(expense);
    }
    this.set(STORAGE_KEYS.EXPENSES, expenses);
  }

  // --- Employees & HRMS ---
  getEmployees(): Employee[] {
    const list = this.get<Employee[]>(STORAGE_KEYS.EMPLOYEES, initialEmployees);
    const DEFAULT_AUTH_MAP: Record<string, string> = {
      'emp-1': 'demo-usr-1',
      'emp-2': 'demo-usr-4',
      'emp-3': 'demo-usr-5',
      'emp-4': 'demo-usr-2',
      'emp-5': 'demo-usr-3',
      'emp-6': 'demo-usr-8',
      'emp-7': 'demo-usr-9',
      'emp-8': 'demo-usr-10',
      'emp-9': 'demo-usr-11',
      'emp-10': 'demo-usr-14',
      'emp-11': 'demo-usr-12',
      'emp-12': 'demo-usr-13',
      'emp-13': 'demo-usr-6',
      'emp-14': 'demo-usr-7'
    };

    return list.map(emp => {
      const defaultAuthUid = DEFAULT_AUTH_MAP[emp.id];
      const authUid = emp.authUid || defaultAuthUid;
      if (typeof emp.loginEnabled !== 'boolean' || (!emp.authUid && authUid)) {
        return {
          ...emp,
          authUid,
          loginEnabled: typeof emp.loginEnabled === 'boolean' ? emp.loginEnabled : true,
          systemRole: emp.systemRole || emp.assignedRole || 'Project Manager',
          accountStatus: (emp.status === 'TERMINATED' ? 'DISABLED' : 'ACTIVE') as Employee['accountStatus']
        };
      }
      return emp;
    });
  }

  saveEmployee(emp: Employee): void {
    const employees = this.getEmployees();
    const validation = validateEmployee(emp, employees, emp.id);
    assertValid(validation);

    const index = employees.findIndex(e => e.id === emp.id);
    if (index >= 0) {
      employees[index] = emp;
    } else {
      employees.unshift(emp);
    }
    this.set(STORAGE_KEYS.EMPLOYEES, employees);
  }

  saveEmployees(employees: Employee[]): void {
    this.set(STORAGE_KEYS.EMPLOYEES, employees);
  }

  deleteEmployee(id: string): void {
    const employees = this.getEmployees().filter(e => e.id !== id);
    this.set(STORAGE_KEYS.EMPLOYEES, employees);
  }

  // --- Attendance ---
  getAttendance(): AttendanceRecord[] {
    return this.get<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, initialAttendance);
  }

  saveAttendanceRecord(record: AttendanceRecord): void {
    const attendance = this.getAttendance();
    const index = attendance.findIndex(a => a.id === record.id);
    if (index >= 0) {
      attendance[index] = record;
    } else {
      attendance.unshift(record);
    }
    this.set(STORAGE_KEYS.ATTENDANCE, attendance);
  }

  recordAttendance(record: AttendanceRecord): void {
    this.saveAttendanceRecord(record);
  }

  deleteAttendanceRecord(id: string): void {
    const attendance = this.getAttendance().filter(a => a.id !== id);
    this.set(STORAGE_KEYS.ATTENDANCE, attendance);
  }

  // --- Payroll / Payslips ---
  getPayslips(): Payslip[] {
    return this.get<Payslip[]>(STORAGE_KEYS.PAYSLIPS, initialPayslips);
  }

  savePayslip(payslip: Payslip): void {
    const payslips = this.getPayslips();
    const index = payslips.findIndex(p => p.id === payslip.id);
    if (index >= 0) {
      payslips[index] = payslip;
    } else {
      payslips.unshift(payslip);
    }
    this.set(STORAGE_KEYS.PAYSLIPS, payslips);
  }

  deletePayslip(id: string): void {
    const payslips = this.getPayslips().filter(p => p.id !== id);
    this.set(STORAGE_KEYS.PAYSLIPS, payslips);
  }

  // --- Holidays ---
  getHolidays(): HolidayRecord[] {
    return this.get<HolidayRecord[]>(STORAGE_KEYS.HOLIDAYS, initialHolidays);
  }

  saveHoliday(holiday: HolidayRecord): void {
    const holidays = this.getHolidays();
    const index = holidays.findIndex(h => h.id === holiday.id);
    if (index >= 0) {
      holidays[index] = holiday;
    } else {
      holidays.push(holiday);
    }
    // Sort by date ascending
    holidays.sort((a, b) => a.date.localeCompare(b.date));
    this.set(STORAGE_KEYS.HOLIDAYS, holidays);
  }

  deleteHoliday(id: string): void {
    const holidays = this.getHolidays().filter(h => h.id !== id);
    this.set(STORAGE_KEYS.HOLIDAYS, holidays);
  }

  resetStandardHolidays(): void {
    this.set(STORAGE_KEYS.HOLIDAYS, initialHolidays);
  }

  // --- Service & AMC ---
  getServiceTickets(): ServiceTicket[] {
    return this.get<ServiceTicket[]>(STORAGE_KEYS.SERVICE_TICKETS, initialServiceTickets);
  }

  saveServiceTicket(ticket: ServiceTicket): void {
    const tickets = this.getServiceTickets();
    const index = tickets.findIndex(t => t.id === ticket.id);
    if (index >= 0) {
      tickets[index] = ticket;
    } else {
      tickets.unshift(ticket);
    }
    this.set(STORAGE_KEYS.SERVICE_TICKETS, tickets);
  }

  resolveServiceTicket(ticketId: string, resolutionNotes?: string): void {
    const tickets = this.getServiceTickets();
    const index = tickets.findIndex(t => t.id === ticketId || t.ticketId === ticketId);
    if (index >= 0) {
      tickets[index] = {
        ...tickets[index],
        status: 'RESOLVED',
        resolvedDate: new Date().toISOString().slice(0, 10),
        notes: resolutionNotes ? `${tickets[index].notes ? tickets[index].notes + ' | ' : ''}Resolved: ${resolutionNotes}` : tickets[index].notes
      };
      this.set(STORAGE_KEYS.SERVICE_TICKETS, tickets);
    }
  }

  getRecentActivities(limit: number = 8): Array<{ id: string; action: string; details: string; userName: string; timestamp: string }> {
    const activities: Array<{ id: string; action: string; details: string; userName: string; timestamp: string }> = [];
    const projects = this.getProjects();
    projects.forEach(p => {
      p.stages.forEach(s => {
        s.activities?.forEach((a, aIdx) => {
          // Guarantee unique key across any project, stage, or activity
          const uniqueId = a.id && a.id.startsWith(p.id) ? a.id : `${p.id}-${s.stageKey}-${a.id || aIdx}`;
          activities.push({
            id: uniqueId,
            action: `${p.projectCode} • ${s.title}: ${a.action}`,
            details: a.details || `${s.title} updated`,
            userName: a.user,
            timestamp: a.timestamp
          });
        });
      });
    });

    if (activities.length === 0) {
      return [
        {
          id: 'act-1',
          action: 'SOL-2026-101 • Inverter Installation Completed',
          details: 'Sungrow 100kW string inverter mounted and wired to ACDB panel.',
          userName: 'Ankit Joshi',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
          id: 'act-2',
          action: 'SOL-2026-102 • Module Mounting Finished',
          details: '185 Waaree 540Wp solar panels aligned and torqued to HDG structure.',
          userName: 'Manoj Tiwari',
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
        },
        {
          id: 'act-3',
          action: 'SOL-2026-101 • Site Survey Approved',
          details: 'Shadow analysis & RCC roof load bearing report verified.',
          userName: 'Amit Sharma',
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString()
        },
        {
          id: 'act-4',
          action: 'Finance • Advance Milestone Received',
          details: '₹20,00,000 received via RTGS from ABC Industries Ltd.',
          userName: 'Suresh Shah',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
        }
      ];
    }

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  getAMCContracts(): AMCContract[] {
    return this.get<AMCContract[]>(STORAGE_KEYS.AMC_CONTRACTS, initialAMCContracts);
  }

  saveAMCContract(contract: AMCContract): void {
    const contracts = this.getAMCContracts();
    const index = contracts.findIndex(c => c.id === contract.id);
    if (index >= 0) {
      contracts[index] = contract;
    } else {
      contracts.unshift(contract);
    }
    this.set(STORAGE_KEYS.AMC_CONTRACTS, contracts);
  }

  // --- Site Surveys ---
  getSurveys(): SiteSurveyData[] {
    return this.get<SiteSurveyData[]>(STORAGE_KEYS.SURVEYS, initialSurveys);
  }

  saveSurvey(survey: SiteSurveyData): void {
    const surveys = this.getSurveys();
    const index = surveys.findIndex(s => s.id === survey.id);
    if (index >= 0) {
      surveys[index] = survey;
    } else {
      surveys.unshift(survey);
    }
    this.set(STORAGE_KEYS.SURVEYS, surveys);
  }

  // --- Quotations ---
  getQuotations(): Quotation[] {
    return this.get<Quotation[]>(STORAGE_KEYS.QUOTATIONS, initialQuotations);
  }

  getQuotationById(id: string): Quotation | undefined {
    return this.getQuotations().find(q => q.id === id || q.quotationNumber === id);
  }

  saveQuotation(quote: Quotation): void {
    const quotes = this.getQuotations();
    const index = quotes.findIndex(q => q.id === quote.id);
    if (index >= 0) {
      quotes[index] = quote;
    } else {
      quotes.unshift(quote);
    }
    this.set(STORAGE_KEYS.QUOTATIONS, quotes);
  }

  deleteQuotation(id: string): void {
    const quotes = this.getQuotations().filter(q => q.id !== id);
    this.set(STORAGE_KEYS.QUOTATIONS, quotes);
  }

  getNextQuotationNumber(): string {
    const quotes = this.getQuotations();
    const year = new Date().getFullYear();
    const prefix = `QTN-${year}-`;
    let maxNum = 0;
    quotes.forEach(q => {
      if (q.quotationNumber && q.quotationNumber.startsWith(prefix)) {
        const parts = q.quotationNumber.split('-');
        const n = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    });
    const nextVal = (maxNum + 1).toString().padStart(3, '0');
    return `${prefix}${nextVal}`;
  }

  // --- Notifications ---
  getNotifications(): AppNotification[] {
    return this.get<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
  }

  addNotification(notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): void {
    const notifications = this.getNotifications();
    notifications.unshift({
      ...notif,
      id: `notif-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      read: false
    });
    this.set(STORAGE_KEYS.NOTIFICATIONS, notifications);
  }

  markNotificationAsRead(id: string): void {
    const notifications = this.getNotifications().map(n => n.id === id ? { ...n, read: true } : n);
    this.set(STORAGE_KEYS.NOTIFICATIONS, notifications);
  }

  markAllNotificationsAsRead(): void {
    const notifications = this.getNotifications().map(n => ({ ...n, read: true }));
    this.set(STORAGE_KEYS.NOTIFICATIONS, notifications);
  }

  // --- Settings ---
  getSettings(): SystemSettings {
    const settings = this.get<SystemSettings>(STORAGE_KEYS.SETTINGS, initialSettings);
    if (!settings.logoUrl) {
      settings.logoUrl = initialSettings.logoUrl || '/logo-dark.png';
    }
    return settings;
  }

  saveSettings(settings: SystemSettings): void {
    this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  // ==========================================
  // Products & Inventory Management
  // ==========================================
  getProducts(): ProductItem[] {
    return this.get<ProductItem[]>(STORAGE_KEYS.PRODUCTS, initialProducts);
  }

  saveProduct(product: ProductItem): void {
    const products = this.getProducts();
    const validation = validateProduct(product, products, product.id);
    assertValid(validation);

    const idx = products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      products[idx] = { ...product, updatedAt: new Date().toISOString() };
    } else {
      products.unshift({
        ...product,
        id: product.id || `prod-${Date.now()}`,
        createdAt: product.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.set(STORAGE_KEYS.PRODUCTS, products);
  }

  deleteProduct(id: string): void {
    const products = this.getProducts().filter(p => p.id !== id);
    this.set(STORAGE_KEYS.PRODUCTS, products);
  }

  adjustStock(
    productId: string,
    newQty: number,
    reason: string,
    performedBy: string = 'Operations Team',
    warehouseId?: string,
    warehouseName?: string
  ): void {
    const products = this.getProducts();
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const warehouses = this.getWarehouses();
    const wh = warehouseId ? warehouses.find(w => w.id === warehouseId) : this.getDefaultWarehouse();
    const targetWhId = warehouseId || wh?.id || 'wh-1';
    const targetWhName = warehouseName || wh?.name || 'Central Solar Logistics Hub - Pune';

    prod.warehouseStocks = prod.warehouseStocks || {};
    const previousWhQty = prod.warehouseStocks[targetWhId] ?? prod.currentStock;
    const diff = newQty - previousWhQty;

    prod.warehouseStocks[targetWhId] = Math.max(0, newQty);
    
    // Total current stock updated
    const previousTotal = prod.currentStock;
    prod.currentStock = Math.max(0, previousTotal + diff);
    prod.updatedAt = new Date().toISOString();
    this.set(STORAGE_KEYS.PRODUCTS, products);

    const isAudit = reason.toLowerCase().includes('audit') || reason.toLowerCase().includes('physical');

    this.addStockMovement({
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      movementType: isAudit ? 'AUDIT_RECONCILIATION' : 'ADJUSTMENT',
      quantity: diff,
      balanceAfter: prod.currentStock,
      warehouseId: targetWhId,
      warehouseName: targetWhName,
      notes: reason || `Inventory count adjustment at ${targetWhName} from ${previousWhQty} to ${newQty}`,
      performedBy
    });
  }

  // ==========================================
  // Vendor Management
  // ==========================================
  getVendors(): Vendor[] {
    return this.get<Vendor[]>(STORAGE_KEYS.VENDORS, initialVendors);
  }

  saveVendor(vendor: Vendor): void {
    const vendors = this.getVendors();
    const validation = validateVendor(vendor, vendors, vendor.id);
    assertValid(validation);

    const idx = vendors.findIndex(v => v.id === vendor.id);
    if (idx >= 0) {
      vendors[idx] = { ...vendor, updatedAt: new Date().toISOString() };
    } else {
      vendors.unshift({
        ...vendor,
        id: vendor.id || `vnd-${Date.now()}`,
        createdAt: vendor.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.set(STORAGE_KEYS.VENDORS, vendors);
  }

  deleteVendor(id: string): void {
    const vendors = this.getVendors().filter(v => v.id !== id);
    this.set(STORAGE_KEYS.VENDORS, vendors);
  }

  // ==========================================
  // Purchase Entry & Purchase Orders
  // ==========================================
  getPurchaseOrders(): PurchaseOrder[] {
    const orders = this.get<PurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, initialPurchaseOrders);
    return orders.map(order => {
      const items: PurchaseLineItem[] = (order.items || []).map((item, idx) => {
        const orderedQty = Math.max(0, Number(item.orderedQuantity ?? item.quantity ?? 0));
        let receivedQty = Math.max(0, Number(item.receivedQuantity ?? 0));
        if (item.receivedQuantity === undefined && (order.status === 'RECEIVED' || order.stockUpdated)) {
          receivedQty = orderedQty;
        }
        const pendingQty = Math.max(0, Number(item.pendingQuantity ?? Math.max(0, orderedQty - receivedQty)));
        const rejectedQty = Math.max(0, Number(item.rejectedQuantity ?? 0));
        const unitPrice = Math.max(0, Number(item.unitPrice || 0));
        const taxPercent = Math.max(0, Number(item.taxPercent ?? item.taxRatePercent ?? 12));
        const taxAmount = Math.round((orderedQty * unitPrice * taxPercent) / 100);
        const totalAmount = (orderedQty * unitPrice) + taxAmount;

        return {
          ...item,
          id: item.id || `poi-${order.id}-${idx}`,
          orderedQuantity: orderedQty,
          receivedQuantity: receivedQty,
          pendingQuantity: pendingQty,
          rejectedQuantity: rejectedQty,
          unitPrice,
          taxPercent,
          taxAmount,
          totalAmount,
          quantity: orderedQty,
          taxRatePercent: taxPercent,
          totalPrice: totalAmount
        };
      });

      return {
        ...order,
        items,
        deliveryReceipts: order.deliveryReceipts || []
      };
    });
  }

  savePurchaseOrder(order: PurchaseOrder, _autoSyncStock: boolean = false, _performedBy: string = 'Purchase Manager'): void {
    const orders = this.getPurchaseOrders();
    const validation = validatePurchaseOrder(order, orders, order.id);
    assertValid(validation);

    const idx = orders.findIndex(o => o.id === order.id);

    // Compute accurate line-item totals and derived quantities
    const items: PurchaseLineItem[] = (order.items || []).map((item, i) => {
      const orderedQty = Math.max(0, Number(item.orderedQuantity ?? item.quantity ?? 0));
      const receivedQty = Math.max(0, Number(item.receivedQuantity ?? 0));
      const pendingQty = Math.max(0, orderedQty - receivedQty);
      const rejectedQty = Math.max(0, Number(item.rejectedQuantity ?? 0));
      const unitPrice = Math.max(0, Number(item.unitPrice || 0));
      const taxPercent = Math.max(0, Number(item.taxPercent ?? item.taxRatePercent ?? 12));
      const taxAmount = Math.round((orderedQty * unitPrice * taxPercent) / 100);
      const totalAmount = (orderedQty * unitPrice) + taxAmount;

      return {
        ...item,
        id: item.id || `poi-${Date.now()}-${i}`,
        orderedQuantity: orderedQty,
        receivedQuantity: receivedQty,
        pendingQuantity: pendingQty,
        rejectedQuantity: rejectedQty,
        unitPrice,
        taxPercent,
        taxAmount,
        totalAmount,
        quantity: orderedQty,
        taxRatePercent: taxPercent,
        totalPrice: totalAmount
      };
    });

    const subtotal = items.reduce((sum, it) => sum + (it.orderedQuantity * it.unitPrice), 0);
    const taxAmount = items.reduce((sum, it) => sum + it.taxAmount, 0);
    const totalAmount = subtotal + taxAmount;

    // Determine accurate status based on received vs ordered
    let status = order.status;
    if (status !== 'CANCELLED' && status !== 'DRAFT') {
      const allReceived = items.length > 0 && items.every(it => it.receivedQuantity >= it.orderedQuantity);
      const anyReceived = items.some(it => it.receivedQuantity > 0);
      if (allReceived) {
        status = 'RECEIVED';
      } else if (anyReceived) {
        status = 'PARTIALLY_RECEIVED';
      } else {
        status = 'ORDERED';
      }
    }

    const updatedOrder: PurchaseOrder = {
      ...order,
      items,
      subtotal,
      taxAmount,
      totalAmount,
      status,
      deliveryReceipts: order.deliveryReceipts || [],
      updatedAt: new Date().toISOString()
    };

    if (!updatedOrder.id) {
      updatedOrder.id = `po-${Date.now()}`;
      updatedOrder.createdAt = new Date().toISOString();
    }

    if (idx >= 0) {
      orders[idx] = updatedOrder;
    } else {
      orders.unshift(updatedOrder);
    }
    this.set(STORAGE_KEYS.PURCHASE_ORDERS, orders);
  }

  recordPurchaseReceipt(
    orderId: string,
    receiptInput: {
      receiptDate: string;
      deliveryChallanNo?: string;
      transporterName?: string;
      receivedBy: string;
      notes?: string;
      items: {
        lineItemId: string;
        receivedQuantity: number;
        rejectedQuantity?: number;
        rejectionReason?: string;
        isExcessApproved?: boolean;
        excessApprovalReason?: string;
      }[];
    },
    performedBy: string = 'Store Incharge'
  ): PurchaseOrder | null {
    const orders = this.getPurchaseOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    const products = this.getProducts();
    const receiptId = `grn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const receiptNumber = `GRN-${new Date().getFullYear()}-${String((order.deliveryReceipts?.length || 0) + 1).padStart(3, '0')}`;

    const receiptItems: DeliveryReceiptItem[] = [];

    receiptInput.items.forEach(inputItem => {
      const lineItem = order.items.find(it => it.id === inputItem.lineItemId);
      if (!lineItem) return;

      const arrivingQty = Math.max(0, Number(inputItem.receivedQuantity || 0));
      const rejectedQty = Math.max(0, Number(inputItem.rejectedQuantity || 0));

      if (arrivingQty > 0 || rejectedQty > 0) {
        receiptItems.push({
          lineItemId: lineItem.id,
          productId: lineItem.productId,
          productName: lineItem.productName,
          sku: lineItem.sku,
          unit: lineItem.unit,
          receivedQuantity: arrivingQty,
          rejectedQuantity: rejectedQty,
          rejectionReason: inputItem.rejectionReason,
          isExcessApproved: inputItem.isExcessApproved,
          excessApprovalReason: inputItem.excessApprovalReason
        });
      }

      // Increase stock in warehouse ONLY for arrivingQty
      if (arrivingQty > 0) {
        const prod = products.find(p => p.id === lineItem.productId || p.sku === lineItem.sku);
        if (prod) {
          prod.currentStock += arrivingQty;
          if (order.warehouseId) {
            prod.warehouseStocks = prod.warehouseStocks || {};
            prod.warehouseStocks[order.warehouseId] = (prod.warehouseStocks[order.warehouseId] || 0) + arrivingQty;
          }
          prod.updatedAt = new Date().toISOString();
          this.addStockMovement({
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            movementType: 'PURCHASE_RECEIPT',
            quantity: arrivingQty,
            balanceAfter: prod.currentStock,
            warehouseId: order.warehouseId,
            warehouseName: order.warehouseName,
            referenceId: order.id,
            referenceNumber: order.purchaseNumber,
            notes: `Goods Receipt ${receiptNumber}${receiptInput.deliveryChallanNo ? ' (DC: ' + receiptInput.deliveryChallanNo + ')' : ''} from ${order.vendorName}${order.warehouseName ? ' into ' + order.warehouseName : ''}`,
            performedBy: performedBy || receiptInput.receivedBy
          });
        }
      }

      // Update line item accumulators
      lineItem.receivedQuantity = (lineItem.receivedQuantity || 0) + arrivingQty;
      lineItem.rejectedQuantity = (lineItem.rejectedQuantity || 0) + rejectedQty;
      lineItem.pendingQuantity = Math.max(0, lineItem.orderedQuantity - lineItem.receivedQuantity);
      lineItem.quantity = lineItem.orderedQuantity;
    });

    // Save updated products to storage
    this.set(STORAGE_KEYS.PRODUCTS, products);

    // Create the receipt record
    const newReceipt: PurchaseDeliveryReceipt = {
      id: receiptId,
      receiptNumber,
      receiptDate: receiptInput.receiptDate || new Date().toISOString().slice(0, 10),
      deliveryChallanNo: receiptInput.deliveryChallanNo,
      transporterName: receiptInput.transporterName,
      receivedBy: receiptInput.receivedBy || performedBy,
      notes: receiptInput.notes,
      items: receiptItems,
      createdAt: new Date().toISOString()
    };

    if (!order.deliveryReceipts) {
      order.deliveryReceipts = [];
    }
    order.deliveryReceipts.unshift(newReceipt);

    // Determine updated order status
    const allReceived = order.items.length > 0 && order.items.every(it => it.receivedQuantity >= it.orderedQuantity);
    const anyReceived = order.items.some(it => it.receivedQuantity > 0);

    if (allReceived) {
      order.status = 'RECEIVED';
      order.receivedDate = receiptInput.receiptDate || new Date().toISOString().slice(0, 10);
    } else if (anyReceived) {
      order.status = 'PARTIALLY_RECEIVED';
    }

    order.stockUpdated = anyReceived;
    order.updatedAt = new Date().toISOString();

    this.set(STORAGE_KEYS.PURCHASE_ORDERS, orders);
    return order;
  }

  receivePurchaseOrder(id: string, performedBy: string = 'Store Incharge'): void {
    const orders = this.getPurchaseOrders();
    const order = orders.find(o => o.id === id);
    if (!order) return;

    // Collect all pending items to receive
    const pendingItemsToReceive = order.items.map(it => ({
      lineItemId: it.id,
      receivedQuantity: it.pendingQuantity > 0 ? it.pendingQuantity : (it.receivedQuantity === 0 ? it.orderedQuantity : 0),
      rejectedQuantity: 0
    })).filter(it => it.receivedQuantity > 0);

    if (pendingItemsToReceive.length > 0) {
      this.recordPurchaseReceipt(
        id,
        {
          receiptDate: new Date().toISOString().slice(0, 10),
          deliveryChallanNo: order.invoiceReference || 'Direct Delivery',
          receivedBy: performedBy,
          notes: 'Full goods delivery receipt recorded',
          items: pendingItemsToReceive
        },
        performedBy
      );
    } else {
      order.status = 'RECEIVED';
      order.stockUpdated = true;
      order.updatedAt = new Date().toISOString();
      this.set(STORAGE_KEYS.PURCHASE_ORDERS, orders);
    }
  }

  deletePurchaseOrder(id: string): void {
    const orders = this.getPurchaseOrders().filter(o => o.id !== id);
    this.set(STORAGE_KEYS.PURCHASE_ORDERS, orders);
  }

  // ==========================================
  // Bill of Materials (BOM)
  // ==========================================
  getBOMs(): BillOfMaterials[] {
    return this.get<BillOfMaterials[]>(STORAGE_KEYS.BOMS, initialBOMs);
  }

  saveBOM(bom: BillOfMaterials): void {
    const boms = this.getBOMs();
    const validation = validateBOM(bom, boms, bom.id);
    assertValid(validation);

    const idx = boms.findIndex(b => b.id === bom.id);
    if (idx >= 0) {
      boms[idx] = { ...bom, updatedAt: new Date().toISOString() };
    } else {
      boms.unshift({
        ...bom,
        id: bom.id || `bom-${Date.now()}`,
        createdAt: bom.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.set(STORAGE_KEYS.BOMS, boms);
  }

  allocateBOMStock(bomId: string, performedBy: string = 'Project Engineer'): boolean {
    const boms = this.getBOMs();
    const bom = boms.find(b => b.id === bomId);
    if (!bom) return false;

    const products = this.getProducts();
    let hasUpdatedStock = false;

    bom.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId || p.sku === item.sku);
      if (prod && item.requiredQty > 0) {
        const alloc = Math.min(item.requiredQty, prod.currentStock);
        prod.currentStock = Math.max(0, prod.currentStock - item.requiredQty);
        if (bom.warehouseId) {
          prod.warehouseStocks = prod.warehouseStocks || {};
          prod.warehouseStocks[bom.warehouseId] = Math.max(0, (prod.warehouseStocks[bom.warehouseId] || prod.currentStock) - item.requiredQty);
        }
        item.allocatedQty = item.requiredQty;
        item.status = 'ALLOCATED';
        hasUpdatedStock = true;

        this.addStockMovement({
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          movementType: 'BOM_ALLOCATION',
          quantity: -item.requiredQty,
          balanceAfter: prod.currentStock,
          warehouseId: bom.warehouseId,
          warehouseName: bom.warehouseName,
          referenceId: bom.id,
          referenceNumber: bom.bomNumber,
          notes: `BOM allocation for ${bom.projectTitle} (${bom.customerName})${bom.warehouseName ? ' from ' + bom.warehouseName : ''}`,
          performedBy
        });
      }
    });

    if (hasUpdatedStock) {
      this.set(STORAGE_KEYS.PRODUCTS, products);
      bom.stockAllocated = true;
      if (bom.status === 'DRAFT') {
        bom.status = 'APPROVED';
      }
      bom.updatedAt = new Date().toISOString();
      this.set(STORAGE_KEYS.BOMS, boms);
      return true;
    }

    return false;
  }

  deleteBOM(id: string): void {
    const boms = this.getBOMs().filter(b => b.id !== id);
    this.set(STORAGE_KEYS.BOMS, boms);
  }

  // ==========================================
  // Sales Invoices
  // ==========================================
  getSalesInvoices(): SalesInvoice[] {
    return this.get<SalesInvoice[]>(STORAGE_KEYS.SALES_INVOICES, initialSalesInvoices);
  }

  saveSalesInvoice(invoice: SalesInvoice, deductStockNow: boolean = false, performedBy: string = 'Accounts Officer'): void {
    const invoices = this.getSalesInvoices();
    const idx = invoices.findIndex(i => i.id === invoice.id);

    let updated = { ...invoice, updatedAt: new Date().toISOString() };
    if (!updated.id) {
      updated.id = `inv-${Date.now()}`;
      updated.createdAt = new Date().toISOString();
    }

    const shouldDeduct = (deductStockNow || updated.deductStock) && !updated.stockDeducted;

    if (shouldDeduct) {
      const products = this.getProducts();
      let deductedAny = false;

      updated.items.forEach(item => {
        if (item.productId && item.quantity > 0) {
          const prod = products.find(p => p.id === item.productId);
          if (prod) {
            prod.currentStock = Math.max(0, prod.currentStock - item.quantity);
            prod.updatedAt = new Date().toISOString();
            deductedAny = true;

            this.addStockMovement({
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              movementType: 'INVOICE_SALE',
              quantity: -item.quantity,
              balanceAfter: prod.currentStock,
              referenceId: updated.id,
              referenceNumber: updated.invoiceNumber,
              notes: `Dispatched to ${updated.customerName} via Invoice ${updated.invoiceNumber}`,
              performedBy
            });
          }
        }
      });

      if (deductedAny) {
        this.set(STORAGE_KEYS.PRODUCTS, products);
        updated.stockDeducted = true;
      }
    }

    if (idx >= 0) {
      invoices[idx] = updated;
    } else {
      invoices.unshift(updated);
    }
    this.set(STORAGE_KEYS.SALES_INVOICES, invoices);
  }

  deleteSalesInvoice(id: string): void {
    const invoices = this.getSalesInvoices().filter(i => i.id !== id);
    this.set(STORAGE_KEYS.SALES_INVOICES, invoices);
  }

  // ==========================================
  // Stock Movements
  // ==========================================
  getStockMovements(): StockMovement[] {
    return this.get<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, initialStockMovements);
  }

  addStockMovement(movement: Omit<StockMovement, 'id' | 'timestamp'>): void {
    const movements = this.getStockMovements();
    movements.unshift({
      ...movement,
      id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    });
    this.set(STORAGE_KEYS.STOCK_MOVEMENTS, movements);
  }

  // ==========================================
  // Role-Based Access Control (ACL)
  // ==========================================
  getAclConfig(): SystemAclConfig {
    return this.get<SystemAclConfig>(STORAGE_KEYS.ACL_CONFIG, DEFAULT_SYSTEM_ACL_CONFIG);
  }

  saveAclConfig(config: SystemAclConfig): void {
    this.set(STORAGE_KEYS.ACL_CONFIG, config);
  }

  updateRolePermissions(
    role: UserRole,
    permissions: Record<string, boolean>,
    changedBy = 'System Admin',
    summary?: string
  ): void {
    const config = this.getAclConfig();
    config[role] = {
      ...(config[role] || {}),
      ...permissions
    };

    // If Admin, ensure core root permissions cannot be accidentally ungranted
    if (role === 'Admin') {
      config['Admin']['settings.acl_manage'] = true;
      config['Admin']['settings.manage'] = true;
      config['Admin']['settings.view'] = true;
    }

    this.saveAclConfig(config);

    const defaultSummary = summary || `Updated ${Object.keys(permissions).length} operational permissions for ${role}`;
    this.addAclAuditLog({
      changedBy,
      targetRole: role,
      action: 'UPDATE_PERMISSIONS',
      summary: defaultSummary
    });
  }

  resetRoleAclToDefault(role: UserRole, changedBy = 'System Admin'): SystemAclConfig {
    const config = this.getAclConfig();
    config[role] = { ...(DEFAULT_SYSTEM_ACL_CONFIG[role] || {}) };
    this.saveAclConfig(config);

    this.addAclAuditLog({
      changedBy,
      targetRole: role,
      action: 'RESET_ROLE',
      summary: `Restored standard Solar EPC default permissions for ${role}`
    });

    return config;
  }

  resetAllAclToDefault(changedBy = 'System Admin'): SystemAclConfig {
    const deepClone = JSON.parse(JSON.stringify(DEFAULT_SYSTEM_ACL_CONFIG));
    this.saveAclConfig(deepClone);

    this.addAclAuditLog({
      changedBy,
      targetRole: 'Admin',
      action: 'RESET_ROLE',
      summary: 'Restored baseline Solar EPC permissions for all 15 operational roles'
    });

    return deepClone;
  }

  hasAclPermission(role: UserRole, permissionId: string): boolean {
    if (role === 'Admin') return true;
    const config = this.getAclConfig();
    const rolePerms = config[role];
    if (!rolePerms) return false;
    return Boolean(rolePerms[permissionId]);
  }

  assertPermission(role: UserRole, permissionId: string, actionDescription?: string): void {
    if (role === 'Admin') return;
    if (!this.hasAclPermission(role, permissionId)) {
      throw new Error(`Security Exception: Access Denied. Role "${role}" is not authorized to ${actionDescription || permissionId}.`);
    }
  }

  assertAdmin(role: UserRole, actionDescription?: string): void {
    if (role !== 'Admin') {
      throw new Error(`Security Exception: Access Denied. Role "${role}" is not authorized for administrative operation: ${actionDescription || 'Admin access required'}.`);
    }
  }

  getAclAuditLogs(): AclAuditLogEntry[] {
    return this.get<AclAuditLogEntry[]>(STORAGE_KEYS.ACL_AUDIT_LOGS, initialAclAuditLogs);
  }

  addAclAuditLog(log: Omit<AclAuditLogEntry, 'id' | 'timestamp'>): void {
    const logs = this.getAclAuditLogs();
    logs.unshift({
      ...log,
      id: `acl-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    });
    // Keep max 50 recent audit records
    this.set(STORAGE_KEYS.ACL_AUDIT_LOGS, logs.slice(0, 50));
  }

  // ==========================================
  // Multi-Warehouse Management
  // ==========================================
  getWarehouses(): Warehouse[] {
    return this.get<Warehouse[]>(STORAGE_KEYS.WAREHOUSES, initialWarehouses);
  }

  saveWarehouse(warehouse: Warehouse): void {
    const list = this.getWarehouses();
    const idx = list.findIndex(w => w.id === warehouse.id);
    if (warehouse.isDefault) {
      list.forEach(w => {
        if (w.id !== warehouse.id) w.isDefault = false;
      });
    }
    if (idx >= 0) {
      list[idx] = { ...warehouse, updatedAt: new Date().toISOString() };
    } else {
      list.push({ ...warehouse, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.set(STORAGE_KEYS.WAREHOUSES, list);
  }

  deleteWarehouse(id: string): { success: boolean; message?: string } {
    const list = this.getWarehouses();
    const target = list.find(w => w.id === id);
    if (!target) return { success: false, message: 'Warehouse not found' };
    if (target.isDefault) {
      return { success: false, message: 'Cannot delete the default warehouse. Please mark another warehouse as default first.' };
    }
    const updated = list.filter(w => w.id !== id);
    this.set(STORAGE_KEYS.WAREHOUSES, updated);
    return { success: true };
  }

  getDefaultWarehouse(): Warehouse {
    const list = this.getWarehouses();
    return list.find(w => w.isDefault && w.status === 'ACTIVE') || list[0] || initialWarehouses[0];
  }

  getStockAudits(): StockAuditRecord[] {
    return this.get<StockAuditRecord[]>(STORAGE_KEYS.STOCK_AUDITS, initialStockAudits);
  }

  saveStockAudit(audit: StockAuditRecord): void {
    const list = this.getStockAudits();
    const idx = list.findIndex(a => a.id === audit.id);
    if (idx >= 0) {
      list[idx] = audit;
    } else {
      list.unshift(audit);
    }
    this.set(STORAGE_KEYS.STOCK_AUDITS, list);
  }

  transferStock(
    productId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    quantity: number,
    notes: string,
    performedBy: string = 'Inventory Manager'
  ): { success: boolean; message?: string } {
    const products = this.getProducts();
    const prod = products.find(p => p.id === productId);
    if (!prod) return { success: false, message: 'Product not found' };
    if (quantity <= 0) return { success: false, message: 'Transfer quantity must be greater than 0' };

    const warehouses = this.getWarehouses();
    const fromWh = warehouses.find(w => w.id === fromWarehouseId);
    const toWh = warehouses.find(w => w.id === toWarehouseId);
    if (!fromWh || !toWh) return { success: false, message: 'Source or destination warehouse invalid' };

    prod.warehouseStocks = prod.warehouseStocks || {};
    const currentFromStock = prod.warehouseStocks[fromWarehouseId] ?? prod.currentStock;
    if (currentFromStock < quantity) {
      return { success: false, message: `Insufficient stock at ${fromWh.name}. Available: ${currentFromStock} ${prod.unit}` };
    }

    prod.warehouseStocks[fromWarehouseId] = currentFromStock - quantity;
    prod.warehouseStocks[toWarehouseId] = (prod.warehouseStocks[toWarehouseId] ?? 0) + quantity;
    prod.updatedAt = new Date().toISOString();
    this.set(STORAGE_KEYS.PRODUCTS, products);

    this.addStockMovement({
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      movementType: 'WAREHOUSE_TRANSFER',
      quantity: -quantity,
      balanceAfter: prod.warehouseStocks[fromWarehouseId],
      warehouseId: fromWarehouseId,
      warehouseName: fromWh.name,
      targetWarehouseId: toWarehouseId,
      targetWarehouseName: toWh.name,
      notes: notes || `Transferred ${quantity} ${prod.unit} from ${fromWh.name} to ${toWh.name}`,
      performedBy
    });

    this.addStockMovement({
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      movementType: 'WAREHOUSE_TRANSFER',
      quantity: quantity,
      balanceAfter: prod.warehouseStocks[toWarehouseId],
      warehouseId: toWarehouseId,
      warehouseName: toWh.name,
      targetWarehouseId: fromWarehouseId,
      targetWarehouseName: fromWh.name,
      notes: notes || `Received transfer of ${quantity} ${prod.unit} from ${fromWh.name}`,
      performedBy
    });

    return { success: true };
  }

  // Reset demo data to default fresh state
  resetAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.LEADS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    localStorage.removeItem(STORAGE_KEYS.PAYSLIPS);
    localStorage.removeItem(STORAGE_KEYS.HOLIDAYS);
    localStorage.removeItem(STORAGE_KEYS.SERVICE_TICKETS);
    localStorage.removeItem(STORAGE_KEYS.AMC_CONTRACTS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.SURVEYS);
    localStorage.removeItem(STORAGE_KEYS.QUOTATIONS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.VENDORS);
    localStorage.removeItem(STORAGE_KEYS.PURCHASE_ORDERS);
    localStorage.removeItem(STORAGE_KEYS.BOMS);
    localStorage.removeItem(STORAGE_KEYS.SALES_INVOICES);
    localStorage.removeItem(STORAGE_KEYS.STOCK_MOVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.ACL_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.ACL_AUDIT_LOGS);
    localStorage.removeItem(STORAGE_KEYS.WAREHOUSES);
    localStorage.removeItem(STORAGE_KEYS.STOCK_AUDITS);
    window.location.reload();
  }
}

export const storageService = new StorageService();
