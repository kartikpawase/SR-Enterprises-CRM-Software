import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { CustomerAssetsList } from './components/CustomerAssetsList';
import { CustomerActivityTimeline } from './components/CustomerActivityTimeline';
import { CustomerRentalsSection } from './components/CustomerRentalsSection';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomerArchiveDialog } from './components/CustomerArchiveDialog';
import { CustomerLabelModal } from './components/CustomerLabelModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  useCustomerDetailQuery,
  useCustomerFinancialSummaryQuery,
  useAddCustomerNoteMutation,
  useDeleteCustomerMutation,
} from './customer.api';
import { usePayments, type PaymentItem } from '../payments/payments.api';
import { useInvoicesQuery, type InvoiceSummaryData } from '../invoices/invoices.api';
import { useSalesQuery, type SaleSummaryData } from '../sales/sales.api';
import { RecordPaymentModal } from '../payments/components/RecordPaymentModal';
import { PaymentReceiptModal } from '../payments/components/PaymentReceiptModal';
import { useAuth } from '../../providers/AuthBoundary';
import { useToast } from '../../providers/ToastProvider';
import { formatINR, formatDate, formatDateTime } from '../../lib/formatters';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit2,
  Clock,
  UserCheck,
  Users,
  Wallet,
  ChevronDown,
  Download,
  MoreVertical,
  Plus,
  FileCheck,
  MessageSquare,
  Wrench,
  Tv,
  Zap,
  Printer,
  Wind,
  Shield,
  CreditCard,
  Activity,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Eye,
  ShoppingBag,
  Package,
  Trash2,
  Repeat,
  Tag,
} from 'lucide-react';

