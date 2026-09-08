<?php
/**
 * SR Enterprises CRM - Official Invoice & Receipt PDF Generator
 * 
 * Generates the EXACT official SR Enterprises Bill of Supply / Receipt template
 * on STRICTLY 1 SINGLE PAGE with pixel-perfect visual fidelity to the reference.
 */

namespace SREnterprises\Mailer;

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/assets/lower_section_b64.php';

use Dompdf\Dompdf;
use Dompdf\Options;

class PdfInvoiceGenerator {
    /**
     * Generate an Official Receipt / Bill of Supply PDF file on disk
     * 
     * @param array $receiptData Real persisted payment record + invoice + line items + customer info
     * @return array ['success' => bool, 'filePath' => string, 'filename' => string, 'error' => string|null]
     */
    public static function generateReceiptPdf(array $receiptData): array {
        return self::generateDocumentPdf($receiptData, 'Receipt');
    }

    /**
     * Generate an Official Invoice / Bill of Supply PDF file on disk
     * 
     * @param array $invoiceData Real persisted invoice record + line items + customer info
     * @return array ['success' => bool, 'filePath' => string, 'filename' => string, 'error' => string|null]
     */
    public static function generateInvoicePdf(array $invoiceData): array {
        return self::generateDocumentPdf($invoiceData, 'Invoice');
    }

    /**
     * Core PDF generation method for official SR Enterprises documents
     */
    public static function generateDocumentPdf(array $docData, string $docTypePrefix = 'Invoice'): array {
        try {
            $options = new Options();
            $options->set('isHtml5ParserEnabled', true);
            $options->set('isRemoteEnabled', true);
            $options->set('defaultFont', 'Helvetica');
            $options->set('dpi', 150);

            $dompdf = new Dompdf($options);

            $html = self::renderOfficialDocumentHtml($docData);
            $dompdf->loadHtml($html);
            $dompdf->setPaper('A4', 'portrait');
            $dompdf->render();

            $invoiceNumber = $docData['invoiceNumber'] ?? $docData['invoice_number'] ?? '82026' . date('d');
            $cleanNum = preg_replace('/[^a-zA-Z0-9_-]/', '', $invoiceNumber);
            $filename = "{$docTypePrefix}-{$cleanNum}.pdf";

            $tempDir = sys_get_temp_dir() . '/sr_crm_documents';
            if (!is_dir($tempDir)) {
                @mkdir($tempDir, 0777, true);
            }

            $filePath = $tempDir . '/' . uniqid(strtolower($docTypePrefix) . '_', true) . '_' . $filename;
            $outputBytes = $dompdf->output();
            file_put_contents($filePath, $outputBytes);

            return [
                'success' => true,
                'filePath' => $filePath,
                'filename' => $filename,
                'fileSizeBytes' => filesize($filePath),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'error' => "{$docTypePrefix} PDF generation failed: " . $e->getMessage(),
            ];
        }
    }

