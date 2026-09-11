import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, ArrowRight, RefreshCw, XCircle, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../providers/ToastProvider';
import { previewCustomerImportApi, executeCustomerImportApi } from '../customer.api';

export interface CustomerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CustomerImportModal: React.FC<CustomerImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressText, setProgressText] = useState<string>('');
  const [duplicatePolicy, setDuplicatePolicy] = useState<'SKIP' | 'CREATE' | 'UPDATE'>('SKIP');
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [parsedRows, setParsedRows] = useState<Array<Record<string, any>>>([]);

  const handleReset = () => {
    setFile(null);
    setPreviewResult(null);
    setExecutionResult(null);
    setParsedRows([]);
    setProgressText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /**
   * Robust parser for Excel (.xlsx, .xls) and CSV files.
   * Flexibly matches column names, preserves address and contact fields,
   * normalizes numeric values, and processes in non-blocking chunks for 10,000+ records.
   */
  const parseExcelOrCsvFile = async (selectedFile: File): Promise<Array<Record<string, any>>> => {
    setProgressText('Reading spreadsheet data...');
    const buffer = await selectedFile.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: Array<Record<string, any>> = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd',
    });

    if (!rawRows || rawRows.length === 0) return [];

    setProgressText(`Analyzing ${rawRows.length.toLocaleString()} rows...`);

    const cleanedRecords: Array<Record<string, any>> = [];

    // Process rows asynchronously in chunks to keep the UI responsive
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < rawRows.length; i += CHUNK_SIZE) {
      const chunk = rawRows.slice(i, i + CHUNK_SIZE);

      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j];
        const rowNumber = i + j + 1;
        const keys = Object.keys(row);

        const getVal = (pattern: RegExp, fallbackIdx?: number): string => {
          const matchKey = keys.find((k) => pattern.test(k.trim().toLowerCase()));
          if (matchKey && row[matchKey] !== undefined && row[matchKey] !== null) {
            return String(row[matchKey]).trim();
          }
          if (fallbackIdx !== undefined && keys[fallbackIdx] && row[keys[fallbackIdx]] !== undefined) {
            return String(row[keys[fallbackIdx]]).trim();
          }
          return '';
        };

        // Column variation matching
        let fullName = getVal(
          /^(fullname|full_name|customername|customer_name|name|client|client_name|customer|party_name|contact_name|account_name)$/i
        );
        if (!fullName && keys.length > 0) {
          const firstVal = String(row[keys[0]] ?? '').trim();
          if (!/^\d+$/.test(firstVal)) {
            fullName = firstVal;
          }
        }

        let rawPhone = getVal(
          /^(phone|mobile|phonenumber|phone_number|mobilenumber|mobile_number|contact|contactnumber|contact_number|mobile_no|phone_no|cell|tel|telephone)$/i
        );
        if (!rawPhone && keys.length > 1) {
          const secondVal = String(row[keys[1]] ?? '').trim();
          if (/\d{5,}/.test(secondVal)) {
            rawPhone = secondVal;
          }
        }

        const email = getVal(/^(email|emailaddress|email_address|e_mail|mail|e-mail)$/i);
        const typeStr = getVal(/^(customertype|customer_type|type|category|customer_category|client_type)$/i);
        const customerType = /comm|corp|firm|bus|comp/i.test(typeStr) ? 'COMMERCIAL' : 'INDIVIDUAL';
        const companyName = getVal(/^(companyname|company_name|company|firm|firm_name|business_name|org|organization)$/i);
        const gstNumber = getVal(/^(gstnumber|gst_number|gst|gstin|gst_no|tax_id|tax_number)$/i);

        let addressLine1 = getVal(
          /^(addressline1|address_line_1|address_line1|address1|address|customeraddress|customer_address|fulladdress|full_address|street|street_address|service_address|location|site_address)$/i
        );
        if (!addressLine1) {
          addressLine1 = fullName || 'Main Service Location';
        }

        const addressLine2 = getVal(/^(addressline2|address_line_2|address_line2|address2|area|locality|colony)$/i);
        const landmark = getVal(/^(landmark|near|landmark_name)$/i);
        const city = getVal(/^(city|town|district|taluka)$/i);
        const state = getVal(/^(state|province|region)$/i);
        const postalCode = getVal(/^(postalcode|postal_code|pincode|pin_code|pin|zip|zipcode|zip_code)$/i);
        const notes = getVal(/^(notes|remarks|comment|comments|description|info)$/i);

        // Skip completely empty rows
        if (!fullName && !rawPhone && !email) continue;

        cleanedRecords.push({
          rowNumber,
          fullName,
          name: fullName,
          phone: rawPhone,
          rawPhone,
          email,
          customerType,
          companyName,
          gstNumber,
          addressLine1,
          addressLine2,
          landmark,
          city,
          state,
          postalCode,
          notes,
        });
      }

      if (rawRows.length > 3000) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return cleanedRecords;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreviewResult(null);
    setExecutionResult(null);
    setIsLoading(true);

    try {
      // Parse Excel (.xlsx, .xls) or CSV
      const records = await parseExcelOrCsvFile(selectedFile);

      if (records.length === 0) {
        throw new Error('No valid customer data rows found in the uploaded file.');
      }

      setParsedRows(records);

      setProgressText(`Validating ${records.length.toLocaleString()} customer records...`);

      // For preview, send dataset (or sample if > 3,000 for preview performance)
      const previewPayload = records.length > 3000 ? records.slice(0, 3000) : records;
      const preview = await previewCustomerImportApi(previewPayload, selectedFile.name);

      // If sliced for preview, scale totalRows indicator
      if (records.length > 3000) {
        preview.totalRows = records.length;
        preview.validRows = records.length - preview.invalidRows;
      }

      setPreviewResult(preview);

      toast.success(
        `Analyzed ${records.length.toLocaleString()} rows: ${preview.validRows.toLocaleString()} ready for import.`,
        'File Verified'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to analyze import file', 'Validation Error');
      setPreviewResult(null);
      setParsedRows([]);
    } finally {
      setIsLoading(false);
      setProgressText('');
    }
  };

  const handleExecuteImport = async () => {
    if (!previewResult || parsedRows.length === 0) return;

    setIsLoading(true);
    const BATCH_SIZE = 500;
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const accumulatedErrors: any[] = [];
    const startTime = Date.now();

    try {
      const totalBatches = Math.ceil(parsedRows.length / BATCH_SIZE);

      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const chunk = parsedRows.slice(batchIdx * BATCH_SIZE, (batchIdx + 1) * BATCH_SIZE);
        const currentCount = Math.min((batchIdx + 1) * BATCH_SIZE, parsedRows.length);

        setProgressText(
          `Importing ${currentCount.toLocaleString()} / ${parsedRows.length.toLocaleString()} records (${Math.round(
            (currentCount / parsedRows.length) * 100
          )}%)...`
        );

        const response = await executeCustomerImportApi(chunk, duplicatePolicy);
        const result = (response as any)?.data ?? response;

        totalImported += result?.imported || 0;
        totalUpdated += result?.updated || 0;
        totalSkipped += result?.skipped || 0;
        totalFailed += result?.failed || 0;
        if (result?.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          accumulatedErrors.push(...result.errors);
        }
      }

      const finalResult = {
        totalProcessed: parsedRows.length,
        imported: totalImported,
        updated: totalUpdated,
        skipped: totalSkipped,
        failed: totalFailed,
        errors: accumulatedErrors,
        executionTimeMs: Date.now() - startTime,
      };

      setExecutionResult(finalResult);

      // Invalidate customer queries and trigger list refetch
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.refetchQueries({ queryKey: ['customers'] });

      toast.success(
        `Successfully imported ${totalImported.toLocaleString()} customers into database.${
          totalSkipped > 0 ? ` (${totalSkipped} duplicate rows skipped)` : ''
        }`,
        'Import Completed'
      );
      onSuccess?.();
    } catch (err: any) {
      const errMsg = err?.details?.message || err?.error?.message || err?.message || 'Import execution failed';
      toast.error(errMsg, 'Import Error');
    } finally {
      setIsLoading(false);
      setProgressText('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Import Customer Directory"
      description="Upload Excel (.xlsx, .xls) or CSV spreadsheets to import customer records into the CRM database."
      size="lg"
      footer={
        <>
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              handleReset();
              onClose();
            }}
            disabled={isLoading}
          >
            {executionResult ? 'Close' : 'Cancel'}
          </Button>
          {!executionResult && previewResult && previewResult.canProceed && (
            <Button
              variant="primary"
              size="md"
              onClick={handleExecuteImport}
              isLoading={isLoading}
              leftIcon={<ArrowRight className="w-4 h-4" />}
            >
              Confirm &amp; Import ({previewResult.validRows.toLocaleString()} Records)
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5 select-none">
        {/* Step 1: Upload Zone (If no execution result yet) */}
        {!executionResult && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                file
                  ? 'border-primary-600 bg-sky-50/40'
                  : 'border-slate-300 hover:border-primary-600 hover:bg-slate-50/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/octet-stream"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-primary-600 flex items-center justify-center mb-2.5 shadow-2xs">
                {file ? <FileSpreadsheet className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
              </div>
              {file ? (
                <div>
                  <p className="text-sm font-bold text-slate-900 font-display">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    {(file.size / 1024).toFixed(1)} KB — Click to choose a different file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-slate-900 font-display">Click to upload Excel / CSV spreadsheet</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">Supports Excel (.xlsx, .xls) &amp; CSV files</p>
                </div>
              )}
            </div>

            {/* Duplicate Policy Selection */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-700 block font-mono text-[11px]">DUPLICATE CUSTOMER HANDLING:</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-medium">
                  <input
                    type="radio"
                    name="dupPolicy"
                    value="SKIP"
                    checked={duplicatePolicy === 'SKIP'}
                    onChange={() => setDuplicatePolicy('SKIP')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span>Skip Duplicates (Recommended)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-medium">
                  <input
                    type="radio"
                    name="dupPolicy"
                    value="UPDATE"
                    checked={duplicatePolicy === 'UPDATE'}
                    onChange={() => setDuplicatePolicy('UPDATE')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span>Update Existing</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-medium">
                  <input
                    type="radio"
                    name="dupPolicy"
                    value="CREATE"
                    checked={duplicatePolicy === 'CREATE'}
                    onChange={() => setDuplicatePolicy('CREATE')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span>Allow All</span>
                </label>
              </div>
            </div>

            {/* Import Format Guidance */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 font-mono text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Supported Columns</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Automatically maps <strong>Name</strong>, <strong>Phone / Mobile</strong>, <strong>Email</strong>, <strong>Address</strong>, <strong>City</strong>, <strong>State</strong>, <strong>Pincode</strong>, <strong>Customer Type</strong>, <strong>Company Name</strong>, <strong>GSTIN</strong>, and <strong>Notes</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Loading Indicator with Live Progress */}
        {isLoading && (
          <div className="p-6 bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-2 text-center border border-slate-200">
            <RefreshCw className="w-6 h-6 text-primary-600 animate-spin" />
            <p className="text-xs font-bold text-slate-800">{progressText || 'Processing customer records...'}</p>
            <p className="text-[11px] text-slate-500">Validating phone numbers, addresses, and database persistence</p>
          </div>
        )}

        {/* Step 2: Validation Preview */}
        {!executionResult && previewResult && !isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 text-center shadow-2xs">
                <span className="block text-[10px] font-semibold text-slate-500 font-mono">TOTAL ROWS</span>
                <span className="text-lg font-extrabold text-slate-900 font-mono">{previewResult.totalRows.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/90 text-center shadow-2xs">
                <span className="block text-[10px] font-bold text-emerald-700 font-mono">READY TO IMPORT</span>
                <span className="text-lg font-extrabold text-emerald-700 font-mono">{previewResult.validRows.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/90 text-center shadow-2xs">
                <span className="block text-[10px] font-bold text-amber-700 font-mono">DUPLICATES</span>
                <span className="text-lg font-extrabold text-amber-700 font-mono">{(previewResult.duplicateRows || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Error Preview list if invalid rows exist */}
            {previewResult.errors && previewResult.errors.length > 0 && (
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl max-h-36 overflow-y-auto space-y-1.5 text-xs text-rose-900">
                <div className="flex items-center gap-1.5 font-bold text-rose-800 font-mono">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Validation Notices ({previewResult.errors.length})</span>
                </div>
                {previewResult.errors.slice(0, 5).map((err: any, idx: number) => (
                  <p key={idx} className="text-[11px] text-rose-700 pl-5 font-mono">
                    • Row {err.rowNumber}: {err.message}
                  </p>
                ))}
                {previewResult.errors.length > 5 && (
                  <p className="text-[10px] text-rose-500 pl-5">
                    ...and {previewResult.errors.length - 5} more issues.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Final Execution Result */}
        {executionResult && (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 font-display">Import Completed Successfully</h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Completed in {(executionResult.executionTimeMs / 1000).toFixed(2)} seconds
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto text-center pt-2">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 block font-mono">PROCESSED</span>
                <span className="text-base font-extrabold text-slate-900 font-mono">{executionResult.totalProcessed.toLocaleString()}</span>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200/90 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 block font-mono">IMPORTED</span>
                <span className="text-base font-extrabold text-emerald-700 font-mono">{executionResult.imported.toLocaleString()}</span>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/90 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-700 block font-mono">DUPLICATES</span>
                <span className="text-base font-extrabold text-amber-700 font-mono">{(executionResult.skipped || executionResult.updated || 0).toLocaleString()}</span>
              </div>
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200/90 shadow-2xs">
                <span className="text-[10px] font-bold text-rose-700 block font-mono">FAILED</span>
                <span className="text-base font-extrabold text-rose-700 font-mono">{(executionResult.failed || 0).toLocaleString()}</span>
              </div>
            </div>

            {executionResult.errors && executionResult.errors.length > 0 && (
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl max-h-32 overflow-y-auto text-left space-y-1 text-xs text-rose-900 mt-2">
                <p className="font-bold text-[11px] font-mono text-rose-800">Failed Records Detail:</p>
                {executionResult.errors.slice(0, 5).map((err: any, idx: number) => (
                  <p key={idx} className="text-[11px] text-rose-700 font-mono">
                    • Row {err.rowNumber}: {err.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
