import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { useTechniciansQuery, useUpdateServiceMutation, type ServiceItem } from '../services.api';
import { UserCheck, AlertCircle } from 'lucide-react';

export interface QuickAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem | null;
}

export const QuickAssignModal: React.FC<QuickAssignModalProps> = ({
  isOpen,
  onClose,
  service,
}) => {
  const [selectedTechId, setSelectedTechId] = useState<string>(service?.technicianId || '');
  const [error, setError] = useState<string | null>(null);

  const { data: technicians } = useTechniciansQuery();
  const updateMutation = useUpdateServiceMutation();

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;
    setError(null);

    try {
      await updateMutation.mutateAsync({
        id: service.id,
        data: {
          technicianId: selectedTechId || null,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update technician');
    }
  };

  if (!service) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Field Technician"
      description={`Assign or reassign an active service technician to ${service.serviceNumber}.`}
      size="sm"
    >
      <form onSubmit={handleAssign} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
          <div className="font-bold text-slate-900">{service.customerName}</div>
          <div className="text-slate-500 font-medium">{service.productName} • {service.serviceLocation}</div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Choose Technician</label>
          {(() => {
            const techList: any[] = Array.isArray(technicians)
              ? technicians
              : Array.isArray((technicians as any)?.data)
              ? (technicians as any).data
              : [];

            return (
              <Select
                options={[
                  { value: '', label: '— Unassign Technician —' },
                  ...techList.map((t: any) => ({
                    value: t.id,
                    label: `${t.fullName || t.name} (${t.phone || 'No phone'})`,
                  })),
                ]}
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
              />
            );
          })()}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold"
            disabled={updateMutation.isPending}
            leftIcon={<UserCheck className="w-4 h-4" />}
          >
            {updateMutation.isPending ? 'Assigning...' : 'Save Assignment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