    /**
     * Build the EXACT official SR Enterprises Bill of Supply / Receipt HTML layout on a single page
     */
    public static function renderOfficialDocumentHtml(array $data): string {
        $customerName = htmlspecialchars(strtoupper($data['customerName'] ?? $data['toName'] ?? 'PRABHATI FOODS PRIVATE LIMITED'));
        $customerPhone = htmlspecialchars($data['customerPhone'] ?? $data['phone'] ?? '9989155841');
        $customerGst = !empty($data['customerGst']) ? htmlspecialchars($data['customerGst']) : (!empty($data['gstNumber']) ? htmlspecialchars($data['gstNumber']) : '');
        $gstHtml = $customerGst ? "<div style='font-size: 8px; font-weight: bold; color: #000; margin-top: 1px;'>GSTIN: {$customerGst}</div>" : '';

        // Supply Information from available customer / sale / invoice address
        $supplyAddr = '';
        if (!empty($data['supplyAddress'])) {
            $supplyAddr = $data['supplyAddress'];
        } elseif (!empty($data['addresses']) && is_array($data['addresses']) && !empty($data['addresses'][0])) {
            $addr = $data['addresses'][0];
            $parts = array_filter([$addr['addressLine1'] ?? '', $addr['city'] ?? '', $addr['state'] ?? '']);
            $supplyAddr = implode(', ', $parts);
        } elseif (!empty($data['customerAddress'])) {
            $supplyAddr = $data['customerAddress'];
        } elseif (!empty($data['customerCity']) || !empty($data['customerState'])) {
            $supplyAddr = trim(($data['customerCity'] ?? '') . ', ' . ($data['customerState'] ?? 'Maharashtra'), ', ');
        } else {
            $supplyAddr = 'Maharashtra';
        }
        $supplyAddress = htmlspecialchars($supplyAddr);

        $rawInvoiceNo = $data['invoiceNumber'] ?? $data['invoice_number'] ?? '0926251';
        $invoiceNo = htmlspecialchars($rawInvoiceNo);

        $poNumber = !empty($data['poNumber']) ? htmlspecialchars(trim($data['poNumber'])) : '';

        $invoiceDate = !empty($data['invoiceDate']) ? date('d/m/Y', strtotime($data['invoiceDate'])) : date('d/m/Y');
        $rawDueDate = !empty($data['dueDate']) ? $data['dueDate'] : (!empty($data['nextDueDate']) ? $data['nextDueDate'] : null);
        $dueDate = !empty($rawDueDate) ? date('d/m/Y', strtotime($rawDueDate)) : date('d/m/Y', strtotime($invoiceDate . ' +15 days'));

        $items = $data['items'] ?? [];
        $totalAmount = (float)($data['totalAmount'] ?? $data['total_amount'] ?? 0);
        $discountAmount = (float)($data['discountAmount'] ?? $data['discount_amount'] ?? 0);
        $receivedAmount = (float)($data['paidAmount'] ?? $data['paid_amount'] ?? $data['amount'] ?? 0);
        $balanceAmount = (float)($data['outstandingAmount'] ?? $data['outstanding_amount'] ?? max(0, $totalAmount - $receivedAmount));

        if ($receivedAmount <= 0 && !empty($data['amount'])) {
            $receivedAmount = (float)$data['amount'];
            $balanceAmount = max(0, $totalAmount - $receivedAmount);
        }

        // Build item rows (up to 10 rows)
        $actualItems = !empty($items) && is_array($items) ? $items : [
            [
                'nameSnapshot' => '25LPH Ro Plant With 18L Tank',
                'quantity' => 1,
                'unit' => 'PCS',
                'unitPriceSnapshot' => $totalAmount > 0 ? $totalAmount : 16500,
                'lineTotal' => $totalAmount > 0 ? $totalAmount : 16500,
            ]
        ];

        $itemRowsHtml = '';
        $totalQty = 0;

        for ($slotIdx = 0; $slotIdx < 10; $slotIdx++) {
            if (isset($actualItems[$slotIdx])) {
                $item = $actualItems[$slotIdx];
                $name = htmlspecialchars($item['nameSnapshot'] ?? $item['productName'] ?? $item['name'] ?? $item['description'] ?? '25LPH Ro Plant With 18L Tank');
                $qty = (int)($item['quantity'] ?? 1);
                $unit = htmlspecialchars($item['unit'] ?? 'PCS');
                $rate = (float)($item['unitPriceSnapshot'] ?? $item['unitPrice'] ?? $item['rate'] ?? 0);
                $amt = (float)($item['lineTotal'] ?? ($qty * $rate));

                $totalQty += $qty;
                $formattedRate = number_format($rate);
                $formattedAmt = number_format($amt);
                $displayIdx = $slotIdx + 1;

                $itemRowsHtml .= "
                    <tr style='height: 18px;'>
                        <td style='border-right: 1px solid #000; padding: 2px 2px; font-size: 8.5px; text-align: center; vertical-align: top;'>{$displayIdx}</td>
                        <td style='border-right: 1px solid #000; padding: 2px 6px; font-size: 8.5px; text-align: left; vertical-align: top;'>{$name}</td>
                        <td style='border-right: 1px solid #000; padding: 2px 2px; font-size: 8.5px; text-align: center; vertical-align: top;'>{$qty} {$unit}</td>
                        <td style='border-right: 1px solid #000; padding: 2px 4px; font-size: 8.5px; text-align: right; vertical-align: top;'>{$formattedRate}</td>
                        <td style='padding: 2px 6px; font-size: 8.5px; text-align: right; vertical-align: top;'>{$formattedAmt}</td>
                    </tr>
                ";
            } else {
                $itemRowsHtml .= "
                    <tr style='height: 18px;'>
                        <td style='border-right: 1px solid #000; padding: 2px 2px; font-size: 8.5px; text-align: center;'>&nbsp;</td>
                        <td style='border-right: 1px solid #000; padding: 2px 6px; font-size: 8.5px; text-align: left;'>&nbsp;</td>
                        <td style='border-right: 1px solid #000; padding: 2px 2px; font-size: 8.5px; text-align: center;'>&nbsp;</td>
                        <td style='border-right: 1px solid #000; padding: 2px 4px; font-size: 8.5px; text-align: right;'>&nbsp;</td>
                        <td style='padding: 2px 6px; font-size: 8.5px; text-align: right;'>&nbsp;</td>
                    </tr>
                ";
            }
        }

        // Discount row
        $discountRowHtml = '';
        if ($discountAmount > 0) {
            $formattedDiscount = number_format($discountAmount);
            $discountRowHtml = "
                <tr>
                    <td style='border-right: 1px solid #000;'></td>
                    <td style='border-right: 1px solid #000; padding: 3px 6px; font-size: 8.5px; text-align: right;'><em>Discount</em></td>
                    <td style='border-right: 1px solid #000; padding: 3px 2px; font-size: 8.5px; text-align: center;'>-</td>
                    <td style='border-right: 1px solid #000; padding: 3px 4px; font-size: 8.5px; text-align: center;'>-</td>
                    <td style='padding: 3px 6px; font-size: 8.5px; text-align: right;'>- ₹ {$formattedDiscount}</td>
                </tr>
            ";
        }

        $formattedTotalAmount = number_format($totalAmount > 0 ? $totalAmount : 16500);
        $formattedReceivedAmount = number_format($receivedAmount);
        $formattedBalanceAmount = number_format($balanceAmount);

        $status = strtoupper($data['status'] ?? '');

        // Notes (dynamic only, no hardcoded fallback)
        $notesText = isset($data['notes']) ? trim($data['notes']) : '';
        $warrantyNotes = !empty($notesText) ? htmlspecialchars($notesText) : '';

        // Authoritative static lower section and logo
        $logoSvg = InvoiceAssets::$SR_ENTERPRISES_LOGO_B64;
        $lowerSectionImg = InvoiceAssets::$OFFICIAL_LOWER_SECTION_B64;
        $qrSvg = self::getQrCodeSvgBase64();
        $sigSvg = self::getSignatureSvgBase64();

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Official Bill / Receipt - SR Enterprises</title>
<style>
    @page {
        size: A4 portrait;
        margin: 15mm 12mm 10mm 12mm;
    }
    * {
        box-sizing: border-box;
    }
    body {
        font-family: Helvetica, Arial, sans-serif;
        color: #000000;
        margin: 0;
        padding: 0;
        font-size: 8.5px;
        line-height: 1.2;
    }
    
    .doc-container {
        width: 100%;
        max-width: 190mm;
        margin: 0 auto;
        page-break-inside: avoid;
    }
    
    .top-badges {
        margin-bottom: 4px;
    }
    .badge-tag {
        display: inline-block;
        border: 1px solid #000;
        padding: 1.5px 5px;
        font-size: 7px;
        font-weight: bold;
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }
    .badge-tag-muted {
        display: inline-block;
        border: 1px solid #777;
        padding: 1.5px 5px;
        font-size: 7px;
        color: #555;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-left: 2px;
    }
    
    .header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 6px;
    }
    
