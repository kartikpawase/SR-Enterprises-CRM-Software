import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Wrench,
  Package,
  HardHat,
  Info,
  X,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useCustomersQuery, useCustomerDetailQuery } from '../../customers/customer.api';
import { useTechniciansQuery } from '../../technicians/technicians.api';
import { useCreateRentalMutation, type CreateRentalPayload } from '../rentals.api';
import { useToast } from '../../../providers/ToastProvider';
import { formatINR } from '../../../lib/formatters';

export interface RentalCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedCustomerId?: string;
}

function generateMachineSerialNumber(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year2 = String(now.getFullYear()).slice(-2);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SN-RO-${day}${month}${year2}-${rand}`;
}

export const RentalCreateModal: React.FC<RentalCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedCustomerId,
}) => {
  const toast = useToast();
  const createRentalMutation = useCreateRentalMutation();

  // Customer search & selection state
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId || '');

  // Debounce customer search input by 200ms
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(customerSearch);
    }, 200);
    return () => clearTimeout(handler);
  }, [customerSearch]);

  // Queries
  const { data: customersData, isLoading: isCustomersLoading } = useCustomersQuery({
    page: 1,
    limit: 100,
    search: debouncedSearch.trim() || undefined,
    status: 'ACTIVE',
    sortBy: 'customerNumber',
    sortOrder: 'asc',
  });
  const { data: customerDetail } = useCustomerDetailQuery(selectedCustomerId || undefined);
  const { data: techniciansData } = useTechniciansQuery({});

  // Form State
  const [formData, setFormData] = useState({
    // Machine Details
    machineType: 'RO',
    machineModel: 'SR Aqua Pure Pro RO',
    serialNumber: generateMachineSerialNumber(),
    capacityLph: '15 LPH',
    installationLocation: 'Kitchen Counter',
    machineCondition: 'GOOD' as const,
    accessories: 'Pre-filter housing, 5-micron spun filter, diverter valve, inlet tubing',
    remarks: '',

    // Agreement Details
    rentalStartDate: new Date().toISOString().split('T')[0],
    rentalEndDate: '',
    rentalDuration: 'MONTHLY' as const,
    minimumRentalPeriodMonths: 1,
    billingFrequency: 'MONTHLY' as const,

    // Pricing
    monthlyRent: 500,
    securityDeposit: 1500,
    depositStatus: 'COLLECTED' as const,

    // Initial Payment
    initialDepositPaid: true,
    initialRentPaid: true,
    paymentMethod: 'UPI',
    referenceNumber: '',

    // Installation
    installationDate: new Date().toISOString().split('T')[0],
    installationTime: '11:00 AM',
    installationAddress: '',
    technicianId: '',
    installationStatus: 'INSTALLED' as const,
    installationNotes: 'Machine tested and pure TDS level verified at 45 ppm.',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Central Customers Filter
  const customersList = useMemo(() => customersData?.data || [], [customersData]);
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customersList.slice(0, 20);
    const query = customerSearch.toLowerCase().trim();
    return customersList.filter(
      (c) =>
        c.fullName.toLowerCase().includes(query) ||
        (c.phone && c.phone.toLowerCase().includes(query)) ||
        (c.customerNumber && c.customerNumber.toLowerCase().includes(query)) ||
        (c.companyName && c.companyName.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query))
    );
  }, [customersList, customerSearch]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    if (customerDetail && (customerDetail as any).id === selectedCustomerId) {
      return customerDetail as any;
    }
    return customersList.find((c) => c.id === selectedCustomerId) || null;
  }, [customersList, selectedCustomerId, customerDetail]);

  const selectedCustomerAddress = useMemo(() => {
    if (!selectedCustomer?.addresses || selectedCustomer.addresses.length === 0) return '';
    const addr = selectedCustomer.addresses[0];
    return `${addr.addressLine1 || ''}${addr.city ? `, ${addr.city}` : ''}`;
  }, [selectedCustomer]);

  const handleSelectCustomer = (cust: any) => {
    setSelectedCustomerId(cust.id);
    const addr = cust.addresses?.[0];
    if (addr && !formData.installationAddress) {
      setFormData((prev) => ({
        ...prev,
        installationAddress: `${addr.addressLine1 || ''}${addr.city ? `, ${addr.city}` : ''}`,
      }));
    }
  };

  const calculateInitialTotal = () => {
    let total = 0;
    if (formData.initialDepositPaid) total += Number(formData.securityDeposit || 0);
    if (formData.initialRentPaid) total += Number(formData.monthlyRent || 0);
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!selectedCustomerId) {
      errors.customer = 'Please select a customer from the customer database';
    }
    const serialNumber = formData.serialNumber.trim() || generateMachineSerialNumber();
    if (!formData.machineModel.trim()) {
      errors.machineModel = 'Machine model is required';
    }
    if (!formData.monthlyRent || formData.monthlyRent <= 0) {
      errors.monthlyRent = 'Monthly rent must be greater than 0';
    }
    if (!formData.rentalStartDate) {
      errors.rentalStartDate = 'Rental start date is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please complete all required fields', 'Validation Error');
      return;
    }

    try {
      const payload: CreateRentalPayload = {
        customerId: selectedCustomerId,
        machineType: formData.machineType,
        machineModel: formData.machineModel.trim(),
        serialNumber,
        capacityLph: formData.capacityLph,
        installationLocation: formData.installationLocation,
        machineCondition: formData.machineCondition,
        accessories: formData.accessories,
        remarks: formData.remarks,
        rentalStartDate: formData.rentalStartDate,
        rentalEndDate: formData.rentalEndDate || undefined,
        rentalDuration: formData.rentalDuration,
        minimumRentalPeriodMonths: Number(formData.minimumRentalPeriodMonths || 1),
        billingFrequency: formData.billingFrequency,
        monthlyRent: Number(formData.monthlyRent),
        billingAmount: Number(formData.monthlyRent),
        securityDeposit: Number(formData.securityDeposit || 0),
        depositStatus: formData.initialDepositPaid ? 'COLLECTED' : 'NOT_COLLECTED',
        initialDepositPaid: formData.initialDepositPaid,
        initialRentPaid: formData.initialRentPaid,
        paymentMethod: formData.paymentMethod,
        referenceNumber: formData.referenceNumber.trim() || undefined,
        installationDate: formData.installationDate || undefined,
        installationTime: formData.installationTime || undefined,
        installationAddress: formData.installationAddress || selectedCustomerAddress || undefined,
        technicianId: formData.technicianId || undefined,
        installationStatus: formData.installationStatus,
        installationNotes: formData.installationNotes,
        notes: formData.notes,
      };

      const result = await createRentalMutation.mutateAsync(payload);
      toast.success(
        `Rental agreement ${result.rentalNumber || ''} created successfully for ${selectedCustomer?.fullName || 'customer'}.`,
        'Rental Created'
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create rental agreement', 'Creation Error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Create New Rental Agreement"
      description="Record a new RO water-purifier machine subscription on recurring rental basis."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: CUSTOMER SELECTION */}
        <div className="bg-slate-50/80 rounded-xl p-4.5 border border-slate-200/90 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Users className="w-4 h-4 text-primary-600" />
              <span>1. Customer Selection (Authoritative Database)</span>
            </div>
            {selectedCustomer && (
              <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 font-bold">
                Customer Connected
              </span>
            )}
          </div>

          {!selectedCustomer ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search customer by name, phone, email, or customer ID..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filtered Customer Options */}
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200/90">
                {isCustomersLoading ? (
                  <div className="p-4 text-center text-xs text-slate-400">Loading customers...</div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No customers found matching "{customerSearch}".
                  </div>
                ) : (
                  filteredCustomers.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className="p-3 hover:bg-slate-50/80 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{cust.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {cust.phone} • ID: {cust.customerNumber}
                        </div>
                      </div>
                      <Button type="button" size="sm" variant="outline" className="text-xs h-7 px-3">
                        Select
                      </Button>
                    </div>
                  ))
                )}
              </div>
              {formErrors.customer && (
                <p className="text-[11px] text-rose-600 font-medium">{formErrors.customer}</p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{selectedCustomer.fullName}</span>
                  <span className="text-[11px] font-mono text-primary-700 bg-primary-50 px-2 py-0.2 rounded border border-primary-200">
                    {selectedCustomer.customerNumber}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  📞 {selectedCustomer.phone} {selectedCustomer.email && `• ✉️ ${selectedCustomer.email}`}
                </div>
                {selectedCustomerAddress && (
                  <div className="text-[11px] text-slate-500">
                    📍 {selectedCustomerAddress}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerId('')}
                className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* SECTION 2: RENTED MACHINE / EQUIPMENT DETAILS */}
        <div className="bg-white rounded-xl p-4.5 border border-slate-200/90 space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Package className="w-4 h-4 text-purple-600" />
            <span>2. Rented Machine Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Machine Type / Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.machineType}
                onChange={(e) => setFormData({ ...formData, machineType: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="RO">RO Standard</option>
                <option value="RO + UV">RO + UV</option>
                <option value="RO + UV + UF">RO + UV + UF Alkaline</option>
                <option value="Commercial RO">Commercial RO (50+ LPH)</option>
                <option value="Hot & Cold RO">Hot &amp; Cold RO Dispenser</option>
                <option value="Other">Other Machine</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Machine Model Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Kent Grand Plus RO"
                value={formData.machineModel}
                onChange={(e) => setFormData({ ...formData, machineModel: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
              />
              {formErrors.machineModel && (
                <p className="text-[10px] text-rose-600 mt-0.5">{formErrors.machineModel}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Machine Serial Number <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, serialNumber: generateMachineSerialNumber() }))}
                  className="text-[10px] text-primary-600 hover:text-primary-700 font-semibold cursor-pointer"
                  title="Generate new serial number"
                >
                  ⚡ Auto Generate
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. SN-RO-310826-1024"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
              />
              {formErrors.serialNumber && (
                <p className="text-[10px] text-rose-600 mt-0.5">{formErrors.serialNumber}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Purification Capacity</label>
              <input
                type="text"
                placeholder="e.g. 15 LPH"
                value={formData.capacityLph}
                onChange={(e) => setFormData({ ...formData, capacityLph: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Installation Location</label>
              <input
                type="text"
                placeholder="e.g. Kitchen Counter / Wall Mount"
                value={formData.installationLocation}
                onChange={(e) => setFormData({ ...formData, installationLocation: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Machine Condition</label>
              <select
                value={formData.machineCondition}
                onChange={(e) => setFormData({ ...formData, machineCondition: e.target.value as any })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none"
              >
                <option value="NEW">New (Brand New Unit)</option>
                <option value="GOOD">Good Condition</option>
                <option value="USED_GOOD">Used — Good Condition</option>
                <option value="USED_FAIR">Used — Fair Condition</option>
                <option value="NEEDS_ATTENTION">Needs Attention</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Accessories Provided</label>
            <input
              type="text"
              placeholder="Pre-filter bowl, spun candle, diverter valve, Teflon tape, 5m food-grade pipe"
              value={formData.accessories}
              onChange={(e) => setFormData({ ...formData, accessories: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none"
            />
          </div>
        </div>

        {/* SECTION 3: RENTAL AGREEMENT & PRICING */}
        <div className="bg-white rounded-xl p-4.5 border border-slate-200/90 space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <IndianRupee className="w-4 h-4 text-emerald-600" />
            <span>3. Rental Agreement &amp; Pricing</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Rental Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.rentalStartDate}
                onChange={(e) => setFormData({ ...formData, rentalStartDate: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Billing Frequency</label>
              <select
                value={formData.billingFrequency}
                onChange={(e) => setFormData({ ...formData, billingFrequency: e.target.value as any })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none"
              >
                <option value="MONTHLY">Monthly Billing</option>
                <option value="QUARTERLY">Quarterly (3 Months)</option>
                <option value="HALF_YEARLY">Half-Yearly (6 Months)</option>
                <option value="YEARLY">Yearly (12 Months)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Monthly Rent (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.monthlyRent}
                onChange={(e) => setFormData({ ...formData, monthlyRent: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-mono"
              />
              {formErrors.monthlyRent && (
                <p className="text-[10px] text-rose-600 mt-0.5">{formErrors.monthlyRent}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Security Deposit (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.securityDeposit}
                onChange={(e) => setFormData({ ...formData, securityDeposit: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none font-mono"
              />
            </div>
          </div>

          {/* Initial Payment Checkboxes */}
          <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/90 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-800">First / Initial Payment Collection</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.initialDepositPaid}
                  onChange={(e) => setFormData({ ...formData, initialDepositPaid: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-slate-700">
                  Collect Security Deposit now ({formatINR(formData.securityDeposit)})
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.initialRentPaid}
                  onChange={(e) => setFormData({ ...formData, initialRentPaid: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-slate-700">
                  Collect 1st Cycle Advance Rent now ({formatINR(formData.monthlyRent)})
                </span>
              </label>
            </div>

            {(formData.initialDepositPaid || formData.initialRentPaid) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                  >
                    <option value="UPI">UPI / GooglePay / PhonePe</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CARD">Card / POS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Transaction Ref # (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref / Bank UTR"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>
            )}

            <div className="text-[11px] font-bold text-emerald-800 font-mono pt-1">
              Total Initial Collected: {formatINR(calculateInitialTotal())}
            </div>
          </div>
        </div>

        {/* SECTION 4: INSTALLATION & TECHNICIAN */}
        <div className="bg-white rounded-xl p-4.5 border border-slate-200/90 space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Wrench className="w-4 h-4 text-primary-600" />
            <span>4. Installation &amp; Technician Assignment</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Assigned Technician</label>
              <select
                value={formData.technicianId}
                onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none"
              >
                <option value="">-- Select Technician (Optional) --</option>
                {techniciansData?.data?.map((tech: any) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.fullName} ({tech.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Installation Status</label>
              <select
                value={formData.installationStatus}
                onChange={(e) => setFormData({ ...formData, installationStatus: e.target.value as any })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none"
              >
                <option value="INSTALLED">Installed &amp; Verified</option>
                <option value="SCHEDULED">Scheduled for Field Visit</option>
                <option value="PENDING">Pending Delivery</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Installation Date</label>
              <input
                type="date"
                value={formData.installationDate}
                onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Installation Address</label>
            <input
              type="text"
              placeholder="e.g. Flat 402, Green Meadows, MG Road"
              value={formData.installationAddress}
              onChange={(e) => setFormData({ ...formData, installationAddress: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createRentalMutation.isPending}
            className="px-6 shadow-md"
          >
            Create Rental Agreement
          </Button>
        </div>
      </form>
    </Modal>
  );
};
