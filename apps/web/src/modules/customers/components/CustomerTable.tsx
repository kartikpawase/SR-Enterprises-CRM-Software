import React from 'react';
import { Eye, MoreVertical, CheckCircle2, XCircle } from 'lucide-react';

export interface CustomerRecord {
  id: string;
  customerNumber: string;
  fullName: string;
  initials: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  customerType: 'INDIVIDUAL' | 'COMMERCIAL';
  lastServiceDate: string;
  nextServiceDate: string;
  nextServiceDays: number | 'Expired' | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  customerLabel?: 'GOOD' | 'BAD' | null;
  customLabel?: { id: string; name: string; color: string } | null;
  summary: {
    totalInvoices: string;
    outstanding: string;
    activeWarranty: string;
    customerSince: string;
  };
  assets?: any[];
  services?: any[];
  invoices?: any[];
  payments?: any[];
  assetsCount: number;
  servicesCount: number;
  invoicesCount: number;
  paymentsCount: number;
}

export interface CustomerTableProps {
  customers: CustomerRecord[];
  selectedCustomerId?: string;
  onSelectCustomer: (customer: CustomerRecord) => void;
  onViewProfile?: (customer: CustomerRecord) => void;
  onActionClick?: (customer: CustomerRecord, e: React.MouseEvent) => void;
  isLoading?: boolean;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onViewProfile,
  onActionClick,
  isLoading,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse select-none">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th scope="col" className="py-3 px-4 pl-5">CUSTOMER</th>
              <th scope="col" className="py-3 px-4">CONTACT</th>
              <th scope="col" className="py-3 px-4">CITY</th>
              <th scope="col" className="py-3 px-4">LAST SERVICE</th>
              <th scope="col" className="py-3 px-4">NEXT SERVICE</th>
              <th scope="col" className="py-3 px-4">STATUS</th>
              <th scope="col" className="py-3 px-4 pr-5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {customers.map((customer) => {
              const isSelected = customer.id === selectedCustomerId;
              const isExpired = customer.nextServiceDays === 'Expired';

              return (
                <tr
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer)}
                  className={`transition-colors cursor-pointer group relative ${
                    isSelected ? 'bg-sky-50/60' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* 1. CUSTOMER (Avatar with initials + Name + Customer ID) */}
                  <td className="py-3.5 px-4 pl-5 relative">
                    {/* Active selection bar on left edge */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-600 rounded-r" />
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 font-mono font-bold text-xs flex items-center justify-center border border-sky-200/80 shadow-2xs shrink-0">
                        {customer.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm block group-hover:text-primary-600 transition-colors truncate">
                            {customer.fullName}
                          </span>
                          {customer.customerLabel === 'GOOD' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs shrink-0">
                              Good Customer
                            </span>
                          )}
                          {customer.customerLabel === 'BAD' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200/90 shadow-2xs shrink-0">
                              Bad Customer
                            </span>
                          )}
                          {customer.customLabel && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs shrink-0"
                              style={{
                                backgroundColor: `${customer.customLabel.color}15`,
                                color: customer.customLabel.color,
                                borderColor: `${customer.customLabel.color}40`,
                              }}
                            >
                              {customer.customLabel.name}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono block font-semibold">
                          {customer.customerNumber}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 2. CONTACT (Phone primary + Email secondary) */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-900 text-xs block font-mono">
                        {customer.phone}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate max-w-[150px] font-medium">
                        {customer.email}
                      </span>
                    </div>
                  </td>

                  {/* 3. CITY */}
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-700 text-xs sm:text-sm">
                      {customer.city}
                    </span>
                  </td>

                  {/* 4. LAST SERVICE */}
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-700 text-xs sm:text-sm font-mono">
                      {customer.lastServiceDate || '—'}
                    </span>
                  </td>

                  {/* 5. NEXT SERVICE (Date + Remaining Days Badge) */}
                  <td className="py-3.5 px-4">
                    <div>
                      <span className="font-semibold text-slate-800 text-xs block font-mono">
                        {customer.nextServiceDate || '—'}
                      </span>
                      {customer.nextServiceDays !== null && customer.nextServiceDays !== undefined && (
                        isExpired ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-red-700 bg-red-50 border border-red-200/80 px-1.5 py-0.5 rounded-full mt-0.5">
                            <XCircle className="w-2.5 h-2.5" />
                            <span>Expired</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-full mt-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>{customer.nextServiceDays} days left</span>
                          </span>
                        )
                      )}
                    </div>
                  </td>

                  {/* 6. STATUS (Active / Inactive compact pill) */}
                  <td className="py-3.5 px-4">
                    {customer.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>Inactive</span>
                      </span>
                    )}
                  </td>

                  {/* 7. ACTIONS (View eye icon + 3-dot vertical menu) */}
                  <td className="py-3.5 px-4 pr-5 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onViewProfile ? onViewProfile(customer) : onSelectCustomer(customer)}
                        title="View Customer Profile"
                        aria-label={`View profile for ${customer.fullName}`}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-sky-50 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => onActionClick && onActionClick(customer, e)}
                        title="More options"
                        aria-label={`More options for ${customer.fullName}`}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {customers.length === 0 && (
        <div className="p-12 text-center text-slate-500">
          <p className="text-sm font-semibold">No customers found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
};