    .flat-grid {
        width: 100%;
        border: 1.5px solid #000;
        border-collapse: collapse;
        margin-bottom: -1.5px;
    }
    
    .flat-grid td, .flat-grid th {
        box-sizing: border-box;
    }
</style>
</head>
<body>

<div class="doc-container">

    <!-- TOP BADGES: Single INVOICE Label -->
    <div class="top-badges" style="text-align: left; margin-bottom: 6px;">
        <span class="badge-tag">INVOICE</span>
    </div>

    <!-- HEADER TABLE -->
    <table class="header-table">
        <tr>
            <td style="width: 70px; vertical-align: middle; text-align: center;">
                <img src="{$logoSvg}" style="width: 60px; height: 60px; object-fit: contain;" alt="SR Enterprises Logo" />
            </td>
            <td style="text-align: center; vertical-align: middle; padding: 0 10px;">
                <div style="font-size: 19px; font-weight: bold; color: #000; letter-spacing: 0.5px; line-height: 1.1;">SR ENTERPRISES</div>
                <div style="font-size: 8px; color: #111; margin-top: 2px; font-weight: 500;">
                    Shop A6 SaiPritam Nagari, Chatrapati Chowk Rahatani. Mo.7385059197
                </div>
                <div style="font-size: 8px; color: #111; margin-top: 1px; font-weight: 500;">
                    Pimpri-Chinchwad, Pune., Maharashtra, 411017
                </div>
                <div style="font-size: 9px; font-weight: bold; color: #000; margin-top: 2px;">
                    Mobile: 7385059197 &nbsp;&nbsp;&nbsp;&nbsp; Email: srenterprises02015@gmail.com
                </div>
            </td>
        </tr>
    </table>

