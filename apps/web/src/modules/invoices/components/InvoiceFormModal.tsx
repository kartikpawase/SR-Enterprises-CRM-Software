import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { useToast } from '../../../providers/ToastProvider';
import { useCustomersQuery } from '../../customers/customer.api';
import {
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  type InvoiceDetailData,
  type InvoiceSummaryData,
} from '../invoices.api';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { formatINR } from '../../../lib/formatters';

interface InvoiceItemFormState {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInvoice?: InvoiceDetailData | InvoiceSummaryData | null;
  onSuccess?: () => void;
}

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  isOpen,
  onClose,
  initialInvoice,
  onSuccess,
}) => {
  let toast: { success: (msg: string, title?: string) => void; error: (msg: string, title?: string) => void };
  try {
    toast = useToast();
  } catch {
    toast = {
      success: (msg: string) => console.log(msg),
      error: (msg: string) => console.error(msg),
    };
  }
  const isEdit = !!initialInvoice;

  const [customerId, setCustomerId] = useState<string>('');
  const [poNumber, setPoNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const [items, setItems] = useState<InvoiceItemFormState[]>([
    { name: '', quantity: 1, unitPrice: 0 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch customers for create mode
  const { data: customerData, isLoading: isLoadingCustomers } = useCustomersQuery({
    page: 1,
    limit: 100,
  });

  const createMutation = useCreateInvoiceMutation();
  const updateMutation = useUpdateInvoiceMutation();

  // Populate form on initialInvoice change or open
  useEffect(() => {
    if (isOpen) {
      if (initialInvoice) {
        setCustomerId(initialInvoice.customerId || '');
        setPoNumber(initialInvoice.poNumber || '');
        setInvoiceDate(
          initialInvoice.invoiceDate
            ? new Date(initialInvoice.invoiceDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        );
        setDueDate(
          initialInvoice.dueDate
            ? new Date(initialInvoice.dueDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        );
        setNotes(initialInvoice.notes || '');
        setDiscountAmount(parseFloat(initialInvoice.discountAmount || '0') || 0);

        const loadedItems = (initialInvoice as any).items;
        if (loadedItems && Array.isArray(loadedItems) && loadedItems.length > 0) {
          setItems(
            loadedItems.slice(0, 10).map((it: any) => ({
              name: it.nameSnapshot || it.name || '',
              quantity: Number(it.quantity) || 1,
              unitPrice: parseFloat(it.unitPriceSnapshot || it.unitPrice || '0') || 0,
            }))
          );
        } else {
          setItems([{ name: '', quantity: 1, unitPrice: parseFloat(initialInvoice.totalAmount || '0') || 0 }]);
        }
      } else {
        // Reset to fresh defaults
        setCustomerId('');
        setPoNumber('');
        const today = new Date().toISOString().split('T')[0];
        setInvoiceDate(today);
        setDueDate(today);
        setNotes('');
        setDiscountAmount(0);
        setItems([{ name: '', quantity: 1, unitPrice: 0 }]);
      }
      setIsSubmitting(false);
    }
  }, [isOpen, initialInvoice]);

  // Validation: Due date cannot be earlier than invoice date
  const isDateInvalid = useMemo(() => {
    if (!invoiceDate || !dueDate) return false;
    return dueDate < invoiceDate;
  }, [invoiceDate, dueDate]);

  // Dynamic Row addition (max 10 items strictly enforced)
  const handleAddItem = () => {
    if (items.length >= 10) {
      toast.error('An invoice can have a maximum of 10 items.', 'Maximum Rows Reached');
      return;
    }
    setItems((prev) => [...prev, { name: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error('An invoice must contain at least one item.', 'Action Blocked');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItemFormState, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - (Number(discountAmount) || 0));
  }, [subtotal, discountAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!isEdit && !customerId) {
      toast.error('Please select a customer for this invoice.', 'Validation Error');
      return;
    }

    if (isDateInvalid) {
      toast.error('Due Date cannot be earlier than Invoice Date.', 'Validation Error');
      return;
    }

    if (items.length === 0 || items.length > 10) {
      toast.error('Invoice must contain between 1 and 10 items.', 'Validation Error');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.name.trim()) {
        toast.error(`Item #${i + 1} must have a valid description.`, 'Validation Error');
        return;
      }
      if (it.quantity <= 0) {
        toast.error(`Item #${i + 1} quantity must be at least 1.`, 'Validation Error');
        return;
      }
      if (it.unitPrice < 0) {
        toast.error(`Item #${i + 1} rate cannot be negative.`, 'Validation Error');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payloadItems = items.map((it) => ({
        name: it.name.trim(),
        description: it.name.trim(),
        itemType: 'PRODUCT' as const,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        taxRatePercent: 0,
        discountAmount: 0,
      }));

      if (isEdit && initialInvoice) {
        await updateMutation.mutateAsync({
          id: initialInvoice.id,
          data: {
            poNumber: poNumber.trim() ? poNumber.trim() : null,
            invoiceDate: new Date(invoiceDate).toISOString(),
            dueDate: new Date(dueDate).toISOString(),
            notes: notes.trim() ? notes.trim() : null,
            discountAmount: Number(discountAmount) || 0,
            items: payloadItems,
          },
        });
        toast.success(`Invoice ${initialInvoice.invoiceNumber} updated successfully.`, 'Invoice Updated');
      } else {
        const created = await createMutation.mutateAsync({
          customerId,
          invoiceDate: new Date(invoiceDate).toISOString(),
          dueDate: new Date(dueDate).toISOString(),
          poNumber: poNumber.trim() ? poNumber.trim() : undefined,
          notes: notes.trim() ? notes.trim() : undefined,
          discountAmount: Number(discountAmount) || 0,
          items: payloadItems,
        });
        toast.success(`Invoice ${created?.invoiceNumber || ''} created successfully.`, 'Invoice Created');
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save invoice.', 'Save Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerOptions = useMemo(() => {
    const list = customerData?.data || [];
    return [
      { value: '', label: 'Select a Customer...' },
      ...list.map((c: any) => ({
        value: c.id,
        label: `${c.fullName || c.name || 'Unnamed'} (${c.phone || 'No phone'})${c.companyName ? ' - ' + c.companyName : ''}`,
      })),
    ];
  }, [customerData]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Invoice: ${initialInvoice?.invoiceNumber}` : 'Create New Tax Invoice'}
      description={
        isEdit
          ? 'Update invoice metadata, line items (max 10), due date, or notes.'
          : 'Create a standalone invoice with up to 10 line items, PO number, and due date.'
      }
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Meta Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          {isEdit ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer</label>
              <Input
                type="text"
                value={initialInvoice?.customerName || 'Customer'}
                disabled
                className="bg-slate-100 cursor-not-allowed font-medium text-slate-700"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer <span className="text-red-500">*</span>
              </label>
              <Select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                options={customerOptions}
                disabled={isLoadingCustomers}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">PO Number (Optional)</label>
            <Input
              type="text"
              placeholder="e.g. PO-89240"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Invoice Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Due Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className={isDateInvalid ? 'border-red-500 focus:ring-red-500' : ''}
            />
            {isDateInvalid && (
              <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Due Date cannot be earlier than Invoice Date
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table (Max 10 items strictly enforced) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Invoice Items ({items.length}/10)
              </h3>
              <p className="text-xs text-slate-500">Add up to 10 line items for this invoice</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              disabled={items.length >= 10}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className={items.length >= 10 ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Add Row
            </Button>
          </div>

          {items.length >= 10 && (
            <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              Maximum limit of 10 items reached. You cannot add additional rows.
            </div>
          )}

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="w-12 py-2 px-2 text-center">#</th>
                  <th className="py-2 px-3">Item Description / Name</th>
                  <th className="w-24 py-2 px-2 text-center">Qty</th>
                  <th className="w-32 py-2 px-2 text-right">Rate (₹)</th>
                  <th className="w-32 py-2 px-3 text-right">Amount (₹)</th>
                  <th className="w-12 py-2 px-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {items.map((item, index) => {
                  const lineAmt = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                  return (
                    <tr key={index} className="hover:bg-slate-50/70">
                      <td className="py-2 px-2 text-center font-bold text-slate-500 align-middle">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3 align-middle">
                        <Input
                          type="text"
                          placeholder="e.g. 25LPH RO Plant With 18L Tank"
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          required
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="py-2 px-2 align-middle">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                          required
                          className="h-8 text-xs text-center font-mono"
                        />
                      </td>
                      <td className="py-2 px-2 align-middle">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                          required
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 align-middle">
                        {lineAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length <= 1}
                          className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Discount Grid */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="w-full sm:w-1/2 space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Notes (Optional)</label>
            <Textarea
              rows={3}
              placeholder="e.g. 1 Years Warranty On Ele Spears 1 Service Free"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="w-full sm:w-1/2 max-w-xs space-y-2 self-end text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">{formatINR(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 gap-2">
              <span>Discount (₹):</span>
              <Input
                type="number"
                min="0"
                step="any"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="h-7 w-28 text-xs text-right font-mono"
              />
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono text-base text-blue-600">{formatINR(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions with Double-Save Protection */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || isDateInvalid}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
