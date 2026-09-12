import React, { useState } from 'react';
import {
  X,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useInventoryItemDetailQuery } from '../inventory.api';

interface InventoryItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  onEdit: (item: any) => void;
  onRecordPurchase: (itemId: string) => void;
  onRecordSale: (itemId: string) => void;
}

export const InventoryItemDetailModal: React.FC<InventoryItemDetailModalProps> = ({
  isOpen,
  onClose,
  itemId,
  onEdit,
  onRecordPurchase,
  onRecordSale,
}) => {
  const [activeTab, setActiveTab] = useState<'purchases' | 'sales'>('purchases');
  const { data: item, isLoading } = useInventoryItemDetailQuery(isOpen ? itemId : undefined);

  if (!isOpen) return null;

  const buy = parseFloat(String(item?.purchasePrice || '0')) || 0;
  const sell = parseFloat(String(item?.sellingPrice || '0')) || 0;
  const stock = item?.currentStock || 0;
  const unitProfit = sell - buy;
  const totalValuation = stock * buy;
  const isLowStock = stock <= (item?.minStockLevel || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-auto border border-gray-100 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-[#C1121F] flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{item?.name || 'Loading item...'}</h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 font-medium">
                  {item?.category || 'Spare Part'}
                </span>
                {item?.brand && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-medium">
                    {item.brand}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                SKU / Part #: {item?.partNumber || 'N/A'}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-gray-500">Loading item details...</div>
          ) : !item ? (
            <div className="py-12 text-center text-sm text-red-500">Item not found</div>
          ) : (
            <>
              {/* Metric Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase">Stock Level</div>
                  <div className="text-xl font-extrabold text-gray-900 mt-1 flex items-center gap-1.5">
                    <span>{stock} units</span>
                  </div>
                  <div className="mt-1">
                    {isLowStock ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        <AlertTriangle className="w-3 h-3" /> Low Stock (Min: {item.minStockLevel})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> In Stock (Min: {item.minStockLevel})
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase">Purchase Cost</div>
                  <div className="text-xl font-extrabold text-gray-900 mt-1">₹{buy.toFixed(2)}</div>
                  <div className="text-[10px] text-gray-400 mt-1">Base unit cost</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase">Selling Price</div>
                  <div className="text-xl font-extrabold text-emerald-700 mt-1">₹{sell.toFixed(2)}</div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-1">
                    Profit: ₹{unitProfit.toFixed(2)}/unit
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase">Stock Value</div>
                  <div className="text-xl font-extrabold text-blue-700 mt-1">₹{totalValuation.toFixed(2)}</div>
                  <div className="text-[10px] text-gray-400 mt-1">At purchase cost</div>
                </div>
              </div>

              {/* Description */}
              {item.description && (
                <div className="text-xs text-gray-600 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <span className="font-semibold text-gray-700">Description / Specs: </span>
                  {item.description}
                </div>
              )}

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRecordPurchase(item.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" /> + Inward Purchase
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRecordSale(item.id);
                  }}
                  disabled={stock <= 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors disabled:opacity-40"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> + Outward Sale
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(item);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Master Specs
                </button>
              </div>

              {/* History Tabs */}
              <div>
                <div className="flex border-b border-gray-200 gap-4 mb-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('purchases')}
                    className={`pb-2 text-xs font-bold transition-colors border-b-2 ${
                      activeTab === 'purchases'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Recent Purchases ({item.recentPurchases?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sales')}
                    className={`pb-2 text-xs font-bold transition-colors border-b-2 ${
                      activeTab === 'sales'
                        ? 'border-emerald-600 text-emerald-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Recent Sales ({item.recentSales?.length || 0})
                  </button>
                </div>

                {activeTab === 'purchases' ? (
                  item.recentPurchases && item.recentPurchases.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                          <tr>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Purchase #</th>
                            <th className="p-2.5">Supplier</th>
                            <th className="p-2.5 text-right">Qty</th>
                            <th className="p-2.5 text-right">Remaining</th>
                            <th className="p-2.5 text-right">Cost/Unit</th>
                            <th className="p-2.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {item.recentPurchases.map((p: any) => (
                            <tr key={p.id} className="hover:bg-gray-50/50">
                              <td className="p-2.5 text-gray-600 font-mono">
                                {new Date(p.purchaseDate).toLocaleDateString('en-IN')}
                              </td>
                              <td className="p-2.5 font-medium text-blue-700">{p.purchaseNumber}</td>
                              <td className="p-2.5 text-gray-700">{p.supplierName || '—'}</td>
                              <td className="p-2.5 text-right font-semibold">{p.quantity}</td>
                              <td className="p-2.5 text-right">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-mono ${
                                    p.remainingQuantity > 0
                                      ? 'bg-emerald-50 text-emerald-700 font-semibold'
                                      : 'text-gray-400'
                                  }`}
                                >
                                  {p.remainingQuantity}
                                </span>
                              </td>
                              <td className="p-2.5 text-right">₹{Number(p.purchasePricePerUnit).toFixed(2)}</td>
                              <td className="p-2.5 text-right font-bold text-gray-900">
                                ₹{Number(p.totalAmount).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      No purchase records yet for this item.
                    </div>
                  )
                ) : item.recentSales && item.recentSales.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Sale #</th>
                          <th className="p-2.5">Customer</th>
                          <th className="p-2.5 text-right">Qty</th>
                          <th className="p-2.5 text-right">Sell Price</th>
                          <th className="p-2.5 text-right">FIFO Cost</th>
                          <th className="p-2.5 text-right">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {item.recentSales.map((s: any) => (
                          <tr key={s.id} className="hover:bg-gray-50/50">
                            <td className="p-2.5 text-gray-600 font-mono">
                              {new Date(s.saleDate).toLocaleDateString('en-IN')}
                            </td>
                            <td className="p-2.5 font-medium text-emerald-700">{s.saleNumber}</td>
                            <td className="p-2.5 text-gray-800 font-medium">{s.customerName || 'Direct / Walk-in'}</td>
                            <td className="p-2.5 text-right font-semibold">{s.quantity}</td>
                            <td className="p-2.5 text-right">₹{Number(s.sellingPricePerUnit).toFixed(2)}</td>
                            <td className="p-2.5 text-right text-gray-500">
                              ₹{Number(s.purchaseCostPerUnit).toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-700">
                              +₹{Number(s.profit).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No sales records yet for this item.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
