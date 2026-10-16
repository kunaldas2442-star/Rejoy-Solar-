import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { dbManager } from '../mysqlDatabase.ts';
import {
  generateToken,
  authenticateToken,
  optionalAuthenticate,
  requireRoles,
  rateLimiter,
  revokeToken,
  extractToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
  hashPassword,
  isValidId,
  sanitizeObject
} from '../security.ts';

export const apiRouter = express.Router();

// Initialize DB Manager
dbManager.init().catch(err => {
  console.warn('[DB Manager] Startup notice:', err);
});

// Seed in-memory fallback from server/fallbackData.json if available
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

// Document Numbering Sequencer
apiRouter.get('/doc-numbers/next', async (req: Request, res: Response) => {
  const type = (req.query.type as any) || 'quotation';
  const nextNum = await dbManager.getNextDocNumber(type);
  res.json({ success: true, type, nextNumber: nextNum });
});

// ==========================================================
// 2. AUTHENTICATION & SECURITY APIS (MYSQL + JWT SESSIONS)
// ==========================================================

// Login Rate Limiter: max 15 attempts per 15 minutes
const loginRateLimiter = rateLimiter({ maxRequests: 15, windowMs: 15 * 60 * 1000 });

// Universal Login (Employees & Admins)
apiRouter.post('/auth/login', loginRateLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required.' });
    return;
  }

  const user = await dbManager.authenticateUser(String(email).trim(), String(password).trim());
  if (user) {
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      employeeId: user.employeeId,
      customerId: user.customerId
    }, 24);

    res.json({
      success: true,
      user,
      token,
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
apiRouter.post('/auth/customer-login', loginRateLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Customer email and password required.' });
    return;
  }
  const user = await dbManager.authenticateUser(String(email).trim(), String(password).trim());
  if (user && user.role === 'Customer') {
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: 'Customer',
      customerId: user.customerId
    }, 24);

    res.json({
      success: true,
      user,
      token
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid customer portal credentials.'
    });
  }
});

// Current User Profile Verification
apiRouter.get('/auth/me', authenticateToken, async (req: Request, res: Response) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Logout & Session Revocation
apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const token = extractToken(req);
  if (token) {
    revokeToken(token);
  }
  res.json({ success: true, message: 'Session logged out and token invalidated.' });
});

// Request Password Reset
apiRouter.post('/auth/forgot-password', rateLimiter({ maxRequests: 5, windowMs: 15 * 60 * 1000 }), async (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    res.status(400).json({ success: false, message: 'Valid email address required.' });
    return;
  }

  // Non-enumerating response
  const token = createPasswordResetToken(email);
  res.json({
    success: true,
    message: 'If the email address exists in the ERP directory, password reset instructions have been generated.',
    resetToken: process.env.NODE_ENV !== 'production' ? token : undefined
  });
});

// Confirm Password Reset
apiRouter.post('/auth/reset-password', async (req: Request, res: Response) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword || String(newPassword).length < 6) {
    res.status(400).json({ success: false, message: 'Valid reset token and password (min 6 chars) required.' });
    return;
  }

  const result = verifyPasswordResetToken(token);
  if (!result.valid || !result.email) {
    res.status(400).json({ success: false, message: result.error || 'Invalid or expired reset token.' });
    return;
  }

  const cleanPass = String(newPassword).trim();
  const hashed = hashPassword(cleanPass);
  
  // Update in customers and users
  await dbManager.query('UPDATE `solar_users` SET `password` = ? WHERE LOWER(email) = ?', [hashed, result.email]);
  await dbManager.query('UPDATE `solar_customers` SET `password` = ? WHERE LOWER(email) = ?', [hashed, result.email]);

  res.json({ success: true, message: 'Password has been successfully updated. You may now log in.' });
});

// Update Customer Password in MySQL
apiRouter.put('/customers/:id/password', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { password } = req.body || {};

  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid customer identifier.' });
    return;
  }

  if (!password || String(password).trim().length < 6) {
    res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    return;
  }

  // IDOR protection: if user is authenticated as customer, can only update own password
  if (req.user && req.user.role === 'Customer' && req.user.customerId !== id && req.user.userId !== id) {
    res.status(403).json({ success: false, message: 'Unauthorized to change another customer account password.' });
    return;
  }

  const success = await dbManager.updateCustomerPassword(id, String(password).trim());
  res.json({ success, message: 'Customer portal password updated successfully.' });
});

// ==========================================================
// 3. CUSTOMERS MODULE API
// ==========================================================

apiRouter.get('/customers', async (_req: Request, res: Response) => {
  const customers = await dbManager.getCustomers();
  res.json({ success: true, count: customers.length, data: customers });
});

