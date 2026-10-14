import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { dbManager } from '../mysqlDatabase.ts';

export const apiRouter = express.Router();

// Initialize DB Manager
dbManager.init().catch(err => {
  console.warn('[DB Manager] Startup notice:', err);
});

// Seed in-memory fallback from server/fallbackData.json
try {
  const fallbackFile = path.join(process.cwd(), 'server', 'fallbackData.json');
  if (fs.existsSync(fallbackFile)) {
    const fallbackData = JSON.parse(fs.readFileSync(fallbackFile, 'utf-8'));
    for (const [key, items] of Object.entries(fallbackData)) {
      if (Array.isArray(items)) {
        dbManager.setFallbackItems(key, items);
      }
    }
  }
} catch (e) {
  console.warn('Initial storage seed notice:', e);
}

// ==========================================================
// 1. DATABASE & PRODUCTION MIGRATION APIS
// ==========================================================

// DB Status & Diagnostics
apiRouter.get('/db/status', (_req: Request, res: Response) => {
  const status = dbManager.getStatus();
  res.json({
    success: true,
    ...status,
    message: status.connected
      ? `Connected to MySQL database "${status.database}" on ${status.host}`
      : 'Operating in High-Performance Local Mode. Configure MySQL credentials in .env to connect live database.',
    tables: [
      'solar_users', 'solar_customers', 'solar_leads', 'solar_projects',
      'solar_project_stages', 'solar_site_surveys', 'solar_quotations',
      'solar_payments', 'solar_expenses', 'solar_employees', 'solar_attendance',
      'solar_payslips', 'solar_holidays', 'solar_service_tickets', 'solar_amc_contracts',
      'solar_notifications', 'solar_products', 'solar_vendors', 'solar_purchase_orders',
      'solar_boms', 'solar_sales_invoices', 'solar_warehouses', 'solar_stock_movements',
      'solar_stock_audits', 'solar_acl_config', 'solar_acl_audit_logs',
      'solar_system_settings', 'solar_workforce_locations'
    ]
  });
});

// Test custom MySQL connection
apiRouter.post('/db/test-connection', async (req: Request, res: Response) => {
  const { host, port, user, password, database } = req.body || {};
  const result = await dbManager.testConnection({
    host: host || 'localhost',
    port: Number(port) || 3306,
    user: user || 'root',
    password: password || '',
    database: database || 'solarpulse_erp'
  });
  res.json(result);
});

// Push schema and migrate all existing data
apiRouter.post('/db/migrate', async (req: Request, res: Response) => {
  const customConfig = req.body || {};
  const result = await dbManager.runFullMigration(customConfig);
  res.json(result);
});

// Download standalone SQL database dump
apiRouter.get(['/db/dump.sql', '/db/export-sql'], (_req: Request, res: Response) => {
  const dumpPath = path.join(process.cwd(), 'database.sql');
  if (fs.existsSync(dumpPath)) {
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', 'attachment; filename="solarpulse_production_mysql.sql"');
    fs.createReadStream(dumpPath).pipe(res);
  } else {
    res.status(404).json({ success: false, error: 'Database dump file not found.' });
  }
});

// ==========================================================
// 2. AUTHENTICATION APIS (MYSQL BACKED)
// ==========================================================

// Login (Employees & Customers)
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required.' });
    return;
  }

  const user = await dbManager.authenticateUser(email, password);
  if (user) {
    res.json({
      success: true,
      user,
      token: `token_${user.id}_${Date.now()}`,
      message: 'Authentication successful.'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid email or password. Please verify credentials.'
    });
  }
});

// Customer Portal Login
apiRouter.post('/auth/customer-login', async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Customer email and password required.' });
    return;
  }
  const user = await dbManager.authenticateUser(email, password);
  if (user && user.role === 'Customer') {
    res.json({
      success: true,
      user,
      token: `cust_token_${user.id}_${Date.now()}`
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid customer portal credentials.'
    });
  }
});

// Update Customer Password in MySQL
apiRouter.put('/customers/:id/password', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { password } = req.body || {};
  if (!password || String(password).trim().length < 6) {
    res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    return;
  }

  const success = await dbManager.updateCustomerPassword(id, String(password).trim());
  res.json({ success, message: 'Customer portal password updated successfully in MySQL.' });
});

// ==========================================================
// 3. CUSTOMERS MODULE API
// ==========================================================

apiRouter.get('/customers', async (_req: Request, res: Response) => {
  const customers = await dbManager.getCustomers();
  res.json({ success: true, count: customers.length, data: customers });
});

apiRouter.post('/customers', async (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || !payload.name || !payload.phone) {
    res.status(400).json({ success: false, message: 'Customer name and phone are required.' });
    return;
  }
  const newCust = {
    ...payload,
    id: payload.id || `cust-${Date.now()}`,
    customerCode: payload.customerCode || `CUST-2026-${Math.floor(100 + Math.random() * 900)}`,
    password: payload.password || '123456',
    createdAt: new Date().toISOString()
  };
  const saved = await dbManager.saveCustomer(newCust);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.put('/customers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body;
  const updated = await dbManager.saveCustomer({ ...payload, id });
  res.json({ success: true, data: updated });
});

