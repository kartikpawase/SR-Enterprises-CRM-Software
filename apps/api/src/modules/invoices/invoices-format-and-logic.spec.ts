import { describe, it, expect, beforeAll } from 'vitest';
import { salesRepository } from '../sales/sales.repository';
import { invoicesRepository } from './invoices.repository';
import { customerRepository } from '../customers/customer.repository';
import { servicesRepository } from '../services/services.repository';
import { ensureDatabaseInitialized, db } from '../../database/client';
import { invoices, invoiceItems } from '../../database/schema/invoices';
import { eq } from 'drizzle-orm';
import { CreateInvoiceSchema, CreateSaleSchema } from '@crm/validation';
import { execSync } from 'child_process';

describe('SR Enterprises CRM Invoice Format + End-to-End Logic Tests', () => {
  let testCustomerId: string;
  let testCustomer: any;

  beforeAll(async () => {
    await ensureDatabaseInitialized();

    testCustomer = await customerRepository.create({
      fullName: 'Kartik Pawase',
      phone: `97660${Math.floor(10000 + Math.random() * 90000)}`,
      email: `kartik.${Date.now()}@example.com`,
      customerType: 'INDIVIDUAL',
      billingAddress: {
        addressLine1: 'Shop A6 SaiPritam Nagari, Chatrapati Chowk Rahatani',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411017',
      },
    });

    testCustomerId = testCustomer.id;
  });

  // TEST 1 — NEW INVOICE
  it('TEST 1: creates a new invoice with MMYY251 format', async () => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const expectedPrefix = `${mm}${yy}`;

    const inv = await invoicesRepository.createInvoice({
      customerId: testCustomerId,
      items: [
        {
          name: 'livpure',
          quantity: 1,
          unitPrice: 16500,
        },
      ],
      poNumber: 'PO-2026-001',
      notes: '1 Years Warranty On Ele Spears 1 Service Free',
    });

    expect(inv).toBeDefined();
    expect(inv.invoiceNumber).toBeDefined();
    expect(inv.invoiceNumber).toMatch(new RegExp(`^${expectedPrefix}\\d{3,}$`));
    const serial = parseInt(inv.invoiceNumber.slice(4), 10);
    expect(serial).toBeGreaterThanOrEqual(251);
  });

  // TEST 2 — SECOND INVOICE
  it('TEST 2: creates second invoice with incrementing sequence and no collision', async () => {
    const inv1 = await invoicesRepository.createInvoice({
      customerId: testCustomerId,
      items: [{ name: 'PreFilter Bowl Housing', quantity: 1, unitPrice: 650 }],
    });

    const inv2 = await invoicesRepository.createInvoice({
      customerId: testCustomerId,
      items: [{ name: 'SF PreFilter', quantity: 2, unitPrice: 150 }],
    });

    expect(inv1.invoiceNumber).not.toEqual(inv2.invoiceNumber);
    const serial1 = parseInt(inv1.invoiceNumber.slice(4), 10);
    const serial2 = parseInt(inv2.invoiceNumber.slice(4), 10);
    expect(serial2).toBe(serial1 + 1);
  });

  // TEST 3 — PO NUMBER PERSISTENCE
  it('TEST 3: manually entered PO Number persists and displays correctly', async () => {
    const testPo = 'PO-SR-2026-ALPHA';
    const inv = await invoicesRepository.createInvoice({
      customerId: testCustomerId,
      items: [{ name: '25LPH RO Plant', quantity: 1, unitPrice: 16500 }],
      poNumber: testPo,
    });

    const fetched = await invoicesRepository.findById(inv.id);
    expect(fetched?.poNumber).toBe(testPo);
  });

  // TEST 4 — BLANK PO NUMBER
  it('TEST 4: invoice with blank PO Number saves cleanly without error', async () => {
    const inv = await invoicesRepository.createInvoice({
      customerId: testCustomerId,
      items: [{ name: 'RO Membrane 80 GPD', quantity: 1, unitPrice: 1800 }],
      poNumber: '',
    });

    expect(inv).toBeDefined();
    const fetched = await invoicesRepository.findById(inv.id);
    expect(fetched?.poNumber == null || fetched?.poNumber === '').toBe(true);
  });

  // TEST 5 — NOTE FROM SALE PROPAGATION
  it('TEST 5: note entered in Sale propagates correctly into linked Invoice', async () => {
    const saleNote = '1 Years Warranty On Ele Spears 1 Service Free';
    const salePo = 'PO-SALE-789';

    const sale = await salesRepository.createSale({
      customerId: testCustomerId,
      status: 'COMPLETED',
      poNumber: salePo,
      notes: saleNote,
      items: [
        {
          productName: 'Livpure RO Machine',
          productType: 'RO_MACHINE',
          quantity: 1,
          unitPrice: 16500,
        },
      ],
    });

    expect(sale).toBeDefined();
    expect(sale?.invoice).toBeDefined();

    const inv = await invoicesRepository.findById(sale!.invoice!.id);
    expect(inv?.notes).toBe(saleNote);
    expect(inv?.poNumber).toBe(salePo);
  });

  // TEST 6 — NOTE FROM SERVICE PROPAGATION
  it('TEST 6: service completion propagates notes and poNumber into invoice', async () => {
    const createdService = await servicesRepository.createService({
      customerId: testCustomerId,
      serviceType: 'REPAIR',
      priority: 'HIGH',
      description: 'Filter replacement and membrane check',
      scheduledDate: new Date().toISOString().split('T')[0],
    });

    const completed = await servicesRepository.completeService(createdService.service.id, {
      workPerformed: 'Replaced sediment filter and carbon block',
      laborCharges: 500,
      partsCharges: 1200,
      totalCharges: 1700,
      notes: 'Customer given 6 months warranty on replaced filters',
      poNumber: 'PO-SRV-4421',
    } as any);

    expect(completed).toBeDefined();
    const [inv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.serviceId, createdService.service.id));

    expect(inv).toBeDefined();
    expect(inv.notes).toBe('Customer given 6 months warranty on replaced filters');
    expect(inv.poNumber).toBe('PO-SRV-4421');
  });

  // TEST 7 — EDIT NOTE
  it('TEST 7: editing the invoice note updates and persists cleanly', async () => {
    const inv = await invoicesRepository.createInvoice({
      customerId: testCustomerId,
      items: [{ name: 'Booster Pump 100 GPD', quantity: 1, unitPrice: 2200 }],
      notes: 'Initial Note',
    });

    const updatedNote = 'Updated: 2 Years Extended Warranty';
    await invoicesRepository.updateDraft(inv.id, {
      notes: updatedNote,
    });

    const fetched = await invoicesRepository.findById(inv.id);
    expect(fetched?.notes).toBe(updatedNote);
  });

  // TEST 8 — 10 ROWS CALCULATION ACCURACY
  it('TEST 8: invoices with fewer than 10 items calculate totals only from actual items', async () => {
    const inv = await invoicesRepository.createInvoice({
      customerId: testCustomerId,
      items: [
        { name: 'Item 1', quantity: 2, unitPrice: 500, taxRatePercent: 0 },
        { name: 'Item 2', quantity: 1, unitPrice: 1000, taxRatePercent: 0 },
      ],
    });

    expect(Number(inv.totalAmount)).toBe(2000);
    const fetched = await invoicesRepository.findById(inv.id);
    expect(fetched?.items.length).toBe(2);
  });

  // TEST 9 — MAXIMUM 10 ROWS LIMIT
  it('TEST 9: rejects creation of an 11th item via validation schemas', () => {
    const elevenItems = Array.from({ length: 11 }).map((_, i) => ({
      name: `Product ${i + 1}`,
      quantity: 1,
      unitPrice: 100,
    }));

    const invoiceValidation = CreateInvoiceSchema.safeParse({
      customerId: testCustomerId,
      items: elevenItems,
    });
    expect(invoiceValidation.success).toBe(false);

    const saleValidation = CreateSaleSchema.safeParse({
      customerId: testCustomerId,
      items: elevenItems.map((it) => ({
        productName: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
    });
    expect(saleValidation.success).toBe(false);
  });

  // TEST 10 — HISTORICAL INVOICE IMMUTABILITY
  it('TEST 10: editing invoice metadata does not alter historical invoice number', async () => {
    const inv = await invoicesRepository.createInvoice({
      customerId: testCustomerId,
      items: [{ name: 'Standard Service Kit', quantity: 1, unitPrice: 850 }],
      poNumber: 'OLD-PO-001',
    });

    const originalNumber = inv.invoiceNumber;

    // Update note and PO Number
    await invoicesRepository.updateDraft(inv.id, {
      poNumber: 'UPDATED-PO-002',
      notes: 'Updated warranty note',
    });

    const refetched = await invoicesRepository.findById(inv.id);
    expect(refetched?.invoiceNumber).toBe(originalNumber);
    expect(refetched?.poNumber).toBe('UPDATED-PO-002');
  });

  // TEST 11 — PDF GENERATION VERIFICATION
  it('TEST 11: PDF generation verifies single INVOICE badge, no SUPPLY, no Due Date, and PO Number in its place', () => {
    const phpCommand = `php -r '
      require_once "scripts/mailer/PdfInvoiceGenerator.php";
      $data = [
        "invoiceNumber" => "0926251",
        "invoiceDate" => "05/09/2026",
        "poNumber" => "PO-VERIFY-123",
        "customer" => [
          "fullName" => "Kartik Pawase",
          "phone" => "8432708662",
        ],
        "items" => [
          ["nameSnapshot" => "livpure", "quantity" => 1, "unitPriceSnapshot" => "16500", "lineTotal" => "16500"]
        ],
        "totalAmount" => 16500,
        "paidAmount" => 0,
        "outstandingAmount" => 16500,
        "notes" => "1 Years Warranty On Ele Spears 1 Service Free",
      ];
      $html = SREnterprises\\Mailer\\PdfInvoiceGenerator::renderOfficialDocumentHtml($data);
      $checks = [
        "has_invoice_badge" => strpos($html, "INVOICE") !== false,
        "no_bill_of_supply" => strpos($html, "BILL OF SUPPLY") === false,
        "no_original_for_recipient" => strpos($html, "ORIGINAL FOR RECIPIENT") === false,
        "no_supply_section" => strpos($html, "Supply:") === false,
        "no_due_date" => strpos($html, "Due Date") === false,
        "has_po_number" => strpos($html, "PO-VERIFY-123") !== false,
        "has_notes" => strpos($html, "1 Years Warranty On Ele Spears 1 Service Free") !== false,
        "has_bank_details" => stripos($html, "Bank Details") !== false,
        "has_au_bank" => stripos($html, "AU Small Finance Bank") !== false,
        "has_account_no" => stripos($html, "2602245912923632") !== false,
        "has_ifsc" => stripos($html, "AUBL0002459") !== false,
        "has_payment_qr" => stripos($html, "Payment QR Code") !== false,
        "has_upi_id" => stripos($html, "srenterprises6711@aubank") !== false,
        "has_terms" => stripos($html, "Terms and Conditions") !== false,
        "has_signatory" => stripos($html, "Authorised Signatory") !== false,
      ];
      echo json_encode($checks);
    '`;

    const rawOutput = execSync(phpCommand, {
      cwd: '/home/kartik/Desktop/SR-Enterprises-CRM-Software (Copy)',
    }).toString();

    const results = JSON.parse(rawOutput);
    expect(results.has_invoice_badge).toBe(true);
    expect(results.no_bill_of_supply).toBe(true);
    expect(results.no_original_for_recipient).toBe(true);
    expect(results.no_supply_section).toBe(true);
    expect(results.no_due_date).toBe(true);
    expect(results.has_po_number).toBe(true);
    expect(results.has_notes).toBe(true);
    expect(results.has_bank_details).toBe(true);
    expect(results.has_au_bank).toBe(true);
    expect(results.has_account_no).toBe(true);
    expect(results.has_ifsc).toBe(true);
    expect(results.has_payment_qr).toBe(true);
    expect(results.has_upi_id).toBe(true);
    expect(results.has_terms).toBe(true);
    expect(results.has_signatory).toBe(true);
  });

  // TEST 12 — REGRESSION VERIFICATION
  it('TEST 12: unrelated CRM sections remain functional and uncorrupted', async () => {
    const cust = await customerRepository.findById(testCustomerId);
    expect(cust).toBeDefined();
    expect(cust?.fullName).toBe('Kartik Pawase');
  });
});