apiRouter.post('/customers', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  if (!payload || !payload.name || !payload.phone) {
    res.status(400).json({ success: false, message: 'Customer name and phone are required.' });
    return;
  }

  const nextCode = await dbManager.getNextDocNumber('customer');
  const newCust = {
    ...payload,
    id: payload.id && isValidId(payload.id) ? payload.id : `cust-${Date.now()}`,
    customerCode: payload.customerCode || nextCode,
    password: payload.password || '123456',
    createdAt: new Date().toISOString()
  };
  const saved = await dbManager.saveCustomer(newCust);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.put('/customers/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid customer ID.' });
    return;
  }
  const payload = sanitizeObject(req.body);
  const updated = await dbManager.saveCustomer({ ...payload, id });
  res.json({ success: true, data: updated });
});

apiRouter.delete('/customers/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid customer ID.' });
    return;
  }
  if (req.user && req.user.role !== 'Admin') {
    res.status(403).json({ success: false, message: 'Only administrators can delete master customer records.' });
    return;
  }
  await dbManager.deleteCustomer(id);
  res.json({ success: true, message: 'Customer deleted.' });
});

// ==========================================================
// 4. LEADS MODULE API (CRM)
// ==========================================================

apiRouter.get('/leads', async (_req: Request, res: Response) => {
  const leads = await dbManager.getLeads();
  res.json({ success: true, count: leads.length, data: leads });
});

apiRouter.post('/leads', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  if (!payload || !payload.customerName || !payload.phone) {
    res.status(400).json({ success: false, message: 'Lead customerName and phone required.' });
    return;
  }
  const newLead = {
    ...payload,
    id: payload.id && isValidId(payload.id) ? payload.id : `lead-${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  const saved = await dbManager.saveLead(newLead);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.put('/leads/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid lead ID.' });
    return;
  }
  const payload = sanitizeObject(req.body);
  const updated = await dbManager.saveLead({ ...payload, id });
  res.json({ success: true, data: updated });
});

apiRouter.delete('/leads/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid lead ID.' });
    return;
  }
  if (req.user && req.user.role !== 'Admin') {
    res.status(403).json({ success: false, message: 'Only administrators can delete lead records.' });
    return;
  }
  await dbManager.deleteLead(id);
  res.json({ success: true, message: 'Lead deleted.' });
});

// ==========================================================
// 5. PROJECTS MODULE API
// ==========================================================

apiRouter.get('/projects', async (_req: Request, res: Response) => {
  const projects = await dbManager.getProjects();
  res.json({ success: true, count: projects.length, data: projects });
});

apiRouter.post('/projects', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const nextCode = await dbManager.getNextDocNumber('project');
  const newProj = {
    ...payload,
    id: payload.id && isValidId(payload.id) ? payload.id : `proj-${Date.now()}`,
    projectCode: payload.projectCode || nextCode,
    createdAt: new Date().toISOString()
  };
  const saved = await dbManager.saveProject(newProj);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.put('/projects/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid project ID.' });
    return;
  }
  const payload = sanitizeObject(req.body);
  const updated = await dbManager.saveProject({ ...payload, id });
  res.json({ success: true, data: updated });
});

apiRouter.delete('/projects/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid project ID.' });
    return;
  }
  if (req.user && req.user.role !== 'Admin') {
    res.status(403).json({ success: false, message: 'Only administrators can delete project records.' });
    return;
  }
  await dbManager.deleteProject(id);
  res.json({ success: true, message: 'Project deleted.' });
});

// ==========================================================
// 6. QUOTATIONS MODULE API
// ==========================================================

apiRouter.get('/quotations', async (_req: Request, res: Response) => {
  const quotes = await dbManager.getQuotations();
  res.json({ success: true, count: quotes.length, data: quotes });
});

apiRouter.post('/quotations', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const nextNum = await dbManager.getNextDocNumber('quotation');
  const newQuote = {
    ...payload,
    id: payload.id && isValidId(payload.id) ? payload.id : `qtn-${Date.now()}`,
    quotationNumber: payload.quotationNumber || payload.quoteNumber || nextNum,
    createdAt: new Date().toISOString()
  };
  const saved = await dbManager.saveQuotation(newQuote);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.put('/quotations/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid quotation ID.' });
    return;
  }
  const payload = sanitizeObject(req.body);
  const updated = await dbManager.saveQuotation({ ...payload, id });
  res.json({ success: true, data: updated });
});

apiRouter.delete('/quotations/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid quotation ID.' });
    return;
  }
  await dbManager.deleteQuotation(id);
  res.json({ success: true, message: 'Quotation deleted.' });
});

// ==========================================================
// 7. INVENTORY, PRODUCTS & STOCK MOVEMENTS (TRANSACTION SAFE)
// ==========================================================

apiRouter.get('/products', async (_req: Request, res: Response) => {
  const items = await dbManager.getProducts();
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/products', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const prod = { ...payload, id: payload.id && isValidId(payload.id) ? payload.id : `prod-${Date.now()}` };
  const saved = await dbManager.saveProduct(prod);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.put('/products/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = sanitizeObject(req.body);
  const saved = await dbManager.saveProduct({ ...payload, id });
  res.json({ success: true, data: saved });
});

apiRouter.delete('/products/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid product ID.' });
    return;
  }
  await dbManager.deleteProduct(id);
  res.json({ success: true, message: 'Product deleted.' });
});

// Atomic Stock Movement
apiRouter.post('/stock-movements', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const movement = {
    ...payload,
    id: payload.id && isValidId(payload.id) ? payload.id : `sm-${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  const result = await dbManager.recordStockMovement(movement);
  if (result.success) {
    res.status(201).json({ success: true, data: result.movement, newStock: result.newStock });
  } else {
    res.status(400).json({ success: false, error: result.error || 'Failed to record stock movement.' });
  }
});

apiRouter.get('/stock-movements', async (_req: Request, res: Response) => {
  const items = await dbManager.getStockMovements();
  res.json({ success: true, count: items.length, data: items });
});

// Vendors
apiRouter.get('/vendors', async (_req: Request, res: Response) => {
  const items = await dbManager.getVendors();
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/vendors', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const v = { ...payload, id: payload.id && isValidId(payload.id) ? payload.id : `ven-${Date.now()}` };
  const saved = await dbManager.saveVendor(v);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.put('/vendors/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid vendor ID.' });
    return;
  }
  const payload = sanitizeObject(req.body);
  const updated = await dbManager.saveVendor({ ...payload, id });
  res.json({ success: true, data: updated });
});