export const CustomerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [selectedInvoiceIdForPayment, setSelectedInvoiceIdForPayment] = useState<string | undefined>(undefined);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<PaymentItem | null>(null);
  const [financialPeriod] = useState('This Year');
  const [noteContent, setNoteContent] = useState('');

  const { data: customer, isLoading, isError, refetch } = useCustomerDetailQuery(id);
  const { data: financialData } = useCustomerFinancialSummaryQuery(id || '');
  const { data: customerPaymentsData, refetch: refetchPayments } = usePayments({
    customerId: id,
    limit: 100,
  });
  const { data: customerInvoicesData, refetch: refetchInvoices } = useInvoicesQuery({
    customerId: id,
    limit: 100,
  });
  const { data: customerSalesData, refetch: refetchSales } = useSalesQuery({
    customerId: id,
    limit: 100,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const addNoteMutation = useAddCustomerNoteMutation(id || '');
  const deleteCustomerMutation = useDeleteCustomerMutation(id || '');

  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  // Dynamic Payment Trend Data Aggregation directly from real payment records
  const allCustomerPayments = React.useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    const addPayment = (p: any) => {
      if (!p) return;
      const key = p.id || p.paymentNumber || `${p.amount}-${p.paymentDate}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(p);
      }
    };

    (customerPaymentsData?.data || []).forEach(addPayment);
    ((customer as any)?.payments || []).forEach(addPayment);
    ((customer as any)?.invoices || []).forEach((inv: any) => {
      (inv.payments || []).forEach(addPayment);
    });

    return list;
  }, [customerPaymentsData, customer]);

  const trendMonthsData = React.useMemo(() => {
    const now = new Date();
    const months: Array<{
      label: string;
      fullName: string;
      year: number;
      monthIndex: number;
      total: number;
      count: number;
    }> = [];

    // Generate last 7 months ending at the current month
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        fullName: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        total: 0,
        count: 0,
      });
    }

    // Accumulate all real payments for this customer
    allCustomerPayments.forEach((p) => {
      const dateVal = p.paymentDate || p.createdAt;
      if (!dateVal) return;
      const pDate = new Date(dateVal);
      if (isNaN(pDate.getTime())) return;

      const m = months.find((x) => x.year === pDate.getFullYear() && x.monthIndex === pDate.getMonth());
      if (m) {
        const amt = parseFloat(p.amount) || 0;
        m.total += amt;
        m.count += 1;
      }
    });

    const maxVal = Math.max(...months.map((m) => m.total), 0);
    // Round up maxVal for clean axis ticks
    let maxAxis = 5000;
    if (maxVal > 0) {
      if (maxVal > 100000) maxAxis = Math.ceil(maxVal / 25000) * 25000;
      else if (maxVal > 50000) maxAxis = Math.ceil(maxVal / 10000) * 10000;
      else if (maxVal > 10000) maxAxis = Math.ceil(maxVal / 5000) * 5000;
      else if (maxVal > 5000) maxAxis = Math.ceil(maxVal / 2500) * 2500;
      else if (maxVal > 1000) maxAxis = Math.ceil(maxVal / 1000) * 1000;
      else maxAxis = Math.ceil(maxVal / 500) * 500;
    }

    const points = months.map((m, idx) => {
      const x = 15 + idx * (320 / 6);
      const ratio = maxAxis > 0 ? Math.min(1, m.total / maxAxis) : 0;
      const y = 125 - ratio * 105;
      return { x, y, ...m };
    });

    // Generate smooth bezier curve path
    let linePath = '';
    let areaPath = '';
    if (points.length > 0) {
      linePath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        let cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        let cp2y = p2.y - (p3.y - p1.y) / 6;

        cp1y = Math.min(125, Math.max(12, cp1y));
        cp2y = Math.min(125, Math.max(12, cp2y));

        linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }

      areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} 130 L ${points[0].x.toFixed(1)} 130 Z`;
    }

    const formatTick = (num: number) => {
      if (num >= 100000) return `${(num / 100000).toFixed(num % 100000 === 0 ? 0 : 1)}L`;
      if (num >= 1000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`;
      return String(Math.round(num));
    };

    const yTicks = [
      formatTick(maxAxis),
      formatTick(maxAxis * 0.66),
      formatTick(maxAxis * 0.33),
      '0',
    ];

    let activeIdx = months.length - 1;
    const lastWithPayment = months.map((m, i) => (m.total > 0 ? i : -1)).filter((i) => i >= 0);
    if (lastWithPayment.length > 0) {
      activeIdx = lastWithPayment[lastWithPayment.length - 1];
    }

    return {
      months: points,
      maxAxis,
      yTicks,
      linePath,
      areaPath,
      defaultActiveIdx: activeIdx,
    };
  }, [allCustomerPayments]);

  const handleDeleteCustomer = async () => {
    const targetId = customer?.id || id;
    if (!targetId) return;
    try {
      await deleteCustomerMutation.mutateAsync(targetId);
      toast.success(
        `Customer ${customer?.fullName || 'record'} (${customer?.customerNumber || ''}) has been permanently deleted.`,
        'Customer Deleted'
      );
      setIsDeleteDialogOpen(false);
      navigate('/customers');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete customer', 'Delete Error');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    try {
      await addNoteMutation.mutateAsync(noteContent.trim());
      setNoteContent('');
      toast.success('Relationship note appended to customer timeline.', 'Note Added');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add note', 'Note Error');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <ErrorState
        title="Failed to load customer profile"
        message="The customer record could not be retrieved. The customer may not exist or you may lack authorized permission."
        onRetry={() => refetch()}
      />
    );
  }

  const defaultAddress = customer.addresses?.[0];
  const formattedAddress = defaultAddress
    ? `${defaultAddress.addressLine1 || ''}${defaultAddress.addressLine2 ? `, ${defaultAddress.addressLine2}` : ''}, ${defaultAddress.city || ''} ${defaultAddress.postalCode ? `- ${defaultAddress.postalCode}` : ''}${defaultAddress.state ? `, ${defaultAddress.state}` : ''}`.trim()
    : 'No address registered';

  const customerSinceFormatted = customer.createdAt
    ? new Date(customer.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Recently';

  // Real Customer Services from database
  const customerServicesList = ((customer as any).services || []).map((s: any) => {
    const machineName = s.productName || s.customName || s.asset?.customName || s.asset?.product?.name || '';
    return {
      id: s.id,
      title: s.serviceType ? s.serviceType.replace(/_/g, ' ') : 'RO Water Purifier Service',
      machineName,
      serviceNumber: s.serviceNumber || 'SRV',
      date: s.scheduledDate ? formatDate(s.scheduledDate) : 'Recently',
      status: s.status,
      statusLabel: s.status === 'COMPLETED' ? 'Completed' : s.status === 'IN_PROGRESS' ? 'In Progress' : 'Scheduled',
      statusColor: s.status === 'COMPLETED'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : s.status === 'IN_PROGRESS'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-blue-50 text-blue-700 border-blue-200',
      amount: s.cost ? formatINR(s.cost) : '₹ 0.00',
      icon: <Wrench className="w-4 h-4 text-blue-600" />,
      bgIcon: 'bg-blue-50',
    };
  });

  // Real Customer Payments, Invoices & Sales Data
  const recordedPayments: PaymentItem[] = customerPaymentsData?.data || [];
  const recordedInvoices: InvoiceSummaryData[] = customerInvoicesData?.data || [];
  const customerSalesList: SaleSummaryData[] = customerSalesData?.data || (customer as any)?.sales || [];

  const displaySales = customerSalesList.map((s) => ({
    id: s.id,
    saleNumber: s.saleNumber,
    date: formatDate(s.saleDate || s.createdAt),
    products: (s as any).items && (s as any).items.length > 0
      ? (s as any).items.map((i: any) => `${i.productNameSnapshot || i.productName || 'RO Product'} (${i.quantity || 1}x)`).join(', ')
      : s.notes || 'RO System / Spare Parts Order',
    itemsList: (s as any).items || [],
    totalAmount: formatINR(s.totalAmount),
    status: s.status === 'COMPLETED' ? 'Delivered' : s.status === 'DRAFT' ? 'Draft / Processing' : 'Cancelled',
    statusColor: s.status === 'COMPLETED'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : s.status === 'DRAFT'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200',
    invoiceNumber: s.invoice?.invoiceNumber,
    invoiceId: s.invoice?.id,
  }));

  // Dynamic Financial Aggregation directly from database records
  const totalInvoicedNumber = recordedInvoices.length > 0
    ? recordedInvoices.reduce((sum, inv) => sum + (parseFloat(inv.totalAmount) || 0), 0)
    : (financialData?.totalBilled ? parseFloat(financialData.totalBilled) : 0);

  const totalPaidNumber = recordedPayments.length > 0
    ? recordedPayments.reduce((sum, p) => sum + (p.status === 'COMPLETED' ? (parseFloat(p.amount) || 0) : 0), 0)
    : (financialData?.totalPaid ? parseFloat(financialData.totalPaid) : 0);

  const outstandingNumber = Math.max(0, totalInvoicedNumber - totalPaidNumber);

  const totalSpentFormatted = financialData?.totalBilled
    ? `₹${parseFloat(financialData.totalBilled).toLocaleString('en-IN')}.00`
    : `₹ ${totalInvoicedNumber.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const totalPaidFormatted = financialData?.totalPaid
    ? `₹${parseFloat(financialData.totalPaid).toLocaleString('en-IN')}.00`
    : `₹ ${totalPaidNumber.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const totalOutstandingFormatted = financialData?.outstanding
    ? `₹${parseFloat(financialData.outstanding).toLocaleString('en-IN')}.00`
    : `₹ ${outstandingNumber.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const paidPercentage = totalInvoicedNumber > 0
    ? Math.round((totalPaidNumber / totalInvoicedNumber) * 100)
    : (totalPaidNumber > 0 ? 100 : 0);

  const outstandingPercentage = totalInvoicedNumber > 0
    ? Math.round((outstandingNumber / totalInvoicedNumber) * 100)
    : 0;

  // Real Invoice History List for Overview Table
  const displayInvoices = recordedInvoices.map((inv) => ({
    id: inv.invoiceNumber,
    dbId: inv.id,
    date: formatDate(inv.invoiceDate || inv.createdAt),
    service: inv.notes || 'RO System / Spare Parts Sale',
    amount: formatINR(inv.totalAmount),
    status: inv.status === 'PAID' ? 'Paid' : inv.status === 'PARTIALLY_PAID' ? 'Partially Paid' : inv.status === 'OVERDUE' ? 'Overdue' : 'Not Paid',
    statusColor: inv.status === 'PAID'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : inv.status === 'PARTIALLY_PAID'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200',
    paymentStatus: inv.status === 'PAID' || parseFloat(inv.outstandingAmount || '0') <= 0
      ? `Paid in Full (${formatINR(inv.paidAmount)})`
      : inv.status === 'PARTIALLY_PAID'
      ? `Paid ${formatINR(inv.paidAmount)} • Due: ${formatDate(inv.dueDate)}`
      : `Due on ${formatDate(inv.dueDate)}`,
  }));


  const tabs = [
    { id: 'overview', label: 'Overview', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'sales', label: `Purchases (${customerSalesList.length})`, icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'rentals', label: 'Rentals', icon: <Repeat className="w-4 h-4" /> },
    { id: 'services', label: 'Services', icon: <Wrench className="w-4 h-4" /> },
    { id: 'invoices', label: 'Invoices', icon: <Receipt className="w-4 h-4" /> },
    { id: 'payments', label: `Payments (${recordedPayments.length})`, icon: <CreditCard className="w-4 h-4" /> },
    { id: 'notes', label: 'Notes', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {/* 1. Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">Customer Profile</h1>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
            <span className="hover:text-slate-900 cursor-pointer" onClick={() => navigate('/dashboard')}>Home</span>
            <span>&gt;</span>
            <span className="hover:text-slate-900 cursor-pointer" onClick={() => navigate('/customers')}>Customers</span>
            <span>&gt;</span>
            <span className="text-slate-900 font-bold">{customer.fullName}</span>
          </nav>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSelectedInvoiceIdForPayment(undefined);
              setIsRecordPaymentModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/90 rounded-xl hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Record Payment</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200/90 rounded-xl hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Delete Customer</span>
          </button>

          <button
            type="button"
            onClick={() => setIsLabelModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Change Customer Label"
          >
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            <span>Customer Label</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <span>More Actions</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <Button
            variant="primary"
            className="rounded-xl text-xs px-4 py-2 flex items-center gap-1.5 shadow-2xs"
            onClick={() => navigate('/services')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            <span>New Service</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </Button>
        </div>
      </div>

      {/* 2. Main Profile Summary Card */}
      <Card className="p-6 rounded-xl border border-slate-200/90 shadow-2xs bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Avatar & Primary Details */}
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden bg-sky-50 border border-sky-200/80 flex items-center justify-center shadow-inner">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                  alt={customer.fullName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span className="text-2xl font-mono font-bold text-sky-700 uppercase">
                  {customer.fullName.slice(0, 2)}
                </span>
              </div>
              <span
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-2xs"
                title="Active Customer"
              >
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-display font-extrabold text-slate-900 tracking-tight">{customer.fullName}</h2>
                <span className="px-2.5 py-0.5 bg-sky-50 text-sky-800 border border-sky-200/80 rounded-full text-2xs font-bold font-mono tracking-wide">
                  Premium Customer
                </span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-mono text-slate-500 font-semibold">
                  {customer.customerNumber}
                </span>

                {/* Customer Status Label Badge */}
                {customer.customerLabel === 'GOOD' && (
                  <button
                    type="button"
                    onClick={() => setIsLabelModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs hover:bg-emerald-100 transition-colors cursor-pointer"
                    title="Click to change customer label"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>Good Customer</span>
                  </button>
                )}
                {customer.customerLabel === 'BAD' && (
                  <button
                    type="button"
                    onClick={() => setIsLabelModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200/90 shadow-2xs hover:bg-rose-100 transition-colors cursor-pointer"
                    title="Click to change customer label"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    <span>Bad Customer</span>
                  </button>
                )}
                {!customer.customerLabel && (
                  <button
                    type="button"
                    onClick={() => setIsLabelModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-500 hover:text-slate-800 bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/70 transition-colors cursor-pointer"
                    title="Click to assign label"
                  >
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>No Label</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 pt-1 font-medium">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{customer.email || 'No email registered'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono">{customer.phone || 'No phone registered'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[220px]">
                    {[defaultAddress?.city, defaultAddress?.state].filter(Boolean).join(', ') || defaultAddress?.addressLine1 || 'Location not specified'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 lg:border-l lg:border-slate-100 lg:pl-6">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-2xs">
                <div className="text-slate-400 font-medium">Customer Since</div>
                <div className="font-bold text-slate-900 font-mono">{customerSinceFormatted}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                <Users className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-2xs">
                <div className="text-slate-400 font-medium">Customer Type</div>
                <div className="font-bold text-slate-900 capitalize">
                  {customer.customerType ? customer.customerType.toLowerCase() : 'Individual'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                <UserCheck className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-2xs">
                <div className="text-slate-400 font-medium">Assigned To</div>
                <div className="font-bold text-slate-900">Support Desk</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                <Shield className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xs">
                <div className="text-slate-400 font-medium">Status</div>
                <div className="font-bold text-emerald-700 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full inline-block" />
                  <span>{customer.status === 'ACTIVE' ? 'Active' : customer.status || 'Active'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Navigation Tabs */}
      <div className="border-b border-slate-200/90">
        <div className="flex items-center gap-1 sm:gap-4 overflow-x-auto no-scrollbar">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-primary-600 text-primary-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Main Two-Column Layout */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Main Content (Wide Column - 7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Top 2-Column Split: About Customer & Recent Services */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* About Customer Card */}
              <Card className="p-5 rounded-2xl border border-slate-200/80 shadow-xs bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">About Customer</h3>
                    <span className="text-2xs font-semibold text-slate-400">Registered Locations &amp; Addresses</span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                        Company / Organization
                      </div>
                      <div className="font-bold text-slate-800">
                        {customer.companyName || 'Individual'}
                      </div>
                    </div>

                    <div>
                      <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                        GST Number
                      </div>
                      <div className="font-mono font-bold text-slate-800">
                        {(customer as any).gstNumber || (customer as any).gstin || 'Not Provided'}
                      </div>
                    </div>

                    <div>
                      <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                        Billing Address
                      </div>
                      <div className="text-slate-700 leading-relaxed font-medium">
                        {formattedAddress}
                      </div>
                    </div>

                    <div>
                      <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                        Shipping Address
                      </div>
                      <div className="text-slate-500 font-medium">
                        Same as billing address
                      </div>
                    </div>

                    {customer.notes && (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                          Notes / Instructions
                        </div>
                        <div className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 text-2xs">
                          {customer.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </button>
                </div>
              </Card>

              {/* Recent Services Card */}
              <Card className="p-5 rounded-2xl border border-slate-200/80 shadow-xs bg-white">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Recent Services</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('services')}
                    className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  {customerServicesList.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      No service records found for this customer.
                    </div>
                  ) : (
                    customerServicesList.map((s: any) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg ${s.bgIcon} flex items-center justify-center shrink-0`}>
                            {s.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {s.title} {s.machineName ? `• ${s.machineName}` : ''}
                            </div>
                            <div className="text-2xs text-slate-400 truncate">
                              {s.serviceNumber} • {s.date}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-2xs font-bold border ${s.statusColor}`}>
                            {s.statusLabel}
                          </span>
                          <span className="text-xs font-bold text-slate-800 font-mono">{s.amount}</span>
                          <button type="button" className="text-slate-300 hover:text-slate-600 p-0.5">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Recent Purchases & Sales Orders Card */}
            <Card className="p-5 rounded-2xl border border-slate-200/80 shadow-xs bg-white">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-rose-500" />
                  <h3 className="text-sm font-bold text-slate-900">Purchased Products &amp; Sales Orders</h3>
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-2xs font-bold rounded-full border border-rose-200">
                    {displaySales.length} Orders
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('sales')}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {displaySales.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No sales orders recorded yet for this customer.
                  </div>
                ) : (
                  displaySales.slice(0, 3).map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div
                            className="text-xs font-bold text-slate-900 truncate hover:text-blue-600 cursor-pointer"
                            onClick={() => navigate(`/sales/${sale.id}`)}
                          >
                            {sale.saleNumber} • {sale.products}
                          </div>
                          <div className="text-2xs text-slate-400 truncate">
                            {sale.date} {sale.invoiceNumber ? `• Invoice: ${sale.invoiceNumber}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-2xs font-bold border ${sale.statusColor}`}>
                          {sale.status}
                        </span>
                        <span className="text-xs font-bold text-slate-800 font-mono">{sale.totalAmount}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-2xs px-2 py-1"
                          onClick={() => navigate(`/sales/${sale.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Bottom Row: Invoice History Table */}
            <Card className="p-5 rounded-2xl border border-slate-200/80 shadow-xs bg-white">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Invoice History</h3>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-2xs font-bold rounded-full">
                    {displayInvoices.length} Invoices
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('invoices')}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-2xs font-bold">
                      <th className="pb-2.5 font-bold">INVOICE ID</th>
                      <th className="pb-2.5 font-bold">DATE</th>
                      <th className="pb-2.5 font-bold">SERVICE</th>
                      <th className="pb-2.5 font-bold">AMOUNT</th>
                      <th className="pb-2.5 font-bold">STATUS</th>
                      <th className="pb-2.5 font-bold">PAYMENT STATUS</th>
                      <th className="pb-2.5 text-right font-bold">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {displayInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                          No invoices generated yet for this customer.
                        </td>
                      </tr>
                    ) : (
                      displayInvoices.map((inv, idx) => (
                        <tr key={inv.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td
                            className="py-3 font-mono font-bold text-blue-600 hover:underline cursor-pointer"
                            onClick={() => {
                              if ((inv as any).dbId) navigate(`/invoices/${(inv as any).dbId}`);
                            }}
                          >
                            {inv.id}
                          </td>
                          <td className="py-3 text-slate-500">{inv.date}</td>
                          <td className="py-3 font-medium text-slate-800">{inv.service}</td>
                          <td className="py-3 font-bold text-slate-900 font-mono">{inv.amount}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-2xs font-bold border ${inv.statusColor}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3 text-slate-500 text-2xs">{inv.paymentStatus}</td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if ((inv as any).dbId) navigate(`/invoices/${(inv as any).dbId}`);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                              title="View / Download Invoice"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Right Sidebar Widgets (Narrow Column - 5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. Financial Summary Card */}
            <Card className="p-5 rounded-xl border border-slate-200/90 shadow-2xs bg-white">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-display font-bold text-slate-900">Financial Summary</h3>
                  <span className="text-2xs text-slate-400 font-medium font-mono">Financial Position</span>
                </div>
                <div className="flex items-center gap-1 text-2xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg font-mono">
                  <span>{financialPeriod}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              </div>

              {/* Big Spent Row */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-sky-50/70 to-teal-50/40 border border-sky-100/80 mb-4">
                <div>
                  <div className="text-2xs font-bold text-slate-500 uppercase tracking-wider font-mono">Total Spent</div>
                  <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight mt-0.5">
                    {totalSpentFormatted}
                  </div>
                  <div className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full mt-1.5 font-mono">
                    <span>↑ 12.5% vs last year</span>
                  </div>
                </div>

                <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-md shadow-primary-600/20">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>

              {/* 4 Financial Sub-KPIs in a Grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                  <div className="text-2xs font-bold text-emerald-700 font-mono">Paid</div>
                  <div className="text-xs font-bold text-emerald-900 font-mono mt-0.5">{totalPaidFormatted}</div>
                  <div className="text-3xs font-semibold text-emerald-700 mt-0.5 font-mono">{paidPercentage}%</div>
                </div>

                <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-200/80">
                  <div className="text-2xs font-bold text-amber-700 font-mono">Outstanding</div>
                  <div className="text-xs font-bold text-amber-900 font-mono mt-0.5">{totalOutstandingFormatted}</div>
                  <div className="text-3xs font-semibold text-amber-700 mt-0.5 font-mono">{outstandingPercentage}%</div>
                </div>

                <div className="p-2 rounded-xl bg-rose-50/60 border border-rose-200/80">
                  <div className="text-2xs font-bold text-rose-700 font-mono">Overdue</div>
                  <div className="text-xs font-bold text-rose-900 font-mono mt-0.5">₹0.00</div>
                  <div className="text-3xs font-semibold text-rose-700 mt-0.5 font-mono">0%</div>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-2xs font-bold text-slate-600 font-mono">Invoices</div>
                  <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">
                    {recordedInvoices.length}
                  </div>
                  <div className="text-3xs font-semibold text-slate-500 mt-0.5 font-mono">Count</div>
                </div>
              </div>
            </Card>

            {/* 2. Payment Trend (Smooth Line Chart) */}
            <Card className="p-5 rounded-xl border border-slate-200/90 shadow-2xs bg-white">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-display font-bold text-slate-900">Payment Trend</h3>
                <div className="flex items-center gap-1 text-2xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg font-mono">
                  <span>This Year</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              </div>

              {/* Responsive SVG Chart with Area Shading */}
              <div className="relative pt-2">
                {/* Dynamic Y-Axis Labels */}
                <div className="flex justify-between text-2xs text-slate-400 font-mono">
                  {trendMonthsData.yTicks.map((tick, i) => (
                    <span key={i}>{tick}</span>
                  ))}
                </div>

                <div className="relative h-40 w-full mt-1">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 350 140" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284C7" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line x1="0" y1="15" x2="350" y2="15" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="0" y1="52" x2="350" y2="52" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="0" y1="88" x2="350" y2="88" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="0" y1="125" x2="350" y2="125" stroke="#e2e8f0" />

                    {/* Shaded Area */}
                    {trendMonthsData.areaPath && (
                      <path
                        d={trendMonthsData.areaPath}
                        fill="url(#trendGradient)"
                      />
                    )}

                    {/* Curved Spline */}
                    {trendMonthsData.linePath && (
                      <path
                        d={trendMonthsData.linePath}
                        fill="none"
                        stroke="#0284C7"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Interactive Points and Vertical Guides */}
                    {trendMonthsData.months.map((p, idx) => {
                      const activeIndex = hoveredTrendIndex !== null ? hoveredTrendIndex : trendMonthsData.defaultActiveIdx;
                      const isHovered = idx === activeIndex;

                      return (
                        <g
                          key={p.label}
                          className="cursor-pointer group"
                          onMouseEnter={() => setHoveredTrendIndex(idx)}
                          onMouseLeave={() => setHoveredTrendIndex(null)}
                        >
                          {/* Invisible hit column */}
                          <rect
                            x={p.x - 22}
                            y="0"
                            width="44"
                            height="140"
                            fill="transparent"
                          />
                          {/* Vertical guide line on active point */}
                          {isHovered && (
                            <line
                              x1={p.x}
                              y1="15"
                              x2={p.x}
                              y2="125"
                              stroke="#7dd3fc"
                              strokeDasharray="2 2"
                              strokeWidth="1.5"
                            />
                          )}
                          {/* Data point circle */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={isHovered ? 5.5 : 3.5}
                            fill={isHovered ? '#0369a1' : '#0284C7'}
                            className="stroke-white stroke-2 transition-all duration-150"
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Active Tooltip Callout */}
                  {(() => {
                    const activeIndex = hoveredTrendIndex !== null ? hoveredTrendIndex : trendMonthsData.defaultActiveIdx;
                    const activePoint = trendMonthsData.months[activeIndex] || trendMonthsData.months[trendMonthsData.months.length - 1];
                    if (!activePoint) return null;

                    return (
                      <div
                        className="absolute bg-slate-900 text-white rounded-lg px-2.5 py-1 text-2xs font-medium shadow-lg pointer-events-none transition-all duration-150 z-10"
                        style={{
                          left: `${(activePoint.x / 350) * 100}%`,
                          top: `${Math.max(5, (activePoint.y / 140) * 100 - 24)}%`,
                          transform: 'translate(-50%, -100%)',
                        }}
                      >
                        <div className="text-slate-400 text-3xs whitespace-nowrap font-mono">{activePoint.fullName}</div>
                        <div className="font-bold font-mono text-white whitespace-nowrap">{formatINR(activePoint.total)}</div>
                        {activePoint.count > 0 && (
                          <div className="text-3xs text-sky-300 whitespace-nowrap font-mono">{activePoint.count} payment{activePoint.count > 1 ? 's' : ''}</div>
                        )}
                        <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                      </div>
                    );
                  })()}
                </div>

                {/* X Axis Months */}
                <div className="flex justify-between text-2xs text-slate-400 font-medium px-2 mt-2 font-mono">
                  {trendMonthsData.months.map((m, idx) => {
                    const activeIndex = hoveredTrendIndex !== null ? hoveredTrendIndex : trendMonthsData.defaultActiveIdx;
                    const isHovered = idx === activeIndex;

                    return (
                      <span
                        key={m.label}
                        onMouseEnter={() => setHoveredTrendIndex(idx)}
                        onMouseLeave={() => setHoveredTrendIndex(null)}
                        className={`cursor-pointer transition-colors ${
                          isHovered ? 'text-primary-600 font-bold' : 'hover:text-slate-700'
                        }`}
                      >
                        {m.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* 3. Communication Card */}
            <Card className="p-5 rounded-2xl border border-slate-200/80 shadow-xs bg-white">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Communication</h3>
                <button type="button" className="text-xs text-blue-600 font-bold hover:underline cursor-pointer">
                  View All
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-2xs text-slate-400 font-medium">Email</div>
                      <div className="font-bold text-slate-800">{customer.email ? `email: ${customer.email}` : 'rahul.patil@example.com'}</div>
                    </div>
                  </div>
                  <span className="text-2xs font-bold text-emerald-600 flex items-center gap-0.5">
                    Verified ✓
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-2xs text-slate-400 font-medium">Phone</div>
                      <div className="font-bold text-slate-800">{customer.phone ? `tel: ${customer.phone}` : '+91 98765 43210'}</div>
                    </div>
                  </div>
                  <span className="text-2xs font-bold text-emerald-600 flex items-center gap-0.5">
                    Verified ✓
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-2xs text-slate-400 font-medium">Last Interaction</div>
                    <div className="font-bold text-slate-800">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div className="text-2xs text-slate-500 mt-0.5 font-medium">
                      Service &amp; Maintenance <span className="font-bold text-slate-700">{customerServicesList[0]?.machineName || (customer as any).assets?.[0]?.customName || (customer as any).assets?.[0]?.product?.name || 'RO Water Purifier System'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Sales / Purchases Tab Content */}
      {activeTab === 'sales' && (
        <Card className="p-6 rounded-2xl border border-slate-200/80 shadow-xs bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Purchases &amp; Sales Orders</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All products, RO machines, filters, and spare parts purchased by {customer.fullName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                onClick={() => navigate(`/sales/new?customerId=${customer.id}`)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Record New Sale
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-2xs font-bold">
                  <th className="pb-3 font-bold">Order #</th>
                  <th className="pb-3 font-bold">Date</th>
                  <th className="pb-3 font-bold">Purchased Items / Products</th>
                  <th className="pb-3 font-bold">Total Amount</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 font-bold">Invoice</th>
                  <th className="pb-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displaySales.length > 0 ? (
                  displaySales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td
                        className="py-3.5 font-mono font-bold text-blue-600 hover:underline cursor-pointer"
                        onClick={() => navigate(`/sales/${sale.id}`)}
                      >
                        {sale.saleNumber}
                      </td>
                      <td className="py-3.5 text-slate-600 whitespace-nowrap">{sale.date}</td>
                      <td className="py-3.5 font-medium text-slate-800 max-w-xs">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate">{sale.products}</span>
                        </div>
                      </td>
                      <td className="py-3.5 font-bold text-slate-900 font-mono whitespace-nowrap">
                        {sale.totalAmount}
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-2xs font-bold border ${sale.statusColor}`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {sale.invoiceNumber ? (
                          <span
                            className="text-blue-600 hover:underline cursor-pointer font-bold"
                            onClick={() => {
                              if (sale.invoiceId) navigate(`/invoices/${sale.invoiceId}`);
                            }}
                          >
                            {sale.invoiceNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not Generated</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => navigate(`/sales/${sale.id}`)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                          onClick={() => navigate('/services')}
                        >
                          Schedule Service
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No sales orders or purchases found for this customer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Rentals Tab Content */}
      {activeTab === 'rentals' && (
        <CustomerRentalsSection
          customerId={customer.id}
          customerName={customer.fullName}
          customerPhone={customer.phone}
        />
      )}

      {/* Services Tab Content */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          <CustomerAssetsList customerId={customer.id} />
        </div>
      )}

      {/* Invoices Tab Content */}
      {activeTab === 'invoices' && (
        <Card className="p-6 rounded-2xl border border-slate-200/80 shadow-xs bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Customer Invoices &amp; Billing Ledger</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All tax invoices generated for {customer.fullName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                onClick={() => navigate('/sales/new')}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create New Sale / Invoice
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-2xs font-bold">
                  <th className="pb-3 font-bold">Invoice #</th>
                  <th className="pb-3 font-bold">Date</th>
                  <th className="pb-3 font-bold">Billed Amount</th>
                  <th className="pb-3 font-bold">Amount Paid</th>
                  <th className="pb-3 font-bold">Balance Due</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 font-bold">Due Date</th>
                  <th className="pb-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recordedInvoices.length > 0 ? (
                  recordedInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td
                        className="py-3.5 font-mono font-bold text-blue-600 hover:underline cursor-pointer"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                      >
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 text-slate-600">{formatDate(inv.invoiceDate || inv.createdAt)}</td>
                      <td className="py-3.5 font-bold text-slate-900 font-mono">{formatINR(inv.totalAmount)}</td>
                      <td className="py-3.5 font-bold text-emerald-600 font-mono">{formatINR(inv.paidAmount)}</td>
                      <td className="py-3.5 font-bold text-amber-600 font-mono">{formatINR(inv.outstandingAmount)}</td>
                      <td className="py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-2xs font-bold border ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-500 font-medium">
                        {inv.status === 'PAID' || parseFloat(inv.outstandingAmount || '0') <= 0 ? '—' : formatDate(inv.dueDate)}
                      </td>
                      <td className="py-3.5 text-right flex items-center justify-end gap-2">
                        {inv.status !== 'PAID' && (
                          <Button
                            size="sm"
                            variant="primary"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-2xs px-2.5 py-1"
                            onClick={() => {
                              setSelectedInvoiceIdForPayment(inv.id);
                              setIsRecordPaymentModalOpen(true);
                            }}
                          >
                            Record Payment
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No invoices found for this customer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 5. Payments Tab Content — Strictly Records All Payments for Customer's Invoices */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Header & Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Total Payments</div>
              <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                {recordedPayments.length} Transactions
              </div>
              <div className="text-3xs text-slate-500 mt-0.5">Recorded for customer invoices</div>
            </Card>

            <Card className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-2xs font-bold text-emerald-600 uppercase tracking-wider">Total Collected</div>
              <div className="text-xl font-bold text-emerald-700 font-mono mt-1">
                {totalPaidFormatted}
              </div>
              <div className="text-3xs text-emerald-600 mt-0.5">Verified Collections</div>
            </Card>

            <Card className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-2xs font-bold text-amber-600 uppercase tracking-wider">Pending Balance</div>
              <div className="text-xl font-bold text-amber-700 font-mono mt-1">
                {totalOutstandingFormatted}
              </div>
              <div className="text-3xs text-amber-600 mt-0.5">Across all invoices</div>
            </Card>

            <Card className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Quick Action</div>
                <div className="text-xs font-bold text-slate-800 mt-1">Record New Payment</div>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={() => {
                  setSelectedInvoiceIdForPayment(undefined);
                  setIsRecordPaymentModalOpen(true);
                }}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Record Payment
              </Button>
            </Card>
          </div>

          {/* Payments Table */}
          <Card className="p-6 rounded-2xl border border-slate-200/80 shadow-xs bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recorded Customer Payments History</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete audit trail of all payments and installment transactions for {customer.fullName}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refetchPayments();
                    refetchInvoices();
                  }}
                  className="text-xs"
                >
                  Refresh
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-2xs font-bold">
                    <th className="pb-3 font-bold">Payment #</th>
                    <th className="pb-3 font-bold">Invoice #</th>
                    <th className="pb-3 font-bold">Payment Date &amp; Time</th>
                    <th className="pb-3 font-bold">Amount Paid</th>
                    <th className="pb-3 font-bold">Method</th>
                    <th className="pb-3 font-bold">Reference / UTR</th>
                    <th className="pb-3 font-bold">Status</th>
                    <th className="pb-3 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recordedPayments.length > 0 ? (
                    recordedPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 font-mono font-bold text-blue-600">
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            <span>{payment.paymentNumber}</span>
                          </div>
                        </td>
                        <td
                          className="py-3.5 font-mono font-bold text-slate-800 hover:text-blue-600 cursor-pointer"
                          onClick={() => {
                            if (payment.invoiceId) navigate(`/invoices/${payment.invoiceId}`);
                          }}
                        >
                          {payment.invoiceNumber || '—'}
                        </td>
                        <td className="py-3.5 text-slate-600">
                          {formatDateTime(payment.paymentDate || payment.createdAt)}
                        </td>
                        <td className="py-3.5 font-bold text-emerald-600 font-mono text-sm">
                          {formatINR(payment.amount)}
                        </td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-2xs font-bold border border-slate-200">
                            {payment.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3.5 font-mono text-2xs text-slate-500">
                          {payment.referenceNumber || '—'}
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-2xs font-bold border ${
                              payment.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : payment.status === 'REFUNDED'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs flex items-center gap-1 ml-auto"
                            onClick={() => setSelectedReceiptPayment(payment)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="max-w-sm mx-auto space-y-2">
                          <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
                          <div className="text-sm font-bold text-slate-700">No Payments Recorded Yet</div>
                          <p className="text-xs text-slate-500">
                            When payments are posted against {customer.fullName}&apos;s invoices, they will be logged here with complete receipt details.
                          </p>
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold mt-2"
                            onClick={() => {
                              setSelectedInvoiceIdForPayment(undefined);
                              setIsRecordPaymentModalOpen(true);
                            }}
                          >
                            Record First Payment
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Activity & Notes Tab Content */}
      {(activeTab === 'activity' || activeTab === 'notes') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CustomerActivityTimeline customerId={customer.id} />
          </div>
          <div>
            <Card className="p-5 rounded-2xl border border-slate-200/80 shadow-xs bg-white space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Add Customer Note</h3>
              <form onSubmit={handleAddNote} className="space-y-3">
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                  rows={4}
                  placeholder="Record customer preferences, visit instructions, or feedback..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  isLoading={addNoteMutation.isPending}
                >
                  Save Note
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      <CustomerFormModal
        isOpen={isEditModalOpen}
        customer={customer}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          setIsEditModalOpen(false);
          refetch();
        }}
      />

      {/* Archive Customer Dialog */}
      <CustomerArchiveDialog
        isOpen={isArchiveDialogOpen}
        customer={customer}
        onClose={() => setIsArchiveDialogOpen(false)}
        onSuccess={() => navigate('/customers')}
      />

      {/* Permanent Delete Customer Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteCustomer}
        title="Permanently Delete Customer"
        message={`Are you sure you want to permanently delete ${customer.fullName} (${customer.customerNumber})? This will remove this customer and ALL associated records (invoices, payments, sales, services, warranties, job cards, inquiries, and notes) completely from the CRM. This action cannot be undone.`}
        confirmLabel="Delete Customer Completely"
        variant="danger"
        isLoading={deleteCustomerMutation.isPending}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        initialInvoiceId={selectedInvoiceIdForPayment}
        onClose={() => {
          setIsRecordPaymentModalOpen(false);
          setSelectedInvoiceIdForPayment(undefined);
        }}
        onSuccess={() => {
          setIsRecordPaymentModalOpen(false);
          setSelectedInvoiceIdForPayment(undefined);
          refetchPayments();
          refetchInvoices();
          refetch();
          toast.success('Payment successfully recorded and updated on customer ledger.');
        }}
      />

      {/* Official Payment Receipt Modal */}
      <PaymentReceiptModal
        isOpen={Boolean(selectedReceiptPayment)}
        payment={selectedReceiptPayment}
        onClose={() => setSelectedReceiptPayment(null)}
      />

      {/* Customer Label Classification Modal */}
      <CustomerLabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        customer={customer || null}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
