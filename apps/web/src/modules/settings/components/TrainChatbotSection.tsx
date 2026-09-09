import React, { useState } from 'react';
import {
  Bot,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  UploadCloud,
  Loader2,
  Eye,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../providers/ToastProvider';
import {
  useChatbotKnowledgeQuery,
  useCreateKnowledgeMutation,
  useUpdateKnowledgeMutation,
  useDeleteKnowledgeMutation,
  usePublishKnowledgeMutation,
} from '../../chatbot/chatbot.api';
import type { ChatbotKnowledge } from '@crm/types';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'Services', label: 'Services & Repair' },
  { value: 'Products', label: 'Products & Purifiers' },
  { value: 'Warranty', label: 'Warranty' },
  { value: 'AMC', label: 'Annual Maintenance (AMC)' },
  { value: 'Rentals', label: 'Rentals & Subscriptions' },
  { value: 'Payments', label: 'Payments & Billing' },
  { value: 'Installation', label: 'Installation' },
  { value: 'Maintenance', label: 'Filter Maintenance' },
  { value: 'Contact', label: 'Contact & Support' },
  { value: 'General FAQ', label: 'General FAQ' },
];

const FORM_CATEGORIES = [
  { value: '', label: 'Select category (optional)' },
  ...CATEGORY_OPTIONS.filter((c) => c.value !== 'all'),
];

export const TrainChatbotSection: React.FC = () => {
  const toast = useToast();

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'true' | 'false'>('all');

  // Queries & Mutations
  const { data: knowledgeList = [], isLoading, refetch } = useChatbotKnowledgeQuery({
    search: search || undefined,
    category: category !== 'all' ? category : undefined,
    isActive: statusFilter,
  });

  const createMutation = useCreateKnowledgeMutation();
  const updateMutation = useUpdateKnowledgeMutation();
  const deleteMutation = useDeleteKnowledgeMutation();
  const publishMutation = usePublishKnowledgeMutation();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChatbotKnowledge | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormCategory('');
    setFormQuestion('');
    setFormAnswer('');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ChatbotKnowledge) => {
    setEditingItem(item);
    setFormTitle(item.title || '');
    setFormCategory(item.category || '');
    setFormQuestion(item.question || '');
    setFormAnswer(item.answer || '');
    setFormIsActive(item.isActive);
    setIsModalOpen(true);
  };

  const handleSaveKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: {
            title: formTitle,
            category: formCategory,
            question: formQuestion,
            answer: formAnswer,
            isActive: formIsActive,
          },
        });
        toast.success('Knowledge entry updated successfully.');
      } else {
        await createMutation.mutateAsync({
          title: formTitle,
          category: formCategory,
          question: formQuestion,
          answer: formAnswer,
          isActive: formIsActive,
        });
        toast.success('New knowledge entry added and trained.');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save knowledge entry');
    }
  };

  const handleToggleActive = async (item: ChatbotKnowledge) => {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        data: { isActive: !item.isActive },
      });
      toast.info(
        `Knowledge "${item.title}" ${!item.isActive ? 'activated' : 'deactivated'}.`
      );
    } catch (err: any) {
      toast.error('Failed to toggle knowledge status');
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Knowledge entry deleted permanently.');
      setDeletingId(null);
    } catch (err: any) {
      toast.error('Failed to delete knowledge entry');
    }
  };

  const handlePublishKnowledge = async () => {
    try {
      const res = await publishMutation.mutateAsync();
      toast.success(
        `Successfully published ${res.publishedCount} knowledge items to live chatbot.`
      );
    } catch (err: any) {
      toast.error('Failed to publish knowledge updates');
    }
  };

  const activeCount = knowledgeList.filter((k) => k.isActive).length;

  return (
    <div id="train-chatbot" className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-2xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-display font-bold text-slate-900">Train Chatbot</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                {activeCount} Active Items
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Authoritative knowledge base topics. The chatbot will answer customer questions strictly based on this data.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePublishKnowledge}
            disabled={publishMutation.isPending}
            className="flex items-center gap-1.5"
          >
            {publishMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span>Publish Knowledge</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Knowledge</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search knowledge topics, questions, answers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter knowledge by category"
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            aria-label="Filter knowledge by status"
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Knowledge List */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-xs">Loading trained knowledge base...</span>
          </div>
        ) : knowledgeList.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No Knowledge Entries Found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Add your first training entry above (e.g. RO warranty period, standard service charges, maintenance guidelines).
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenCreateModal}
              className="mt-4"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Entry
            </Button>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Title &amp; Category</th>
                <th className="py-3 px-4">Trained Question / Topic</th>
                <th className="py-3 px-4">Official Answer</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {knowledgeList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 align-top min-w-[160px]">
                    <p className="font-semibold text-slate-900">{item.title || '—'}</p>
                    {item.category ? (
                      <span className="inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {item.category}
                      </span>
                    ) : null}
                  </td>

                  <td className="py-3 px-4 align-top max-w-[220px]">
                    <p className="text-slate-700 line-clamp-2">{item.question || '—'}</p>
                  </td>

                  <td className="py-3 px-4 align-top max-w-[320px]">
                    <p className="text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded-md border border-slate-200/60 font-mono text-[11px]">
                      {item.answer || '—'}
                    </p>
                  </td>

                  <td className="py-3 px-4 align-top text-center">
                    <button
                      onClick={() => handleToggleActive(item)}
                      title="Click to toggle status"
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                        item.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      {item.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>

                  <td className="py-3 px-4 align-top text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Knowledge"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDeletingId(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Knowledge"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Knowledge Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Chatbot Knowledge' : 'Train New Chatbot Knowledge'}
        size="lg"
      >
        <form onSubmit={handleSaveKnowledge} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Title
              </label>
              <Input
                placeholder="e.g. RO Service Warranty Period"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {FORM_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              User Question / Search Topic
            </label>
            <Input
              placeholder="e.g. What is the standard warranty period for RO service?"
              value={formQuestion}
              onChange={(e) => setFormQuestion(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              The common question or topic formulation that users are expected to ask.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Authoritative Official Answer
            </label>
            <Textarea
              placeholder="Enter the official, authoritative response that the chatbot will present to users..."
              value={formAnswer}
              onChange={(e) => setFormAnswer(e.target.value)}
              rows={4}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              This exact content will be returned whenever a matching question is asked.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="formIsActive"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="formIsActive" className="text-xs font-medium text-slate-700 select-none cursor-pointer">
              Set active immediately (available for chatbot retrieval)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : editingItem ? (
                'Update Knowledge'
              ) : (
                'Save & Train'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to permanently delete this trained knowledge item? The chatbot will no longer be able to answer matching questions from this entry.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeletingId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deletingId && handleDeleteKnowledge(deletingId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