apiRouter.delete('/vendors/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid vendor ID.' });
    return;
  }
  await dbManager.deleteVendor(id);
  res.json({ success: true, message: 'Vendor record deleted.' });
});

// Purchase Orders
apiRouter.get('/purchase-orders', async (_req: Request, res: Response) => {
  const items = await dbManager.getPurchaseOrders();
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/purchase-orders', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const nextNum = await dbManager.getNextDocNumber('po');
  const po = {
    ...payload,
    id: payload.id && isValidId(payload.id) ? payload.id : `po-${Date.now()}`,
    poNumber: payload.poNumber || nextNum
  };
  const saved = await dbManager.savePurchaseOrder(po);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.put('/purchase-orders/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid PO ID.' });
    return;
  }
  const payload = sanitizeObject(req.body);
  const updated = await dbManager.savePurchaseOrder({ ...payload, id });
  res.json({ success: true, data: updated });
});

apiRouter.delete('/purchase-orders/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid PO ID.' });
    return;
  }
  await dbManager.deletePurchaseOrder(id);
  res.json({ success: true, message: 'Purchase order deleted.' });
});

// Sales Invoices
apiRouter.get('/sales-invoices', async (_req: Request, res: Response) => {
  const items = await dbManager.getSalesInvoices();
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/sales-invoices', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const nextNum = await dbManager.getNextDocNumber('invoice');
  const inv = {
    ...payload,
    id: payload.id && isValidId(payload.id) ? payload.id : `inv-${Date.now()}`,
    invoiceNumber: payload.invoiceNumber || nextNum
  };
  const saved = await dbManager.saveSalesInvoice(inv);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.put('/sales-invoices/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid invoice ID.' });
    return;
  }
  const payload = sanitizeObject(req.body);
  const updated = await dbManager.saveSalesInvoice({ ...payload, id });
  res.json({ success: true, data: updated });
});

apiRouter.delete('/sales-invoices/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid invoice ID.' });
    return;
  }
  await dbManager.deleteSalesInvoice(id);
  res.json({ success: true, message: 'Sales invoice deleted.' });
});

// Warehouses
apiRouter.get('/warehouses', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('warehouses');
  res.json({ success: true, count: items.length, data: items });
});

// Bill of Materials (BOM)
apiRouter.get('/boms', async (_req: Request, res: Response) => {
  const items = await dbManager.getBOMs();
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/boms', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const saved = await dbManager.saveBOM(payload);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.delete('/boms/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  await dbManager.deleteBOM(id);
  res.json({ success: true, message: 'BOM deleted.' });
});

// Site Surveys
apiRouter.get('/surveys', async (_req: Request, res: Response) => {
  const items = await dbManager.getSurveys();
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/surveys', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const saved = await dbManager.saveSurvey(payload);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.delete('/surveys/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  await dbManager.deleteSurvey(id);
  res.json({ success: true, message: 'Survey deleted.' });
});

// ==========================================================
// 8. FINANCE & BILLING APIS
// ==========================================================

