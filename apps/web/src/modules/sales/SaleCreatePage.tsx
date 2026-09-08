import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { useCustomersQuery, useCustomerDetailQuery, type CustomerSummary } from '../customers/customer.api';
import { CustomerFormModal } from '../customers/components/CustomerFormModal';
import { useProductsQuery, useCreateSaleMutation } from './sales.api';
import { useToast } from '../../providers/ToastProvider';
import {
  ShoppingBag,
  Trash2,
  User,
  UserPlus,
  Search,
  X,
  MapPin,
  Mail,
  Building,
  Calculator,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import type { SaleItemInput } from '@crm/validation';

// Specifier types
type ProductSpecifier = 'RO_MACHINE' | 'SPARE_PART';

interface FormLineItem {
  specifier: ProductSpecifier;
  productId?: string;
  productName: string;
  sku: string;
  productType: 'RO_MACHINE' | 'FILTER_CARTRIDGE' | 'SPARE_PART' | 'ACCESSORY' | 'SERVICE';
  brand?: string;
  model?: string;
  purificationCapacity?: string;
  storageCapacity?: string;
  technology?: string;
  partCategory?: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRatePercent: number;
  serialNumber?: string;
  nextServiceDate?: string;
  installationRequired?: boolean;
  warrantyPeriodMonths: number;
  warrantyPreset: '1M' | '3M' | '6M' | '1Y' | '2Y' | 'CUSTOM' | 'NO_WARRANTY';
}

const WARRANTY_PRESETS = [
  { id: 'NO_WARRANTY', label: 'No Warranty', months: 0 },
  { id: '1M', label: '1M', months: 1 },
  { id: '3M', label: '3M', months: 3 },
  { id: '6M', label: '6M', months: 6 },
  { id: '1Y', label: '1Y (12M)', months: 12 },
  { id: '2Y', label: '2Y (24M)', months: 24 },
  { id: 'CUSTOM', label: 'Custom', months: null },
] as const;

export const SaleCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [customerId, setCustomerId] = useState(searchParams.get('customerId') || '');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [documentDiscount, setDocumentDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<FormLineItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Draft product state for manual entry
  const [draftSpecifier, setDraftSpecifier] = useState<ProductSpecifier>('RO_MACHINE');
  const [draftName, setDraftName] = useState('');
  const [draftBrand, setDraftBrand] = useState('Kent');
  const [draftModel, setDraftModel] = useState('');
  const [draftSku, setDraftSku] = useState('');
  const [draftPurificationCapacity, setDraftPurificationCapacity] = useState('15 LPH');
  const [draftStorageCapacity, setDraftStorageCapacity] = useState('8 Litres');
  const [draftTechnology, setDraftTechnology] = useState('RO + UV + UF + TDS Controller');
  const [draftSerialNumber, setDraftSerialNumber] = useState('');
  const [draftNextServiceDate, setDraftNextServiceDate] = useState('');
  const [draftPartCategory, setDraftPartCategory] = useState('Filter Cartridge');
  const [draftHsnCode, setDraftHsnCode] = useState('84212190');
  const [draftQuantity, setDraftQuantity] = useState<number>(1);
  const [draftUnitPrice, setDraftUnitPrice] = useState<string>('16500');
  const [draftDiscountAmount, setDraftDiscountAmount] = useState<string>('0');
  const [draftTaxRatePercent, setDraftTaxRatePercent] = useState<number>(0);
  const [draftWarrantyPreset, setDraftWarrantyPreset] = useState<'1M' | '3M' | '6M' | '1Y' | '2Y' | 'CUSTOM' | 'NO_WARRANTY'>('1Y');
  const [draftCustomWarrantyMonths, setDraftCustomWarrantyMonths] = useState<number>(12);
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
  const [extraCustomers, setExtraCustomers] = useState<CustomerSummary[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearchQuery]);

  // Queries (real-time server search + newest first)
  const { data: customerResponse } = useCustomersQuery({
    search: debouncedCustomerSearch || undefined,
    page: 1,
    limit: 100,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const { data: customerDetailData } = useCustomerDetailQuery(customerId || undefined);
  const createSaleMutation = useCreateSaleMutation();

  const fetchedCustomers = customerResponse?.data || [];

  // Merge extra (e.g. newly created) customers and fetched customers without duplicates
  const allAvailableCustomers = useMemo(() => {
    const map = new Map<string, CustomerSummary>();
    for (const c of extraCustomers) {
      map.set(c.id, c);
    }
    if (customerDetailData) {
      map.set(customerDetailData.id, customerDetailData);
    }
    for (const c of fetchedCustomers) {
      map.set(c.id, c);
    }
    return Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [extraCustomers, customerDetailData, fetchedCustomers]);

  const selectedCustomer = allAvailableCustomers.find((c) => c.id === customerId) || customerDetailData;

  // Filtered customer list (strictly sorted with newest customer on top)
  const filteredCustomersList = useMemo(() => {
    let list = allAvailableCustomers;
    const q = customerSearchQuery.trim().toLowerCase();
    if (q) {
      list = allAvailableCustomers.filter((c) => {
        const matchName = c.fullName?.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q);
        const matchNum = c.customerNumber?.toLowerCase().includes(q);
        const matchComp = c.companyName?.toLowerCase().includes(q);
        return matchName || matchPhone || matchNum || matchComp;
      });
    }

    return [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [allAvailableCustomers, customerSearchQuery]);

  const handleCustomerCreated = (newCust: CustomerSummary) => {
    setIsAddCustomerOpen(false);
    if (newCust && newCust.id) {
      setExtraCustomers((prev) => [newCust, ...prev.filter((c) => c && c.id && c.id !== newCust.id)]);
      setCustomerId(newCust.id);
    }
    setCustomerSearchQuery('');
  };

  // Switch specifier and apply sensible defaults
  const handleSpecifierSwitch = (spec: ProductSpecifier) => {
    setDraftSpecifier(spec);
    if (spec === 'RO_MACHINE') {
      setDraftName('');
      setDraftBrand('Kent');
      setDraftModel('Grand Plus');
      setDraftHsnCode('84212190');
      setDraftUnitPrice('16500');
      setDraftWarrantyPreset('1Y');
      setDraftCustomWarrantyMonths(12);
      setDraftPurificationCapacity('15 LPH');
      setDraftStorageCapacity('8 Litres');
      setDraftTechnology('RO + UV + UF + TDS Controller');
    } else {
      setDraftName('');
      setDraftBrand('Kemflo');
      setDraftModel('');
      setDraftHsnCode('84219900');
      setDraftUnitPrice('450');
      setDraftWarrantyPreset('3M');
      setDraftCustomWarrantyMonths(3);
      setDraftPartCategory('Filter Cartridge');
    }
  };

  // Add draft product to line items
  const handleAddDraftItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftName.trim()) {
      toast.error('Please enter the Product / Machine Name.', 'Product Name Required');
      return;
    }

    const price = parseFloat(draftUnitPrice);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid unit price.', 'Price Invalid');
      return;
    }

    const discount = parseFloat(draftDiscountAmount) || 0;
    const qty = Math.max(1, draftQuantity || 1);

    // Calculate warranty months
    let warrantyMonths = 12;
    if (draftWarrantyPreset === 'NO_WARRANTY') warrantyMonths = 0;
    else if (draftWarrantyPreset === '1M') warrantyMonths = 1;
    else if (draftWarrantyPreset === '3M') warrantyMonths = 3;
    else if (draftWarrantyPreset === '6M') warrantyMonths = 6;
    else if (draftWarrantyPreset === '1Y') warrantyMonths = 12;
    else if (draftWarrantyPreset === '2Y') warrantyMonths = 24;
    else warrantyMonths = Math.max(0, draftCustomWarrantyMonths || 0);

    const generatedSku = draftSku.trim() || `${draftSpecifier === 'RO_MACHINE' ? 'RO' : 'SPARE'}-${(draftBrand || 'SR').slice(0, 4).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const generatedSerial = draftSpecifier === 'RO_MACHINE'
      ? (draftSerialNumber.trim() || `SN-RO-${Date.now().toString().slice(-6)}`)
      : (draftSerialNumber.trim() || undefined);

    const newItem: FormLineItem = {
      specifier: draftSpecifier,
      productName: draftName.trim(),
      sku: generatedSku,
      productType: draftSpecifier,
      brand: draftBrand.trim() || 'SR Enterprises',
      model: draftModel.trim() || undefined,
      purificationCapacity: draftSpecifier === 'RO_MACHINE' ? draftPurificationCapacity : undefined,
      storageCapacity: draftSpecifier === 'RO_MACHINE' ? draftStorageCapacity : undefined,
      technology: draftSpecifier === 'RO_MACHINE' ? draftTechnology : undefined,
      partCategory: draftSpecifier === 'SPARE_PART' ? draftPartCategory : undefined,
      hsnCode: draftHsnCode.trim() || (draftSpecifier === 'RO_MACHINE' ? '84212190' : '84219900'),
      quantity: qty,
      unitPrice: price,
      discountAmount: discount,
      taxRatePercent: draftTaxRatePercent,
      serialNumber: generatedSerial,
      nextServiceDate: draftNextServiceDate ? draftNextServiceDate.trim() : undefined,
      warrantyPeriodMonths: warrantyMonths,
      warrantyPreset: draftWarrantyPreset,
    };

    setItems((prev) => [...prev, newItem]);
    toast.success(`Added "${newItem.productName}" to sale items.`);

    // Reset draft fields for quick next entry
    setDraftName('');
    setDraftSerialNumber('');
    setDraftNextServiceDate('');
    setDraftDiscountAmount('0');
  };

  const handleUpdateItem = <K extends keyof FormLineItem>(index: number, field: K, value: FormLineItem[K]) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = updated[index];
      if (!current) return prev;
      updated[index] = { ...current, [field]: value };
      return updated;
    });
  };

  const handleWarrantyPresetChange = (index: number, preset: '1M' | '3M' | '6M' | '1Y' | '2Y' | 'CUSTOM' | 'NO_WARRANTY') => {
    const config = WARRANTY_PRESETS.find((p) => p.id === preset);
    setItems((prev) => {
      const updated = [...prev];
      const current = updated[index];
      if (!current) return prev;
      const months = config?.months !== null ? config!.months : current.warrantyPeriodMonths || 12;
      updated[index] = {
        ...current,
        warrantyPreset: preset,
        warrantyPeriodMonths: months,
      };
      return updated;
    });
  };

  const handleCustomWarrantyMonthsChange = (index: number, months: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = updated[index];
      if (!current) return prev;
      updated[index] = {
        ...current,
        warrantyPreset: 'CUSTOM',
        warrantyPeriodMonths: Math.max(0, months),
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Real-time financial calculations
  const financials = useMemo(() => {
    let subtotal = 0;
    let lineDiscounts = 0;
    let taxTotal = 0;

    items.forEach((item) => {
      const lineSubtotal = (item.quantity || 1) * (item.unitPrice || 0);
      const discount = Math.min(lineSubtotal, item.discountAmount || 0);
      const taxable = Math.max(0, lineSubtotal - discount);
      const taxRate = item.taxRatePercent !== undefined && item.taxRatePercent !== null ? item.taxRatePercent : 0;
      const tax = taxable * (taxRate / 100);

      subtotal += lineSubtotal;
      lineDiscounts += discount;
      taxTotal += tax;
    });

    const totalDiscount = lineDiscounts + Math.max(0, documentDiscount || 0);
    const grandTotal = Math.max(0, subtotal - totalDiscount + taxTotal);

    return {
      subtotal: subtotal.toFixed(2),
      discount: totalDiscount.toFixed(2),
      tax: taxTotal.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
    };
  }, [items, documentDiscount]);

  const handleSubmit = async (targetStatus: 'DRAFT' | 'COMPLETED') => {
    if (isSubmitting || createSaleMutation.isPending) return;

    if (!customerId) {
      toast.error('Please select a customer for this sale.', 'Customer Required');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one product to the sale.', 'Line Items Required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId,
        saleDate: new Date(saleDate || new Date()),
        items: items.map((i) => ({
          productId: i.productId || undefined,
          productName: i.productName,
          sku: i.sku,
          productType: i.productType as any,
          brand: i.brand,
          model: i.model,
          purificationCapacity: i.purificationCapacity,
          storageCapacity: i.storageCapacity,
          technology: i.technology,
          partCategory: i.partCategory,
          hsnCode: i.hsnCode,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discountAmount: Number(i.discountAmount || 0),
          taxRatePercent: Number(i.taxRatePercent !== undefined && i.taxRatePercent !== null ? i.taxRatePercent : 0),
          serialNumber: i.serialNumber ? i.serialNumber.trim() : undefined,
          nextServiceDate: i.nextServiceDate ? i.nextServiceDate.trim() : undefined,
          warrantyPeriodMonths: Number(i.warrantyPeriodMonths ?? 12),
          warrantyMonths: Number(i.warrantyPeriodMonths ?? 12),
        })),
        discountAmount: Number(documentDiscount || 0),
        notes: notes ? notes.trim() : undefined,
        status: targetStatus,
      };

      const result = await createSaleMutation.mutateAsync(payload);
      toast.success(
        `Sale ${result?.saleNumber} successfully recorded.`,
        targetStatus === 'COMPLETED' ? 'Sale Confirmed & Invoice Issued' : 'Draft Sale Saved'
      );

      if (result?.id) {
        navigate(`/sales/${result.id}`);
      } else {
        navigate('/sales');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save sale transaction.', 'Sale Creation Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <PageHeader
        title="Create New Sale"
        description="Record RO machine purchase or spare parts order with automated GST and asset creation."
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Sales', href: '/sales' },
          { label: 'New Sale' },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate('/sales')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Sales
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Customer Selection */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary-600" />
                <h2 className="text-base font-bold text-slate-900">1. Customer Details</h2>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddCustomerOpen(true)}
                leftIcon={<UserPlus className="w-4 h-4 text-primary-600" />}
                className="text-xs"
              >
                Add New Customer
              </Button>
            </div>

            <div className="space-y-3">
              {/* Customer Search Bar */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Search Customer <span className="text-slate-400 font-normal normal-case">(Name, Phone, or ID)</span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    placeholder="Search by customer name, phone number, or ID..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="pl-9 pr-8"
                  />
                  {customerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {customerSearchQuery.trim() && (
                  <div className="mt-1 flex items-center justify-between text-2xs text-slate-500 px-1">
                    <span>
                      Found {filteredCustomersList.length} matching {filteredCustomersList.length === 1 ? 'customer' : 'customers'}
                    </span>
                    {filteredCustomersList.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAddCustomerOpen(true)}
                        className="text-primary-600 hover:underline font-medium cursor-pointer"
                      >
                        + Create &quot;{customerSearchQuery}&quot; as new customer
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Customer Select Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Customer <span className="text-red-500">*</span>
                </label>
                <Select
                  options={[
                    { value: '', label: customerSearchQuery.trim() ? `-- Select from ${filteredCustomersList.length} filtered results --` : '-- Choose Customer --' },
                    ...filteredCustomersList.map((c) => ({
                      value: c.id,
                      label: `${c.fullName} (${c.phone}) — ${c.customerNumber}${c.companyName ? ` [${c.companyName}]` : ''}`,
                    })),
                  ]}
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                />
              </div>

              {selectedCustomer && (
                <div className="bg-gradient-to-r from-primary-50/70 to-slate-50 p-4 rounded-xl border border-primary-100/80 text-xs text-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{selectedCustomer.fullName}</span>
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-800 rounded-md font-mono text-2xs font-bold border border-primary-200">
                        {selectedCustomer.customerNumber}
                      </span>
                      {selectedCustomer.customerType && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-2xs font-medium uppercase">
                          {selectedCustomer.customerType}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomerId('')}
                      className="text-2xs text-rose-600 hover:text-rose-700 hover:underline font-medium cursor-pointer"
                    >
                      Clear / Change
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs text-slate-600 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Phone: <strong className="text-slate-800">{selectedCustomer.phone}</strong></span>
                    </div>
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Email: <strong className="text-slate-800">{selectedCustomer.email}</strong></span>
                      </div>
                    )}
                    {selectedCustomer.companyName && (
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Company: <strong className="text-slate-800">{selectedCustomer.companyName}</strong></span>
                      </div>
                    )}
                    {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 && (
                      <div className="flex items-center gap-1.5 sm:col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          Address: <strong className="text-slate-800">{selectedCustomer.addresses[0]?.city}, {selectedCustomer.addresses[0]?.state}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Sale Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Order Reference / Notes
                  </label>
                  <Input
                    placeholder="e.g. Ground floor installation, festive discount"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Section 2: Product Detail Manual Entry & Specifier */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">2. Product Details & Item Entry</h2>
              </div>
              <span className="text-xs bg-primary-50 text-primary-700 font-bold px-2.5 py-1 rounded-full border border-primary-200">
                {items.length} item(s) in sale
              </span>
            </div>

            {/* Specifier Switcher */}
            <div className="mb-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Item Classification / Specifier <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSpecifierSwitch('RO_MACHINE')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    draftSpecifier === 'RO_MACHINE'
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base">💧</span>
                  <span>RO Purifier Machine</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSpecifierSwitch('SPARE_PART')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    draftSpecifier === 'SPARE_PART'
                      ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/30'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base">🔧</span>
                  <span>Spare Part / Filter / Accessory</span>
                </button>
              </div>

              {/* Dynamic Form for the selected Specifier */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                {draftSpecifier === 'RO_MACHINE' ? (
                  /* ================= RO PURIFIER FIELDS ================= */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          RO Machine / Model Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          placeholder="e.g. Kent Grand Plus RO+UV+UF+TDS Controller"
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Brand / Make</label>
                        <Input
                          placeholder="e.g. Kent, Aquaguard, Pureit, SR OEM"
                          value={draftBrand}
                          onChange={(e) => setDraftBrand(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Purification Capacity</label>
                        <Input
                          placeholder="e.g. 15 LPH, 25 LPH, 50 LPH, 100 GPD"
                          value={draftPurificationCapacity}
                          onChange={(e) => setDraftPurificationCapacity(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Storage Tank Capacity</label>
                        <Input
                          placeholder="e.g. 8 Litres, 10 Litres, 12L"
                          value={draftStorageCapacity}
                          onChange={(e) => setDraftStorageCapacity(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Purification Technology</label>
                        <Input
                          placeholder="e.g. RO + UV + UF + TDS Control"
                          value={draftTechnology}
                          onChange={(e) => setDraftTechnology(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Machine Serial Number <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <Input
                          placeholder="e.g. SN-2026-KG-09812 (Auto if blank)"
                          value={draftSerialNumber}
                          onChange={(e) => setDraftSerialNumber(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Next Service / Visit Date <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <Input
                          type="date"
                          value={draftNextServiceDate}
                          onChange={(e) => setDraftNextServiceDate(e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">HSN Code</label>
                        <Input
                          placeholder="84212190"
                          value={draftHsnCode}
                          onChange={(e) => setDraftHsnCode(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= SPARE PART / FILTER FIELDS ================= */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Spare Part / Filter Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          placeholder="e.g. Sediment Filter 10 Inch Spun, RO Membrane 75 GPD, Booster Pump 24V"
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Component Category</label>
                        <Select
                          options={[
                            { value: 'Filter Cartridge', label: 'Filter Cartridge (Sediment/Carbon)' },
                            { value: 'RO Membrane', label: 'RO Membrane (75/80/100 GPD)' },
                            { value: 'Booster Pump', label: 'Booster Pump (24V / 48V)' },
                            { value: 'SMPS Power Adapter', label: 'SMPS Power Adapter (24V/36V)' },
                            { value: 'Solenoid / Float Valve', label: 'Solenoid Valve (SV) / Float Valve' },
                            { value: 'UV Tube / Ballast', label: 'UV Lamp Tube / Philips Ballast' },
                            { value: 'Fitting / Tubing', label: 'Diverter Valve / Fitting / Tubing' },
                            { value: 'Mineral Cartridge', label: 'Alkaline Bio-Mineral Cartridge' },
                            { value: 'Chemical / Consumable', label: 'Antiscalant Ball / Media Resin' },
                            { value: 'Other Accessory', label: 'Other Spare / Accessory' },
                          ]}
                          value={draftPartCategory}
                          onChange={(e) => setDraftPartCategory(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Brand / Grade</label>
                        <Input
                          placeholder="e.g. Kemflo, Vontron, Dow Filmtec, BNQS"
                          value={draftBrand}
                          onChange={(e) => setDraftBrand(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Part SKU / Code</label>
                        <Input
                          placeholder="e.g. SED-10-SPUN, MEM-75-VON"
                          value={draftSku}
                          onChange={(e) => setDraftSku(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">HSN Code</label>
                        <Input
                          placeholder="84219900"
                          value={draftHsnCode}
                          onChange={(e) => setDraftHsnCode(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Common Financials & Warranty for the draft item */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={draftQuantity}
                        onChange={(e) => setDraftQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Unit Price (₹) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={draftUnitPrice}
                        onChange={(e) => setDraftUnitPrice(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Discount (₹)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={draftDiscountAmount}
                        onChange={(e) => setDraftDiscountAmount(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">GST Tax Rate</label>
                      <Select
                        options={[
                          { value: '0', label: '0% GST (None / Exempt)' },
                          { value: '5', label: '5% GST' },
                          { value: '12', label: '12% GST' },
                          { value: '18', label: '18% GST (Standard)' },
                          { value: '28', label: '28% GST' },
                        ]}
                        value={String(draftTaxRatePercent)}
                        onChange={(e) => setDraftTaxRatePercent(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Warranty Selector for draft item */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Warranty Coverage:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {WARRANTY_PRESETS.map((preset) => {
                        const isSelected = draftWarrantyPreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setDraftWarrantyPreset(preset.id)}
                            className={`px-2.5 py-1 text-2xs font-medium rounded-md transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}

                      {draftWarrantyPreset === 'CUSTOM' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="120"
                            value={draftCustomWarrantyMonths}
                            onChange={(e) => setDraftCustomWarrantyMonths(parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-0.5 text-2xs border border-emerald-400 rounded text-slate-900 bg-white font-bold text-center"
                          />
                          <span className="text-2xs text-slate-500">Months</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Item Button */}
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleAddDraftItem}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    + Add This {draftSpecifier === 'RO_MACHINE' ? 'RO Machine' : 'Spare Part'} to Sale
                  </Button>
                </div>
              </div>
            </div>

            {/* Line Items List */}
            {items.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">No products added to this sale yet</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fill in the product details above and click &quot;+ Add This Product&quot; to include it in this order.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, idx) => {
                  const lineSub = (item.quantity || 1) * (item.unitPrice || 0);
                  const lineDisc = Math.min(lineSub, item.discountAmount || 0);
                  const taxRate = item.taxRatePercent !== undefined && item.taxRatePercent !== null ? item.taxRatePercent : 0;
                  const lineTax = (lineSub - lineDisc) * (taxRate / 100);
                  const lineTotal = lineSub - lineDisc + lineTax;

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3 relative group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{item.productName}</span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-2xs font-bold ${
                                item.productType === 'RO_MACHINE'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {item.productType === 'RO_MACHINE' ? '💧 RO Machine' : `🔧 Spare: ${item.partCategory || 'Part'}`}
                            </span>
                            {item.brand && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-2xs font-medium">
                                Brand: {item.brand}
                              </span>
                            )}
                          </div>

                          <div className="text-2xs text-slate-500 font-mono flex flex-wrap gap-x-3 gap-y-1">
                            {item.sku && <span>SKU: {item.sku}</span>}
                            {item.hsnCode && <span>HSN: {item.hsnCode}</span>}
                            {item.purificationCapacity && <span>Capacity: {item.purificationCapacity}</span>}
                            {item.storageCapacity && <span>Tank: {item.storageCapacity}</span>}
                            {item.technology && <span>Tech: {item.technology}</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remove Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <label className="block font-medium text-slate-600 mb-1">Qty</label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-600 mb-1">Unit Price (₹)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-600 mb-1">Discount (₹)</label>
                          <Input
                            type="number"
                            min="0"
                            value={item.discountAmount}
                            onChange={(e) => handleUpdateItem(idx, 'discountAmount', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-600 mb-1">GST Tax</label>
                          <div className="py-2 px-3 bg-slate-100 rounded text-slate-700 font-medium text-xs">
                            {item.taxRatePercent}% (₹{lineTax.toFixed(2)})
                          </div>
                        </div>
                      </div>

                      {item.productType === 'RO_MACHINE' && (
                        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Machine Serial #:</span>
                            <input
                              type="text"
                              placeholder="e.g. SN-8921-2026"
                              value={item.serialNumber || ''}
                              onChange={(e) => handleUpdateItem(idx, 'serialNumber', e.target.value)}
                              className="px-2.5 py-1 text-xs border border-slate-300 rounded font-mono bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 w-full"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Next Service Date:</span>
                            <input
                              type="date"
                              value={item.nextServiceDate || ''}
                              onChange={(e) => handleUpdateItem(idx, 'nextServiceDate', e.target.value)}
                              className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 w-full"
                            />
                          </div>
                        </div>
                      )}

                      {/* Warranty Period Option */}
                      <div className="pt-2.5 pb-1 border-t border-slate-100 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Warranty Period:</span>
                          </div>
                          <span className="text-2xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {item.warrantyPeriodMonths === 0
                              ? 'No Warranty'
                              : item.warrantyPeriodMonths >= 12 && item.warrantyPeriodMonths % 12 === 0
                              ? `${item.warrantyPeriodMonths / 12} Year${item.warrantyPeriodMonths > 12 ? 's' : ''} (${item.warrantyPeriodMonths} Months)`
                              : `${item.warrantyPeriodMonths} Month${item.warrantyPeriodMonths === 1 ? '' : 's'}`} Coverage
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {WARRANTY_PRESETS.map((preset) => {
                            const isSelected = item.warrantyPreset === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleWarrantyPresetChange(idx, preset.id)}
                                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white shadow-xs font-bold ring-2 ring-emerald-600/30'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}

                          {/* Custom Input */}
                          {item.warrantyPreset === 'CUSTOM' && (
                            <div className="flex items-center gap-1.5 ml-1 animate-in fade-in duration-150">
                              <input
                                type="number"
                                min="0"
                                max="120"
                                value={item.warrantyPeriodMonths}
                                onChange={(e) => handleCustomWarrantyMonthsChange(idx, parseInt(e.target.value) || 0)}
                                className="w-20 px-2.5 py-1 text-xs border border-emerald-400 rounded-lg font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                placeholder="Months"
                              />
                              <span className="text-2xs text-slate-600 font-medium">Months</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-500">
                          {item.quantity} × ₹{item.unitPrice?.toFixed(2)}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          Line Total: ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Financial Summary & Confirmation Actions */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Calculator className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Financial Summary</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-medium text-slate-900">₹{financials.subtotal}</span>
              </div>

              <div className="flex justify-between text-slate-600 items-center">
                <span>Extra Order Discount (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={documentDiscount}
                  onChange={(e) => setDocumentDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 text-right text-xs border border-slate-300 rounded font-mono bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Total Discounts Applied</span>
                <span className="font-mono text-emerald-600 font-semibold">-₹{financials.discount}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>GST Tax</span>
                <span className="font-mono font-medium text-slate-900">₹{financials.tax}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-base">Grand Total</span>
                <span className="font-bold text-primary-700 text-xl font-mono">
                  ₹{financials.grandTotal}
                </span>
              </div>
            </div>

            {/* Business Confirmation Notice */}
            <div className="mt-5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Automated Confirmation Workflow</span>
              </div>
              <p className="leading-relaxed">
                Confirming this sale will automatically generate an authoritative **GST Invoice**, register **Customer Assets**, and activate initial **Standard Warranties**.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-2.5">
              <Button
                variant="primary"
                className="w-full"
                isLoading={isSubmitting || createSaleMutation.isPending}
                disabled={isSubmitting || createSaleMutation.isPending}
                onClick={() => handleSubmit('COMPLETED')}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Save & Confirm Sale
              </Button>

              <Button
                variant="outline"
                className="w-full"
                disabled={isSubmitting || createSaleMutation.isPending}
                onClick={() => handleSubmit('DRAFT')}
              >
                Save as Draft Order
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      <CustomerFormModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSuccess={handleCustomerCreated}
      />
    </div>
  );
};