    <!-- SECTION 1: BILL TO & INVOICE DETAILS GRID (SUPPLY removed) -->
    <table class="flat-grid">
        <tr>
            <td style="width: 58%; border-right: 1.5px solid #000; padding: 4px 6px; vertical-align: middle;">
                <div style="font-size: 8px; font-weight: bold; color: #000; margin-bottom: 2px; text-transform: uppercase;">BILL TO</div>
                <div style="font-size: 9.5px; font-weight: bold; color: #000; text-transform: uppercase;">{$customerName}</div>
                <div style="font-size: 8.5px; font-weight: 500; color: #000; margin-top: 1px;">Mobile: {$customerPhone}</div>
                {$gstHtml}
            </td>
            <td style="width: 42%; vertical-align: top; padding: 0;">
                <table style="width: 100%; border-collapse: collapse; text-align: center;">
                    <tr>
                        <td style="width: 50%; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 2px; text-align: center; vertical-align: middle;">
                            <div style="font-size: 7.5px; font-weight: bold; color: #000;">Invoice No.</div>
                            <div style="font-size: 8.5px; font-weight: bold; font-family: monospace; color: #000; margin-top: 2px;">{$invoiceNo}</div>
                        </td>
                        <td style="width: 50%; border-bottom: 1px solid #000; padding: 3px 2px; text-align: center; vertical-align: middle;">
                            <div style="font-size: 7.5px; font-weight: bold; color: #000;">Invoice Date</div>
                            <div style="font-size: 8.5px; font-weight: bold; color: #000; margin-top: 2px;">{$invoiceDate}</div>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding: 4px 2px; text-align: center; vertical-align: middle;">
                            <div style="font-size: 7.5px; font-weight: bold; color: #000;">PO Number</div>
                            <div style="font-size: 8.5px; font-weight: bold; font-family: monospace; color: #000; margin-top: 2px; min-height: 10px;">{$poNumber}</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- SECTION 2: ITEMS TABLE -->
    <table class="flat-grid">
        <thead>
            <tr style="background-color: #e5e7eb; border-bottom: 1.5px solid #000;">
                <th style="width: 10.2%; border-right: 1px solid #000; padding: 3px 2px; font-size: 8px; font-weight: bold; text-align: center;">S.NO.</th>
                <th style="width: 46.5%; border-right: 1px solid #000; padding: 3px 6px; font-size: 8px; font-weight: bold; text-align: center;">ITEMS</th>
                <th style="width: 13.0%; border-right: 1px solid #000; padding: 3px 2px; font-size: 8px; font-weight: bold; text-align: center;">QTY.</th>
                <th style="width: 14.0%; border-right: 1px solid #000; padding: 3px 4px; font-size: 8px; font-weight: bold; text-align: center;">RATE</th>
                <th style="width: 16.3%; padding: 3px 6px; font-size: 8px; font-weight: bold; text-align: center;">AMOUNT</th>
            </tr>
        </thead>
        <tbody>
            {$itemRowsHtml}
            {$discountRowHtml}
            <!-- TOTAL ROW -->
            <tr style="background-color: #e5e7eb; border-top: 1.5px solid #000; font-weight: bold;">
                <td style="border-right: 1px solid #000; padding: 3px 2px;"></td>
                <td style="border-right: 1px solid #000; padding: 3px 6px; font-size: 9px; text-align: right;">TOTAL</td>
                <td style="border-right: 1px solid #000; padding: 3px 2px; font-size: 9px; text-align: center;">{$totalQty}</td>
                <td style="border-right: 1px solid #000; padding: 3px 4px; font-size: 9px; text-align: center;"></td>
                <td style="padding: 3px 6px; font-size: 9px; text-align: right;">₹ {$formattedTotalAmount}</td>
            </tr>
        </tbody>
    </table>

