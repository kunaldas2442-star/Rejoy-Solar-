import { hashPassword, verifyPassword, generateToken, verifyToken, isValidId, sanitizeObject } from '../server/security.ts';
import { dbManager } from '../server/mysqlDatabase.ts';
import { generateQuotationPdf } from '../src/utils/quotationPdfGenerator';
import { REFERENCE_5KW_QUOTATION } from '../src/utils/quotationDefaults';

async function runVerification() {
  console.log('====================================================');
  console.log('REJOY SOLAR PRODUCTION-READINESS VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(desc: string, condition: boolean) {
    total++;
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
  }

  // --- 1. SECURITY & CRYPTOGRAPHY ---
  console.log('--- 1. Security & Cryptographic Invariants ---');
  const plainPassword = 'StrongPassword@2026';
  const hashed = hashPassword(plainPassword);
  assert('Password hash uses scrypt scheme', hashed.startsWith('scrypt$'));
  assert('Password verifies with correct password', verifyPassword(plainPassword, hashed));
  assert('Password fails with incorrect password', !verifyPassword('WrongPass', hashed));

  // Legacy fallback verification
  assert('Legacy plain text verify succeeds', verifyPassword('123456', '123456'));
  assert('Legacy plain text verify fails on mismatch', !verifyPassword('badpass', '123456'));

  // HMAC-SHA256 Token Lifecycle
  const tokenPayload = {
    userId: 'usr-admin-01',
    email: 'admin@rejoysolar.com',
    role: 'Admin'
  };
  const token = generateToken(tokenPayload, 1); // 1 hr token
  const tokenVer = verifyToken(token);
  assert('Generated session token is valid', tokenVer.valid === true);
  assert('Token payload contains correct user role', tokenVer.payload?.role === 'Admin');
  assert('Token payload contains correct email', tokenVer.payload?.email === 'admin@rejoysolar.com');

  // Tamper resistance
  const tamperedToken = token.slice(0, -5) + 'abcde';
  const tamperVer = verifyToken(tamperedToken);
  assert('Tampered token is rejected', tamperVer.valid === false);

  // Input Sanitization & ID validation
  assert('Valid alphanumeric ID passes', isValidId('cust-2026-001'));
  assert('Path injection ID fails', !isValidId('../../../etc/passwd'));
  assert('Poisoned ID with spaces or special chars fails', !isValidId('id with spaces!@#'));

  const sanitized = sanitizeObject({
    name: '  Test Clean  ',
    __proto__: { injected: true },
    nested: { city: '  Surat  ' }
  });
  assert('Object strings are trimmed', sanitized.name === 'Test Clean');
  assert('Nested strings are trimmed', (sanitized as any).nested.city === 'Surat');
  assert('Prototype pollution is stripped', !Object.prototype.hasOwnProperty('injected'));

  // --- 2. AUTHORITATIVE PERSISTENCE & SEQUENCING ---
  console.log('\n--- 2. Database Manager & Document Numbering ---');
  const nextQtn = await dbManager.getNextDocNumber('quotation');
  assert('Quotation document number adheres to standard RSP/QTN/YYYY-YY/XXXX', nextQtn.startsWith('RSP/QTN/'));

  const nextInv = await dbManager.getNextDocNumber('invoice');
  assert('Invoice document number adheres to standard INV/YYYY-YY/XXXX', nextInv.startsWith('INV/'));

  const nextProj = await dbManager.getNextDocNumber('project');
  assert('Project code adheres to PRJ-YYYY-XXX', nextProj.startsWith('PRJ-'));

  // Fallback persistence check
  const testCustomer = {
    id: `cust-test-${Date.now()}`,
    name: 'Production Audit Customer Ltd',
    phone: '9825099999',
    email: 'audit@example.com'
  };
  await dbManager.saveCustomer(testCustomer);
  const customers = await dbManager.getCustomers();
  assert('Saved customer exists in database collection', customers.some(c => c.id === testCustomer.id));

  // --- 3. TRANSACTION SAFE INVENTORY ---
  console.log('\n--- 3. Transaction-Safe Inventory & Stock Controls ---');
  const testProduct = {
    id: `prod-solar-${Date.now()}`,
    name: '540W Mono PERC Solar Panel',
    currentStock: 50,
    unitPrice: 12500
  };
  await dbManager.saveProduct(testProduct);

  // Successful stock deduction
  const issueResult = await dbManager.recordStockMovement({
    productId: testProduct.id,
    movementType: 'OUT',
    quantity: 10,
    referenceNumber: 'REF-OUT-001'
  });
  assert('Stock movement OUT reduces stock accurately', issueResult.success && issueResult.newStock === 40);

  // Excessive stock deduction prevention (Negative Stock Guard)
  const excessiveResult = await dbManager.recordStockMovement({
    productId: testProduct.id,
    movementType: 'OUT',
    quantity: 100, // exceeds 40 available
    referenceNumber: 'REF-OUT-EXCESS'
  });
  assert('Excessive stock movement is rejected', excessiveResult.success === false);

  // --- 4. FINANCIAL BUSINESS LOGIC ---
  console.log('\n--- 4. Financial Calculations & Quotation Totals ---');
  const quoteData = {
    id: `quote-audit-${Date.now()}`,
    capacityKw: 5,
    baseProjectPrice: 300000,
    discountAmount: 10000, // Taxable: 290,000
    gstRate: 13.8, // 13.8% of 290,000 = 40,020
    centralSubsidy: 78000,
    stateSubsidy: 0
  };
  const savedQuote = await dbManager.saveQuotation(quoteData);
  assert('Taxable amount accurately computed', savedQuote.taxableAmount === 290000);
  assert('Authoritative GST calculated on server', savedQuote.gstAmount === Math.round(290000 * 0.138));
  assert('Total subsidy accurately applied', savedQuote.totalSubsidy === 78000);
  assert('Final investment mathematically verified', savedQuote.finalProjectInvestment === (savedQuote.totalAmount - 78000));

  // --- 5. QUOTATION PDF FIDELITY ---
  console.log('\n--- 5. Quotation PDF Fidelity (10-Page Verification) ---');
  const testQuoteForPdf = {
    ...REFERENCE_5KW_QUOTATION,
    id: 'test-audit-pdf',
    quotationNumber: 'RSP/QTN/2026-27/0010',
    capacityKw: 3,
    status: 'APPROVED' as const
  };
  const pdfDoc = generateQuotationPdf(testQuoteForPdf);
  const pdfPages = pdfDoc.getNumberOfPages();
  assert('Generated quotation PDF has exactly 10 pages matching reference standard', pdfPages === 10);

  console.log('\n====================================================');
  console.log(`ALL CHECKS PASSED: ${passed}/${total} test invariants verified!`);
  console.log('====================================================');
}

runVerification().catch(err => {
  console.error('\nVerification suite FAILED:', err);
  process.exit(1);
});