apiRouter.delete('/customers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const items = dbManager.getFallbackItems('customers').filter(c => c.id !== id);
  dbManager.setFallbackItems('customers', items);
  res.json({ success: true, message: 'Customer deleted.' });
});

// ==========================================================
// 4. LEADS MODULE API (CRM)
// ==========================================================

apiRouter.get('/leads', async (_req: Request, res: Response) => {
  const leads = await dbManager.getLeads();
  res.json({ success: true, count: leads.length, data: leads });
});

apiRouter.post('/leads', async (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || !payload.customerName || !payload.phone) {
    res.status(400).json({ success: false, message: 'Lead customerName and phone required.' });
    return;
  }
  const newLead = {
    ...payload,
    id: payload.id || `lead-${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  const saved = await dbManager.saveLead(newLead);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.put('/leads/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body;
  const updated = await dbManager.saveLead({ ...payload, id });
  res.json({ success: true, data: updated });
});

apiRouter.delete('/leads/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const items = dbManager.getFallbackItems('leads').filter(l => l.id !== id);
  dbManager.setFallbackItems('leads', items);
  res.json({ success: true, message: 'Lead deleted.' });
});

// ==========================================================
// 5. PROJECTS MODULE API
// ==========================================================

apiRouter.get('/projects', async (_req: Request, res: Response) => {
  const projects = await dbManager.getProjects();
  res.json({ success: true, count: projects.length, data: projects });
});

apiRouter.post('/projects', async (req: Request, res: Response) => {
  const payload = req.body;
  const newProj = {
    ...payload,
    id: payload.id || `proj-${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  const saved = await dbManager.saveProject(newProj);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.put('/projects/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body;
  const updated = await dbManager.saveProject({ ...payload, id });
  res.json({ success: true, data: updated });
});

// ==========================================================
// 6. INVENTORY & SUPPLY CHAIN ERP APIS
// ==========================================================

// Products
apiRouter.get('/products', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('products');
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/products', (req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('products');
  const prod = { ...req.body, id: req.body.id || `prod-${Date.now()}` };
  items.unshift(prod);
  dbManager.setFallbackItems('products', items);
  res.status(201).json({ success: true, data: prod });
});

// Vendors
apiRouter.get('/vendors', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('vendors');
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/vendors', (req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('vendors');
  const v = { ...req.body, id: req.body.id || `ven-${Date.now()}` };
  items.unshift(v);
  dbManager.setFallbackItems('vendors', items);
  res.status(201).json({ success: true, data: v });
});

// Purchase Orders
apiRouter.get('/purchase-orders', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('purchase_orders');
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/purchase-orders', (req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('purchase_orders');
  const po = { ...req.body, id: req.body.id || `po-${Date.now()}` };
  items.unshift(po);
  dbManager.setFallbackItems('purchase_orders', items);
  res.status(201).json({ success: true, data: po });
});

// Bill of Materials (BOM)
apiRouter.get('/boms', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('boms');
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/boms', (req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('boms');
  const bom = { ...req.body, id: req.body.id || `bom-${Date.now()}` };
  items.unshift(bom);
  dbManager.setFallbackItems('boms', items);
  res.status(201).json({ success: true, data: bom });
});

// Sales Invoices (with e-Way Bill support)
apiRouter.get('/sales-invoices', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('sales_invoices');
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/sales-invoices', (req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('sales_invoices');
  const inv = { ...req.body, id: req.body.id || `inv-${Date.now()}` };
  items.unshift(inv);
  dbManager.setFallbackItems('sales_invoices', items);
  res.status(201).json({ success: true, data: inv });
});

// Warehouses
apiRouter.get('/warehouses', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('warehouses');
  res.json({ success: true, count: items.length, data: items });
});

// Stock Movements
apiRouter.get('/stock-movements', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('stock_movements');
  res.json({ success: true, count: items.length, data: items });
});

// Stock Audits
apiRouter.get('/stock-audits', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('stock_audits');
  res.json({ success: true, count: items.length, data: items });
});

// ==========================================================
// 7. HRMS MODULE APIS
// ==========================================================

apiRouter.get('/employees', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('employees');
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.get('/attendance', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('attendance');
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.get('/payslips', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('payslips');
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.get('/holidays', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('holidays');
  res.json({ success: true, count: items.length, data: items });
});

// ==========================================================
// 8. FINANCE & BILLING APIS
// ==========================================================

apiRouter.get('/payments', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('payments');
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.get('/expenses', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('expenses');
  res.json({ success: true, count: items.length, data: items });
});

// ==========================================================
// 9. SERVICE TICKETS & AMC APIS
// ==========================================================

apiRouter.get('/service-tickets', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('service_tickets');
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.get('/amc-contracts', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('amc_contracts');
  res.json({ success: true, count: items.length, data: items });
});

// ==========================================================
// 10. NOTIFICATIONS & SETTINGS APIS
// ==========================================================

apiRouter.get('/notifications', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('notifications');
  res.json({ success: true, count: items.length, data: items });
});
