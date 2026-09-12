import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ShoppingCart, CheckCircle2 } from 'lucide-react';
import type { InventoryItem } from '../inventory.api';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';

interface RecordSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  items: InventoryItem[];
  preselectedItemId?: string;
  isLoading?: boolean;
}

export const RecordSaleModal: React.FC<RecordSaleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  items,
  preselectedItemId,
  isLoading = false,
}) => {
  const [selectedItemId, setSelectedItemId] = useState(preselectedItemId || '');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState('1');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState('COMPLETED');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch active customers from existing CRM customer database for selection
  const { data: customerList } = useQuery({
    queryKey: ['customers', 'simple-list'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/customers', { params: { limit: 100 } });
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (preselectedItemId) {
      setSelectedItemId(preselectedItemId);
    } else if (items.length > 0 && !selectedItemId) {
      setSelectedItemId(items[0].id);
    }
  }, [preselectedItemId, items, isOpen]);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  useEffect(() => {
    if (selectedItem) {
      setSellingPrice(String(selectedItem.sellingPrice || '0'));
    }
  }, [selectedItemId]);

  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    if (!id) return;
    const c = customerList?.find((cust: any) => cust.id === id);
    if (c) {
      setCustomerName(c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim());
      setCustomerPhone(c.mobileNumber || c.phoneNumber || '');
    }
  };

  if (!isOpen) return null;

  const currentStock = selectedItem?.currentStock || 0;
  const qtyNum = parseInt(quantity, 10) || 0;
  const sellNum = parseFloat(sellingPrice) || 0;
  const unitCostEst = parseFloat(String(selectedItem?.purchasePrice || '0')) || 0;

  const totalSaleAmount = qtyNum * sellNum;
  const totalCostEst = qtyNum * unitCostEst;
  const estimatedProfit = totalSaleAmount - totalCostEst;
  const marginPercent = totalSaleAmount > 0 ? ((estimatedProfit / totalSaleAmount) * 100).toFixed(1) : '0';

  const isStockInsufficient = qtyNum > currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedItemId) {
      setError('Please select an inventory item');
      return;
    }

    if (qtyNum <= 0) {
      setError('Quantity must be at least 1');
      return;
    }

    if (isStockInsufficient) {
      setError(`Cannot sell ${qtyNum} units. Only ${currentStock} units available in stock.`);
      return;
    }

    if (sellNum < 0) {
      setError('Selling price cannot be negative');
      return;
    }

    try {
      await onSubmit({
        itemId: selectedItemId,
        customerId: customerId || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        saleDate: new Date(saleDate).toISOString(),
        quantity: qtyNum,
        sellingPricePerUnit: sellNum,
        paymentStatus,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to record sale');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Record Outward Sale</h2>
              <p className="text-xs text-gray-500">
                Decrements stock, locks transaction-time FIFO purchase cost, and calculates profit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Selector & Available Stock Indicator */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700">
                Inventory Item / Spare Part <span className="text-red-500">*</span>
              </label>
              {selectedItem && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    currentStock > 0
                      ? currentStock <= selectedItem.minStockLevel
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  Stock: {currentStock} units available
                </span>
              )}
            </div>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white font-medium text-gray-900"
            >
              <option value="" disabled>
                -- Choose Item / Spare Part --
              </option>
              {items.map((it) => (
                <option key={it.id} value={it.id} disabled={it.currentStock <= 0}>
                  {it.name} ({it.category}) {it.currentStock <= 0 ? '— [OUT OF STOCK]' : `— Stock: ${it.currentStock}`}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Selection (from existing CRM database or manual) */}
          <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Customer Information <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            {customerList && customerList.length > 0 && (
              <div>
                <select
                  value={customerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white mb-2"
                >
                  <option value="">-- Pick From Existing CRM Customers (Optional) --</option>
                  {customerList.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim()} ({c.mobileNumber || c.phoneNumber || 'No phone'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Name (optional)"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone Number (optional)"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                />
              </div>
            </div>
          </div>

          {/* Date & Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Sale Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={currentStock || undefined}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg outline-none font-semibold ${
                  isStockInsufficient
                    ? 'border-red-500 text-red-700 bg-red-50'
                    : 'border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              />
              {isStockInsufficient && (
                <span className="text-[10px] text-red-600 font-medium">
                  Exceeds available stock ({currentStock})
                </span>
              )}
            </div>
          </div>

          {/* Pricing & Automatic Profit Preview */}
          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Selling Price / Unit (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white font-medium"
                >
                  <option value="COMPLETED">Completed / Paid</option>
                  <option value="PENDING">Pending Payment</option>
                </select>
              </div>
            </div>

            {/* Live Profit Preview Box */}
            <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-xs space-y-1.5">
              <div className="flex justify-between text-gray-600">
                <span>Total Sale Value:</span>
                <span className="font-bold text-gray-900">₹{totalSaleAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Estimated FIFO Cost:</span>
                <span>₹{totalCostEst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-100 font-semibold text-emerald-800">
                <span>Estimated Net Profit:</span>
                <span className="font-extrabold text-sm text-emerald-700">
                  ₹{estimatedProfit.toFixed(2)} ({marginPercent}%)
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Remarks</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery notes, installation address, counter invoice ref..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isStockInsufficient || currentStock <= 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Recording...' : 'Record Sale & Deduct Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
