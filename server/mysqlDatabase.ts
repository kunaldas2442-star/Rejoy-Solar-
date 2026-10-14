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
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'solarpulse_erp'
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
      if (!process.env.DB_HOST && !process.env.DB_NAME) {
        return { connected: false, error: 'Database credentials not specified in environment' };
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

  // --- Customers Module ---
  public async getCustomers(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows] = await this.pool.query('SELECT * FROM `solar_customers` ORDER BY `created_at` DESC');
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getCustomers error, using fallback:', e);
      }
    }
    return this.getFallbackItems('customers');
  }

  public async saveCustomer(cust: any): Promise<any> {
    const cleanPass = cust.password ? (cust.password.startsWith('scrypt$') ? cust.password : hashPassword(cust.password)) : hashPassword('123456');
    cust.password = cleanPass;

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
          cust.id, cust.customerCode || cust.id, cust.name, cust.companyName || '',
          cust.customerType || 'Residential', cust.phone, cust.email || '',
          cleanPass, cust.siteAddress || '', cust.city || '',
          cust.state || 'Gujarat', cust.pincode || '', cust.gstNumber || '',
          cust.electricityConsumerNo || '', Number(cust.sanctionedLoadKw) || 0,
          cust.status || 'ACTIVE', cust.activeProjectId || null
        ]);
      } catch (e) {
        console.warn('MySQL saveCustomer error:', e);
      }
    }
    const items = this.getFallbackItems('customers');
    const idx = items.findIndex(c => c.id === cust.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...cust };
    else items.unshift(cust);
    this.setFallbackItems('customers', items);
    return cust;
  }

  public async deleteCustomer(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_customers` WHERE `id` = ?', [id]);
      } catch (e) {
        console.warn('MySQL deleteCustomer error:', e);
      }
    }
    const items = this.getFallbackItems('customers').filter(c => c.id !== id);
    this.setFallbackItems('customers', items);
    return true;
  }

  public async updateCustomerPassword(customerId: string, newPass: string): Promise<boolean> {
    const hashed = hashPassword(newPass);
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('UPDATE `solar_customers` SET `password` = ? WHERE `id` = ?', [hashed, customerId]);
      } catch (e) {
        console.warn('MySQL updateCustomerPassword error:', e);
      }
    }
    const items = this.getFallbackItems('customers');
    const target = items.find(c => c.id === customerId);
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
        const [rows] = await this.pool.query('SELECT * FROM `solar_leads` ORDER BY `created_at` DESC');
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getLeads error:', e);
      }
    }
    return this.getFallbackItems('leads');
  }

  public async saveLead(lead: any): Promise<any> {
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
          lead.id, lead.customerName, lead.companyName || '', lead.phone, lead.email || '',
          lead.address || '', lead.city || '', Number(lead.solarCapacityKw) || 0,
          Number(lead.estimatedValue) || 0, lead.source || 'Website',
          lead.assignedSalespersonId || '', lead.assignedSalespersonName || '',
          lead.status || 'NEW', lead.notes || '',
          lead.nextFollowUpDate ? String(lead.nextFollowUpDate).split('T')[0] : null
        ]);
      } catch (e) {
        console.warn('MySQL saveLead error:', e);
      }
    }
    const items = this.getFallbackItems('leads');
    const idx = items.findIndex(l => l.id === lead.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...lead };
    else items.unshift(lead);
    this.setFallbackItems('leads', items);
    return lead;
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
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getProjects error:', e);
      }
    }
    return this.getFallbackItems('projects');
  }

  public async saveProject(proj: any): Promise<any> {
    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_projects\` (
            \`id\`, \`project_code\`, \`customer_id\`, \`customer_name\`, \`title\`,
            \`capacity_kw\`, \`total_value\`, \`status\`, \`current_stage_key\`,
            \`completion_percentage\`, \`project_manager_id\`, \`project_manager_name\`,
            \`site_address\`, \`city\`, \`inverter_model\`, \`panel_model\`,
            \`structure_type\`, \`start_date\`, \`expected_completion_date\`,
            \`notes\`, \`assignments_json\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`title\` = VALUES(\`title\`), \`capacity_kw\` = VALUES(\`capacity_kw\`),
            \`total_value\` = VALUES(\`total_value\`), \`status\` = VALUES(\`status\`),
            \`current_stage_key\` = VALUES(\`current_stage_key\`),
            \`completion_percentage\` = VALUES(\`completion_percentage\`),
            \`project_manager_id\` = VALUES(\`project_manager_id\`),
            \`project_manager_name\` = VALUES(\`project_manager_name\`),
            \`notes\` = VALUES(\`notes\`), \`assignments_json\` = VALUES(\`assignments_json\`)
        `;
        await this.pool.query(sql, [
          proj.id, proj.projectCode || proj.id, proj.customerId, proj.customerName, proj.title,
          Number(proj.capacityKw) || 0, Number(proj.totalValue) || 0, proj.status || 'PLANNING',
          proj.currentStageKey || 'site_survey', Number(proj.completionPercentage) || 0,
          proj.projectManagerId || '', proj.projectManagerName || '', proj.siteAddress || '',
          proj.city || '', proj.inverterModel || '', proj.panelModel || '',
          proj.structureType || 'Elevated GI Structure',
          proj.startDate ? String(proj.startDate).split('T')[0] : null,
          proj.expectedCompletionDate ? String(proj.expectedCompletionDate).split('T')[0] : null,
          proj.notes || '', JSON.stringify(proj.assignments || [])
        ]);
      } catch (e) {
        console.warn('MySQL saveProject error:', e);
      }
    }
    const items = this.getFallbackItems('projects');
    const idx = items.findIndex(p => p.id === proj.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...proj };
    else items.unshift(proj);
    this.setFallbackItems('projects', items);
    return proj;
  }

  public async deleteProject(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM `solar_projects` WHERE `id` = ?', [id]);
      } catch (e) {
        console.warn('MySQL deleteProject error:', e);
      }
    }
    const items = this.getFallbackItems('projects').filter(p => p.id !== id);
    this.setFallbackItems('projects', items);
    return true;
  }

  // --- Quotations Module ---
  public async getQuotations(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows] = await this.pool.query('SELECT * FROM `solar_quotations` ORDER BY `created_at` DESC');
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getQuotations error:', e);
      }
    }
    return this.getFallbackItems('quotations');
  }

  public async saveQuotation(quote: any): Promise<any> {
    // Authoritative Financial Calculation Verification
    const capacityKw = Number(quote.capacityKw) || 3;
    const baseAmount = Number(quote.baseProjectPrice || quote.baseAmount) || (capacityKw * 60000);
    const discountAmount = Number(quote.discountAmount) || 0;
    const taxableAmount = Math.max(0, baseAmount - discountAmount);
    const gstRate = Number(quote.gstRate || quote.gstEquipmentRate) || 13.8;
    const gstAmount = Math.round((taxableAmount * gstRate) / 100);
    const totalAmount = taxableAmount + gstAmount;
    const subsidy = Number(quote.totalSubsidy || (quote.centralSubsidy || 0) + (quote.stateSubsidy || 0));
    const finalInvestment = Math.max(0, totalAmount - subsidy);

    quote.capacityKw = capacityKw;
    quote.baseAmount = baseAmount;
    quote.discountAmount = discountAmount;
    quote.taxableAmount = taxableAmount;
    quote.gstAmount = gstAmount;
    quote.totalAmount = totalAmount;
    quote.totalSubsidy = subsidy;
    quote.finalProjectInvestment = finalInvestment;

    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_quotations\` (
            \`id\`, \`quotation_number\`, \`customer_id\`, \`customer_name\`,
            \`system_type\`, \`capacity_kw\`, \`base_amount\`, \`discount_amount\`,
            \`gst_rate\`, \`gst_amount\`, \`total_amount\`, \`subsidy_amount\`,
            \`final_investment\`, \`status\`, \`valid_until\`, \`terms_and_conditions\`,
            \`bom_items_json\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`customer_name\` = VALUES(\`customer_name\`), \`system_type\` = VALUES(\`system_type\`),
            \`capacity_kw\` = VALUES(\`capacity_kw\`), \`base_amount\` = VALUES(\`base_amount\`),
            \`discount_amount\` = VALUES(\`discount_amount\`), \`gst_rate\` = VALUES(\`gst_rate\`),
            \`gst_amount\` = VALUES(\`gst_amount\`), \`total_amount\` = VALUES(\`total_amount\`),
            \`subsidy_amount\` = VALUES(\`subsidy_amount\`), \`final_investment\` = VALUES(\`final_investment\`),
            \`status\` = VALUES(\`status\`), \`valid_until\` = VALUES(\`valid_until\`),
            \`bom_items_json\` = VALUES(\`bom_items_json\`)
        `;
        await this.pool.query(sql, [
          quote.id, quote.quotationNumber || quote.quoteNumber || quote.id,
          quote.customerId || '', quote.customerName || 'Customer',
          quote.systemType || 'On-Grid', capacityKw, baseAmount, discountAmount,
          gstRate, gstAmount, totalAmount, subsidy, finalInvestment,
          quote.status || 'DRAFT',
          quote.validUntil ? String(quote.validUntil).split('T')[0] : null,
          quote.termsAndConditions || '',
          JSON.stringify(quote.lineItems || quote.bomItems || [])
        ]);
      } catch (e) {
        console.warn('MySQL saveQuotation error:', e);
      }
    }
    const items = this.getFallbackItems('quotations');
    const idx = items.findIndex(q => q.id === quote.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...quote };
    else items.unshift(quote);
    this.setFallbackItems('quotations', items);
    return quote;
  }

  public async deleteQuotation(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM \`solar_quotations\` WHERE \`id\` = ?', [id]);
      } catch (e) {
        console.warn('MySQL deleteQuotation error:', e);
      }
    }
    const items = this.getFallbackItems('quotations').filter(q => q.id !== id);
    this.setFallbackItems('quotations', items);
    return true;
  }

  // --- Payments & Invoices ---
  public async getPayments(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows] = await this.pool.query('SELECT * FROM `solar_payments` ORDER BY `payment_date` DESC');
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getPayments error:', e);
      }
    }
    return this.getFallbackItems('payments');
  }

  public async savePayment(pay: any): Promise<any> {
    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_payments\` (
            \`id\`, \`receipt_number\`, \`project_id\`, \`customer_id\`, \`customer_name\`,
            \`amount\`, \`payment_mode\`, \`reference_number\`, \`status\`, \`notes\`, \`payment_date\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`amount\` = VALUES(\`amount\`), \`payment_mode\` = VALUES(\`payment_mode\`),
            \`reference_number\` = VALUES(\`reference_number\`), \`status\` = VALUES(\`status\`),
            \`notes\` = VALUES(\`notes\`), \`payment_date\` = VALUES(\`payment_date\`)
        `;
        await this.pool.query(sql, [
          pay.id, pay.receiptNumber || pay.receiptNo || pay.id, pay.projectId || '',
          pay.customerId || '', pay.customerName || '', Number(pay.amount) || 0,
          pay.paymentMode || pay.method || 'NEFT/RTGS', pay.referenceNumber || pay.transactionRef || '',
          pay.status || 'COMPLETED', pay.notes || '',
          pay.paymentDate ? String(pay.paymentDate).split('T')[0] : new Date().toISOString().split('T')[0]
        ]);
      } catch (e) {
        console.warn('MySQL savePayment error:', e);
      }
    }
    const items = this.getFallbackItems('payments');
    const idx = items.findIndex(p => p.id === pay.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...pay };
    else items.unshift(pay);
    this.setFallbackItems('payments', items);
    return pay;
  }

  public async getSalesInvoices(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows] = await this.pool.query('SELECT * FROM `solar_sales_invoices` ORDER BY `invoice_date` DESC');
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getSalesInvoices error:', e);
      }
    }
    return this.getFallbackItems('sales_invoices');
  }

  public async saveSalesInvoice(inv: any): Promise<any> {
    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_sales_invoices\` (
            \`id\`, \`invoice_number\`, \`project_id\`, \`customer_id\`, \`customer_name\`,
            \`invoice_date\`, \`due_date\`, \`subtotal\`, \`tax_amount\`, \`grand_total\`,
            \`eway_bill_number\`, \`status\`, \`line_items_json\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`customer_name\` = VALUES(\`customer_name\`), \`subtotal\` = VALUES(\`subtotal\`),
            \`tax_amount\` = VALUES(\`tax_amount\`), \`grand_total\` = VALUES(\`grand_total\`),
            \`status\` = VALUES(\`status\`), \`eway_bill_number\` = VALUES(\`eway_bill_number\`),
            \`line_items_json\` = VALUES(\`line_items_json\`)
        `;
        await this.pool.query(sql, [
          inv.id, inv.invoiceNumber || inv.id, inv.projectId || '',
          inv.customerId || '', inv.customerName || '',
          inv.invoiceDate ? String(inv.invoiceDate).split('T')[0] : new Date().toISOString().split('T')[0],
          inv.dueDate ? String(inv.dueDate).split('T')[0] : null,
          Number(inv.subtotal) || 0, Number(inv.taxAmount) || 0, Number(inv.grandTotal) || 0,
          inv.ewayBillNumber || '', inv.status || 'UNPAID', JSON.stringify(inv.lineItems || [])
        ]);
      } catch (e) {
        console.warn('MySQL saveSalesInvoice error:', e);
      }
    }
    const items = this.getFallbackItems('sales_invoices');
    const idx = items.findIndex(i => i.id === inv.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...inv };
    else items.unshift(inv);
    this.setFallbackItems('sales_invoices', items);
    return inv;
  }

  // --- Expenses Module ---
  public async getExpenses(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows] = await this.pool.query('SELECT * FROM `solar_expenses` ORDER BY `expense_date` DESC');
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getExpenses error:', e);
      }
    }
    return this.getFallbackItems('expenses');
  }

  public async saveExpense(exp: any): Promise<any> {
    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_expenses\` (
            \`id\`, \`project_id\`, \`category\`, \`amount\`, \`vendor_name\`,
            \`payment_mode\`, \`expense_date\`, \`notes\`, \`status\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`amount\` = VALUES(\`amount\`), \`category\` = VALUES(\`category\`),
            \`vendor_name\` = VALUES(\`vendor_name\`), \`status\` = VALUES(\`status\`),
            \`notes\` = VALUES(\`notes\`)
        `;
        await this.pool.query(sql, [
          exp.id, exp.projectId || '', exp.category || 'General', Number(exp.amount) || 0,
          exp.vendorName || '', exp.paymentMode || 'Cash',
          exp.expenseDate ? String(exp.expenseDate).split('T')[0] : new Date().toISOString().split('T')[0],
          exp.notes || '', exp.status || 'PAID'
        ]);
      } catch (e) {
        console.warn('MySQL saveExpense error:', e);
      }
    }
    const items = this.getFallbackItems('expenses');
    const idx = items.findIndex(e => e.id === exp.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...exp };
    else items.unshift(exp);
    this.setFallbackItems('expenses', items);
    return exp;
  }

  // --- Inventory & Stock Movements with Atomic Transactions ---
  public async getProducts(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows] = await this.pool.query('SELECT * FROM `solar_products` ORDER BY `name` ASC');
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getProducts error:', e);
      }
    }
    return this.getFallbackItems('products');
  }

  public async saveProduct(prod: any): Promise<any> {
    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_products\` (
            \`id\`, \`item_code\`, \`name\`, \`category\`, \`manufacturer\`,
            \`unit\`, \`unit_price\`, \`current_stock\`, \`min_stock_level\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`), \`category\` = VALUES(\`category\`),
            \`manufacturer\` = VALUES(\`manufacturer\`), \`unit_price\` = VALUES(\`unit_price\`),
            \`current_stock\` = VALUES(\`current_stock\`), \`min_stock_level\` = VALUES(\`min_stock_level\`)
        `;
        await this.pool.query(sql, [
          prod.id, prod.itemCode || prod.sku || prod.id, prod.name, prod.category || 'Solar Panels',
          prod.manufacturer || prod.brand || '', prod.unit || 'Nos', Number(prod.unitPrice || prod.price) || 0,
          Number(prod.currentStock || prod.stock) || 0, Number(prod.minStockLevel) || 5
        ]);
      } catch (e) {
        console.warn('MySQL saveProduct error:', e);
      }
    }
    const items = this.getFallbackItems('products');
    const idx = items.findIndex(p => p.id === prod.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...prod };
    else items.unshift(prod);
    this.setFallbackItems('products', items);
    return prod;
  }

  // Atomic Stock Movement Transaction
  public async recordStockMovement(movement: any): Promise<{ success: boolean; movement: any; newStock: number; error?: string }> {
    const qty = Number(movement.quantity) || 0;
    const type = movement.movementType || 'OUT'; // IN or OUT
    const productId = movement.productId;

    if (!productId || qty <= 0) {
      return { success: false, movement, newStock: 0, error: 'Valid productId and positive quantity required.' };
    }

    if (this.isConnected && this.pool) {
      const conn = await this.pool.getConnection();
      try {
        await conn.beginTransaction();

        // Check current stock with FOR UPDATE lock
        const [rows]: any = await conn.query('SELECT current_stock FROM `solar_products` WHERE `id` = ? FOR UPDATE', [productId]);
        if (!rows || rows.length === 0) {
          await conn.rollback();
          conn.release();
          return { success: false, movement, newStock: 0, error: `Product ID "${productId}" not found.` };
        }

        const currentStock = Number(rows[0].current_stock) || 0;
        let newStock = currentStock;

        if (type === 'OUT' || type === 'ISSUE_TO_PROJECT') {
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

        // Update product stock
        await conn.query('UPDATE `solar_products` SET `current_stock` = ? WHERE `id` = ?', [newStock, productId]);

        // Insert stock movement record
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

        // Update in-memory product stock
        const prods = this.getFallbackItems('products');
        const pIdx = prods.findIndex(p => p.id === productId);
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

    // In-memory fallback stock movement
    const prods = this.getFallbackItems('products');
    const pIdx = prods.findIndex(p => p.id === productId);
    if (pIdx < 0) {
      return { success: false, movement, newStock: 0, error: `Product ID "${productId}" not found.` };
    }

    const currentStock = Number(prods[pIdx].currentStock) || 0;
    let newStock = currentStock;

    if (type === 'OUT' || type === 'ISSUE_TO_PROJECT') {
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
        const [rows] = await this.pool.query('SELECT * FROM `solar_employees` ORDER BY `employee_code` ASC');
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getEmployees error:', e);
      }
    }
    return this.getFallbackItems('employees');
  }

  public async saveEmployee(emp: any): Promise<any> {
    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_employees\` (
            \`id\`, \`employee_code\`, \`name\`, \`email\`, \`phone\`,
            \`role\`, \`department\`, \`designation\`, \`salary_monthly\`,
            \`status\`, \`is_field_worker\`, \`date_of_joining\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`), \`email\` = VALUES(\`email\`),
            \`phone\` = VALUES(\`phone\`), \`role\` = VALUES(\`role\`),
            \`department\` = VALUES(\`department\`), \`designation\` = VALUES(\`designation\`),
            \`salary_monthly\` = VALUES(\`salary_monthly\`), \`status\` = VALUES(\`status\`),
            \`is_field_worker\` = VALUES(\`is_field_worker\`)
        `;
        await this.pool.query(sql, [
          emp.id, emp.employeeCode || emp.employeeId || emp.id, emp.name,
          emp.email || '', emp.phone || '', emp.role || 'Field Engineer',
          emp.department || 'Operations', emp.designation || emp.role || '',
          Number(emp.salaryMonthly || emp.salary) || 30000,
          emp.status || 'ACTIVE', emp.isFieldWorker ? 1 : 0,
          emp.dateOfJoining ? String(emp.dateOfJoining).split('T')[0] : new Date().toISOString().split('T')[0]
        ]);
      } catch (e) {
        console.warn('MySQL saveEmployee error:', e);
      }
    }
    const items = this.getFallbackItems('employees');
    const idx = items.findIndex(e => e.id === emp.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...emp };
    else items.unshift(emp);
    this.setFallbackItems('employees', items);
    return emp;
  }

  public async getAttendance(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows] = await this.pool.query('SELECT * FROM `solar_attendance` ORDER BY `attendance_date` DESC');
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getAttendance error:', e);
      }
    }
    return this.getFallbackItems('attendance');
  }

  public async saveAttendance(att: any): Promise<any> {
    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_attendance\` (
            \`id\`, \`employee_id\`, \`employee_name\`, \`attendance_date\`,
            \`check_in_time\`, \`check_out_time\`, \`status\`, \`location_latitude\`, \`location_longitude\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`check_out_time\` = VALUES(\`check_out_time\`), \`status\` = VALUES(\`status\`)
        `;
        await this.pool.query(sql, [
          att.id, att.employeeId, att.employeeName || '',
          att.attendanceDate ? String(att.attendanceDate).split('T')[0] : new Date().toISOString().split('T')[0],
          att.checkInTime || '09:00:00', att.checkOutTime || null,
          att.status || 'PRESENT', att.locationLatitude || null, att.locationLongitude || null
        ]);
      } catch (e) {
        console.warn('MySQL saveAttendance error:', e);
      }
    }
    const items = this.getFallbackItems('attendance');
    const idx = items.findIndex(a => a.id === att.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...att };
    else items.unshift(att);
    this.setFallbackItems('attendance', items);
    return att;
  }

  public async getPayslips(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows] = await this.pool.query('SELECT * FROM `solar_payslips` ORDER BY `month` DESC');
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getPayslips error:', e);
      }
    }
    return this.getFallbackItems('payslips');
  }

  public async savePayslip(slip: any): Promise<any> {
    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_payslips\` (
            \`id\`, \`employee_id\`, \`employee_name\`, \`month\`, \`basic_pay\`,
            \`hra\`, \`allowances\`, \`deductions\`, \`net_pay\`, \`status\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`basic_pay\` = VALUES(\`basic_pay\`), \`net_pay\` = VALUES(\`net_pay\`),
            \`status\` = VALUES(\`status\`)
        `;
        await this.pool.query(sql, [
          slip.id, slip.employeeId, slip.employeeName || '', slip.month || '2026-04',
          Number(slip.basicPay) || 0, Number(slip.hra) || 0, Number(slip.allowances) || 0,
          Number(slip.deductions) || 0, Number(slip.netPay) || 0, slip.status || 'GENERATED'
        ]);
      } catch (e) {
        console.warn('MySQL savePayslip error:', e);
      }
    }
    const items = this.getFallbackItems('payslips');
    const idx = items.findIndex(s => s.id === slip.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...slip };
    else items.unshift(slip);
    this.setFallbackItems('payslips', items);
    return slip;
  }

  // --- Service Tickets & AMC ---
  public async getServiceTickets(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows] = await this.pool.query('SELECT * FROM `solar_service_tickets` ORDER BY `created_at` DESC');
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getServiceTickets error:', e);
      }
    }
    return this.getFallbackItems('service_tickets');
  }

  public async saveServiceTicket(ticket: any): Promise<any> {
    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_service_tickets\` (
            \`id\`, \`ticket_number\`, \`customer_id\`, \`customer_name\`, \`project_id\`,
            \`title\`, \`description\`, \`priority\`, \`status\`, \`assigned_technician_name\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`status\` = VALUES(\`status\`), \`priority\` = VALUES(\`priority\`),
            \`assigned_technician_name\` = VALUES(\`assigned_technician_name\`)
        `;
        await this.pool.query(sql, [
          ticket.id, ticket.ticketNumber || ticket.id, ticket.customerId || '',
          ticket.customerName || '', ticket.projectId || '', ticket.title || 'Inverter Alarm',
          ticket.description || '', ticket.priority || 'MEDIUM', ticket.status || 'OPEN',
          ticket.assignedTechnicianName || ''
        ]);
      } catch (e) {
        console.warn('MySQL saveServiceTicket error:', e);
      }
    }
    const items = this.getFallbackItems('service_tickets');
    const idx = items.findIndex(t => t.id === ticket.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...ticket };
    else items.unshift(ticket);
    this.setFallbackItems('service_tickets', items);
    return ticket;
  }

  public async getAmcContracts(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows] = await this.pool.query('SELECT * FROM `solar_amc_contracts` ORDER BY `start_date` DESC');
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getAmcContracts error:', e);
      }
    }
    return this.getFallbackItems('amc_contracts');
  }

  public async saveAmcContract(contract: any): Promise<any> {
    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_amc_contracts\` (
            \`id\`, \`contract_number\`, \`customer_id\`, \`customer_name\`, \`project_id\`,
            \`start_date\`, \`end_date\`, \`annual_fee\`, \`visits_per_year\`, \`status\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`status\` = VALUES(\`status\`), \`annual_fee\` = VALUES(\`annual_fee\`)
        `;
        await this.pool.query(sql, [
          contract.id, contract.contractNumber || contract.id, contract.customerId || '',
          contract.customerName || '', contract.projectId || '',
          contract.startDate ? String(contract.startDate).split('T')[0] : '2026-04-01',
          contract.endDate ? String(contract.endDate).split('T')[0] : '2027-03-31',
          Number(contract.annualFee) || 12000, Number(contract.visitsPerYear) || 4,
          contract.status || 'ACTIVE'
        ]);
      } catch (e) {
        console.warn('MySQL saveAmcContract error:', e);
      }
    }
    const items = this.getFallbackItems('amc_contracts');
    const idx = items.findIndex(c => c.id === contract.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...contract };
    else items.unshift(contract);
    this.setFallbackItems('amc_contracts', items);
    return contract;
  }

  // --- Purchase Orders & Vendors ---
  public async getPurchaseOrders(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows] = await this.pool.query('SELECT * FROM `solar_purchase_orders` ORDER BY `po_date` DESC');
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getPurchaseOrders error:', e);
      }
    }
    return this.getFallbackItems('purchase_orders');
  }

  public async savePurchaseOrder(po: any): Promise<any> {
    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_purchase_orders\` (
            \`id\`, \`po_number\`, \`vendor_id\`, \`vendor_name\`, \`po_date\`,
            \`expected_delivery_date\`, \`total_amount\`, \`status\`, \`line_items_json\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`status\` = VALUES(\`status\`), \`total_amount\` = VALUES(\`total_amount\`),
            \`line_items_json\` = VALUES(\`line_items_json\`)
        `;
        await this.pool.query(sql, [
          po.id, po.poNumber || po.id, po.vendorId || '', po.vendorName || '',
          po.poDate ? String(po.poDate).split('T')[0] : new Date().toISOString().split('T')[0],
          po.expectedDeliveryDate ? String(po.expectedDeliveryDate).split('T')[0] : null,
          Number(po.totalAmount) || 0, po.status || 'DRAFT', JSON.stringify(po.lineItems || [])
        ]);
      } catch (e) {
        console.warn('MySQL savePurchaseOrder error:', e);
      }
    }
    const items = this.getFallbackItems('purchase_orders');
    const idx = items.findIndex(p => p.id === po.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...po };
    else items.unshift(po);
    this.setFallbackItems('purchase_orders', items);
    return po;
  }

  public async getVendors(): Promise<any[]> {
    if (this.isConnected && this.pool) {
      try {
        const [rows] = await this.pool.query('SELECT * FROM `solar_vendors` ORDER BY `name` ASC');
        return rows as any[];
      } catch (e) {
        console.warn('MySQL getVendors error:', e);
      }
    }
    return this.getFallbackItems('vendors');
  }

  public async saveVendor(ven: any): Promise<any> {
    if (this.isConnected && this.pool) {
      try {
        const sql = `
          INSERT INTO \`solar_vendors\` (
            \`id\`, \`name\`, \`category\`, \`contact_person\`, \`phone\`, \`email\`, \`gst_number\`, \`city\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`), \`phone\` = VALUES(\`phone\`), \`email\` = VALUES(\`email\`)
        `;
        await this.pool.query(sql, [
          ven.id, ven.name, ven.category || 'Solar Panels', ven.contactPerson || '',
          ven.phone || '', ven.email || '', ven.gstNumber || '', ven.city || ''
        ]);
      } catch (e) {
        console.warn('MySQL saveVendor error:', e);
      }
    }
    const items = this.getFallbackItems('vendors');
    const idx = items.findIndex(v => v.id === ven.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...ven };
    else items.unshift(ven);
    this.setFallbackItems('vendors', items);
    return ven;
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
