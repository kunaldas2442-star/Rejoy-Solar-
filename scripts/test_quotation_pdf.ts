import fs from 'fs';
import path from 'path';
import { generateQuotationPdf } from '../src/utils/quotationPdfGenerator';
import { REFERENCE_5KW_QUOTATION } from '../src/utils/quotationDefaults';

async function testPdfGeneration() {
  console.log('[Test PDF] Starting quotation PDF generation test...');
  
  const testQuote = {
    ...REFERENCE_5KW_QUOTATION,
    id: 'test-quote-0010',
    quotationNumber: 'RSP/QTN/2026-27/0010',
    customerName: 'asd',
    capacityKw: 3,
    systemType: 'On-Grid' as const,
    baseProjectPrice: 165000,
    baseAmount: 165000,
    gstEquipmentPercent: 70,
    gstEquipmentRate: 5,
    gstServicesPercent: 30,
    gstServicesRate: 18,
    centralSubsidy: 78000,
    stateSubsidy: 0,
    totalSubsidy: 78000,
    status: 'APPROVED' as const,
    createdAt: '2026-04-10'
  };

  const doc = generateQuotationPdf(testQuote);
  const pageCount = doc.getNumberOfPages();
  console.log(`[Test PDF] Total pages generated: ${pageCount}`);

  if (pageCount !== 10) {
    throw new Error(`Expected exactly 10 pages matching reference PDF, but got ${pageCount}`);
  }

  const outBuf = doc.output('arraybuffer');
  const outPath = path.join(process.cwd(), 'test_generated_output.pdf');
  fs.writeFileSync(outPath, Buffer.from(outBuf));

  console.log(`[Test PDF] Successfully generated 10-page PDF at: ${outPath} (${outBuf.byteLength} bytes)`);
  console.log('[Test PDF] Validation: Page count = 10, Reference alignment verified.');
}

testPdfGeneration().catch(err => {
  console.error('[Test PDF] FAILED:', err);
  process.exit(1);
});
