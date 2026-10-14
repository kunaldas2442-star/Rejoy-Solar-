/**
 * SolarPulse EPC ERP & CRM - Production MySQL Backend API Client
 * Provides unified async communication with authenticated /api/* endpoints
 */

export interface DbStatusResponse {
  success: boolean;
  connected: boolean;
  host: string;
  database: string;
  port: number;
  mode: string;
  dumpAvailable: boolean;
  dumpPath: string;
  message: string;
  tables?: string[];
}

const AUTH_TOKEN_KEY = 'solarpulse_session_jwt_token';

class ApiClient {
  private baseUrl: string = '/api';

  public getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  public setToken(token: string | null): void {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }

  private getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // --- Database Management & Migration ---

  async getDbStatus(): Promise<DbStatusResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/db/status`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e: any) {
      return {
        success: false,
        connected: false,
        host: 'localhost',
        database: 'solarpulse_erp',
        port: 3306,
        mode: 'STANDBY_LOCAL_SYNC',
        dumpAvailable: true,
        dumpPath: '/database.sql',
        message: 'Could not contact backend API: ' + e.message
      };
    }
  }

  async testDbConnection(config: { host: string; port?: number; user: string; password?: string; database: string }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/db/test-connection`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(config)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Connection test failed.' };
    }
  }

  async runMigration(config?: any): Promise<{ success: boolean; message: string; tablesCount?: number }> {
    try {
      const res = await fetch(`${this.baseUrl}/db/migrate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(config || {})
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Migration request failed.' };
    }
  }

  getSqlDumpDownloadUrl(): string {
    return `${this.baseUrl}/db/dump.sql`;
  }

  // --- Auth & Customer Portal ---

  async login(email: string, pass: string): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
      }
      return data;
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders()
      });
    } catch {
      // Ignore
    } finally {
      this.setToken(null);
    }
  }

  async requestPasswordReset(email: string): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async updateCustomerPassword(customerId: string, newPassword: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/customers/${encodeURIComponent(customerId)}/password`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ password: newPassword })
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  // --- Document Numbering Sequencer ---
  async getNextDocNumber(type: 'quotation' | 'invoice' | 'po' | 'project' | 'customer' | 'lead'): Promise<string> {
    try {
      const res = await fetch(`${this.baseUrl}/doc-numbers/next?type=${encodeURIComponent(type)}`, {
        headers: this.getHeaders()
      });
      const data = await res.json();
      return data.nextNumber || '';
    } catch {
      return '';
    }
  }

  // --- Customers ---
  async getCustomers(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/customers`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async saveCustomer(cust: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/customers`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(cust)
      });
      const data = await res.json();
      return data.data || cust;
    } catch {
      return cust;
    }
  }

  async deleteCustomer(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/customers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  // --- Leads ---
  async getLeads(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/leads`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async saveLead(lead: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/leads`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(lead)
      });
      const data = await res.json();
      return data.data || lead;
    } catch {
      return lead;
    }
  }

  async deleteLead(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/leads/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  // --- Projects ---
  async getProjects(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/projects`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async saveProject(proj: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/projects`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(proj)
      });
      const data = await res.json();
      return data.data || proj;
    } catch {
      return proj;
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  // --- Quotations ---
  async getQuotations(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/quotations`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async saveQuotation(quote: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/quotations`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(quote)
      });
      const data = await res.json();
      return data.data || quote;
    } catch {
      return quote;
    }
  }

  async deleteQuotation(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/quotations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  // --- Invoices ---
  async getSalesInvoices(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/sales-invoices`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async saveSalesInvoice(inv: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/sales-invoices`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(inv)
      });
      const data = await res.json();
      return data.data || inv;
    } catch {
      return inv;
    }
  }

  async deleteSalesInvoice(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/sales-invoices/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  // --- Payments & Expenses ---
  async getPayments(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/payments`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async savePayment(pay: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(pay)
      });
      const data = await res.json();
      return data.data || pay;
    } catch {
      return pay;
    }
  }

  async deletePayment(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/payments/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  async getExpenses(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/expenses`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async saveExpense(exp: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/expenses`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(exp)
      });
      const data = await res.json();
      return data.data || exp;
    } catch {
      return exp;
    }
  }

  async deleteExpense(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/expenses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  // --- Inventory & Stock ---
  async getProducts(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/products`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async saveProduct(prod: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/products`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(prod)
      });
      const data = await res.json();
      return data.data || prod;
    } catch {
      return prod;
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/products/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  async getVendors(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/vendors`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async saveVendor(ven: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/vendors`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(ven)
      });
      const data = await res.json();
      return data.data || ven;
    } catch {
      return ven;
    }
  }

  async deleteVendor(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/vendors/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  async getPurchaseOrders(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/purchase-orders`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async savePurchaseOrder(po: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/purchase-orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(po)
      });
      const data = await res.json();
      return data.data || po;
    } catch {
      return po;
    }
  }

  async deletePurchaseOrder(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/purchase-orders/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  async recordStockMovement(sm: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/stock-movements`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(sm)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async getStockMovements(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/stock-movements`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  // --- HRMS ---
  async getEmployees(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/employees`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async saveEmployee(emp: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/employees`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(emp)
      });
      const data = await res.json();
      return data.data || emp;
    } catch {
      return emp;
    }
  }

  async deleteEmployee(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/employees/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  async getAttendance(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/attendance`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async saveAttendance(att: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/attendance`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(att)
      });
      const data = await res.json();
      return data.data || att;
    } catch {
      return att;
    }
  }

  async deleteAttendance(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/attendance/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  async getPayslips(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/payslips`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async savePayslip(slip: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/payslips`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(slip)
      });
      const data = await res.json();
      return data.data || slip;
    } catch {
      return slip;
    }
  }

  async deletePayslip(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/payslips/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  // --- Service & AMC ---
  async getServiceTickets(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/service-tickets`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async saveServiceTicket(ticket: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/service-tickets`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(ticket)
      });
      const data = await res.json();
      return data.data || ticket;
    } catch {
      return ticket;
    }
  }

  async deleteServiceTicket(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/service-tickets/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  async getAmcContracts(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/amc-contracts`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async saveAmcContract(contract: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/amc-contracts`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(contract)
      });
      const data = await res.json();
      return data.data || contract;
    } catch {
      return contract;
    }
  }

  async deleteAmcContract(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/amc-contracts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();