apiRouter.get('/payments', async (_req: Request, res: Response) => {
  const items = await dbManager.getPayments();
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/payments', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const pay = { ...payload, id: payload.id && isValidId(payload.id) ? payload.id : `pay-${Date.now()}` };
  const saved = await dbManager.savePayment(pay);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.delete('/payments/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid payment ID.' });
    return;
  }
  await dbManager.deletePayment(id);
  res.json({ success: true, message: 'Payment record deleted.' });
});

apiRouter.get('/expenses', async (_req: Request, res: Response) => {
  const items = await dbManager.getExpenses();
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/expenses', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const exp = { ...payload, id: payload.id && isValidId(payload.id) ? payload.id : `exp-${Date.now()}` };
  const saved = await dbManager.saveExpense(exp);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.delete('/expenses/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid expense ID.' });
    return;
  }
  await dbManager.deleteExpense(id);
  res.json({ success: true, message: 'Expense record deleted.' });
});

// ==========================================================
// 9. HRMS MODULE APIS
// ==========================================================

apiRouter.get('/employees', async (_req: Request, res: Response) => {
  const items = await dbManager.getEmployees();
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/employees', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const emp = { ...payload, id: payload.id && isValidId(payload.id) ? payload.id : `emp-${Date.now()}` };
  const saved = await dbManager.saveEmployee(emp);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.put('/employees/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid employee ID.' });
    return;
  }
  const payload = sanitizeObject(req.body);
  const updated = await dbManager.saveEmployee({ ...payload, id });
  res.json({ success: true, data: updated });
});

apiRouter.delete('/employees/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid employee ID.' });
    return;
  }
  await dbManager.deleteEmployee(id);
  res.json({ success: true, message: 'Employee record deleted.' });
});

apiRouter.get('/attendance', async (_req: Request, res: Response) => {
  const items = await dbManager.getAttendance();
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/attendance', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const att = { ...payload, id: payload.id && isValidId(payload.id) ? payload.id : `att-${Date.now()}` };
  const saved = await dbManager.saveAttendance(att);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.delete('/attendance/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid attendance ID.' });
    return;
  }
  await dbManager.deleteAttendance(id);
  res.json({ success: true, message: 'Attendance record deleted.' });
});

apiRouter.get('/payslips', async (_req: Request, res: Response) => {
  const items = await dbManager.getPayslips();
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/payslips', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const slip = { ...payload, id: payload.id && isValidId(payload.id) ? payload.id : `slip-${Date.now()}` };
  const saved = await dbManager.savePayslip(slip);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.delete('/payslips/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid payslip ID.' });
    return;
  }
  await dbManager.deletePayslip(id);
  res.json({ success: true, message: 'Payslip deleted.' });
});

apiRouter.get('/holidays', (_req: Request, res: Response) => {
  const items = dbManager.getFallbackItems('holidays');
  res.json({ success: true, count: items.length, data: items });
});

// ==========================================================
// 10. SERVICE TICKETS & AMC APIS
// ==========================================================

apiRouter.get('/service-tickets', async (_req: Request, res: Response) => {
  const items = await dbManager.getServiceTickets();
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/service-tickets', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const ticket = { ...payload, id: payload.id && isValidId(payload.id) ? payload.id : `tkt-${Date.now()}` };
  const saved = await dbManager.saveServiceTicket(ticket);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.delete('/service-tickets/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid ticket ID.' });
    return;
  }
  await dbManager.deleteServiceTicket(id);
  res.json({ success: true, message: 'Service ticket deleted.' });
});

apiRouter.get('/amc-contracts', async (_req: Request, res: Response) => {
  const items = await dbManager.getAmcContracts();
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/amc-contracts', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const contract = { ...payload, id: payload.id && isValidId(payload.id) ? payload.id : `amc-${Date.now()}` };
  const saved = await dbManager.saveAmcContract(contract);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.delete('/amc-contracts/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: 'Invalid contract ID.' });
    return;
  }
  await dbManager.deleteAmcContract(id);
  res.json({ success: true, message: 'AMC contract deleted.' });
});

// ==========================================================
// 11. NOTIFICATIONS & SETTINGS APIS
// ==========================================================

apiRouter.get('/notifications', async (_req: Request, res: Response) => {
  const items = await dbManager.getNotifications();
  res.json({ success: true, count: items.length, data: items });
});

apiRouter.post('/notifications', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const n = { ...payload, id: payload.id || `notif-${Date.now()}` };
  const saved = await dbManager.saveNotification(n);
  res.status(201).json({ success: true, data: saved });
});

apiRouter.get('/settings', async (_req: Request, res: Response) => {
  const settings = await dbManager.getSettings();
  res.json({ success: true, data: settings });
});

apiRouter.post('/settings', optionalAuthenticate, async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body);
  const saved = await dbManager.saveSettings(payload);
  res.json({ success: true, data: saved });
});
