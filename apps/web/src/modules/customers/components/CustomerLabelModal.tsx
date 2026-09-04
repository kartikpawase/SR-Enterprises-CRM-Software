import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Tag, CheckCircle2, AlertCircle, CircleDashed } from 'lucide-react';
import { useUpdateCustomerLabelMutation, type CustomerSummary } from '../customer.api';
import { useToast } from '../../../providers/ToastProvider';

export interface CustomerLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerSummary | null;
  onSuccess?: () => void;
}

export const CustomerLabelModal: React.FC<CustomerLabelModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
}) => {
  const toast = useToast();
  const [selectedLabel, setSelectedLabel] = useState<'GOOD' | 'BAD' | null>(null);

  useEffect(() => {
    if (customer) {
      setSelectedLabel(customer.customerLabel ?? null);
    }
  }, [customer, isOpen]);

  const updateMutation = useUpdateCustomerLabelMutation(customer?.id || '');

  const handleSave = async () => {
    if (!customer) return;
    try {
      await updateMutation.mutateAsync(selectedLabel);
      const labelText =
        selectedLabel === 'GOOD'
          ? 'Good Customer'
          : selectedLabel === 'BAD'
          ? 'Bad Customer'
          : 'No Label';

      toast.success(
        `Customer label updated to "${labelText}" for ${customer.fullName}.`,
        'Label Updated'
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update customer label', 'Update Error');
    }
  };

  const labelOptions: Array<{
    value: 'GOOD' | 'BAD' | null;
    title: string;
    description: string;
    badgeStyle: string;
    icon: React.ReactNode;
  }> = [
    {
      value: 'GOOD',
      title: 'Good Customer',
      description: 'Reliable customer with smooth transactions and positive relationship.',
      badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200/90 hover:border-emerald-300',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    },
    {
      value: 'BAD',
      title: 'Bad Customer',
      description: 'Customer marked for caution or special administrative attention.',
      badgeStyle: 'bg-rose-50 text-rose-800 border-rose-200/90 hover:border-rose-300',
      icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
    },
    {
      value: null,
      title: 'No Label / Unassigned',
      description: 'Default state with no specific classification tag.',
      badgeStyle: 'bg-slate-50 text-slate-700 border-slate-200/90 hover:border-slate-300',
      icon: <CircleDashed className="w-4 h-4 text-slate-500" />,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <Tag className="w-4 h-4 text-primary-600" />
          <span>Customer Label</span>
        </div>
      }
      description={`Manually assign or change classification tag for ${customer?.fullName || 'customer'}`}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={updateMutation.isPending}
            disabled={updateMutation.isPending}
          >
            Save Label
          </Button>
        </div>
      }
    >
      <div className="space-y-3 py-1">
        <p className="text-xs text-slate-500 font-medium">
          Select an administrative label to classify this customer. This tag is internal and strictly for quick identification.
        </p>

        <div className="space-y-2">
          {labelOptions.map((opt) => {
            const isSelected = selectedLabel === opt.value;
            return (
              <label
                key={String(opt.value)}
                onClick={() => setSelectedLabel(opt.value)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'border-primary-500 bg-sky-50/50 shadow-xs ring-1 ring-primary-500/20'
                    : 'border-slate-200/90 bg-white hover:bg-slate-50/70 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="customerLabel"
                  value={String(opt.value)}
                  checked={isSelected}
                  onChange={() => setSelectedLabel(opt.value)}
                  className="mt-0.5 text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900">{opt.title}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${opt.badgeStyle}`}
                    >
                      {opt.icon}
                      <span>{opt.title}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{opt.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
