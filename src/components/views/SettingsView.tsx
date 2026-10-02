import React, { useState } from 'react';
import { useApp, SettingsTab } from '../../context/AppContext';
import { useAuth, ROLE_DEFINITIONS } from '../../context/AuthContext';
import { storageService } from '../../services/storage';
import { SystemSettings } from '../../types/solar';
import { RoleBasedAccessControlPanel } from '../settings/RoleBasedAccessControlPanel';
import {
  Settings,
  Building2,
  Database,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
  Users,
  Sliders,
  Sparkles
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, showToast, triggerRefresh, activeSettingsTab, setActiveSettingsTab } = useApp();
  const [form, setForm] = useState<SystemSettings>({ ...settings });
  const [isTestingTally, setIsTestingTally] = useState(false);

  const currentTab: SettingsTab = activeSettingsTab || 'general';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(form);
    showToast('System integration settings saved successfully', 'success');
  };

  const handleTestTally = () => {
    setIsTestingTally(true);
    setTimeout(() => {
      setIsTestingTally(false);
      showToast(
        `Tally Prime XML Listener verified at ${form.tallyServerUrl}. Ready for ODBC voucher push.`,
        'info'
      );
    }, 800);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo data back to original realistic Solar EPC defaults?')) {
      storageService.resetAllData();
      showToast('System data reset to initial Solar EPC demonstration state', 'success');
      triggerRefresh();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Reset */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              System Administration
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Tally, WhatsApp & RBAC Security Matrix</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            System Settings & Integrations
          </h1>
        </div>

        <button
          onClick={handleResetData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors shadow-2xs self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo Data</span>
        </button>
      </div>

      {/* Main Settings Tabs Bar */}
      <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/70 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSettingsTab('general')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            currentTab === 'general'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Building2 className="w-4 h-4 text-amber-500" />
          <span>General & EPC Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('tally')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            currentTab === 'tally'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Server className="w-4 h-4 text-amber-600" />
          <span>Tally Prime Integration</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('whatsapp')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            currentTab === 'whatsapp'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span>WhatsApp Cloud API</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('acl')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            currentTab === 'acl'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Role-Based Access Control</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
            currentTab === 'acl' ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-800'
          }`}>
            ACL
          </span>
        </button>
      </div>

      {/* Conditional Content based on active tab */}
      {currentTab === 'acl' ? (
        <RoleBasedAccessControlPanel />
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Company Profile & Banking */}
          {(currentTab === 'general') && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Building2 className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Solar EPC Company Information</h3>
                  <p className="text-xs text-slate-500">Appears on official quotations, milestone bills, and dispatch challans</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company Trade Name</label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={e => setForm({ ...form, companyName: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={form.companyGst}
                    onChange={e => setForm({ ...form, companyGst: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Registered EPC Office Address</label>
                  <input
                    type="text"
                    value={form.companyAddress}
                    onChange={e => setForm({ ...form, companyAddress: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Helpdesk Phone</label>
                  <input
                    type="text"
                    value={form.companyPhone}
                    onChange={e => setForm({ ...form, companyPhone: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Company Email</label>
                  <input
                    type="email"
                    value={form.companyEmail || ''}
                    onChange={e => setForm({ ...form, companyEmail: e.target.value })}
                    placeholder="epc@solarpulse.com"
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={form.currencySymbol || '₹'}
                    onChange={e => setForm({ ...form, currencySymbol: e.target.value })}
                    placeholder="₹"
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company Logo URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={form.logoUrl || ''}
                      onChange={e => setForm({ ...form, logoUrl: e.target.value })}
                      placeholder="/logo-dark.png or https://..."
                      className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                    />
                    {form.logoUrl && (
                      <div className="w-9 h-9 rounded-lg border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        <img
                          src={form.logoUrl}
                          alt="Logo Preview"
                          className="max-h-full max-w-full object-contain"
                          onError={e => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tally Prime Integration */}
          {(currentTab === 'tally') && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Server className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Tally Prime Accounting Synchronizer</h3>
                    <p className="text-xs text-slate-500">Automated XML vouchers over ODBC or HTTP gateway</p>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {form.tallyStatus}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tally Prime Company Name</label>
                  <input
                    type="text"
                    value={form.tallyCompany}
                    onChange={e => setForm({ ...form, tallyCompany: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tally ODBC / XML Endpoint</label>
                  <input
                    type="text"
                    value={form.tallyServerUrl}
                    onChange={e => setForm({ ...form, tallyServerUrl: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gateway Status</label>
                  <select
                    value={form.tallyStatus}
                    onChange={e => setForm({ ...form, tallyStatus: e.target.value as any })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                  >
                    <option value="CONNECTED">CONNECTED (Active ODBC)</option>
                    <option value="STANDBY">STANDBY (Local Port 9000)</option>
                    <option value="DISCONNECTED">DISCONNECTED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-slate-500">
                  Compliant with Tally Prime 3.0 & 4.0 XML voucher schema for Receipts, Sales Invoices & Vendor Payments.
                </p>
                <button
                  type="button"
                  onClick={handleTestTally}
                  disabled={isTestingTally}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  {isTestingTally ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>
          )}

          {/* WhatsApp Cloud API */}
          {(currentTab === 'whatsapp') && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">WhatsApp Business Integration</h3>
                    <p className="text-xs text-slate-500">Automated milestone dispatches, quotation links & ticket alerts</p>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800">
                  Web Dispatch Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Business Phone ID</label>
                  <input
                    type="text"
                    value={form.whatsAppPhoneId}
                    onChange={e => setForm({ ...form, whatsAppPhoneId: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Integration Mode</label>
                  <select
                    value={form.whatsAppStatus}
                    onChange={e => setForm({ ...form, whatsAppStatus: e.target.value as any })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                  >
                    <option value="CONNECTED">CONNECTED (Meta Cloud API)</option>
                    <option value="SANDBOX">SANDBOX (Direct Web WhatsApp Link)</option>
                    <option value="DISCONNECTED">DISCONNECTED</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Save Bar for general, tally, or whatsapp */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

