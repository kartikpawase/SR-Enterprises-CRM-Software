import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useSaleQuery, useConfirmSaleMutation, useCancelSaleMutation } from './sales.api';
import { RecordPaymentModal } from '../payments/components/RecordPaymentModal';
import { useToast } from '../../providers/ToastProvider';
import { useAuth } from '../../providers/AuthBoundary';
import { sendInvoiceViaWhatsApp } from '../../lib/whatsapp';
import { formatINR, formatDate } from '../../lib/formatters';
import srEnterprisesQr from '../../assets/sr-enterprises-upi-qr.png';
import {
  ShoppingBag,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Printer,
  AlertTriangle,
  ArrowUpRight,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Building,
  ShieldCheck,
  Receipt,
  Calendar,
  QrCode,
  Copy,
  CreditCard,
} from 'lucide-react';

export const SaleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);

  const pageContainerRef = React.useRef<HTMLDivElement>(null);
  const gridContainerRef = React.useRef<HTMLDivElement>(null);
  const leftPanelRef = React.useRef<HTMLDivElement>(null);

  const { data: sale, isLoading } = useSaleQuery(id);
  const confirmMutation = useConfirmSaleMutation();
  const cancelMutation = useCancelSaleMutation();

  const canConfirm = hasPermission('sales.confirm');
  const canCancel = hasPermission('sales.cancel');

  // Page-local scroll coordination for desktop two-column split-scroll experience
  React.useEffect(() => {
    const pageEl = pageContainerRef.current;
    if (!pageEl) return;

    const handleWheel = (e: WheelEvent) => {
      // Only coordinate on desktop screens (>= 1024px)
      if (window.innerWidth < 1024) return;

      const leftPanel = leftPanelRef.current;
      const grid = gridContainerRef.current;
      const mainScrollEl = pageEl.closest('main');

      if (!leftPanel || !grid || !mainScrollEl) return;

      // Never intercept when scrolling inside modals, dropdowns, or overlays
      if ((e.target as HTMLElement)?.closest?.('[role="dialog"], [role="menu"], .fixed')) {
        return;
      }

      const gridRect = grid.getBoundingClientRect();
      const mainRect = mainScrollEl.getBoundingClientRect();

      // Check if the outer page has scrolled down to the sticky threshold beneath header
      const isStickyReached = gridRect.top <= mainRect.top + 8;

      if (e.deltaY > 0) {
        // Scrolling DOWN
        if (isStickyReached) {
          const maxLeftScroll = leftPanel.scrollHeight - leftPanel.clientHeight;
          if (maxLeftScroll > 0 && leftPanel.scrollTop < maxLeftScroll - 1) {
            e.preventDefault();
            leftPanel.scrollTop = Math.min(maxLeftScroll, leftPanel.scrollTop + e.deltaY);
          }
        }
      } else if (e.deltaY < 0) {
        // Scrolling UP
        if (leftPanel.scrollTop > 0) {
          e.preventDefault();
          leftPanel.scrollTop = Math.max(0, leftPanel.scrollTop + e.deltaY);
        }
      }
    };

    // Scoped non-passive wheel listener on Sale Confirmation container
    pageEl.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      pageEl.removeEventListener('wheel', handleWheel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse py-8">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-100 rounded-xl"></div>
          <div className="h-96 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Sale Order Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          The requested sales record could not be found or has been removed.
        </p>
        <Button variant="outline" onClick={() => navigate('/sales')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Return to Sales
        </Button>
      </div>
    );
  }

  const handleConfirmSale = async () => {
    try {
      await confirmMutation.mutateAsync({ id: sale.id });
      toast.success(
        `Sale ${sale.saleNumber} confirmed. Invoice and Customer Assets generated.`,
        'Sale Confirmed'
      );
    } catch (err: any) {
      toast.error(err.message || 'Unable to confirm sale.', 'Confirmation Failed');
    }
  };

  const handleCancelSale = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a cancellation reason.', 'Reason Required');
      return;
    }

    try {
      await cancelMutation.mutateAsync({ id: sale.id, data: { reason: cancelReason } });
      toast.success(`Sale ${sale.saleNumber} has been marked as cancelled.`, 'Sale Cancelled');
      setIsCancelModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Unable to cancel sale.', 'Cancellation Failed');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!sale.customerPhone) {
      toast.error('Customer phone number is not available.', 'Phone Missing');
      return;
    }

    const res = sendInvoiceViaWhatsApp({
      phone: sale.customerPhone,
      orderNumber: sale.saleNumber,
      invoiceNumber: sale.invoice?.invoiceNumber || sale.saleNumber,
      customerName: sale.customerName,
    });

    if (res.success) {
      toast.success(
        `Opening WhatsApp chat with ${sale.customerName} (${sale.customerPhone})...`,
        'WhatsApp Invoice Sent'
      );
    } else {
      toast.error(res.error || 'Failed to open WhatsApp.', 'WhatsApp Error');
    }
  };

  const handleCopyUpi = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('srenterprises6711@aubank');
      toast.success('UPI ID copied: srenterprises6711@aubank', 'Copied to Clipboard');
    }
  };

  const statusVariantMap: Record<string, any> = {
    COMPLETED: 'active',
    DRAFT: 'inactive',
    CANCELLED: 'archived',
  };

  const totalAmount = parseFloat(sale.totalAmount || '0');
  const validPayments = (sale.payments || []).filter((p: any) => p.status === 'COMPLETED');
  const paidAmount = validPayments.length > 0
    ? validPayments.reduce((acc: number, p: any) => acc + (parseFloat(p.amount) || 0), 0)
    : sale.invoice?.paidAmount
    ? parseFloat(sale.invoice.paidAmount)
    : 0;
  const balanceDue = Math.max(0, totalAmount - paidAmount);
  const isFullyPaid = (balanceDue <= 0.001 && paidAmount > 0) || sale.invoice?.status === 'PAID';

  return (
    <div ref={pageContainerRef} className="space-y-6 max-w-6xl mx-auto pb-16 print:p-0 print:m-0 print:space-y-4">
      {/* Page Header (Hidden during Print) */}
      <div className="print:hidden">
        <PageHeader
          title={`Sale Order: ${sale.saleNumber}`}
          description={`Recorded on ${new Date(sale.saleDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}`}
          breadcrumbs={[
            { label: 'Home', href: '/dashboard' },
            { label: 'Sales', href: '/sales' },
            { label: sale.saleNumber },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/sales')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back to Sales
              </Button>

              {/* Print Invoice Option */}
              <Button
                variant="outline"
                onClick={handlePrint}
                leftIcon={<Printer className="w-4 h-4 text-slate-600" />}
              >
                Print Invoice / Order
              </Button>

              {/* WhatsApp Share Button */}
              <Button
                variant="primary"
                onClick={handleWhatsAppShare}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                leftIcon={<MessageCircle className="w-4 h-4" />}
              >
                Send via WhatsApp
              </Button>

              {/* Record Payment Button */}
              {sale.invoice && !isFullyPaid && (
                <Button
                  variant="outline"
                  onClick={() => setIsRecordPaymentModalOpen(true)}
                  className="font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 flex items-center gap-1.5"
                  leftIcon={<CreditCard className="w-4 h-4 text-emerald-600" />}
                >
                  Record Payment
                </Button>
              )}

              {sale.status === 'DRAFT' && canConfirm && (
                <Button
                  variant="primary"
                  onClick={handleConfirmSale}
                  isLoading={confirmMutation.isPending}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Confirm Sale
                </Button>
              )}

              {sale.status !== 'CANCELLED' && canCancel && (
                <Button
                  variant="outline"
                  onClick={() => setIsCancelModalOpen(true)}
                  leftIcon={<XCircle className="w-4 h-4 text-red-500" />}
                >
                  Cancel Sale
                </Button>
              )}

              {sale.invoice && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/invoices/${sale.invoice!.id}`)}
                  leftIcon={<FileText className="w-4 h-4 text-blue-600" />}
                >
                  View Invoice
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Cancellation Notice if Cancelled */}
      {sale.status === 'CANCELLED' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-start gap-3 print:border-red-400">
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">This sale transaction has been cancelled</div>
            <div className="text-xs text-red-600 mt-0.5">
              Reason: {sale.cancelReason || 'No reason specified'} • Cancelled at:{' '}
              {sale.cancelledAt ? new Date(sale.cancelledAt).toLocaleString('en-IN') : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Linked Tax Invoice Highlight Banner */}
      {sale.invoice && (
        <Card className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-200/80 rounded-2xl shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-bold uppercase tracking-wider text-blue-700">Official GST Invoice</span>
                  <Badge variant="primary">{sale.invoice.status}</Badge>
                </div>
                <div className="font-mono font-bold text-slate-900 text-base">
                  {sale.invoice.invoiceNumber}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <Button
                size="sm"
                variant="outline"
                className="bg-white"
                onClick={() => navigate(`/invoices/${sale.invoice!.id}`)}
                leftIcon={<FileText className="w-3.5 h-3.5 text-blue-600" />}
              >
                View Full Invoice
              </Button>

              <Button
                size="sm"
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={handleWhatsAppShare}
                leftIcon={<MessageCircle className="w-3.5 h-3.5" />}
              >
                WhatsApp Invoice
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div ref={gridContainerRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side Panel: QR for Payment, Record Payment Option, and Financial Summary (Independent Vertical Scroll on Desktop) */}
        <div
          ref={leftPanelRef}
          className="space-y-6 lg:col-span-1 lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1"
        >
          {/* Financial Position Card */}
          <Card className="p-5 rounded-2xl border border-slate-200 shadow-xs bg-white">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Order Financial Summary</h3>
              <StatusBadge
                status={statusVariantMap[sale.status] || 'inactive'}
                label={sale.status}
              />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-medium text-slate-900">
                  {formatINR(sale.subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Discounts Applied</span>
                <span className="font-mono text-emerald-600 font-semibold">
                  -{formatINR(sale.discountAmount)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Total GST (18%)</span>
                <span className="font-mono font-medium text-slate-900">
                  {formatINR(sale.taxAmount)}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-sm">Grand Total</span>
                <span className="font-bold text-blue-700 text-lg font-mono">
                  {formatINR(sale.totalAmount)}
                </span>
              </div>
            </div>

            {/* Quick WhatsApp Share Action in Summary */}
            <div className="pt-4 mt-4 border-t border-slate-100 print:hidden space-y-2">
              <Button
                variant="primary"
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5"
                onClick={handleWhatsAppShare}
                leftIcon={<MessageCircle className="w-4 h-4" />}
              >
                Send Invoice on WhatsApp
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center gap-1.5"
                onClick={handlePrint}
                leftIcon={<Printer className="w-4 h-4 text-slate-600" />}
              >
                Print Invoice
              </Button>
            </div>

            {sale.notes && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span className="font-bold block text-slate-800 mb-0.5">Order Notes:</span>
                {sale.notes}
              </div>
            )}
          </Card>

          {/* Online Payment & Dynamic UPI QR Code Card */}
          <Card className="p-5 rounded-2xl border border-slate-200 shadow-xs bg-white overflow-hidden">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">UPI &amp; Online Payment</h3>
                  <span className="text-2xs text-slate-400 font-medium">Scan QR code for instant customer payment</span>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {formatINR(sale.totalAmount)}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
              {/* Official AU Bank UPI QR Code */}
              <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 mb-3">
                <img
                  src={srEnterprisesQr}
                  alt="S R ENTERPRISES AU Bank UPI Payment QR Code"
                  className="w-44 h-44 object-contain rounded-md"
                />
              </div>

              <div className="text-center space-y-1 w-full">
                <div className="text-xs font-bold text-slate-900">
                  Scan &amp; Pay {formatINR(sale.totalAmount)}
                </div>
                <div className="text-2xs text-slate-500 flex items-center justify-center gap-1">
                  <span>UPI ID:</span>
                  <code className="bg-slate-200/80 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-3xs">
                    srenterprises6711@aubank
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="text-blue-600 hover:text-blue-700 p-0.5 rounded"
                    title="Copy UPI ID"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 pt-1 font-medium">
                  <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200 shadow-3xs">Paytm</span>
                  <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200 shadow-3xs">GPay</span>
                  <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200 shadow-3xs">PhonePe</span>
                  <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200 shadow-3xs">AU 30+</span>
                </div>
              </div>
            </div>

            {/* Manual Payment & Confirm Sale Actions */}
            <div className="space-y-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center gap-1.5 font-bold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 border-emerald-200"
                onClick={() => setIsRecordPaymentModalOpen(true)}
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                Add / Record Payment
              </Button>

              {sale.status === 'DRAFT' && canConfirm && (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 text-sm shadow-xs flex items-center justify-center gap-2 rounded-xl mt-2"
                  onClick={handleConfirmSale}
                  isLoading={confirmMutation.isPending}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Confirm Sale
                </Button>
              )}
            </div>
          </Card>

          {/* Registered Customer Assets Card (Showing up to 3 most recent) */}
          {sale.assets && sale.assets.length > 0 && (
            <Card className="p-5 rounded-2xl border border-slate-200 shadow-xs bg-white">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Registered Assets</h4>
                </div>
                <Badge variant="success">3 Recent</Badge>
              </div>

              <div className="space-y-2 text-xs">
                {(sale.assets || [])
                  .slice()
                  .sort((a: any, b: any) => {
                    const dateA = new Date(a.purchaseDate || a.createdAt || 0).getTime();
                    const dateB = new Date(b.purchaseDate || b.createdAt || 0).getTime();
                    if (dateB !== dateA) return dateB - dateA;
                    return (b.assetNumber || '').localeCompare(a.assetNumber || '', undefined, { numeric: true });
                  })
                  .slice(0, 3)
                  .map((asset: any) => (
                    <div key={asset.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="font-bold text-slate-900">{asset.customName}</div>
                      <div className="text-2xs font-mono text-slate-500 mt-0.5">
                        {asset.assetNumber} • SN: {asset.serialNumber}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>

        {/* Center / Main Information Panel: Customer Details and Line Items (Freezes on scroll) */}
        <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-0 lg:self-start lg:z-10">
          {/* Customer Details Card */}
          <Card className="p-5 rounded-2xl border border-slate-200 shadow-xs bg-white">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Customer Details</h3>
                  <span className="text-2xs text-slate-400 font-medium">Billed Customer &amp; Contact Information</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs print:hidden"
                onClick={() => navigate(`/customers/${sale.customerId}`)}
                rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
              >
                View Customer Profile
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Customer Name
                </span>
                <span className="font-bold text-slate-900 text-sm block">{sale.customerName}</span>
                <span className="font-mono text-2xs text-slate-500 font-semibold">{sale.customerNumber}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Phone Number
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {sale.customerPhone || 'Not provided'}
                  </span>
                  {sale.customerPhone && (
                    <button
                      type="button"
                      onClick={handleWhatsAppShare}
                      className="text-emerald-600 hover:text-emerald-700 p-1 rounded hover:bg-emerald-50 transition-colors print:hidden"
                      title="Open WhatsApp Chat"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Email Address
                </span>
                <span className="font-medium text-slate-800 flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {sale.customerEmail || 'Not provided'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Account Type
                </span>
                <span className="font-bold text-slate-800 capitalize">
                  {sale.customerType ? sale.customerType.toLowerCase() : 'Individual'}
                </span>
              </div>
            </div>
          </Card>

          {/* Line Items Table */}
          <Card className="p-5 rounded-2xl border border-slate-200 shadow-xs bg-white">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Purchased Products &amp; Items</h3>
                  <span className="text-2xs text-slate-400 font-medium">Authoritative transaction line items</span>
                </div>
              </div>
              <Badge variant="neutral">{sale.items.length} item(s)</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-y border-slate-200 uppercase font-bold text-2xs">
                  <tr>
                    <th className="py-2.5 px-3">Product Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Discount</th>
                    <th className="py-2.5 px-3 text-right">GST Tax</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{item.productNameSnapshot}</div>
                        <div className="text-2xs text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                          <span>SKU: {item.skuSnapshot}</span>
                          {item.serialNumber && (
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded font-semibold">
                              SN: {item.serialNumber}
                            </span>
                          )}
                          {item.warrantyMonths && (
                            <span className="text-indigo-600 font-sans font-semibold">
                              • {item.warrantyMonths}M Warranty
                            </span>
                          )}
                          {item.nextServiceDate && (
                            <span className="text-emerald-700 font-sans font-semibold">
                              • Next Service:{' '}
                              {new Date(item.nextServiceDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold font-mono">{item.quantity}</td>
                      <td className="py-3 px-3 text-right font-mono font-medium">
                        {formatINR(item.unitPriceSnapshot)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-600">
                        {parseFloat(item.discountAmount) > 0
                          ? `-${formatINR(item.discountAmount)}`
                          : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {formatINR(item.taxAmount)} ({item.taxRatePercent}%)
                      </td>
                      <td className="py-3 px-3 text-right font-bold font-mono text-slate-900">
                        {formatINR(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Payment Information & Recorded Transactions History Card */}
          <Card className="p-5 rounded-2xl border border-slate-200 shadow-xs bg-white">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Payment Details &amp; History</h3>
                  <span className="text-2xs text-slate-400 font-medium">
                    Financial settlement, installments &amp; payment receipts
                  </span>
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
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 print:hidden"
                    onClick={() => setIsRecordPaymentModalOpen(true)}
                    leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                  >
                    Record Payment
                  </Button>
                )}
              </div>
            </div>

            {/* Payment Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Total Order Amount
                </span>
                <span className="font-bold font-mono text-slate-900 text-sm mt-0.5 block">
                  {formatINR(totalAmount)}
                </span>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <span className="text-2xs font-semibold text-emerald-700 uppercase tracking-wider block">
                  Total Received / Paid
                </span>
                <span className="font-bold font-mono text-emerald-700 text-sm mt-0.5 block">
                  {formatINR(paidAmount)}
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${balanceDue > 0 ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                <span className="text-2xs font-semibold uppercase tracking-wider block opacity-75">
                  Remaining Balance Due
                </span>
                <span className={`font-bold font-mono text-sm mt-0.5 block ${balanceDue > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
                  {formatINR(balanceDue)}
                </span>
              </div>
            </div>

            {/* Recorded Payments Table */}
            {sale.payments && sale.payments.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-2xs">
                    <tr>
                      <th className="py-2.5 px-3">Installment / Ref</th>
                      <th className="py-2.5 px-3 text-center">Payment Date</th>
                      <th className="py-2.5 px-3 text-center">Mode</th>
                      <th className="py-2.5 px-3 text-right">Amount Received</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sale.payments.map((p: any, idx: number) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-semibold text-slate-900">
                            Installment #{idx + 1} ({p.paymentNumber})
                          </div>
                          {p.referenceNumber && (
                            <div className="text-2xs text-slate-500 font-mono">Ref: {p.referenceNumber}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                          {formatDate(p.paymentDate)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-semibold text-2xs bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {formatINR(p.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                {sale.status === 'COMPLETED' ? (
                  <span>No separate installment records. Payment settled at sale confirmation.</span>
                ) : (
                  <span>No payments recorded yet. Click <strong>Record Payment</strong> or scan the QR code to collect payment.</span>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Sale Transaction"
      >
        <div className="space-y-4 text-sm">
          <p className="text-slate-600">
            Cancelling this sale will mark order <strong>{sale.saleNumber}</strong> and its linked invoice as cancelled. Historical transaction records will be preserved for financial auditing.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Customer returned machine, order placed in error"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Keep Sale
            </Button>
            <Button
              variant="destructive"
              isLoading={cancelMutation.isPending}
              onClick={handleCancelSale}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Record Manual Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        initialInvoiceId={sale.invoice?.id}
        onSuccess={() => {
          toast.success('Payment recorded successfully.', 'Payment Saved');
          setIsRecordPaymentModalOpen(false);
        }}
      />
    </div>
  );
};