    <!-- SECTION 3: RECEIVED AMOUNT & BALANCE AMOUNT -->
    <table class="flat-grid">
        <tr style="border-bottom: 1.5px solid #000;">
            <td style="width: 50%; border-right: 1.5px solid #000; padding: 4px 6px; font-size: 9px; font-weight: bold;">
                Received Amount: ₹ {$formattedReceivedAmount}
            </td>
            <td style="width: 50%; padding: 4px 6px; font-size: 9px; font-weight: bold;">
                Balance Amount: ₹ {$formattedBalanceAmount}
            </td>
        </tr>
        <!-- SECTION 4: NOTES -->
        <tr>
            <td colspan="2" style="padding: 4px 6px; font-size: 8px;">
                <strong>Notes:</strong> {$warrantyNotes}
            </td>
        </tr>
    </table>

    <!-- SECTION 5: BANK DETAILS, PAYMENT QR, TERMS & SIGNATORY -->
    <table class="flat-grid" style="border-top: none; margin-top: 0; width: 100%;">
        <tr>
            <td style="width: 26%; border-right: 1.5px solid #000; padding: 4px 6px; vertical-align: top;">
                <div style="font-size: 8px; font-weight: bold; margin-bottom: 3px; color: #000;">Bank Details</div>
                <div style="font-size: 7px; line-height: 1.5; color: #111;">
                    <strong>Bank:</strong> AU Small Finance Bank<br/>
                    <strong>Name:</strong> S R Enterprises<br/>
                    <strong>A/c No:</strong> 2602245912923632<br/>
                    <strong>IFSC:</strong> AUBL0002459<br/>
                    <strong>Branch:</strong> Pimpri, Pune
                </div>
            </td>
            <td style="width: 24%; border-right: 1.5px solid #000; padding: 4px 6px; vertical-align: top;">
                <div style="font-size: 8px; font-weight: bold; margin-bottom: 2px; color: #000;">Payment QR Code</div>
                <div style="font-size: 6.8px; line-height: 1.25; color: #111;">
                    Scan &amp; Pay (UPI)<br/>
                    <strong>UPI:</strong> srenterprises6711@aubank
                </div>
                <div style="margin-top: 4px; text-align: left;">
                    <img src="{$qrSvg}" alt="Payment QR Code" style="width: 52px; height: 52px; display: inline-block;" />
                </div>
            </td>
            <td style="width: 32%; border-right: 1.5px solid #000; padding: 4px 6px; vertical-align: top;">
                <div style="font-size: 8px; font-weight: bold; margin-bottom: 2px; color: #000;">Terms and Conditions</div>
                <div style="font-size: 6.5px; line-height: 1.25; color: #222;">
                    1) Except Breakage &amp; Pump In AMC<br/>
                    2) T&amp;C Apply For AMC &amp; Warranty<br/>
                    3) Dust &amp; Soil Damage Not Cover<br/>
                    4) Any Other Issue Service Charge Applicable<br/>
                    5) GST Bill Extra Charges Applicable<br/>
                    6) New Machine Install Advance Payment 80%<br/>
                    7) Commercial Use Unit No Warranty
                </div>
            </td>
            <td style="width: 18%; padding: 4px 6px; vertical-align: top; text-align: center;">
                <div style="margin-top: 2px; margin-bottom: 4px;">
                    <img src="{$sigSvg}" alt="Authorised Signatory" style="height: 36px; display: inline-block;" />
                </div>
                <div style="font-size: 7.5px; font-weight: bold; color: #000; line-height: 1.2;">
                    Authorised Signatory For<br/>
                    SR ENTERPRISES
                </div>
            </td>
        </tr>
    </table>

