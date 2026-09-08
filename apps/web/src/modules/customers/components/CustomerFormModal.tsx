import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCustomerSchema, type CreateCustomerInput } from '@crm/validation';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { useToast } from '../../../providers/ToastProvider';
import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  checkCustomerDuplicateApi,
  type CustomerSummary,
} from '../customer.api';
import { AlertCircle, User, Phone, Mail, Building, Plus, Trash2 } from 'lucide-react';

export interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: CustomerSummary | null;
  onSuccess?: (customer: CustomerSummary) => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
}) => {
  const isEditing = !!customer;
  const toast = useToast();
  const createMutation = useCreateCustomerMutation();
  const updateMutation = useUpdateCustomerMutation(customer?.id || '');

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number>(0);

  const getInitialValues = (cust?: CustomerSummary | null): CreateCustomerInput => ({
    fullName: cust?.fullName || '',
    phone: cust?.phone || '',
    email: cust?.email || '',
    customerType: cust?.customerType || 'INDIVIDUAL',
    companyName: cust?.companyName || '',
    gstNumber: cust?.gstNumber || '',
    notes: cust?.notes || '',
    customerLabel: (cust as any)?.customerLabel ?? null,
    addresses: cust?.addresses && cust.addresses.length > 0
      ? cust.addresses.map((a) => ({
          addressType: a.addressType || 'SERVICE',
          addressLine1: a.addressLine1 || '',
          addressLine2: a.addressLine2 || '',
          landmark: a.landmark || '',
          city: a.city || '',
          state: a.state || '',
          postalCode: a.postalCode || (a as any).pincode || '',
          isDefault: a.isDefault ?? true,
        }))
      : [
          {
            addressType: 'SERVICE',
            addressLine1: '',
            addressLine2: '',
            landmark: '',
            city: '',
            state: '',
            postalCode: '',
            isDefault: true,
          },
        ],
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(CreateCustomerSchema) as any,
    defaultValues: getInitialValues(customer),
    shouldUnregister: false,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'addresses',
  });

  useEffect(() => {
    if (isOpen) {
      reset(getInitialValues(customer));
      setDuplicateWarning(null);
      const hasExistingAddress = !!customer?.addresses?.some(
        (a) => (a.addressLine1 && a.addressLine1 !== 'Main Service Location') || a.city || a.postalCode
      );
      setSelectedAddressIndex(hasExistingAddress ? 0 : -1);
    }
  }, [isOpen, customer, reset]);

  useEffect(() => {
    if (selectedAddressIndex >= 0 && selectedAddressIndex >= fields.length) {
      setSelectedAddressIndex(Math.max(0, fields.length - 1));
    }
  }, [fields.length, selectedAddressIndex]);

  const phoneValue = watch('phone');
  const emailValue = watch('email');
  const customerTypeValue = watch('customerType');

  // Real-time duplicate phone checking on blur
  const handleCheckDuplicatePhone = async () => {
    if (phoneValue && phoneValue.length >= 10) {
      try {
        const result = await checkCustomerDuplicateApi({
          phone: phoneValue,
          excludeCustomerId: customer?.id,
        });
        if (result.isDuplicate && result.existingCustomer) {
          setDuplicateWarning(
            `A customer with phone ${phoneValue} already exists: ${result.existingCustomer.fullName} (${result.existingCustomer.customerNumber})`
          );
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        // ignore network error on duplicate hint
      }
    }
  };

  // Real-time duplicate email checking on blur
  const handleCheckDuplicateEmail = async () => {
    if (emailValue && emailValue.includes('@')) {
      try {
        const result = await checkCustomerDuplicateApi({
          email: emailValue,
          excludeCustomerId: customer?.id,
        });
        if (result.isDuplicate && result.existingCustomer) {
          setDuplicateWarning(
            `A customer with email ${emailValue} already exists: ${result.existingCustomer.fullName} (${result.existingCustomer.customerNumber})`
          );
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        // ignore network error on duplicate hint
      }
    }
  };

  const extractFirstErrorMessage = (errObj: any): string | null => {
    if (!errObj) return null;
    if (typeof errObj.message === 'string' && errObj.message) return errObj.message;
    if (Array.isArray(errObj)) {
      for (const item of errObj) {
        const msg = extractFirstErrorMessage(item);
        if (msg) return msg;
      }
    }
    if (typeof errObj === 'object') {
      for (const key of Object.keys(errObj)) {
        const msg = extractFirstErrorMessage(errObj[key]);
        if (msg) return msg;
      }
    }
    return null;
  };

  const onInvalid = (fieldErrors: any) => {
    const message = extractFirstErrorMessage(fieldErrors) || 'Please check required fields';
    toast.error(message, 'Validation Required');
  };

  const onSubmit = async (data: CreateCustomerInput) => {
    try {
      if (isEditing && customer) {
        const res = await updateMutation.mutateAsync(data);
        const updated = (res as any)?.data || res;
        if (!updated || !updated.id) {
          throw new Error('Failed to update customer: Server returned an invalid response');
        }
        toast.success(`Customer ${updated.fullName || data.fullName} updated successfully.`, 'Customer Updated');
        onClose();
        reset(getInitialValues(null));
        onSuccess?.(updated);
      } else {
        const res = await createMutation.mutateAsync(data);
        const created = (res as any)?.data || res;
        if (!created || !created.id) {
          throw new Error('Failed to create customer: Server returned an invalid response');
        }
        toast.success(
          `Customer ${created.fullName || data.fullName} (${created.customerNumber || 'Saved'}) created.`,
          'Customer Created'
        );
        onClose();
        reset(getInitialValues(null));
        onSuccess?.(created);
      }
    } catch (err: any) {
      console.error('[CustomerFormModal] Save Error:', err);
      const msg =
        err?.details?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to save customer. Please check network connection.';
      toast.error(msg, 'Save Error');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Customer: ${customer.fullName}` : 'Add New Customer'}
      description="Create a primary customer record with service location and contact information."
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSubmit(onSubmit, onInvalid)}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isEditing ? 'Save Changes' : 'Create Customer'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        {/* Duplicate Customer Alert Banner */}
        {duplicateWarning && (
          <div role="alert" className="p-3 bg-amber-50 border border-amber-200 rounded-btn flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Potential Duplicate Customer Detected</span>
              <p>{duplicateWarning}</p>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5">
            1. Customer Identity &amp; Contact
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="e.g. Rajesh Kumar"
              required
              leftIcon={<User className="w-4 h-4" />}
              error={errors.fullName?.message}
              {...register('fullName')}
            />

            <Input
              label="Phone Number"
              placeholder="e.g. 9826123456"
              required
              leftIcon={<Phone className="w-4 h-4" />}
              error={errors.phone?.message}
              {...register('phone')}
              onBlur={handleCheckDuplicatePhone}
            />

            <Input
              label="Email Address (Optional)"
              type="email"
              placeholder="e.g. rajesh@gmail.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
              onBlur={handleCheckDuplicateEmail}
            />

            <Select
              label="Customer Type"
              options={[
                { value: 'INDIVIDUAL', label: 'Individual / Residential' },
                { value: 'COMMERCIAL', label: 'Commercial / Business' },
              ]}
              {...register('customerType')}
            />
          </div>

          {customerTypeValue === 'COMMERCIAL' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-btn">
              <Input
                label="Company / Establishment Name"
                placeholder="e.g. Apex Hospital & Diagnostics"
                leftIcon={<Building className="w-4 h-4" />}
                error={errors.companyName?.message}
                {...register('companyName')}
              />
              <Input
                label="GSTIN Number (Optional)"
                placeholder="e.g. 22AAAAA0000A1Z5"
                error={errors.gstNumber?.message}
                {...register('gstNumber')}
              />
            </div>
          )}
        </div>

        {/* Addresses Section (Optional Dropdown & More Options) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                2. Service &amp; Installation Addresses
              </h4>
              <span className="text-[11px] text-slate-400 font-normal">(Optional)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  append({
                    addressType: 'SERVICE',
                    addressLine1: '',
                    addressLine2: '',
                    landmark: '',
                    city: '',
                    state: '',
                    postalCode: '',
                    isDefault: false,
                  });
                  setSelectedAddressIndex(fields.length);
                }}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Another Address
              </Button>
            </div>
          </div>

          {/* Service & Installation Address Selection Dropdown */}
          <Select
            label="SELECT SERVICE & INSTALLATION ADDRESS"
            value={selectedAddressIndex === -1 ? 'none' : String(selectedAddressIndex)}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'none') {
                setSelectedAddressIndex(-1);
              } else if (val === 'add_new') {
                append({
                  addressType: 'SERVICE',
                  addressLine1: '',
                  addressLine2: '',
                  landmark: '',
                  city: '',
                  state: '',
                  postalCode: '',
                  isDefault: false,
                });
                setSelectedAddressIndex(fields.length);
              } else {
                setSelectedAddressIndex(Number(val));
              }
            }}
            options={[
              { value: 'none', label: '-- Select / Add Service Address (Optional) --' },
              ...fields.map((field, idx) => {
                const addr = watch('addresses')?.[idx] || {};
                const isDefault = idx === 0 || addr.isDefault;
                const parts: string[] = [];
                const line1 = (addr.addressLine1 || '').trim();
                const city = (addr.city || '').trim();
                const postalCode = (addr.postalCode || (addr as any).pincode || '').trim();

                if (line1 && line1 !== 'Main Service Location') parts.push(line1);
                if (city) parts.push(city);
                if (postalCode) parts.push(postalCode);

                const prefix = `Address #${idx + 1}${isDefault ? ' (Default Service Location)' : ''}`;
                const details = parts.length > 0 ? ` — ${parts.join(' — ')}` : (idx === 0 ? ' — Main Service Location' : ' — New Service Location');
                return {
                  value: String(idx),
                  label: `${prefix}${details}`,
                };
              }),
            ]}
          />

          {/* Active Selected Address Card (displayed only when an address is chosen) */}
          {selectedAddressIndex >= 0 && fields[selectedAddressIndex] && (
            <div
              key={fields[selectedAddressIndex].id}
              className="p-4 rounded-btn border border-slate-200 bg-slate-50/50 space-y-3 relative transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Address #{selectedAddressIndex + 1} {selectedAddressIndex === 0 ? '(Default Service Location)' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAddressIndex(-1)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
                  >
                    Hide Form
                  </button>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        remove(selectedAddressIndex);
                        setSelectedAddressIndex(Math.max(0, selectedAddressIndex - 1));
                      }}
                      className="p-1 text-slate-400 hover:text-danger-600 rounded flex items-center gap-1 text-xs font-medium"
                      aria-label="Remove address"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Address Line 1 (Street / Area)"
                  placeholder="House/Plot No., Street, Area (e.g. Pandri Road)"
                  error={errors.addresses?.[selectedAddressIndex]?.addressLine1?.message}
                  {...register(`addresses.${selectedAddressIndex}.addressLine1`)}
                />

                <Input
                  label="Address Line 2 (Optional)"
                  placeholder="Apartment, Wing, Colony"
                  error={errors.addresses?.[selectedAddressIndex]?.addressLine2?.message}
                  {...register(`addresses.${selectedAddressIndex}.addressLine2`)}
                />

                <Input
                  label="Landmark (Optional)"
                  placeholder="Near City Hospital"
                  error={errors.addresses?.[selectedAddressIndex]?.landmark?.message}
                  {...register(`addresses.${selectedAddressIndex}.landmark`)}
                />

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    label="City"
                    placeholder="e.g. Pune"
                    error={errors.addresses?.[selectedAddressIndex]?.city?.message}
                    {...register(`addresses.${selectedAddressIndex}.city`)}
                  />
                  <Input
                    label="State"
                    placeholder="e.g. Maharashtra"
                    error={errors.addresses?.[selectedAddressIndex]?.state?.message}
                    {...register(`addresses.${selectedAddressIndex}.state`)}
                  />
                  <Input
                    label="Pincode"
                    placeholder="e.g. 411001"
                    error={errors.addresses?.[selectedAddressIndex]?.postalCode?.message}
                    {...register(`addresses.${selectedAddressIndex}.postalCode`)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5">
            3. Customer Notes &amp; Instructions
          </h4>
          <Textarea
            placeholder="Special installation requests, preferred technician visit timings, landmark instructions..."
            rows={2}
            error={errors.notes?.message}
            {...register('notes')}
          />
        </div>
      </form>
    </Modal>
  );
};
