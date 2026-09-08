import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Tag, CheckCircle2, AlertCircle, CircleDashed, Sparkles, Plus, Check } from 'lucide-react';
import {
  useUpdateCustomerLabelMutation,
  useCustomLabelsQuery,
  useCreateCustomLabelMutation,
  useUpdateCustomLabelMutation,
  type CustomerSummary,
  type CustomLabelDefinition,
} from '../customer.api';
import { useToast } from '../../../providers/ToastProvider';

export interface CustomerLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerSummary | null;
  onSuccess?: () => void;
}

const PRESET_COLORS = [
  { hex: '#2563EB', name: 'Blue' },
  { hex: '#7C3AED', name: 'Purple' },
  { hex: '#059669', name: 'Emerald' },
  { hex: '#D97706', name: 'Amber' },
  { hex: '#DC2626', name: 'Red' },
  { hex: '#DB2777', name: 'Pink' },
  { hex: '#0891B2', name: 'Cyan' },
  { hex: '#4F46E5', name: 'Indigo' },
];

export const CustomerLabelModal: React.FC<CustomerLabelModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
}) => {
  const toast = useToast();
  const [selectedLabel, setSelectedLabel] = useState<'GOOD' | 'BAD' | 'CUSTOM' | null>(null);

  // Custom Label fields
  const [selectedCustomLabelId, setSelectedCustomLabelId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState('#2563EB');
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  // Queries & mutations
  const { data: customLabels = [] } = useCustomLabelsQuery();
  const updateCustomerLabelMutation = useUpdateCustomerLabelMutation(customer?.id || '');
  const createCustomLabelMutation = useCreateCustomLabelMutation();
  const updateCustomLabelDefMutation = useUpdateCustomLabelMutation();

  const isSaving =
    updateCustomerLabelMutation.isPending ||
    createCustomLabelMutation.isPending ||
    updateCustomLabelDefMutation.isPending;

  useEffect(() => {
    if (customer) {
      if (customer.customLabel) {
        setSelectedLabel('CUSTOM');
        setSelectedCustomLabelId(customer.customLabel.id);
        setCustomName(customer.customLabel.name);
        setCustomColor(customer.customLabel.color || '#2563EB');
        setIsEditingExisting(false);
      } else if (customer.customerLabel === 'GOOD') {
        setSelectedLabel('GOOD');
        setSelectedCustomLabelId(null);
      } else if (customer.customerLabel === 'BAD') {
        setSelectedLabel('BAD');
        setSelectedCustomLabelId(null);
      } else {
        setSelectedLabel(null);
        setSelectedCustomLabelId(null);
      }
    }
  }, [customer, isOpen]);

  const handleSelectExistingCustomLabel = (labelDef: CustomLabelDefinition) => {
    setSelectedCustomLabelId(labelDef.id);
    setCustomName(labelDef.name);
    setCustomColor(labelDef.color);
    setIsEditingExisting(false);
  };

  const handleCreateNewMode = () => {
    setSelectedCustomLabelId(null);
    setCustomName('');
    setCustomColor('#2563EB');
    setIsEditingExisting(false);
  };

  const handleSave = async () => {
    if (!customer) return;

    try {
      if (selectedLabel === 'CUSTOM') {
        const trimmedName = customName.trim();
        if (!trimmedName) {
          toast.error('Please enter a label name for the custom label.', 'Validation Error');
          return;
        }

        if (selectedCustomLabelId) {
          // Check if the user modified the selected definition's name or color
          const currentDef = customLabels.find((l) => l.id === selectedCustomLabelId);
          if (currentDef && (currentDef.name !== trimmedName || currentDef.color !== customColor)) {
            // Update existing definition
            await updateCustomLabelDefMutation.mutateAsync({
              id: selectedCustomLabelId,
              data: { name: trimmedName, color: customColor },
            });
          }

          // Assign existing custom label to customer
          await updateCustomerLabelMutation.mutateAsync({
            label: 'CUSTOM',
            customLabelId: selectedCustomLabelId,
          });
        } else {
          // Creating brand new custom label inline
          await updateCustomerLabelMutation.mutateAsync({
            label: 'CUSTOM',
            newCustomLabel: {
              name: trimmedName,
              color: customColor,
            },
          });
        }

        toast.success(
          `Customer label updated to "${trimmedName}" for ${customer.fullName}.`,
          'Label Updated'
        );
      } else if (selectedLabel === 'GOOD') {
        await updateCustomerLabelMutation.mutateAsync('GOOD');
        toast.success(
          `Customer label updated to "Good Customer" for ${customer.fullName}.`,
          'Label Updated'
        );
      } else if (selectedLabel === 'BAD') {
        await updateCustomerLabelMutation.mutateAsync('BAD');
        toast.success(
          `Customer label updated to "Bad Customer" for ${customer.fullName}.`,
          'Label Updated'
        );
      } else {
        await updateCustomerLabelMutation.mutateAsync(null);
        toast.success(
          `Customer label removed for ${customer.fullName}.`,
          'Label Updated'
        );
      }

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
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={isSaving}
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
          {/* 1. Good Customer, 2. Bad Customer, 3. No Label */}
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

          {/* 4. Custom Label (Admin-defined) */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              selectedLabel === 'CUSTOM'
                ? 'border-primary-500 bg-sky-50/40 shadow-xs ring-1 ring-primary-500/20'
                : 'border-slate-200/90 bg-white hover:bg-slate-50/70 hover:border-slate-300'
            }`}
          >
            <label
              onClick={() => setSelectedLabel('CUSTOM')}
              className="flex items-start gap-3 cursor-pointer select-none"
            >
              <input
                type="radio"
                name="customerLabel"
                value="CUSTOM"
                checked={selectedLabel === 'CUSTOM'}
                onChange={() => setSelectedLabel('CUSTOM')}
                className="mt-0.5 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-xs text-slate-900">Custom Label</span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs"
                    style={{
                      backgroundColor: `${customColor}15`,
                      color: customColor,
                      borderColor: `${customColor}40`,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: customColor }} />
                    <span>{customName.trim() || 'Custom Label'}</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Administrator-defined classification tag with custom name and color.
                </p>
              </div>
            </label>

            {/* Expandable Custom Label Configuration */}
            {selectedLabel === 'CUSTOM' && (
              <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-3">
                {/* Existing labels picker if any exist */}
                {customLabels.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700">
                        Saved Custom Labels:
                      </span>
                      <button
                        type="button"
                        onClick={handleCreateNewMode}
                        className="text-[11px] text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Create New</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {customLabels.map((lbl) => {
                        const isSelected = selectedCustomLabelId === lbl.id;
                        return (
                          <button
                            key={lbl.id}
                            type="button"
                            onClick={() => handleSelectExistingCustomLabel(lbl)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? 'ring-2 ring-primary-500 shadow-xs border-primary-400 bg-white font-bold'
                                : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: lbl.color }}
                            />
                            <span>{lbl.name}</span>
                            {isSelected && <Check className="w-3 h-3 text-primary-600 ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Name Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Label Name <span className="text-rose-500">*</span>
                    </label>
                    {selectedCustomLabelId && (
                      <span className="text-[10px] text-slate-400">
                        Editing will update for all assigned customers
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g., VIP Customer, AMC Customer, High Value"
                    maxLength={40}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>

                {/* Color Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Label Color <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => {
                      const isChosen = customColor.toUpperCase() === c.hex.toUpperCase();
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setCustomColor(c.hex)}
                          className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center cursor-pointer border ${
                            isChosen ? 'ring-2 ring-offset-1 ring-primary-500 scale-110' : 'hover:scale-105 border-black/10'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        >
                          {isChosen && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </button>
                      );
                    })}

                    {/* Custom Hex Picker Input */}
                    <label
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-[11px] text-slate-700 font-mono shadow-2xs"
                      title="Pick custom color"
                    >
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="w-4 h-4 p-0 border-0 rounded cursor-pointer"
                      />
                      <span>{customColor.toUpperCase()}</span>
                    </label>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                  <span>Badge Preview:</span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs"
                    style={{
                      backgroundColor: `${customColor}18`,
                      color: customColor,
                      borderColor: `${customColor}40`,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: customColor }} />
                    <span>{customName.trim() || 'Preview'}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
