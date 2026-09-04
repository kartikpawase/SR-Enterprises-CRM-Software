import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { JobCardDetailCard } from './components/JobCardDetailCard';
import { CompleteServiceModal } from './components/CompleteServiceModal';
import { QuickAssignModal } from './components/QuickAssignModal';
import { RecordPaymentModal } from '../payments/components/RecordPaymentModal';
import { useServiceDetailQuery, useNotifyServiceTechnicianWhatsAppMutation } from './services.api';
import { useToast } from '../../providers/ToastProvider';
import { formatINR } from '../../lib/formatters';
import {
  User,
  Cpu,
  ShieldCheck,
  Phone,
  Mail,
  CheckCircle,
  CheckCircle2,
  ArrowLeft,
  UserCheck,
  AlertTriangle,
  FileText,
  ArrowUpRight,
  CreditCard,
  Receipt,
  MessageSquare,
  Send,
  AlertCircle,
} from 'lucide-react';

function formatSystemDate(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return '—';
  if (typeof dateVal === 'string') {
    const match = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    }
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export const ServiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [whatsappFeedback, setWhatsappFeedback] = useState<{ type: 'success' | 'error'; message: string; directUrl?: string } | null>(null);

  const notifyWhatsAppMutation = useNotifyServiceTechnicianWhatsAppMutation();

  const handleSendWhatsApp = async () => {
    if (!service?.id) return;
    setWhatsappFeedback(null);
    try {
      const res = await notifyWhatsAppMutation.mutateAsync(service.id);
      const resData = (res as any)?.data || res;
      if (res?.success) {
        const successMsg = res.message || `WhatsApp notification sent to ${service.technicianName || 'technician'}!`;
        setWhatsappFeedback({
          type: 'success',
          message: successMsg,
          directUrl: resData?.directUrl,
        });
        toast.success(successMsg, 'WhatsApp Sent');
      } else {
        const errorMsg = res?.message || resData?.error || 'Failed to send WhatsApp notification';
        setWhatsappFeedback({
          type: 'error',
          message: errorMsg,
          directUrl: resData?.directUrl,
        });
        toast.error(errorMsg, 'WhatsApp Error');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'WhatsApp notification failed';
      setWhatsappFeedback({
        type: 'error',
        message: errMsg,
      });
      toast.error(errMsg, 'WhatsApp Failed');
    }
  };

  const { data: service, isLoading, error } = useServiceDetailQuery(id);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center text-slate-500 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Loading service record details...</span>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Service Record Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested service ID does not exist or may have been deleted.
        </p>
        <Button variant="outline" onClick={() => navigate('/services')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Services
        </Button>
      </div>
    );
  }

  const isCompleted = service.status === 'COMPLETED';
  const totalBilled = Number(service.invoice?.totalAmount || service.totalCharges || 0);
  const validPayments = ((service as any).payments || []).filter((p: any) => p.status === 'COMPLETED');
  const paidAmount = validPayments.length > 0
    ? validPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0)
    : service.invoice?.paidAmount
    ? parseFloat(service.invoice.paidAmount)
    : 0;
  const balanceDue = Math.max(0, totalBilled - paidAmount);
  const isFullyPaid = (balanceDue <= 0.001 && paidAmount > 0) || service.invoice?.status === 'PAID';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/services')}
            className="text-xs text-slate-500 hover:text-slate-900 pl-0 mb-1"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Back to Services
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {service.serviceNumber}
            </h1>
            <StatusBadge
              status={isCompleted ? 'active' : 'warning'}
              label={service.status.replace(/_/g, ' ')}
            />
            {service.serviceClassification === 'WARRANTY' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Warranty Covered
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                General Service
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {service.serviceType.replace(/_/g, ' ')} • {service.serviceLocation === 'DOORSTEP' ? 'Doorstep Visit' : 'In-Shop Repair'} • Scheduled for{' '}
            {formatSystemDate(service.scheduledDate)}
            {service.scheduledTimeSlot ? ` (${service.scheduledTimeSlot})` : ''}
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Record Payment Button */}
          {totalBilled > 0 && !isFullyPaid && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRecordPaymentModalOpen(true)}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 flex items-center gap-1.5"
              leftIcon={<CreditCard className="w-4 h-4 text-emerald-600" />}
            >
              Record Payment
            </Button>
          )}

          {!isCompleted && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAssignModalOpen(true)}
                className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                leftIcon={<UserCheck className="w-4 h-4" />}
              >
                {service.technicianId ? 'Reassign Tech' : 'Assign Tech'}
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCompleteModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Complete Service
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer, Machine & Warranty (1 Col) */}
        <div className="space-y-6">
          {/* Customer Card */}
          <Card className="rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-4 flex flex-row items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-primary-600" />
                Customer Info
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/customers/${service.customerId}`)}
                className="h-7 text-[11px] text-primary-600 hover:text-primary-800"
                rightIcon={<ArrowUpRight className="w-3 h-3" />}
              >
                Profile
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <div className="font-bold text-slate-900 text-sm">{service.customerName}</div>
                <div className="text-[11px] text-slate-500 font-mono">ID: {service.customerNumber}</div>
              </div>
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono">{service.customerPhone}</span>
                </div>
                {service.customerEmail && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{service.customerEmail}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Machine / Asset Card */}
          <Card className="rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-600" />
                Registered Machine
              </h3>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <div>
                <div className="font-bold text-slate-900">{service.productName}</div>
                <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                  SKU: {service.productSku} {service.productBrand && `• Brand: ${service.productBrand}`}
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 font-mono text-[11px]">
                <span className="text-slate-500 block">Serial Number:</span>
                <span className="font-bold text-slate-800">{service.serialNumber || 'Non-serialized Unit'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Technician Card */}
          <Card className="rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-4 flex flex-row items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Assigned Technician
              </h3>
              {!isCompleted && (
                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-bold"
                >
                  Change
                </button>
              )}
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-3">
              {service.technicianName ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-extrabold text-sm border border-blue-200 shrink-0">
                      {service.technicianName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{service.technicianName}</div>
                      <div className="text-slate-500 font-mono">{service.technicianPhone}</div>
                    </div>
                  </div>

                  {/* WhatsApp Technician Notification Status & One-Click Trigger */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      WhatsApp Alert
                    </span>
                    <button
                      type="button"
                      onClick={handleSendWhatsApp}
                      disabled={notifyWhatsAppMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer border border-emerald-700 disabled:opacity-50"
                      title="Send WhatsApp job assignment notification to technician"
                    >
                      <Send className="w-3 h-3" />
                      {notifyWhatsAppMutation.isPending ? 'Sending...' : 'Notify WhatsApp'}
                    </button>
                  </div>

                  {whatsappFeedback && (
                    <div
                      className={`p-2.5 rounded-xl text-[11px] flex items-center justify-between gap-1.5 ${
                        whatsappFeedback.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {whatsappFeedback.type === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                        <span className="break-words">{whatsappFeedback.message}</span>
                      </div>
                      {whatsappFeedback.directUrl && (
                        <a
                          href={whatsappFeedback.directUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded transition-colors text-[10px] shrink-0"
                          title="Open WhatsApp chat with technician"
                        >
                          <Send className="w-2.5 h-2.5" />
                          Open WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-amber-800 text-center space-y-1">
                  <p className="font-semibold">No technician assigned yet</p>
                  <button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="text-[11px] font-bold text-amber-900 underline cursor-pointer"
                  >
                    Assign Field Tech Now
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Job Card & Timeline Execution (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Card Details */}
          <JobCardDetailCard service={service} />

          {/* Payment Information & Recorded Transactions History Card */}
          {totalBilled > 0 && (
            <Card className="rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-4 sm:p-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      Payment Details &amp; History
                    </h3>
                    <p className="text-xs text-slate-500">Service billing settlement, recorded payments &amp; outstanding balance</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isFullyPaid ? (
                    <Badge variant="success">Payment Complete</Badge>
                  ) : paidAmount > 0 ? (
                    <Badge variant="warning">Partially Paid</Badge>
                  ) : (
                    <Badge variant="danger">Payment Pending</Badge>
                  )}

                  {!isFullyPaid && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300"
                      onClick={() => setIsRecordPaymentModalOpen(true)}
                      leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                    >
                      Record Payment
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4 text-xs">
                {/* Linked Invoice Banner */}
                {service.invoice && (
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-blue-900">
                        Linked Invoice: <span className="font-mono font-bold">{service.invoice.invoiceNumber}</span>
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/invoices/${service.invoice.id}`)}
                      className="h-7 text-xs text-blue-700 hover:text-blue-900"
                      rightIcon={<ArrowUpRight className="w-3 h-3" />}
                    >
                      View Invoice
                    </Button>
                  </div>
                )}

                {/* 3 Summary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Total Service Charges
                    </span>
                    <span className="font-bold font-mono text-slate-900 text-sm mt-0.5 block">
                      {formatINR(totalBilled)}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block">
                      Total Received / Paid
                    </span>
                    <span className="font-bold font-mono text-emerald-700 text-sm mt-0.5 block">
                      {formatINR(paidAmount)}
                    </span>
                  </div>

                  <div className={`p-3 rounded-xl border ${balanceDue > 0 ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider block opacity-75">
                      Remaining Balance Due
                    </span>
                    <span className={`font-bold font-mono text-sm mt-0.5 block ${balanceDue > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
                      {formatINR(balanceDue)}
                    </span>
                  </div>
                </div>

                {/* Recorded Payments Table */}
                {(service as any).payments && (service as any).payments.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Installment / Ref</th>
                          <th className="py-2.5 px-3 text-center">Payment Date</th>
                          <th className="py-2.5 px-3 text-center">Mode</th>
                          <th className="py-2.5 px-3 text-right">Amount Received</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(service as any).payments.map((p: any, idx: number) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3">
                              <div className="font-mono font-semibold text-slate-900">
                                Installment #{idx + 1} ({p.paymentNumber})
                              </div>
                              {p.referenceNumber && (
                                <div className="text-[10px] text-slate-500 font-mono">Ref: {p.referenceNumber}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                              {formatSystemDate(p.paymentDate)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-semibold text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                                {p.paymentMethod}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatINR(p.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle className="w-3 h-3" /> {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    No payment transactions recorded yet for this service.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Customer & Internal Notes Card */}
          <Card className="rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                Customer & Internal Notes
              </h3>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="font-bold text-slate-700 block mb-1">Customer Reported Notes:</span>
                <p className="text-slate-600">{service.customerNotes || 'No specific notes logged by customer.'}</p>
              </div>

              {service.internalNotes && (
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                  <span className="font-bold text-blue-900 block mb-1">Internal Instructions:</span>
                  <p className="text-blue-800">{service.internalNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <CompleteServiceModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        service={service}
      />

      <QuickAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        service={service}
      />

      {/* Record Service Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        initialInvoiceId={service.invoice?.id}
        onSuccess={() => {
          toast.success('Payment recorded successfully.', 'Payment Saved');
          setIsRecordPaymentModalOpen(false);
        }}
      />
    </div>
  );
};