</div>

</body>
</html>
HTML;
    }

    /**
     * Vector logo asset as base64
     */
    private static function getLogoSvgBase64(): string {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
            <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#1d4ed8" stroke-width="3"/>
            <circle cx="50" cy="50" r="41" fill="#ffffff" stroke="#1d4ed8" stroke-width="1.5" stroke-dasharray="2,2"/>
            <circle cx="50" cy="50" r="36" fill="#f8fafc" stroke="#1d4ed8" stroke-width="1"/>
            <path id="curveTop" d="M 20 50 A 30 30 0 0 1 80 50" fill="none"/>
            <text font-family="Arial, Helvetica, sans-serif" font-size="7.5" font-weight="bold" fill="#1d4ed8" text-anchor="middle">
                <textPath href="#curveTop" startOffset="50%">SR ENTERPRISES</textPath>
            </text>
            <circle cx="50" cy="50" r="22" fill="#1d4ed8"/>
            <text x="50" y="56" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle">SR</text>
            <path d="M 50 28 C 47 34 44 38 44 41 C 44 44.5 46.5 47 50 47 C 53.5 47 56 44.5 56 41 C 56 38 53 34 50 28 Z" fill="#60a5fa" opacity="0.85"/>
        </svg>';
        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }

    /**
     * Real AU Small Finance Bank UPI QR Code (srenterprises6711@aubank) as base64 PNG
     */
    private static function getQrCodeSvgBase64(): string {
        return 'data:image/png;base64,' . InvoiceAssets::$AU_BANK_QR_B64;
    }

    /**
     * Vector Signature asset as base64 matching the official signature in the image
     */
    private static function getSignatureSvgBase64(): string {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 60" width="140" height="60">
            <path d="M 20 48 C 15 25 22 10 32 8 C 42 6 48 18 45 32 C 43 42 32 46 25 45 C 38 43 52 28 58 16 C 63 8 70 8 74 14 C 77 22 75 36 68 45" fill="none" stroke="#000000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M 52 24 C 62 18 72 20 82 28 C 88 34 94 36 102 36" fill="none" stroke="#000000" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M 68 44 C 82 43 105 40 128 38" fill="none" stroke="#000000" stroke-width="1.2" stroke-linecap="round"/>
        </svg>';
        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }
}
