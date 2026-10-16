import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, SolarProject, AppNotification, SystemSettings } from '../types/solar';
import { storageService } from '../services/storage';
import { ExportModule } from '../services/exportImport';
import { ReportCategory } from '../types/reports';

export type SettingsTab = 'general' | 'tally' | 'whatsapp' | 'acl' | 'users' | 'database';

export type AppView =
  | 'dashboard'
  | 'live_tracking'
  | 'crm_leads'
  | 'crm_customers'
  | 'crm_quotations'
  | 'projects_all'
  | 'projects_stage_filtered'
  | 'customer_control_center'
  | 'sales_purchase'
  | 'sales_bom'
  | 'sales_invoices'
  | 'purchase_vendors'
  | 'purchase_orders'
  | 'inventory_products'
  | 'inventory_stock'
  | 'warehouse_management'
  | 'finance'
  | 'hrms'
  | 'service'
  | 'reports'
  | 'settings'
  | 'customer_portal'
  | 'users';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}

interface AppContextType {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  selectedCustomerId: string | null;
  selectedProjectId: string | null;
  openCustomerControlCenter: (customerId: string, projectId?: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isWhatsAppOpen: boolean;
  whatsAppData: {
    recipientPhone: string;
    recipientName: string;
    type: any;
    data: any;
  } | null;
  openWhatsAppModal: (phone: string, name: string, type: any, data: any) => void;
  closeWhatsAppModal: () => void;
  isImportExportOpen: boolean;
  importExportModule: ExportModule;
  openImportExportModal: (module: ExportModule) => void;
  closeImportExportModal: () => void;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  settings: SystemSettings;
  updateSettings: (newSettings: SystemSettings) => void;
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  stageFilterKey: string | null;
  setStageFilterKey: (key: string | null) => void;
  activeReportCategory: ReportCategory;
  setActiveReportCategory: (category: ReportCategory) => void;
  openReport: (category: ReportCategory) => void;
  activeSettingsTab: SettingsTab;
  setActiveSettingsTab: (tab: SettingsTab) => void;
  openSettingsTab: (tab: SettingsTab) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const getNormalizedPath = (pathname: string): string => {
  let p = pathname.toLowerCase();
  // Strip import.meta.env.BASE_URL if set (e.g. /erp/)
  const baseUrl = (import.meta.env.BASE_URL || '/').toLowerCase().replace(/\/+$/, '');
  if (baseUrl && baseUrl !== '/' && p.startsWith(baseUrl)) {
    p = p.slice(baseUrl.length) || '/';
  }
  return p.replace(/\/+$/, '') || '/';
};

const getInitialViewFromPath = (): { view: AppView; filterKey: string | null; settingsTab?: SettingsTab } => {
  if (typeof window === 'undefined') {
    return { view: 'dashboard', filterKey: null, settingsTab: 'general' };
  }
  const path = getNormalizedPath(window.location.pathname);

  // Settings sub-routes
  if (path === '/settings/acl' || path.endsWith('/settings/acl') || path === '/acl' || path === '/roles') {
    return { view: 'settings', filterKey: null, settingsTab: 'acl' };
  }
  if (path === '/settings/database' || path.endsWith('/settings/database') || path === '/database' || path === '/mysql') {
    return { view: 'settings', filterKey: null, settingsTab: 'database' };
  }
  if (path === '/settings/tally' || path.endsWith('/settings/tally')) {
    return { view: 'settings', filterKey: null, settingsTab: 'tally' };
  }
  if (path === '/settings/whatsapp' || path.endsWith('/settings/whatsapp')) {
    return { view: 'settings', filterKey: null, settingsTab: 'whatsapp' };
  }
  if (path === '/users' || path === '/settings/users' || path.endsWith('/users')) {
    return { view: 'users', filterKey: null, settingsTab: 'users' };
  }
  if (path === '/settings/general' || path.endsWith('/settings/general') || path === '/settings' || path.endsWith('/settings')) {
    return { view: 'settings', filterKey: null, settingsTab: 'general' };
  }

  // Role-specific dashboard URLs
  if (
    path === '/admin/dashboard' ||
    path === '/sales/dashboard' ||
    path === '/projects/dashboard' ||
    path === '/field/dashboard' ||
    path === '/service/dashboard' ||
    path === '/finance/dashboard' ||
    path === '/hr/dashboard'
  ) {
    return { view: 'dashboard', filterKey: null };
  }
  if (path === '/customer/dashboard') {
    return { view: 'customer_portal', filterKey: null };
  }

  // Core ERP & CRM Modules
  if (path === '/live-tracking' || path === '/field-tracking' || path.endsWith('/live-tracking') || path.endsWith('/field-tracking')) {
    return { view: 'live_tracking', filterKey: null };
  }
  if (
    path === '/customers' ||
    path === '/crm/customers' ||
    path === '/crm-customers' ||
    path.endsWith('/customers') ||
    path.endsWith('/crm/customers') ||
    path.endsWith('/crm-customers')
  ) {
    return { view: 'crm_customers', filterKey: null };
  }
  if (
    path === '/quotations' ||
    path === '/crm/quotations' ||
    path === '/crm-quotations' ||
    path === '/proposals' ||
    path.endsWith('/quotations') ||
    path.endsWith('/crm/quotations') ||
    path.endsWith('/crm-quotations') ||
    path.endsWith('/proposals')
  ) {
    return { view: 'crm_quotations', filterKey: null };
  }
  if (
    path === '/crm' ||
    path === '/leads' ||
    path === '/crm/leads' ||
    path === '/crm-leads' ||
    path.endsWith('/leads') ||
    path.endsWith('/crm/leads') ||
    path.endsWith('/crm-leads') ||
    path.endsWith('/crm')
  ) {
    return { view: 'crm_leads', filterKey: null };
  }
  if (path === '/projects' || path.endsWith('/projects')) {
    return { view: 'projects_all', filterKey: null };
  }
  if (path === '/site-visits' || path.endsWith('/site-visits') || path === '/surveys') {
    return { view: 'projects_stage_filtered', filterKey: 'site_survey' };
  }
  if (path === '/installations' || path.endsWith('/installations')) {
    return { view: 'projects_stage_filtered', filterKey: 'module_mounting' };
  }
  if (path === '/services' || path === '/service' || path.endsWith('/services') || path.endsWith('/service')) {
    return { view: 'service', filterKey: null };
  }
  if (path === '/reports' || path.endsWith('/reports')) {
    return { view: 'reports', filterKey: null };
  }
  if (path === '/finance' || path.endsWith('/finance') || path === '/accounts') {
    return { view: 'finance', filterKey: null };
  }
  if (path === '/hrms' || path === '/hrm' || path.endsWith('/hrms') || path === '/employees') {
    return { view: 'hrms', filterKey: null };
  }
  if (path === '/customer-portal' || path === '/portal' || path.endsWith('/customer-portal') || path.endsWith('/portal')) {
    return { view: 'customer_portal', filterKey: null };
  }
  if (path === '/control-center' || path === '/customer-control-center' || path.endsWith('/control-center')) {
    return { view: 'customer_control_center', filterKey: null };
  }

  // Sales, Purchase & Inventory Modules
  if (path === '/sales' || path === '/sales-purchase' || path.endsWith('/sales-purchase')) {
    return { view: 'sales_purchase', filterKey: null };
  }
  if (path === '/bom' || path.endsWith('/bom')) {
    return { view: 'sales_bom', filterKey: null };
  }
  if (path === '/invoices' || path.endsWith('/invoices')) {
    return { view: 'sales_invoices', filterKey: null };
  }
  if (path === '/vendors' || path.endsWith('/vendors')) {
    return { view: 'purchase_vendors', filterKey: null };
  }
  if (path === '/purchase-orders' || path.endsWith('/purchase-orders')) {
    return { view: 'purchase_orders', filterKey: null };
  }
  if (path === '/products' || path.endsWith('/products')) {
    return { view: 'inventory_products', filterKey: null };
  }
  if (path === '/inventory' || path === '/stock' || path.endsWith('/inventory')) {
    return { view: 'inventory_stock', filterKey: null };
  }
  if (path === '/warehouses' || path === '/warehouse-management' || path.endsWith('/warehouses')) {
    return { view: 'warehouse_management', filterKey: null };
  }

  // Dashboard / Root
  if (path === '/' || path === '/dashboard' || path.endsWith('/dashboard')) {
    return { view: 'dashboard', filterKey: null };
  }

  return { view: 'dashboard', filterKey: null };
};

const getPathForView = (view: AppView, filterKey?: string | null, settingsTab?: SettingsTab): string => {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  let route = '/dashboard';

  switch (view) {
    case 'dashboard':
      route = '/dashboard';
      break;
    case 'live_tracking':
      route = '/live-tracking';
      break;
    case 'crm_leads':
      route = '/leads';
      break;
    case 'crm_customers':
      route = '/customers';
      break;
    case 'crm_quotations':
      route = '/quotations';
      break;
    case 'projects_all':
      route = '/projects';
      break;
    case 'projects_stage_filtered':
      if (filterKey === 'site_survey') route = '/site-visits';
      else if (filterKey === 'module_mounting') route = '/installations';
      else route = '/projects';
      break;
    case 'customer_control_center':
      route = '/control-center';
      break;
    case 'finance':
      route = '/finance';
      break;
    case 'hrms':
      route = '/hrms';
      break;
    case 'service':
      route = '/services';
      break;
    case 'reports':
      route = '/reports';
      break;
    case 'settings':
      if (settingsTab && settingsTab !== 'general') {
        route = `/settings/${settingsTab}`;
      } else {
        route = '/settings';
      }
      break;
    case 'customer_portal':
      route = '/customer-portal';
      break;
    case 'sales_purchase':
      route = '/sales-purchase';
      break;
    case 'sales_bom':
      route = '/bom';
      break;
    case 'sales_invoices':
      route = '/invoices';
      break;
    case 'purchase_vendors':
      route = '/vendors';
      break;
    case 'purchase_orders':
      route = '/purchase-orders';
      break;
    case 'inventory_products':
      route = '/products';
      break;
    case 'inventory_stock':
      route = '/inventory';
      break;
    case 'warehouse_management':
      route = '/warehouses';
      break;
    case 'users':
      route = '/users';
      break;
    default:
      route = '/dashboard';
  }

  return base ? `${base}${route}` : route;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialRoute = getInitialViewFromPath();
  const [activeView, setActiveViewState] = useState<AppView>(initialRoute.view);
  const [stageFilterKey, setStageFilterKeyInternal] = useState<string | null>(initialRoute.filterKey);
  const [activeReportCategory, setActiveReportCategory] = useState<ReportCategory>('sales');
  const [activeSettingsTab, setActiveSettingsTabState] = useState<SettingsTab>(initialRoute.settingsTab || 'general');

  const openReport = (category: ReportCategory) => {
    setActiveReportCategory(category);
    setActiveView('reports');
  };

  const setActiveSettingsTab = (tab: SettingsTab) => {
    setActiveSettingsTabState(tab);
    if (typeof window !== 'undefined' && activeView === 'settings') {
      const targetPath = getPathForView('settings', null, tab);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view: 'settings', tab }, '', targetPath);
      }
    }
  };

  const openSettingsTab = (tab: SettingsTab) => {
    setActiveSettingsTabState(tab);
    setActiveViewState('settings');
    if (typeof window !== 'undefined') {
      const targetPath = getPathForView('settings', null, tab);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view: 'settings', tab }, '', targetPath);
      }
    }
  };

  const setActiveView = (view: AppView) => {
    setActiveViewState(view);
    if (typeof window !== 'undefined') {
      const targetPath = getPathForView(view, stageFilterKey, activeSettingsTab);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view }, '', targetPath);
      }
    }
  };

  const setStageFilterKey = (key: string | null) => {
    setStageFilterKeyInternal(key);
    if (typeof window !== 'undefined' && activeView === 'projects_stage_filtered') {
      const targetPath = getPathForView('projects_stage_filtered', key);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view: 'projects_stage_filtered', filter: key }, '', targetPath);
      }
    }
  };

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const current = getInitialViewFromPath();
      setActiveViewState(current.view);
      setStageFilterKeyInternal(current.filterKey);
      if (current.settingsTab) {
        setActiveSettingsTabState(current.settingsTab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>('cust-1');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>('proj-1');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppData, setWhatsAppData] = useState<{
    recipientPhone: string;
    recipientName: string;
    type: any;
    data: any;
  } | null>(null);

  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importExportModule, setImportExportModule] = useState<ExportModule>('Leads');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(() => storageService.getSettings());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    setNotifications(storageService.getNotifications());
    setSettings(storageService.getSettings());

    // Synchronize authoritative backend data on application mount
    storageService.syncFromBackend().catch(() => {});

    const handleStorageUpdate = () => {
      setNotifications(storageService.getNotifications());
      setSettings(storageService.getSettings());
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('solarpulse_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('solarpulse_storage_updated', handleStorageUpdate);
  }, []);

  const openCustomerControlCenter = (customerId: string, projectId?: string) => {
    setSelectedCustomerId(customerId);
    if (projectId) {
      setSelectedProjectId(projectId);
    } else {
      const customers = storageService.getCustomers();
      const c = customers.find(item => item.id === customerId);
      if (c && c.activeProjectId) {
        setSelectedProjectId(c.activeProjectId);
      }
    }
    setActiveView('customer_control_center');
  };

  const openWhatsAppModal = (phone: string, name: string, type: any, data: any) => {
    setWhatsAppData({
      recipientPhone: phone,
      recipientName: name,
      type,
      data
    });
    setIsWhatsAppOpen(true);
  };

  const closeWhatsAppModal = () => {
    setIsWhatsAppOpen(false);
    setWhatsAppData(null);
  };

  const openImportExportModal = (module: ExportModule) => {
    setImportExportModule(module);
    setIsImportExportOpen(true);
  };

  const closeImportExportModal = () => {
    setIsImportExportOpen(false);
  };

  const markNotificationRead = (id: string) => {
    storageService.markNotificationAsRead(id);
    setNotifications(storageService.getNotifications());
  };

  const markAllNotificationsRead = () => {
    storageService.markAllNotificationsAsRead();
    setNotifications(storageService.getNotifications());
  };

  const updateSettings = (newSettings: SystemSettings) => {
    storageService.saveSettings(newSettings);
    setSettings(newSettings);
    showToast('System configuration saved successfully', 'success');
  };

  const showToast = (text: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        selectedCustomerId,
        selectedProjectId,
        openCustomerControlCenter,
        isSearchOpen,
        setIsSearchOpen,
        isWhatsAppOpen,
        whatsAppData,
        openWhatsAppModal,
        closeWhatsAppModal,
        isImportExportOpen,
        importExportModule,
        openImportExportModal,
        closeImportExportModal,
        notifications,
        unreadNotificationsCount,
        markNotificationRead,
        markAllNotificationsRead,
        settings,
        updateSettings,
        toasts,
        showToast,
        removeToast,
        stageFilterKey,
        setStageFilterKey,
        activeReportCategory,
        setActiveReportCategory,
        openReport,
        activeSettingsTab,
        setActiveSettingsTab,
        openSettingsTab,
        refreshTrigger,
        triggerRefresh
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
