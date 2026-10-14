import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { hashPassword, verifyPassword } from './security.ts';

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

export function getDbConfigFromEnv(): DbConfig {
  const clean = (val?: string) => (val ? String(val).trim().replace(/^["']|["']$/g, '') : '');
  const rawPort = clean(process.env.DB_PORT);
  return {
    host: clean(process.env.DB_HOST) || 'localhost',
    port: rawPort && !isNaN(Number(rawPort)) ? Number(rawPort) : 3306,
    user: clean(process.env.DB_USER) || 'root',
    password: clean(process.env.DB_PASS) || clean(process.env.DB_PASSWORD) || '',
    database: clean(process.env.DB_NAME) || 'solarpulse_erp'
  };
}

class MySqlDatabaseManager {
  private pool: mysql.Pool | null = null;
  private isConnected: boolean = false;
  private inMemoryFallback: Map<string, any[]> = new Map();
  private settingsStore: Record<string, any> = {};
  private config: DbConfig;
  private fallbackFilePath: string = path.join(process.cwd(), 'server', 'fallbackData.json');
  private persistTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.config = getDbConfigFromEnv();
    this.loadFallbackData();
  }

  // Load fallback data from server/fallbackData.json or database.sql
  private loadFallbackData() {
    const collections = [
      'users', 'customers', 'leads', 'projects', 'project_stages', 'surveys',
      'quotations', 'payments', 'expenses', 'employees', 'attendance', 'payslips',
      'holidays', 'service_tickets', 'amc_contracts', 'products', 'vendors',
      'purchase_orders', 'boms', 'sales_invoices', 'warehouses', 'stock_movements',
      'stock_audits', 'notifications', 'acl_audit_logs', 'acl_config', 'settings',
      'workforce_locations'
    ];
    collections.forEach(c => {
      if (!this.inMemoryFallback.has(c)) {
        this.inMemoryFallback.set(c, []);
      }
    });

    try {
      if (fs.existsSync(this.fallbackFilePath)) {
        const raw = fs.readFileSync(this.fallbackFilePath, 'utf-8');
        const data = JSON.parse(raw);
        for (const [key, items] of Object.entries(data)) {
          if (Array.isArray(items)) {
            this.inMemoryFallback.set(key, items);
          }
        }
        console.log(`[DB Manager] Loaded ${Object.keys(data).length} collections from fallback disk cache.`);
      }
    } catch (err: any) {
      console.warn('[DB Manager] Could not load disk fallback:', err?.message || err);
    }
  }

  // Debounced atomic save to server/fallbackData.json
  public schedulePersistFallback() {
    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
    }
    this.persistTimeout = setTimeout(() => {
      this.persistFallbackToDisk();
    }, 500);
  }

  public persistFallbackToDisk(): boolean {
    try {
      const exportObj: Record<string, any[]> = {};
      this.inMemoryFallback.forEach((val, key) => {
        exportObj[key] = val;
      });
      const tempPath = `${this.fallbackFilePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(exportObj, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.fallbackFilePath);
      return true;
    } catch (err: any) {
      console.error('[DB Manager] Error saving fallback to disk:', err?.message || err);
      return false;
    }
  }

  public async init(): Promise<{ connected: boolean; error?: string }> {
    try {
      this.config = getDbConfigFromEnv();
      if (!process.env.DB_HOST && !process.env.DB_NAME) {
        return { connected: false, error: 'Database credentials not specified in environment' };
      }

      if (this.pool) {
        try {
          await this.pool.end();
        } catch {}
        this.pool = null;
      }

      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        waitForConnections: true,
        connectionLimit: 15,
        queueLimit: 0,
        multipleStatements: true
      });

      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      this.isConnected = true;
      console.log(`[MySQL] Successfully connected to database: ${this.config.database} @ ${this.config.host}:${this.config.port}`);
      
      // Auto-initialize schema if needed
      await this.ensureSchema();

      return { connected: true };
    } catch (err: any) {
      this.isConnected = false;
      this.pool = null;
      console.warn(`[MySQL] Running in high-performance local/in-memory mode (${err.message || 'MySQL not reachable'})`);
      return { connected: false, error: err.message };
    }
  }

  public async testConnection(customConfig: Partial<DbConfig>): Promise<{ success: boolean; message: string; version?: string }> {
    const cfg = { ...this.config, ...customConfig };
    let tempConn: mysql.Connection | null = null;
    try {
      tempConn = await mysql.createConnection({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        connectTimeout: 5000
      });
      const [rows]: any = await tempConn.query('SELECT VERSION() as version');
      const version = rows && rows[0] ? rows[0].version : 'MySQL 8+';
      await tempConn.end();
      return { success: true, message: `Successfully connected to MySQL ${version} on ${cfg.host}`, version };
    } catch (err: any) {
      if (tempConn) {
        try { await tempConn.end(); } catch {}
      }
      return { success: false, message: err.message || 'Connection failed' };
    }
  }

  public async ensureSchema(): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      const dumpPath = path.join(process.cwd(), 'database.sql');
      if (fs.existsSync(dumpPath)) {
        const sql = fs.readFileSync(dumpPath, 'utf-8');
        await this.pool.query(sql);
        console.log('[MySQL] Schema and production data checked/migrated successfully.');
      }
    } catch (err: any) {
      console.warn('[MySQL] Schema migration notice:', err.message);
    }
  }

  public async runFullMigration(customConfig?: Partial<DbConfig>): Promise<{ success: boolean; message: string; tablesCount?: number }> {
    const dumpPath = path.join(process.cwd(), 'database.sql');
    if (!fs.existsSync(dumpPath)) {
      return { success: false, message: 'database.sql dump file not found on server.' };
    }
    const sql = fs.readFileSync(dumpPath, 'utf-8');

    if (customConfig && customConfig.host) {
      let conn: mysql.Connection | null = null;
      try {
        const cfg = { ...this.config, ...customConfig };
        conn = await mysql.createConnection({
          host: cfg.host,
          port: cfg.port,
          user: cfg.user,
          password: cfg.password,
          database: cfg.database,
          multipleStatements: true
        });
        await conn.query(sql);
        const [tables]: any = await conn.query('SHOW TABLES');
        await conn.end();
        return {
          success: true,
          message: `Successfully executed schema & pushed all existing data to ${cfg.database} on ${cfg.host}!`,
          tablesCount: Array.isArray(tables) ? tables.length : 28
        };
      } catch (err: any) {
        if (conn) try { await conn.end(); } catch {}
        return { success: false, message: `Migration error: ${err.message}` };
      }
    }

    if (!this.isConnected || !this.pool) {
      return {
        success: true,
        message: 'No live MySQL connection configured in environment. The complete database.sql is ready for manual import or automated push.',
        tablesCount: 28
      };
    }

    try {
      await this.pool.query(sql);
      const [tables]: any = await this.pool.query('SHOW TABLES');
      return {
        success: true,
        message: `Successfully pushed all existing tables and data to MySQL ${this.config.database}!`,
        tablesCount: Array.isArray(tables) ? tables.length : 28
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      host: this.config.host,
      database: this.config.database,
      port: this.config.port,
      user: this.config.user,
      mode: this.isConnected ? 'LIVE_MYSQL_POOL' : 'STANDBY_LOCAL_SYNC',
      dumpAvailable: fs.existsSync(path.join(process.cwd(), 'database.sql')),
      dumpPath: '/database.sql'
    };
  }

  public getDumpSql(): string {
    const dumpPath = path.join(process.cwd(), 'database.sql');
    if (fs.existsSync(dumpPath)) {
      return fs.readFileSync(dumpPath, 'utf-8');
    }
    return '-- Database dump not found';
  }

  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (this.isConnected && this.pool) {
      const [rows] = await this.pool.query(sql, params);
      return rows as T[];
    }
    return [];
  }

  // --- Collection Accessors with full local fallback + MySQL sync ---

  public getFallbackItems(collection: string): any[] {
    return this.inMemoryFallback.get(collection) || [];
  }

  public setFallbackItems(collection: string, items: any[]) {
    this.inMemoryFallback.set(collection, items);
    this.schedulePersistFallback();
  }

  // Authoritative Document Numbering Generator
  public async getNextDocNumber(type: 'quotation' | 'invoice' | 'po' | 'project' | 'customer' | 'lead'): Promise<string> {
    const now = new Date();
    const curYear = now.getFullYear();
    const nextYearShort = String(curYear + 1).slice(-2);
    const finYear = `${curYear}-${nextYearShort}`;

    switch (type) {
      case 'quotation': {
        const quotes = await this.getQuotations();
        const prefix = `RSP/QTN/${finYear}/`;
        let maxSeq = 10;
        quotes.forEach(q => {
          const num = q.quotationNumber || q.quoteNumber || '';
          if (num.includes(prefix)) {
            const seq = parseInt(num.split(prefix)[1], 10);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
          }
        });
        return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
      }
      case 'invoice': {
        const invoices = await this.getSalesInvoices();
        const prefix = `INV/${finYear}/`;
        let maxSeq = 1;
        invoices.forEach(inv => {
          const num = inv.invoiceNumber || '';
          if (num.includes(prefix)) {
            const seq = parseInt(num.split(prefix)[1], 10);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
          }
        });
        return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
      }
      case 'po': {
        const pos = await this.getPurchaseOrders();
        const prefix = `PO/${finYear}/`;
        let maxSeq = 1;
        pos.forEach(p => {
          const num = p.poNumber || '';
          if (num.includes(prefix)) {
            const seq = parseInt(num.split(prefix)[1], 10);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
          }
        });
        return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
      }
      case 'project': {
        const projects = await this.getProjects();
        return `PRJ-${curYear}-${String(projects.length + 1).padStart(3, '0')}`;
      }
      case 'customer': {
        const customers = await this.getCustomers();
        return `CUST-${curYear}-${String(customers.length + 1).padStart(3, '0')}`;
      }
      case 'lead': {
        const leads = await this.getLeads();
        return `LEAD-${curYear}-${String(leads.length + 1).padStart(3, '0')}`;
      }
    }
  }

  // --- Users & Authentication ---
  public async authenticateUser(email: string, pass: string): Promise<any | null> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (this.isConnected && this.pool) {
      try {
        const [users]: any = await this.pool.query('SELECT * FROM `solar_users` WHERE LOWER(email) = ?', [cleanEmail]);
        if (Array.isArray(users) && users.length > 0) {
          const u = users[0];
          if (verifyPassword(cleanPass, u.password)) {
            // Upgrade legacy password hash if needed
            if (!u.password.startsWith('scrypt$')) {
              const newHash = hashPassword(cleanPass);
              this.pool.query('UPDATE `solar_users` SET `password` = ? WHERE `id` = ?', [newHash, u.id]).catch(() => {});
            }
            return {
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              phone: u.phone,
              department: u.department,
              designation: u.designation,
              employeeId: u.employee_id,
              isFieldWorker: Boolean(u.is_field_worker)
            };
          }
        }

        const [customers]: any = await this.pool.query('SELECT * FROM `solar_customers` WHERE LOWER(email) = ?', [cleanEmail]);
        if (Array.isArray(customers) && customers.length > 0) {
          const c = customers[0];
          if (verifyPassword(cleanPass, c.password)) {
            if (!c.password.startsWith('scrypt$')) {
              const newHash = hashPassword(cleanPass);
              this.pool.query('UPDATE `solar_customers` SET `password` = ? WHERE `id` = ?', [newHash, c.id]).catch(() => {});
            }
            return {
              id: `usr-${c.id}`,
              customerId: c.id,
              name: c.name,
              email: c.email,
              role: 'Customer',
              phone: c.phone,
              department: 'Customer',
              designation: 'Customer',
              isFieldWorker: false
            };
          }
        }
      } catch (e) {
        console.warn('MySQL authenticateUser error:', e);
      }
    }

    // Fallback store
    const users = this.getFallbackItems('users');
    const matchedUser = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (matchedUser && verifyPassword(cleanPass, matchedUser.password || '123456')) {
      return matchedUser;
    }

    const customers = this.getFallbackItems('customers');
    const matchedCust = customers.find(c => c.email && c.email.toLowerCase() === cleanEmail);
    if (matchedCust && verifyPassword(cleanPass, matchedCust.password || '123456')) {
      return {
        id: `usr-${matchedCust.id}`,
        customerId: matchedCust.id,
        name: matchedCust.name,
        email: matchedCust.email,
        role: 'Customer',
        phone: matchedCust.phone,
        department: 'Customer',
        designation: 'Customer',
        isFieldWorker: false
      };
    }

    return null;
  }

  // --- Helper entity mappers for snake_case MySQL <-> camelCase TypeScript ---
  private mapCustomerRow(row: any): any {
    if (!row) return row;
    return {
      ...row,
      id: row.id,
      customerCode: row.customer_code || row.customerCode || row.id,
      customer_code: row.customer_code || row.customerCode || row.id,
      name: row.name || '',
      companyName: row.company_name || row.companyName || '',
      company_name: row.company_name || row.companyName || '',
      customerType: row.customer_type || row.customerType || 'Residential',
      customer_type: row.customer_type || row.customerType || 'Residential',
      phone: row.phone || '',
      email: row.email || '',
      password: row.password || '',
      siteAddress: row.site_address || row.siteAddress || '',
      site_address: row.site_address || row.siteAddress || '',
      city: row.city || '',
      state: row.state || 'Gujarat',
      pincode: row.pincode || '',
      gstNumber: row.gst_number || row.gstNumber || '',
      gst_number: row.gst_number || row.gstNumber || '',
      electricityConsumerNo: row.electricity_consumer_no || row.electricityConsumerNo || '',
      electricity_consumer_no: row.electricity_consumer_no || row.electricityConsumerNo || '',
      sanctionedLoadKw: Number(row.sanctioned_load_kw ?? row.sanctionedLoadKw ?? 0),
      sanctioned_load_kw: Number(row.sanctioned_load_kw ?? row.sanctionedLoadKw ?? 0),
      status: row.status || 'ACTIVE',
      activeProjectId: row.active_project_id || row.activeProjectId || null,
      active_project_id: row.active_project_id || row.activeProjectId || null,
      createdAt: row.created_at || row.createdAt,
      created_at: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt,
      updated_at: row.updated_at || row.updatedAt
    };
  }

  private mapLeadRow(row: any): any {
    if (!row) return row;
    return {
      ...row,
      id: row.id,
      customerName: row.customer_name || row.customerName || '',
      customer_name: row.customer_name || row.customerName || '',
      companyName: row.company_name || row.companyName || '',
      company_name: row.company_name || row.companyName || '',
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
      city: row.city || '',
      solarCapacityKw: Number(row.solar_capacity_kw ?? row.solarCapacityKw ?? 0),
      solar_capacity_kw: Number(row.solar_capacity_kw ?? row.solarCapacityKw ?? 0),
      estimatedValue: Number(row.estimated_value ?? row.estimatedValue ?? 0),
      estimated_value: Number(row.estimated_value ?? row.estimatedValue ?? 0),
      source: row.source || 'Website',
      assignedSalespersonId: row.assigned_salesperson_id || row.assignedSalespersonId || '',
      assigned_salesperson_id: row.assigned_salesperson_id || row.assignedSalespersonId || '',
      assignedSalespersonName: row.assigned_salesperson_name || row.assignedSalespersonName || '',
      assigned_salesperson_name: row.assigned_salesperson_name || row.assignedSalespersonName || '',
      status: row.status || 'NEW',
      notes: row.notes || '',
      nextFollowUpDate: row.next_follow_up_date ? String(row.next_follow_up_date).split('T')[0] : (row.nextFollowUpDate || null),
      next_follow_up_date: row.next_follow_up_date ? String(row.next_follow_up_date).split('T')[0] : (row.nextFollowUpDate || null),
      createdAt: row.created_at || row.createdAt,
      created_at: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt,
      updated_at: row.updated_at || row.updatedAt
    };
  }

  private mapEmployeeRow(row: any): any {
    if (!row) return row;
    return {
      ...row,
      id: row.id,
      employeeCode: row.employee_code || row.employeeCode || row.id,
      employee_code: row.employee_code || row.employeeCode || row.id,
      name: row.name || '',
      photoUrl: row.photo_url || row.photoUrl || '',
      photo_url: row.photo_url || row.photoUrl || '',
      department: row.department || 'Operations',
      designation: row.designation || 'Field Engineer',
      assignedRole: row.system_role || row.systemRole || row.role || 'Field Engineer',
      systemRole: row.system_role || row.systemRole || row.role || 'Field Engineer',
      system_role: row.system_role || row.systemRole || row.role || 'Field Engineer',
      role: row.system_role || row.systemRole || row.role || 'Field Engineer',
      phone: row.phone || '',
      email: row.email || '',
      joiningDate: row.joining_date ? (typeof row.joining_date === 'string' ? row.joining_date.split('T')[0] : new Date(row.joining_date).toISOString().split('T')[0]) : (row.joiningDate || new Date().toISOString().split('T')[0]),
      joining_date: row.joining_date ? (typeof row.joining_date === 'string' ? row.joining_date.split('T')[0] : new Date(row.joining_date).toISOString().split('T')[0]) : (row.joiningDate || new Date().toISOString().split('T')[0]),
      salaryMonthly: Number(row.salary_monthly ?? row.salaryMonthly ?? 30000),
      salary_monthly: Number(row.salary_monthly ?? row.salaryMonthly ?? 30000),
      status: row.status || 'ACTIVE',
      currentSiteLocation: row.current_site_location || row.currentSiteLocation || '',
      current_site_location: row.current_site_location || row.currentSiteLocation || '',
      loginEnabled: row.login_enabled !== undefined ? Boolean(row.login_enabled) : (row.loginEnabled !== undefined ? Boolean(row.loginEnabled) : true),
      login_enabled: row.login_enabled !== undefined ? (row.login_enabled ? 1 : 0) : (row.loginEnabled ? 1 : 0),
      isFieldWorker: row.is_field_worker !== undefined ? Boolean(row.is_field_worker) : (row.isFieldWorker !== undefined ? Boolean(row.isFieldWorker) : false),
      is_field_worker: row.is_field_worker !== undefined ? (row.is_field_worker ? 1 : 0) : (row.isFieldWorker ? 1 : 0),
      accountStatus: row.account_status || row.accountStatus || 'ACTIVE',
      account_status: row.account_status || row.accountStatus || 'ACTIVE'
    };
  }

  // --- Customers Module ---
  public async getCustomers(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `solar_customers` ORDER BY `created_at` DESC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => this.mapCustomerRow(r));
        }
      } catch (e) {
        console.warn('MySQL getCustomers error, using fallback:', e);
      }
    }
    return this.getFallbackItems('customers').map((r: any) => this.mapCustomerRow(r));
  }

  public async saveCustomer(cust: any): Promise<any> {
    const cleanPass = cust.password ? (cust.password.startsWith('scrypt$') ? cust.password : hashPassword(cust.password)) : hashPassword('123456');
    cust.password = cleanPass;
    const mapped = this.mapCustomerRow(cust);

    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_customers\` (
            \`id\`, \`customer_code\`, \`name\`, \`company_name\`, \`customer_type\`,
            \`phone\`, \`email\`, \`password\`, \`site_address\`, \`city\`, \`state\`,
            \`pincode\`, \`gst_number\`, \`electricity_consumer_no\`, \`sanctioned_load_kw\`,
            \`status\`, \`active_project_id\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`), \`company_name\` = VALUES(\`company_name\`),
            \`customer_type\` = VALUES(\`customer_type\`), \`phone\` = VALUES(\`phone\`),
            \`email\` = VALUES(\`email\`), \`password\` = VALUES(\`password\`),
            \`site_address\` = VALUES(\`site_address\`), \`city\` = VALUES(\`city\`),
            \`state\` = VALUES(\`state\`), \`pincode\` = VALUES(\`pincode\`),
            \`gst_number\` = VALUES(\`gst_number\`), \`electricity_consumer_no\` = VALUES(\`electricity_consumer_no\`),
            \`sanctioned_load_kw\` = VALUES(\`sanctioned_load_kw\`), \`status\` = VALUES(\`status\`),
            \`active_project_id\` = VALUES(\`active_project_id\`)
        `;
        await this.pool.query(sql, [
          mapped.id, mapped.customerCode, mapped.name, mapped.companyName,
          mapped.customerType, mapped.phone, mapped.email,
          cleanPass, mapped.siteAddress, mapped.city,
          mapped.state, mapped.pincode, mapped.gstNumber,
          mapped.electricityConsumerNo, mapped.sanctionedLoadKw,
          mapped.status, mapped.activeProjectId
        ]);
      } catch (e: any) {
        console.warn('MySQL saveCustomer error:', e?.message || e);
      }
    }
    const items = this.getFallbackItems('customers');
    const idx = items.findIndex(c => c.id === mapped.id || (c.customerCode && c.customerCode === mapped.customerCode));
    if (idx >= 0) items[idx] = { ...items[idx], ...mapped };
    else items.unshift(mapped);
    this.setFallbackItems('customers', items);
    return mapped;
  }

  public async deleteCustomer(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_customers` WHERE `id` = ? OR `customer_code` = ?', [id, id]);
      } catch (e: any) {
        console.warn('MySQL deleteCustomer error:', e?.message || e);
      }
    }
    const items = this.getFallbackItems('customers').filter(c => c.id !== id && c.customerCode !== id);
    this.setFallbackItems('customers', items);
    return true;
  }

  public async updateCustomerPassword(customerId: string, newPass: string): Promise<boolean> {
    const hashed = hashPassword(newPass);
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('UPDATE `solar_customers` SET `password` = ? WHERE `id` = ? OR `customer_code` = ?', [hashed, customerId, customerId]);
      } catch (e: any) {
        console.warn('MySQL updateCustomerPassword error:', e?.message || e);
      }
    }
    const items = this.getFallbackItems('customers');
    const target = items.find(c => c.id === customerId || c.customerCode === customerId);
    if (target) {
      target.password = hashed;
    }
    this.setFallbackItems('customers', items);
    return true;
  }

  // --- Leads Module ---
  public async getLeads(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `solar_leads` ORDER BY `created_at` DESC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => this.mapLeadRow(r));
        }
      } catch (e) {
        console.warn('MySQL getLeads error:', e);
      }
    }
    return this.getFallbackItems('leads').map((r: any) => this.mapLeadRow(r));
  }

  public async saveLead(lead: any): Promise<any> {
    const mapped = this.mapLeadRow(lead);
    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_leads\` (
            \`id\`, \`customer_name\`, \`company_name\`, \`phone\`, \`email\`,
            \`address\`, \`city\`, \`solar_capacity_kw\`, \`estimated_value\`,
            \`source\`, \`assigned_salesperson_id\`, \`assigned_salesperson_name\`,
            \`status\`, \`notes\`, \`next_follow_up_date\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`customer_name\` = VALUES(\`customer_name\`), \`company_name\` = VALUES(\`company_name\`),
            \`phone\` = VALUES(\`phone\`), \`email\` = VALUES(\`email\`),
            \`address\` = VALUES(\`address\`), \`city\` = VALUES(\`city\`),
            \`solar_capacity_kw\` = VALUES(\`solar_capacity_kw\`), \`estimated_value\` = VALUES(\`estimated_value\`),
            \`source\` = VALUES(\`source\`), \`assigned_salesperson_id\` = VALUES(\`assigned_salesperson_id\`),
            \`assigned_salesperson_name\` = VALUES(\`assigned_salesperson_name\`), \`status\` = VALUES(\`status\`),
            \`notes\` = VALUES(\`notes\`), \`next_follow_up_date\` = VALUES(\`next_follow_up_date\`)
        `;
        await this.pool.query(sql, [
          mapped.id, mapped.customerName, mapped.companyName, mapped.phone, mapped.email,
          mapped.address, mapped.city, mapped.solarCapacityKw,
          mapped.estimatedValue, mapped.source,
          mapped.assignedSalespersonId, mapped.assignedSalespersonName,
          mapped.status, mapped.notes, mapped.nextFollowUpDate
        ]);
      } catch (e: any) {
        console.warn('MySQL saveLead error:', e?.message || e);
      }
    }
    const items = this.getFallbackItems('leads');
    const idx = items.findIndex(l => l.id === mapped.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...mapped };
    else items.unshift(mapped);
    this.setFallbackItems('leads', items);
    return mapped;
  }

  public async deleteLead(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_leads` WHERE `id` = ?', [id]);
      } catch (e) {
        console.warn('MySQL deleteLead error:', e);
      }
    }
    const items = this.getFallbackItems('leads').filter(l => l.id !== id);
    this.setFallbackItems('leads', items);
    return true;
  }

  // --- Projects Module ---
  public async getProjects(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `solar_projects` ORDER BY `created_at` DESC');
        if (Array.isArray(rows) && rows.length > 0) {
          const fallbackProjects = this.getFallbackItems('projects');
          return rows.map((r: any) => {
            const fallbackMatch = fallbackProjects.find((fp: any) => fp.id === r.id || fp.projectCode === r.project_code);
            let assignedUsers = fallbackMatch?.assignedUsers || [];
            if (r.assignments_json) {
              try {
                const parsed = JSON.parse(r.assignments_json);
                if (Array.isArray(parsed) && parsed.length > 0) assignedUsers = parsed;
              } catch {}
            }
            return {
              ...fallbackMatch,
              ...r,
              id: r.id,
              projectCode: r.project_code || r.projectCode || r.id,
              customerId: r.customer_id || r.customerId || '',
              customerName: r.customer_name || r.customerName || '',
              title: r.title || 'Solar Project',
              capacityKw: Number(r.capacity_kw ?? r.capacityKw ?? 0),
              totalValue: Number(r.total_value ?? r.totalValue ?? 0),
              status: r.status || 'PLANNING',
              currentStageKey: r.current_stage_key || r.currentStageKey || 'site_survey',
              completionPercentage: Number(r.completion_percentage ?? r.completionPercentage ?? 0),
              progressPercentage: Number(r.completion_percentage ?? r.completionPercentage ?? 0),
              projectManagerId: r.project_manager_id || r.projectManagerId || '',
              projectManagerName: r.project_manager_name || r.projectManagerName || '',
              siteAddress: r.site_address || r.siteAddress || '',
              city: r.city || '',
              inverterModel: r.inverter_model || r.inverterModel || '',
              panelModel: r.panel_model || r.panelModel || '',
              structureType: r.structure_type || r.structureType || 'Elevated GI Structure',
              startDate: r.start_date ? String(r.start_date).split('T')[0] : (r.startDate || null),
              expectedCompletionDate: r.expected_completion_date ? String(r.expected_completion_date).split('T')[0] : (r.expectedCompletionDate || null),
              actualCompletionDate: r.actual_completion_date ? String(r.actual_completion_date).split('T')[0] : (r.actualCompletionDate || null),
              notes: r.notes || '',
              assignedUsers,
              stages: fallbackMatch?.stages || []
            };
          });
        }
      } catch (e) {
        console.warn('MySQL getProjects error:', e);
      }
    }
    return this.getFallbackItems('projects');
  }

  public async saveProject(proj: any): Promise<any> {
    const mapped = {
      ...proj,
      id: proj.id || `proj-${Date.now()}`,
      projectCode: proj.projectCode || proj.project_code || `SOL-${Date.now()}`,
      customerId: proj.customerId || proj.customer_id || '',
      customerName: proj.customerName || proj.customer_name || '',
      title: proj.title || 'Solar Project',
      capacityKw: Number(proj.capacityKw || proj.capacity_kw) || 0,
      totalValue: Number(proj.totalValue || proj.total_value) || 0,
      status: proj.status || 'PLANNING',
      currentStageKey: proj.currentStageKey || proj.current_stage_key || 'site_survey',
      completionPercentage: Number(proj.completionPercentage || proj.completion_percentage || proj.progressPercentage) || 0,
      projectManagerId: proj.projectManagerId || proj.project_manager_id || '',
      projectManagerName: proj.projectManagerName || proj.project_manager_name || '',
      siteAddress: proj.siteAddress || proj.site_address || '',
      city: proj.city || '',
      inverterModel: proj.inverterModel || proj.inverter_model || '',
      panelModel: proj.panelModel || proj.panel_model || '',
      structureType: proj.structureType || proj.structure_type || 'Elevated GI Structure',
      startDate: proj.startDate || proj.start_date ? String(proj.startDate || proj.start_date).split('T')[0] : null,
      expectedCompletionDate: proj.expectedCompletionDate || proj.expected_completion_date ? String(proj.expectedCompletionDate || proj.expected_completion_date).split('T')[0] : null,
      actualCompletionDate: proj.actualCompletionDate || proj.actual_completion_date ? String(proj.actualCompletionDate || proj.actual_completion_date).split('T')[0] : null,
      notes: proj.notes || '',
      assignedUsers: proj.assignedUsers || proj.assignments || []
    };

    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_projects\` (
            \`id\`, \`project_code\`, \`customer_id\`, \`customer_name\`, \`title\`,
            \`capacity_kw\`, \`total_value\`, \`status\`, \`current_stage_key\`,
            \`completion_percentage\`, \`project_manager_id\`, \`project_manager_name\`,
            \`site_address\`, \`city\`, \`inverter_model\`, \`panel_model\`,
            \`structure_type\`, \`start_date\`, \`expected_completion_date\`, \`actual_completion_date\`,
            \`notes\`, \`assignments_json\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`title\` = VALUES(\`title\`),
            \`customer_name\` = VALUES(\`customer_name\`),
            \`capacity_kw\` = VALUES(\`capacity_kw\`),
            \`total_value\` = VALUES(\`total_value\`),
            \`status\` = VALUES(\`status\`),
            \`current_stage_key\` = VALUES(\`current_stage_key\`),
            \`completion_percentage\` = VALUES(\`completion_percentage\`),
            \`project_manager_id\` = VALUES(\`project_manager_id\`),
            \`project_manager_name\` = VALUES(\`project_manager_name\`),
            \`site_address\` = VALUES(\`site_address\`),
            \`city\` = VALUES(\`city\`),
            \`inverter_model\` = VALUES(\`inverter_model\`),
            \`panel_model\` = VALUES(\`panel_model\`),
            \`structure_type\` = VALUES(\`structure_type\`),
            \`start_date\` = VALUES(\`start_date\`),
            \`expected_completion_date\` = VALUES(\`expected_completion_date\`),
            \`actual_completion_date\` = VALUES(\`actual_completion_date\`),
            \`notes\` = VALUES(\`notes\`),
            \`assignments_json\` = VALUES(\`assignments_json\`)
        `;
        await this.pool.query(sql, [
          mapped.id, mapped.projectCode, mapped.customerId, mapped.customerName, mapped.title,
          mapped.capacityKw, mapped.totalValue, mapped.status, mapped.currentStageKey,
          mapped.completionPercentage, mapped.projectManagerId, mapped.projectManagerName,
          mapped.siteAddress, mapped.city, mapped.inverterModel, mapped.panelModel,
          mapped.structureType, mapped.startDate, mapped.expectedCompletionDate, mapped.actualCompletionDate,
          mapped.notes, JSON.stringify(mapped.assignedUsers)
        ]);
      } catch (e: any) {
        console.warn('MySQL saveProject error:', e?.message || e);
      }
    }
    const items = this.getFallbackItems('projects');
    const idx = items.findIndex(p => p.id === mapped.id || p.projectCode === mapped.projectCode);
    if (idx >= 0) items[idx] = { ...items[idx], ...mapped, stages: proj.stages || items[idx].stages || [] };
    else items.unshift({ ...mapped, stages: proj.stages || [] });
    this.setFallbackItems('projects', items);
    return mapped;
  }

  public async deleteProject(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_projects` WHERE `id` = ? OR `project_code` = ?', [id, id]);
      } catch (e: any) {
        console.warn('MySQL deleteProject error:', e?.message || e);
      }
    }
    const items = this.getFallbackItems('projects').filter(p => p.id !== id && p.projectCode !== id);
    this.setFallbackItems('projects', items);
    return true;
  }

  // --- Quotations Module ---
  public async getQuotations(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `solar_quotations` ORDER BY `created_at` DESC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => {
            let items: any[] = [];
            if (r.items_json) {
              try { items = JSON.parse(r.items_json); } catch {}
            }
            return {
              ...r,
              id: r.id,
              quotationNumber: r.quotation_number || r.quotationNumber || r.id,
              customerId: r.customer_id || r.customerId || '',
              customerName: r.customer_name || r.customerName || '',
              projectId: r.project_id || r.projectId || '',
              capacityKw: Number(r.capacity_kw ?? r.capacityKw ?? 0),
              baseAmount: Number(r.base_amount ?? r.baseAmount ?? 0),
              subtotal: Number(r.subtotal ?? r.base_amount ?? 0),
              discountAmount: Number(r.discount_amount ?? r.discountAmount ?? 0),
              gstPercent: Number(r.gst_percent ?? r.gstPercent ?? 13.8),
              gstAmount: Number(r.gst_amount ?? r.gstAmount ?? 0),
              totalAmount: Number(r.total_amount ?? r.totalAmount ?? 0),
              status: r.status || 'DRAFT',
              validUntil: r.valid_until ? String(r.valid_until).split('T')[0] : (r.validUntil || null),
              termsAndConditions: r.terms_and_conditions || r.termsAndConditions || '',
              items
            };
          });
        }
      } catch (e) {
        console.warn('MySQL getQuotations error:', e);
      }
    }
    return this.getFallbackItems('quotations');
  }

  public async saveQuotation(quote: any): Promise<any> {
    const capacityKw = Number(quote.capacityKw || quote.capacity_kw) || 3;
    const baseAmount = Number(quote.baseAmount || quote.base_amount || quote.baseProjectPrice) || (capacityKw * 60000);
    const discountAmount = Number(quote.discountAmount || quote.discount_amount) || 0;
    const taxableAmount = Math.max(0, baseAmount - discountAmount);
    const gstRate = Number(quote.gstPercent || quote.gst_percent || quote.gstRate || quote.gstEquipmentRate) || 13.8;
    const gstAmount = Number(quote.gstAmount || quote.gst_amount) || Math.round((taxableAmount * gstRate) / 100);
    const totalAmount = Number(quote.totalAmount || quote.total_amount) || (taxableAmount + gstAmount);
    const items = quote.items || quote.lineItems || quote.bomItems || [];
    const validUntil = quote.validUntil || quote.valid_until ? String(quote.validUntil || quote.valid_until).split('T')[0] : null;

    const mapped = {
      ...quote,
      id: quote.id || `qtn-${Date.now()}`,
      quotationNumber: quote.quotationNumber || quote.quoteNumber || quote.quotation_number || `QTN-${Date.now()}`,
      customerId: quote.customerId || quote.customer_id || '',
      customerName: quote.customerName || quote.customer_name || 'Customer',
      projectId: quote.projectId || quote.project_id || '',
      capacityKw,
      baseAmount,
      subtotal: Number(quote.subtotal) || taxableAmount,
      discountAmount,
      gstPercent: gstRate,
      gstAmount,
      totalAmount,
      status: quote.status || 'DRAFT',
      validUntil,
      termsAndConditions: quote.termsAndConditions || quote.terms_and_conditions || '',
      items
    };

    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_quotations\` (
            \`id\`, \`quotation_number\`, \`customer_id\`, \`customer_name\`, \`project_id\`,
            \`capacity_kw\`, \`base_amount\`, \`subtotal\`, \`discount_amount\`,
            \`gst_percent\`, \`gst_amount\`, \`total_amount\`, \`status\`, \`valid_until\`,
            \`terms_and_conditions\`, \`items_json\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`customer_name\` = VALUES(\`customer_name\`),
            \`capacity_kw\` = VALUES(\`capacity_kw\`),
            \`base_amount\` = VALUES(\`base_amount\`),
            \`subtotal\` = VALUES(\`subtotal\`),
            \`discount_amount\` = VALUES(\`discount_amount\`),
            \`gst_percent\` = VALUES(\`gst_percent\`),
            \`gst_amount\` = VALUES(\`gst_amount\`),
            \`total_amount\` = VALUES(\`total_amount\`),
            \`status\` = VALUES(\`status\`),
            \`valid_until\` = VALUES(\`valid_until\`),
            \`terms_and_conditions\` = VALUES(\`terms_and_conditions\`),
            \`items_json\` = VALUES(\`items_json\`)
        `;
        await this.pool.query(sql, [
          mapped.id,
          mapped.quotationNumber,
          mapped.customerId,
          mapped.customerName,
          mapped.projectId,
          mapped.capacityKw,
          mapped.baseAmount,
          mapped.subtotal,
          mapped.discountAmount,
          mapped.gstPercent,
          mapped.gstAmount,
          mapped.totalAmount,
          mapped.status,
          mapped.validUntil,
          mapped.termsAndConditions,
          JSON.stringify(mapped.items)
        ]);
      } catch (e: any) {
        console.warn('MySQL saveQuotation error:', e?.message || e);
      }
    }
    const fallbackList = this.getFallbackItems('quotations');
    const idx = fallbackList.findIndex(q => q.id === mapped.id || q.quotationNumber === mapped.quotationNumber);
    if (idx >= 0) fallbackList[idx] = { ...fallbackList[idx], ...mapped };
    else fallbackList.unshift(mapped);
    this.setFallbackItems('quotations', fallbackList);
    return mapped;
  }

  public async deleteQuotation(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_quotations` WHERE `id` = ? OR `quotation_number` = ?', [id, id]);
      } catch (e) {
        console.warn('MySQL deleteQuotation error:', e);
      }
    }
    const items = this.getFallbackItems('quotations').filter(q => q.id !== id && q.quotationNumber !== id);
    this.setFallbackItems('quotations', items);
    return true;
  }

  // --- Payments & Invoices ---
  public async getPayments(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `solar_payments` ORDER BY `paid_date` DESC, `created_at` DESC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => ({
            ...r,
            id: r.id,
            receiptNumber: r.receipt_number || r.receiptNumber || r.id,
            projectId: r.project_id || r.projectId || '',
            customerId: r.customer_id || r.customerId || '',
            customerName: r.customer_name || r.customerName || '',
            milestone: r.milestone || 'Advance',
            amount: Number(r.amount ?? 0),
            status: r.status || 'PAID',
            dueDate: r.due_date ? String(r.due_date).split('T')[0] : (r.dueDate || null),
            paidDate: r.paid_date ? String(r.paid_date).split('T')[0] : (r.paidDate || null),
            paymentMode: r.payment_mode || r.paymentMode || 'Bank NEFT/RTGS',
            transactionReference: r.transaction_reference || r.transactionReference || '',
            notes: r.notes || '',
            tallySyncStatus: r.tally_sync_status || r.tallySyncStatus || 'NOT SYNCED',
            tallyReference: r.tally_reference || r.tallyReference || ''
          }));
        }
      } catch (e) {
        console.warn('MySQL getPayments error:', e);
      }
    }
    return this.getFallbackItems('payments');
  }

  public async savePayment(pay: any): Promise<any> {
    const mapped = {
      ...pay,
      id: pay.id || `pay-${Date.now()}`,
      receiptNumber: pay.receiptNumber || pay.receiptNo || pay.receipt_number || `RCPT-${Date.now()}`,
      projectId: pay.projectId || pay.project_id || '',
      customerId: pay.customerId || pay.customer_id || '',
      customerName: pay.customerName || pay.customer_name || '',
      milestone: pay.milestone || 'Advance',
      amount: Number(pay.amount) || 0,
      status: pay.status || 'PAID',
      dueDate: pay.dueDate || pay.due_date ? String(pay.dueDate || pay.due_date).split('T')[0] : null,
      paidDate: pay.paidDate || pay.paid_date || pay.paymentDate || pay.payment_date ? String(pay.paidDate || pay.paid_date || pay.paymentDate || pay.payment_date).split('T')[0] : new Date().toISOString().split('T')[0],
      paymentMode: pay.paymentMode || pay.payment_mode || pay.method || 'Bank NEFT/RTGS',
      transactionReference: pay.transactionReference || pay.transaction_reference || pay.referenceNumber || pay.reference_number || '',
      notes: pay.notes || '',
      tallySyncStatus: pay.tallySyncStatus || pay.tally_sync_status || 'NOT SYNCED',
      tallyReference: pay.tallyReference || pay.tally_reference || ''
    };

    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_payments\` (
            \`id\`, \`receipt_number\`, \`project_id\`, \`customer_id\`, \`customer_name\`,
            \`milestone\`, \`amount\`, \`status\`, \`due_date\`, \`paid_date\`,
            \`payment_mode\`, \`transaction_reference\`, \`notes\`, \`tally_sync_status\`, \`tally_reference\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`customer_name\` = VALUES(\`customer_name\`),
            \`milestone\` = VALUES(\`milestone\`),
            \`amount\` = VALUES(\`amount\`),
            \`status\` = VALUES(\`status\`),
            \`due_date\` = VALUES(\`due_date\`),
            \`paid_date\` = VALUES(\`paid_date\`),
            \`payment_mode\` = VALUES(\`payment_mode\`),
            \`transaction_reference\` = VALUES(\`transaction_reference\`),
            \`notes\` = VALUES(\`notes\`),
            \`tally_sync_status\` = VALUES(\`tally_sync_status\`),
            \`tally_reference\` = VALUES(\`tally_reference\`)
        `;
        await this.pool.query(sql, [
          mapped.id, mapped.receiptNumber, mapped.projectId, mapped.customerId, mapped.customerName,
          mapped.milestone, mapped.amount, mapped.status, mapped.dueDate, mapped.paidDate,
          mapped.paymentMode, mapped.transactionReference, mapped.notes, mapped.tallySyncStatus, mapped.tallyReference
        ]);
      } catch (e: any) {
        console.warn('MySQL savePayment error:', e?.message || e);
      }
    }
    const items = this.getFallbackItems('payments');
    const idx = items.findIndex(p => p.id === mapped.id || p.receiptNumber === mapped.receiptNumber);
    if (idx >= 0) items[idx] = { ...items[idx], ...mapped };
    else items.unshift(mapped);
    this.setFallbackItems('payments', items);
    return mapped;
  }

  public async deletePayment(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_payments` WHERE `id` = ? OR `receipt_number` = ?', [id, id]);
      } catch (e) {
        console.warn('MySQL deletePayment error:', e);
      }
    }
    const items = this.getFallbackItems('payments').filter(p => p.id !== id && p.receiptNumber !== id);
    this.setFallbackItems('payments', items);
    return true;
  }

  public async getSalesInvoices(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `solar_sales_invoices` ORDER BY `invoice_date` DESC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => {
            let items: any[] = [];
            if (r.items_json) {
              try { items = JSON.parse(r.items_json); } catch {}
            }
            return {
              ...r,
              id: r.id,
              invoiceNumber: r.invoice_number || r.invoiceNumber || r.id,
              projectId: r.project_id || r.projectId || '',
              customerId: r.customer_id || r.customerId || '',
              customerName: r.customer_name || r.customerName || '',
              invoiceDate: r.invoice_date ? String(r.invoice_date).split('T')[0] : (r.invoiceDate || null),
              dueDate: r.due_date ? String(r.due_date).split('T')[0] : (r.dueDate || null),
              subtotal: Number(r.subtotal ?? 0),
              taxAmount: Number(r.gst_amount ?? r.taxAmount ?? 0),
              gstAmount: Number(r.gst_amount ?? r.taxAmount ?? 0),
              grandTotal: Number(r.total_amount ?? r.grandTotal ?? 0),
              totalAmount: Number(r.total_amount ?? r.grandTotal ?? 0),
              status: r.payment_status || r.status || 'UNPAID',
              paymentStatus: r.payment_status || r.status || 'UNPAID',
              ewayBillNumber: r.eway_bill_number || r.ewayBillNumber || '',
              notes: r.notes || '',
              items
            };
          });
        }
      } catch (e) {
        console.warn('MySQL getSalesInvoices error:', e);
      }
    }
    return this.getFallbackItems('sales_invoices');
  }

  public async saveSalesInvoice(inv: any): Promise<any> {
    const items = inv.items || inv.lineItems || [];
    const mapped = {
      ...inv,
      id: inv.id || `inv-${Date.now()}`,
      invoiceNumber: inv.invoiceNumber || inv.invoice_number || `INV-${Date.now()}`,
      projectId: inv.projectId || inv.project_id || '',
      customerId: inv.customerId || inv.customer_id || '',
      customerName: inv.customerName || inv.customer_name || '',
      invoiceDate: inv.invoiceDate || inv.invoice_date ? String(inv.invoiceDate || inv.invoice_date).split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: inv.dueDate || inv.due_date ? String(inv.dueDate || inv.due_date).split('T')[0] : null,
      subtotal: Number(inv.subtotal) || 0,
      gstAmount: Number(inv.taxAmount || inv.gst_amount || inv.gstAmount) || 0,
      totalAmount: Number(inv.totalAmount || inv.grandTotal || inv.total_amount) || 0,
      status: inv.status || inv.paymentStatus || inv.payment_status || 'UNPAID',
      ewayBillNumber: inv.ewayBillNumber || inv.eway_bill_number || '',
      notes: inv.notes || '',
      items
    };

    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_sales_invoices\` (
            \`id\`, \`invoice_number\`, \`project_id\`, \`customer_id\`, \`customer_name\`,
            \`invoice_date\`, \`due_date\`, \`items_json\`, \`subtotal\`, \`gst_amount\`,
            \`total_amount\`, \`payment_status\`, \`eway_bill_number\`, \`notes\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`customer_name\` = VALUES(\`customer_name\`), \`due_date\` = VALUES(\`due_date\`),
            \`items_json\` = VALUES(\`items_json\`), \`subtotal\` = VALUES(\`subtotal\`),
            \`gst_amount\` = VALUES(\`gst_amount\`), \`total_amount\` = VALUES(\`total_amount\`),
            \`payment_status\` = VALUES(\`payment_status\`), \`eway_bill_number\` = VALUES(\`eway_bill_number\`),
            \`notes\` = VALUES(\`notes\`)
        `;
        await this.pool.query(sql, [
          mapped.id, mapped.invoiceNumber, mapped.projectId, mapped.customerId, mapped.customerName,
          mapped.invoiceDate, mapped.dueDate, JSON.stringify(mapped.items), mapped.subtotal,
          mapped.gstAmount, mapped.totalAmount, mapped.status, mapped.ewayBillNumber, mapped.notes
        ]);
      } catch (e: any) {
        console.warn('MySQL saveSalesInvoice error:', e?.message || e);
      }
    }
    const list = this.getFallbackItems('sales_invoices');
    const idx = list.findIndex(i => i.id === mapped.id || i.invoiceNumber === mapped.invoiceNumber);
    if (idx >= 0) list[idx] = { ...list[idx], ...mapped };
    else list.unshift(mapped);
    this.setFallbackItems('sales_invoices', list);
    return mapped;
  }

  public async deleteSalesInvoice(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_sales_invoices` WHERE `id` = ? OR `invoice_number` = ?', [id, id]);
      } catch (e) {
        console.warn('MySQL deleteSalesInvoice error:', e);
      }
    }
    const items = this.getFallbackItems('sales_invoices').filter(i => i.id !== id && i.invoiceNumber !== id);
    this.setFallbackItems('sales_invoices', items);
    return true;
  }

  // --- Expenses Module ---
  public async getExpenses(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `solar_expenses` ORDER BY `expense_date` DESC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => ({
            ...r,
            id: r.id,
            expenseNumber: r.expense_number || r.expenseNumber || r.id,
            projectId: r.project_id || r.projectId || '',
            projectCode: r.project_code || r.projectCode || '',
            vendorName: r.vendor_name || r.vendorName || '',
            category: r.category || 'General',
            amount: Number(r.amount ?? 0),
            expenseDate: r.expense_date ? String(r.expense_date).split('T')[0] : (r.expenseDate || null),
            date: r.expense_date ? String(r.expense_date).split('T')[0] : (r.date || null),
            paymentMode: r.payment_mode || r.paymentMode || 'Bank Payment',
            referenceNo: r.reference_no || r.referenceNo || '',
            notes: r.notes || '',
            tallySyncStatus: r.tally_sync_status || r.tallySyncStatus || 'NOT SYNCED'
          }));
        }
      } catch (e) {
        console.warn('MySQL getExpenses error:', e);
      }
    }
    return this.getFallbackItems('expenses');
  }

  public async saveExpense(exp: any): Promise<any> {
    const mapped = {
      ...exp,
      id: exp.id || `exp-${Date.now()}`,
      expenseNumber: exp.expenseNumber || exp.expense_number || `EXP-${Date.now()}`,
      projectId: exp.projectId || exp.project_id || '',
      projectCode: exp.projectCode || exp.project_code || '',
      vendorName: exp.vendorName || exp.vendor_name || 'Vendor',
      category: exp.category || 'General',
      amount: Number(exp.amount) || 0,
      expenseDate: exp.expenseDate || exp.expense_date || exp.date ? String(exp.expenseDate || exp.expense_date || exp.date).split('T')[0] : new Date().toISOString().split('T')[0],
      paymentMode: exp.paymentMode || exp.payment_mode || 'Bank Payment',
      referenceNo: exp.referenceNo || exp.reference_no || '',
      notes: exp.notes || '',
      tallySyncStatus: exp.tallySyncStatus || exp.tally_sync_status || 'NOT SYNCED'
    };

    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_expenses\` (
            \`id\`, \`expense_number\`, \`project_id\`, \`project_code\`, \`vendor_name\`,
            \`category\`, \`amount\`, \`expense_date\`, \`payment_mode\`, \`reference_no\`,
            \`notes\`, \`tally_sync_status\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`project_id\` = VALUES(\`project_id\`),
            \`project_code\` = VALUES(\`project_code\`),
            \`vendor_name\` = VALUES(\`vendor_name\`),
            \`category\` = VALUES(\`category\`),
            \`amount\` = VALUES(\`amount\`),
            \`expense_date\` = VALUES(\`expense_date\`),
            \`payment_mode\` = VALUES(\`payment_mode\`),
            \`reference_no\` = VALUES(\`reference_no\`),
            \`notes\` = VALUES(\`notes\`),
            \`tally_sync_status\` = VALUES(\`tally_sync_status\`)
        `;
        await this.pool.query(sql, [
          mapped.id, mapped.expenseNumber, mapped.projectId, mapped.projectCode, mapped.vendorName,
          mapped.category, mapped.amount, mapped.expenseDate, mapped.paymentMode, mapped.referenceNo,
          mapped.notes, mapped.tallySyncStatus
        ]);
      } catch (e: any) {
        console.warn('MySQL saveExpense error:', e?.message || e);
      }
    }
    const items = this.getFallbackItems('expenses');
    const idx = items.findIndex(e => e.id === mapped.id || e.expenseNumber === mapped.expenseNumber);
    if (idx >= 0) items[idx] = { ...items[idx], ...mapped };
    else items.unshift(mapped);
    this.setFallbackItems('expenses', items);
    return mapped;
  }

  public async deleteExpense(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_expenses` WHERE `id` = ? OR `expense_number` = ?', [id, id]);
      } catch (e) {
        console.warn('MySQL deleteExpense error:', e);
      }
    }
    const items = this.getFallbackItems('expenses').filter(e => e.id !== id && e.expenseNumber !== id);
    this.setFallbackItems('expenses', items);
    return true;
  }

  // --- Inventory & Stock Movements ---
  public async getProducts(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `solar_products` ORDER BY `name` ASC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => ({
            ...r,
            id: r.id,
            name: r.name,
            sku: r.sku || r.id,
            category: r.category || 'Solar Panels',
            brand: r.brand || '',
            unit: r.unit || 'NOS',
            hsnCode: r.hsn_code || r.hsnCode || '',
            gstRate: Number(r.gst_rate ?? r.gstRate ?? 18),
            unitPrice: Number(r.unit_price ?? r.unitPrice ?? 0),
            price: Number(r.unit_price ?? r.unitPrice ?? 0),
            currentStock: Number(r.current_stock ?? r.currentStock ?? 0),
            stock: Number(r.current_stock ?? r.currentStock ?? 0),
            reorderLevel: Number(r.reorder_level ?? r.reorderLevel ?? r.minStockThreshold ?? 5),
            minStockThreshold: Number(r.reorder_level ?? r.reorderLevel ?? r.minStockThreshold ?? 5),
            status: r.status || 'ACTIVE'
          }));
        }
      } catch (e) {
        console.warn('MySQL getProducts error:', e);
      }
    }
    return this.getFallbackItems('products');
  }

  public async saveProduct(prod: any): Promise<any> {
    const mapped = {
      ...prod,
      id: prod.id || `prod-${Date.now()}`,
      name: prod.name || '',
      sku: prod.sku || prod.itemCode || prod.item_code || prod.id,
      category: prod.category || 'Solar Panels',
      brand: prod.brand || prod.manufacturer || '',
      unit: prod.unit || 'NOS',
      hsnCode: prod.hsnCode || prod.hsn_code || '',
      gstRate: Number(prod.gstRate || prod.gst_rate) || 18,
      unitPrice: Number(prod.unitPrice || prod.unit_price || prod.price) || 0,
      currentStock: Number(prod.currentStock || prod.current_stock || prod.stock) || 0,
      reorderLevel: Number(prod.reorderLevel || prod.reorder_level || prod.minStockThreshold || prod.min_stock_level) || 5,
      status: prod.status || 'ACTIVE'
    };

    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_products\` (
            \`id\`, \`name\`, \`sku\`, \`category\`, \`brand\`, \`unit\`,
            \`hsn_code\`, \`gst_rate\`, \`unit_price\`, \`current_stock\`, \`reorder_level\`, \`status\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`), \`category\` = VALUES(\`category\`),
            \`brand\` = VALUES(\`brand\`), \`unit\` = VALUES(\`unit\`),
            \`hsn_code\` = VALUES(\`hsn_code\`), \`gst_rate\` = VALUES(\`gst_rate\`),
            \`unit_price\` = VALUES(\`unit_price\`), \`current_stock\` = VALUES(\`current_stock\`),
            \`reorder_level\` = VALUES(\`reorder_level\`), \`status\` = VALUES(\`status\`)
        `;
        await this.pool.query(sql, [
          mapped.id, mapped.name, mapped.sku, mapped.category, mapped.brand, mapped.unit,
          mapped.hsnCode, mapped.gstRate, mapped.unitPrice, mapped.currentStock, mapped.reorderLevel, mapped.status
        ]);
      } catch (e: any) {
        console.warn('MySQL saveProduct error:', e?.message || e);
      }
    }
    const items = this.getFallbackItems('products');
    const idx = items.findIndex(p => p.id === mapped.id || p.sku === mapped.sku);
    if (idx >= 0) items[idx] = { ...items[idx], ...mapped };
    else items.unshift(mapped);
    this.setFallbackItems('products', items);
    return mapped;
  }

  public async deleteProduct(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_products` WHERE `id` = ? OR `sku` = ?', [id, id]);
      } catch (e) {
        console.warn('MySQL deleteProduct error:', e);
      }
    }
    const items = this.getFallbackItems('products').filter(p => p.id !== id && p.sku !== id);
    this.setFallbackItems('products', items);
    return true;
  }

  // Atomic Stock Movement Transaction
  public async recordStockMovement(movement: any): Promise<{ success: boolean; movement: any; newStock: number; error?: string }> {
    const qty = Number(movement.quantity) || 0;
    const type = movement.movementType || 'OUT';
    const productId = movement.productId;

    if (!productId || qty <= 0) {
      return { success: false, movement, newStock: 0, error: 'Valid productId and positive quantity required.' };
    }

    if (this.isConnected && this.pool) {
      const conn = await this.pool.getConnection();
      try {
        await conn.beginTransaction();

        const [rows]: any = await conn.query('SELECT current_stock FROM `solar_products` WHERE `id` = ? OR `sku` = ? FOR UPDATE', [productId, productId]);
        if (!rows || rows.length === 0) {
          await conn.rollback();
          conn.release();
          return { success: false, movement, newStock: 0, error: `Product ID "${productId}" not found.` };
        }

        const currentStock = Number(rows[0].current_stock) || 0;
        let newStock = currentStock;

        if (type === 'OUT' || type === 'ISSUE_TO_PROJECT' || type === 'BOM_ALLOCATION') {
          if (currentStock < qty) {
            await conn.rollback();
            conn.release();
            return {
              success: false,
              movement,
              newStock: currentStock,
              error: `Insufficient stock! Requested: ${qty}, Available: ${currentStock}.`
            };
          }
          newStock = currentStock - qty;
        } else {
          newStock = currentStock + qty;
        }

        await conn.query('UPDATE `solar_products` SET `current_stock` = ? WHERE `id` = ? OR `sku` = ?', [newStock, productId, productId]);

        const insertSql = `
          INSERT INTO \`solar_stock_movements\` (
            \`id\`, \`product_id\`, \`movement_type\`, \`quantity\`, \`warehouse_id\`,
            \`project_id\`, \`reference_number\`, \`notes\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await conn.query(insertSql, [
          movement.id || `sm-${Date.now()}`, productId, type, qty,
          movement.warehouseId || 'wh-bhl-01', movement.projectId || null,
          movement.referenceNumber || '', movement.notes || ''
        ]);

        await conn.commit();
        conn.release();

        const prods = this.getFallbackItems('products');
        const pIdx = prods.findIndex(p => p.id === productId || p.sku === productId);
        if (pIdx >= 0) {
          prods[pIdx].currentStock = newStock;
          this.setFallbackItems('products', prods);
        }

        const movements = this.getFallbackItems('stock_movements');
        movements.unshift(movement);
        this.setFallbackItems('stock_movements', movements);

        return { success: true, movement, newStock };
      } catch (err: any) {
        await conn.rollback();
        conn.release();
        return { success: false, movement, newStock: 0, error: err.message };
      }
    }

    const prods = this.getFallbackItems('products');
    const pIdx = prods.findIndex(p => p.id === productId || p.sku === productId);
    if (pIdx < 0) {
      return { success: false, movement, newStock: 0, error: `Product ID "${productId}" not found.` };
    }

    const currentStock = Number(prods[pIdx].currentStock) || 0;
    let newStock = currentStock;

    if (type === 'OUT' || type === 'ISSUE_TO_PROJECT' || type === 'BOM_ALLOCATION') {
      if (currentStock < qty) {
        return {
          success: false,
          movement,
          newStock: currentStock,
          error: `Insufficient stock! Requested: ${qty}, Available: ${currentStock}.`
        };
      }
      newStock = currentStock - qty;
    } else {
      newStock = currentStock + qty;
    }

    prods[pIdx].currentStock = newStock;
    this.setFallbackItems('products', prods);

    const movements = this.getFallbackItems('stock_movements');
    movements.unshift(movement);
    this.setFallbackItems('stock_movements', movements);

    return { success: true, movement, newStock };
  }

  public async getStockMovements(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows] = await this.pool.query('SELECT * FROM `solar_stock_movements` ORDER BY `created_at` DESC');
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getStockMovements error:', e);
      }
    }
    return this.getFallbackItems('stock_movements');
  }

  // --- HRMS Module ---
  public async getEmployees(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `solar_employees` ORDER BY `employee_code` ASC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => this.mapEmployeeRow(r));
        }
      } catch (e) {
        console.warn('MySQL getEmployees error:', e);
      }
    }
    return this.getFallbackItems('employees').map((r: any) => this.mapEmployeeRow(r));
  }

  public async saveEmployee(emp: any): Promise<any> {
    const mapped = this.mapEmployeeRow(emp);
    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_employees\` (
            \`id\`, \`employee_code\`, \`name\`, \`photo_url\`, \`department\`,
            \`designation\`, \`phone\`, \`email\`, \`joining_date\`, \`salary_monthly\`,
            \`status\`, \`current_site_location\`, \`login_enabled\`, \`system_role\`,
            \`is_field_worker\`, \`account_status\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`),
            \`photo_url\` = VALUES(\`photo_url\`),
            \`department\` = VALUES(\`department\`),
            \`designation\` = VALUES(\`designation\`),
            \`phone\` = VALUES(\`phone\`),
            \`email\` = VALUES(\`email\`),
            \`joining_date\` = VALUES(\`joining_date\`),
            \`salary_monthly\` = VALUES(\`salary_monthly\`),
            \`status\` = VALUES(\`status\`),
            \`current_site_location\` = VALUES(\`current_site_location\`),
            \`login_enabled\` = VALUES(\`login_enabled\`),
            \`system_role\` = VALUES(\`system_role\`),
            \`is_field_worker\` = VALUES(\`is_field_worker\`),
            \`account_status\` = VALUES(\`account_status\`)
        `;
        await this.pool.query(sql, [
          mapped.id,
          mapped.employeeCode,
          mapped.name,
          mapped.photoUrl || '',
          mapped.department,
          mapped.designation,
          mapped.phone,
          mapped.email,
          mapped.joiningDate,
          mapped.salaryMonthly,
          mapped.status,
          mapped.currentSiteLocation,
          mapped.loginEnabled ? 1 : 0,
          mapped.systemRole,
          mapped.isFieldWorker ? 1 : 0,
          mapped.accountStatus
        ]);
      } catch (e: any) {
        console.warn('MySQL saveEmployee error:', e?.message || e);
      }
    }
    const items = this.getFallbackItems('employees');
    const idx = items.findIndex(e => e.id === mapped.id || (e.employeeCode && e.employeeCode === mapped.employeeCode));
    if (idx >= 0) items[idx] = { ...items[idx], ...mapped };
    else items.unshift(mapped);
    this.setFallbackItems('employees', items);
    return mapped;
  }

  public async deleteEmployee(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_employees` WHERE `id` = ? OR `employee_code` = ?', [id, id]);
      } catch (e) {
        console.warn('MySQL deleteEmployee error:', e);
      }
    }
    const items = this.getFallbackItems('employees').filter(e => e.id !== id && e.employeeCode !== id);
    this.setFallbackItems('employees', items);
    return true;
  }

  public async getAttendance(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `solar_attendance` ORDER BY `attendance_date` DESC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => ({
            ...r,
            id: r.id,
            employeeId: r.employee_id || r.employeeId || '',
            employeeName: r.employee_name || r.employeeName || '',
            attendanceDate: r.attendance_date ? String(r.attendance_date).split('T')[0] : (r.attendanceDate || null),
            checkInTime: r.check_in_time || r.checkInTime || '09:00:00',
            checkOutTime: r.check_out_time || r.checkOutTime || null,
            status: r.status || 'PRESENT'
          }));
        }
      } catch (e) {
        console.warn('MySQL getAttendance error:', e);
      }
    }
    return this.getFallbackItems('attendance');
  }

  public async saveAttendance(att: any): Promise<any> {
    const mapped = {
      ...att,
      id: att.id || `att-${Date.now()}`,
      employeeId: att.employeeId || att.employee_id || '',
      employeeName: att.employeeName || att.employee_name || '',
      attendanceDate: att.attendanceDate || att.attendance_date ? String(att.attendanceDate || att.attendance_date).split('T')[0] : new Date().toISOString().split('T')[0],
      checkInTime: att.checkInTime || att.check_in_time || '09:00:00',
      checkOutTime: att.checkOutTime || att.check_out_time || null,
      status: att.status || 'PRESENT'
    };

    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_attendance\` (
            \`id\`, \`employee_id\`, \`employee_name\`, \`attendance_date\`,
            \`check_in_time\`, \`check_out_time\`, \`status\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`check_out_time\` = VALUES(\`check_out_time\`), \`status\` = VALUES(\`status\`)
        `;
        await this.pool.query(sql, [
          mapped.id, mapped.employeeId, mapped.employeeName, mapped.attendanceDate,
          mapped.checkInTime, mapped.checkOutTime, mapped.status
        ]);
      } catch (e: any) {
        console.warn('MySQL saveAttendance error:', e?.message || e);
      }
    }
    const list = this.getFallbackItems('attendance');
    const idx = list.findIndex(a => a.id === mapped.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...mapped };
    else list.unshift(mapped);
    this.setFallbackItems('attendance', list);
    return mapped;
  }

  public async deleteAttendance(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_attendance` WHERE `id` = ?', [id]);
      } catch (e) {
        console.warn('MySQL deleteAttendance error:', e);
      }
    }
    const items = this.getFallbackItems('attendance').filter(a => a.id !== id);
    this.setFallbackItems('attendance', items);
    return true;
  }

  public async getPayslips(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `solar_payslips` ORDER BY `month` DESC, `year` DESC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => ({
            ...r,
            id: r.id,
            employeeId: r.employee_id || r.employeeId || '',
            employeeName: r.employee_name || r.employeeName || '',
            month: r.month || '2026-04',
            year: Number(r.year ?? 2026),
            basicSalary: Number(r.basic_salary ?? r.basicSalary ?? r.basicPay ?? 0),
            basicPay: Number(r.basic_salary ?? r.basicSalary ?? r.basicPay ?? 0),
            allowances: Number(r.allowances ?? 0),
            deductions: Number(r.deductions ?? 0),
            netSalary: Number(r.net_salary ?? r.netSalary ?? r.netPay ?? 0),
            netPay: Number(r.net_salary ?? r.netSalary ?? r.netPay ?? 0),
            status: r.payment_status || r.status || 'GENERATED',
            paymentStatus: r.payment_status || r.status || 'GENERATED'
          }));
        }
      } catch (e) {
        console.warn('MySQL getPayslips error:', e);
      }
    }
    return this.getFallbackItems('payslips');
  }

  public async savePayslip(slip: any): Promise<any> {
    const mapped = {
      ...slip,
      id: slip.id || `slip-${Date.now()}`,
      employeeId: slip.employeeId || slip.employee_id || '',
      employeeName: slip.employeeName || slip.employee_name || '',
      month: slip.month || '2026-04',
      year: Number(slip.year) || 2026,
      basicSalary: Number(slip.basicSalary || slip.basicPay || slip.basic_salary) || 0,
      allowances: Number(slip.allowances) || 0,
      deductions: Number(slip.deductions) || 0,
      netSalary: Number(slip.netSalary || slip.netPay || slip.net_salary) || 0,
      status: slip.status || slip.paymentStatus || 'GENERATED'
    };

    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_payslips\` (
            \`id\`, \`employee_id\`, \`employee_name\`, \`month\`, \`year\`,
            \`basic_salary\`, \`allowances\`, \`deductions\`, \`net_salary\`, \`payment_status\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`basic_salary\` = VALUES(\`basic_salary\`),
            \`allowances\` = VALUES(\`allowances\`),
            \`deductions\` = VALUES(\`deductions\`),
            \`net_salary\` = VALUES(\`net_salary\`),
            \`payment_status\` = VALUES(\`payment_status\`)
        `;
        await this.pool.query(sql, [
          mapped.id, mapped.employeeId, mapped.employeeName, mapped.month, mapped.year,
          mapped.basicSalary, mapped.allowances, mapped.deductions, mapped.netSalary, mapped.status
        ]);
      } catch (e: any) {
        console.warn('MySQL savePayslip error:', e?.message || e);
      }
    }
    const list = this.getFallbackItems('payslips');
    const idx = list.findIndex(s => s.id === mapped.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...mapped };
    else list.unshift(mapped);
    this.setFallbackItems('payslips', list);
    return mapped;
  }

  public async deletePayslip(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_payslips` WHERE `id` = ?', [id]);
      } catch (e) {
        console.warn('MySQL deletePayslip error:', e);
      }
    }
    const items = this.getFallbackItems('payslips').filter(s => s.id !== id);
    this.setFallbackItems('payslips', items);
    return true;
  }

  // --- Service Tickets & AMC ---
  public async getServiceTickets(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `solar_service_tickets` ORDER BY `created_at` DESC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => ({
            ...r,
            id: r.id,
            ticketId: r.ticket_id || r.ticketId || r.id,
            customerId: r.customer_id || r.customerId || '',
            customerName: r.customer_name || r.customerName || '',
            projectId: r.project_id || r.projectId || '',
            projectTitle: r.project_title || r.projectTitle || '',
            issue: r.issue || r.title || 'Service Ticket',
            title: r.issue || r.title || 'Service Ticket',
            category: r.category || 'Inverter Warning',
            priority: r.priority || 'MEDIUM',
            assignedTechnicianId: r.assigned_technician_id || r.assignedTechnicianId || '',
            assignedTechnicianName: r.assigned_technician_name || r.assignedTechnicianName || '',
            status: r.status || 'OPEN',
            notes: r.notes || r.description || ''
          }));
        }
      } catch (e) {
        console.warn('MySQL getServiceTickets error:', e);
      }
    }
    return this.getFallbackItems('service_tickets');
  }

  public async saveServiceTicket(ticket: any): Promise<any> {
    const mapped = {
      ...ticket,
      id: ticket.id || `srv-${Date.now()}`,
      ticketId: ticket.ticketId || ticket.ticketNumber || ticket.ticket_id || `SRV-${Date.now()}`,
      customerId: ticket.customerId || ticket.customer_id || '',
      customerName: ticket.customerName || ticket.customer_name || '',
      projectId: ticket.projectId || ticket.project_id || '',
      projectTitle: ticket.projectTitle || ticket.project_title || '',
      issue: ticket.issue || ticket.title || 'Service Ticket',
      category: ticket.category || 'Inverter Warning',
      priority: ticket.priority || 'MEDIUM',
      assignedTechnicianId: ticket.assignedTechnicianId || ticket.assigned_technician_id || '',
      assignedTechnicianName: ticket.assignedTechnicianName || ticket.assigned_technician_name || '',
      status: ticket.status || 'OPEN',
      notes: ticket.notes || ticket.description || ''
    };

    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_service_tickets\` (
            \`id\`, \`ticket_id\`, \`customer_id\`, \`customer_name\`, \`project_id\`,
            \`project_title\`, \`issue\`, \`category\`, \`priority\`, \`assigned_technician_id\`,
            \`assigned_technician_name\`, \`status\`, \`notes\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`issue\` = VALUES(\`issue\`), \`category\` = VALUES(\`category\`),
            \`priority\` = VALUES(\`priority\`), \`assigned_technician_name\` = VALUES(\`assigned_technician_name\`),
            \`status\` = VALUES(\`status\`), \`notes\` = VALUES(\`notes\`)
        `;
        await this.pool.query(sql, [
          mapped.id, mapped.ticketId, mapped.customerId, mapped.customerName, mapped.projectId,
          mapped.projectTitle, mapped.issue, mapped.category, mapped.priority, mapped.assignedTechnicianId,
          mapped.assignedTechnicianName, mapped.status, mapped.notes
        ]);
      } catch (e: any) {
        console.warn('MySQL saveServiceTicket error:', e?.message || e);
      }
    }
    const list = this.getFallbackItems('service_tickets');
    const idx = list.findIndex(t => t.id === mapped.id || t.ticketId === mapped.ticketId);
    if (idx >= 0) list[idx] = { ...list[idx], ...mapped };
    else list.unshift(mapped);
    this.setFallbackItems('service_tickets', list);
    return mapped;
  }

  public async deleteServiceTicket(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_service_tickets` WHERE `id` = ? OR `ticket_id` = ?', [id, id]);
      } catch (e) {
        console.warn('MySQL deleteServiceTicket error:', e);
      }
    }
    const items = this.getFallbackItems('service_tickets').filter(t => t.id !== id && t.ticketId !== id);
    this.setFallbackItems('service_tickets', items);
    return true;
  }

  public async getAmcContracts(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `solar_amc_contracts` ORDER BY `start_date` DESC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => ({
            ...r,
            id: r.id,
            amcCode: r.amc_code || r.amcCode || r.id,
            customerId: r.customer_id || r.customerId || '',
            customerName: r.customer_name || r.customerName || '',
            projectId: r.project_id || r.projectId || '',
            projectTitle: r.project_title || r.projectTitle || '',
            planName: r.plan_name || r.planName || 'Standard AMC',
            startDate: r.start_date ? String(r.start_date).split('T')[0] : (r.startDate || null),
            endDate: r.end_date ? String(r.end_date).split('T')[0] : (r.endDate || null),
            annualAmount: Number(r.annual_amount ?? r.annualAmount ?? 12000),
            annualFee: Number(r.annual_amount ?? r.annualAmount ?? 12000),
            visitsCompleted: Number(r.visits_completed ?? r.visitsCompleted ?? 0),
            totalVisits: Number(r.total_visits ?? r.totalVisits ?? 4),
            status: r.status || 'ACTIVE'
          }));
        }
      } catch (e) {
        console.warn('MySQL getAmcContracts error:', e);
      }
    }
    return this.getFallbackItems('amc_contracts');
  }

  public async saveAmcContract(contract: any): Promise<any> {
    const mapped = {
      ...contract,
      id: contract.id || `amc-${Date.now()}`,
      amcCode: contract.amcCode || contract.contractNumber || contract.amc_code || `AMC-${Date.now()}`,
      customerId: contract.customerId || contract.customer_id || '',
      customerName: contract.customerName || contract.customer_name || '',
      projectId: contract.projectId || contract.project_id || '',
      projectTitle: contract.projectTitle || contract.project_title || '',
      planName: contract.planName || contract.plan_name || 'Standard AMC',
      startDate: contract.startDate || contract.start_date ? String(contract.startDate || contract.start_date).split('T')[0] : '2026-04-01',
      endDate: contract.endDate || contract.end_date ? String(contract.endDate || contract.end_date).split('T')[0] : '2027-03-31',
      annualAmount: Number(contract.annualAmount || contract.annualFee || contract.annual_amount) || 12000,
      visitsCompleted: Number(contract.visitsCompleted || contract.visits_completed) || 0,
      totalVisits: Number(contract.totalVisits || contract.visitsPerYear || contract.total_visits) || 4,
      status: contract.status || 'ACTIVE'
    };

    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_amc_contracts\` (
            \`id\`, \`amc_code\`, \`customer_id\`, \`customer_name\`, \`project_id\`,
            \`project_title\`, \`plan_name\`, \`start_date\`, \`end_date\`,
            \`annual_amount\`, \`visits_completed\`, \`total_visits\`, \`status\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`plan_name\` = VALUES(\`plan_name\`), \`annual_amount\` = VALUES(\`annual_amount\`),
            \`visits_completed\` = VALUES(\`visits_completed\`), \`total_visits\` = VALUES(\`total_visits\`),
            \`status\` = VALUES(\`status\`)
        `;
        await this.pool.query(sql, [
          mapped.id, mapped.amcCode, mapped.customerId, mapped.customerName, mapped.projectId,
          mapped.projectTitle, mapped.planName, mapped.startDate, mapped.endDate,
          mapped.annualAmount, mapped.visitsCompleted, mapped.totalVisits, mapped.status
        ]);
      } catch (e: any) {
        console.warn('MySQL saveAmcContract error:', e?.message || e);
      }
    }
    const list = this.getFallbackItems('amc_contracts');
    const idx = list.findIndex(c => c.id === mapped.id || c.amcCode === mapped.amcCode);
    if (idx >= 0) list[idx] = { ...list[idx], ...mapped };
    else list.unshift(mapped);
    this.setFallbackItems('amc_contracts', list);
    return mapped;
  }

  public async deleteAmcContract(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_amc_contracts` WHERE `id` = ? OR `amc_code` = ?', [id, id]);
      } catch (e) {
        console.warn('MySQL deleteAmcContract error:', e);
      }
    }
    const items = this.getFallbackItems('amc_contracts').filter(c => c.id !== id && c.amcCode !== id);
    this.setFallbackItems('amc_contracts', items);
    return true;
  }

  // --- Purchase Orders & Vendors ---
  public async getPurchaseOrders(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `solar_purchase_orders` ORDER BY `po_date` DESC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => {
            let items: any[] = [];
            if (r.items_json) {
              try { items = JSON.parse(r.items_json); } catch {}
            }
            return {
              ...r,
              id: r.id,
              poNumber: r.po_number || r.poNumber || r.id,
              purchaseNumber: r.po_number || r.purchaseNumber || r.id,
              vendorId: r.vendor_id || r.vendorId || '',
              vendorName: r.vendor_name || r.vendorName || '',
              poDate: r.po_date ? String(r.po_date).split('T')[0] : (r.poDate || null),
              purchaseDate: r.po_date ? String(r.po_date).split('T')[0] : (r.purchaseDate || null),
              expectedDeliveryDate: r.expected_delivery_date ? String(r.expected_delivery_date).split('T')[0] : (r.expectedDeliveryDate || null),
              projectId: r.project_id || r.projectId || '',
              subtotal: Number(r.subtotal ?? 0),
              gstAmount: Number(r.gst_amount ?? r.taxAmount ?? 0),
              taxAmount: Number(r.gst_amount ?? r.taxAmount ?? 0),
              totalAmount: Number(r.total_amount ?? r.totalAmount ?? 0),
              status: r.status || 'DRAFT',
              paymentStatus: r.payment_status || r.paymentStatus || 'PENDING',
              notes: r.notes || '',
              items
            };
          });
        }
      } catch (e) {
        console.warn('MySQL getPurchaseOrders error:', e);
      }
    }
    return this.getFallbackItems('purchase_orders');
  }

  public async savePurchaseOrder(po: any): Promise<any> {
    const items = po.items || po.lineItems || [];
    const mapped = {
      ...po,
      id: po.id || `po-${Date.now()}`,
      poNumber: po.poNumber || po.purchaseNumber || po.po_number || `PO-${Date.now()}`,
      vendorId: po.vendorId || po.vendor_id || '',
      vendorName: po.vendorName || po.vendor_name || '',
      poDate: po.poDate || po.purchaseDate || po.po_date ? String(po.poDate || po.purchaseDate || po.po_date).split('T')[0] : new Date().toISOString().split('T')[0],
      expectedDeliveryDate: po.expectedDeliveryDate || po.expected_delivery_date ? String(po.expectedDeliveryDate || po.expected_delivery_date).split('T')[0] : null,
      projectId: po.projectId || po.project_id || '',
      subtotal: Number(po.subtotal) || 0,
      gstAmount: Number(po.taxAmount || po.gst_amount || po.gstAmount) || 0,
      totalAmount: Number(po.totalAmount || po.total_amount) || 0,
      status: po.status || 'DRAFT',
      paymentStatus: po.paymentStatus || po.payment_status || 'PENDING',
      notes: po.notes || '',
      items
    };

    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_purchase_orders\` (
            \`id\`, \`po_number\`, \`vendor_id\`, \`vendor_name\`, \`po_date\`,
            \`expected_delivery_date\`, \`project_id\`, \`items_json\`, \`subtotal\`,
            \`gst_amount\`, \`total_amount\`, \`status\`, \`payment_status\`, \`notes\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`vendor_name\` = VALUES(\`vendor_name\`), \`expected_delivery_date\` = VALUES(\`expected_delivery_date\`),
            \`items_json\` = VALUES(\`items_json\`), \`subtotal\` = VALUES(\`subtotal\`),
            \`gst_amount\` = VALUES(\`gst_amount\`), \`total_amount\` = VALUES(\`total_amount\`),
            \`status\` = VALUES(\`status\`), \`payment_status\` = VALUES(\`payment_status\`),
            \`notes\` = VALUES(\`notes\`)
        `;
        await this.pool.query(sql, [
          mapped.id, mapped.poNumber, mapped.vendorId, mapped.vendorName, mapped.poDate,
          mapped.expectedDeliveryDate, mapped.projectId, JSON.stringify(mapped.items),
          mapped.subtotal, mapped.gstAmount, mapped.totalAmount, mapped.status, mapped.paymentStatus, mapped.notes
        ]);
      } catch (e: any) {
        console.warn('MySQL savePurchaseOrder error:', e?.message || e);
      }
    }
    const list = this.getFallbackItems('purchase_orders');
    const idx = list.findIndex(p => p.id === mapped.id || p.poNumber === mapped.poNumber);
    if (idx >= 0) list[idx] = { ...list[idx], ...mapped };
    else list.unshift(mapped);
    this.setFallbackItems('purchase_orders', list);
    return mapped;
  }

  public async deletePurchaseOrder(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_purchase_orders` WHERE `id` = ? OR `po_number` = ?', [id, id]);
      } catch (e) {
        console.warn('MySQL deletePurchaseOrder error:', e);
      }
    }
    const items = this.getFallbackItems('purchase_orders').filter(p => p.id !== id && p.poNumber !== id);
    this.setFallbackItems('purchase_orders', items);
    return true;
  }

  public async getVendors(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `solar_vendors` ORDER BY `name` ASC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => ({
            ...r,
            id: r.id,
            name: r.name,
            vendorCode: r.vendor_code || r.vendorCode || r.id,
            contactPerson: r.contact_person || r.contactPerson || '',
            phone: r.phone || '',
            email: r.email || '',
            address: r.address || '',
            city: r.city || '',
            state: r.state || '',
            gstNumber: r.gst_number || r.gstNumber || '',
            paymentTerms: r.payment_terms || r.paymentTerms || '30 Days Credit',
            status: r.status || 'ACTIVE'
          }));
        }
      } catch (e) {
        console.warn('MySQL getVendors error:', e);
      }
    }
    return this.getFallbackItems('vendors');
  }

  public async saveVendor(ven: any): Promise<any> {
    const mapped = {
      ...ven,
      id: ven.id || `vnd-${Date.now()}`,
      name: ven.name || '',
      vendorCode: ven.vendorCode || ven.vendor_code || `VND-${Date.now().toString().slice(-4)}`,
      contactPerson: ven.contactPerson || ven.contact_person || '',
      phone: ven.phone || '',
      email: ven.email || '',
      address: ven.address || '',
      city: ven.city || '',
      state: ven.state || 'Gujarat',
      gstNumber: ven.gstNumber || ven.gst_number || '',
      paymentTerms: ven.paymentTerms || ven.payment_terms || '30 Days Credit',
      status: ven.status || 'ACTIVE'
    };

    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_vendors\` (
            \`id\`, \`name\`, \`vendor_code\`, \`contact_person\`, \`phone\`, \`email\`,
            \`address\`, \`city\`, \`state\`, \`gst_number\`, \`payment_terms\`, \`status\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`), \`contact_person\` = VALUES(\`contact_person\`),
            \`phone\` = VALUES(\`phone\`), \`email\` = VALUES(\`email\`),
            \`address\` = VALUES(\`address\`), \`city\` = VALUES(\`city\`),
            \`state\` = VALUES(\`state\`), \`gst_number\` = VALUES(\`gst_number\`),
            \`payment_terms\` = VALUES(\`payment_terms\`), \`status\` = VALUES(\`status\`)
        `;
        await this.pool.query(sql, [
          mapped.id, mapped.name, mapped.vendorCode, mapped.contactPerson, mapped.phone, mapped.email,
          mapped.address, mapped.city, mapped.state, mapped.gstNumber, mapped.paymentTerms, mapped.status
        ]);
      } catch (e: any) {
        console.warn('MySQL saveVendor error:', e?.message || e);
      }
    }
    const items = this.getFallbackItems('vendors');
    const idx = items.findIndex(v => v.id === mapped.id || v.vendorCode === mapped.vendorCode);
    if (idx >= 0) items[idx] = { ...items[idx], ...mapped };
    else items.unshift(mapped);
    this.setFallbackItems('vendors', items);
    return mapped;
  }

  public async deleteVendor(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_vendors` WHERE `id` = ? OR `vendor_code` = ?', [id, id]);
      } catch (e) {
        console.warn('MySQL deleteVendor error:', e);
      }
    }
    const items = this.getFallbackItems('vendors').filter(v => v.id !== id && v.vendorCode !== id);
    this.setFallbackItems('vendors', items);
    return true;
  }

  // --- Settings & Notifications ---
  public async getNotifications(): Promise<any[]> {
    return this.getFallbackItems('notifications');
  }

  public async saveNotification(n: any): Promise<any> {
    const items = this.getFallbackItems('notifications');
    items.unshift(n);
    this.setFallbackItems('notifications', items);
    return n;
  }

  public async getSettings(): Promise<any> {
    const items = this.getFallbackItems('settings');
    return items[0] || {};
  }

  public async saveSettings(settings: any): Promise<any> {
    this.setFallbackItems('settings', [settings]);
    return settings;
  }
}

export const dbManager = new MySqlDatabaseManager();
