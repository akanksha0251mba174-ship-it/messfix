import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  Clock,
  Eye,
  MessageSquarePlus,
  Pencil,
  SearchCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  BLUEPRINT_LIMITS,
  Complaint,
  ComplaintCategory,
  ComplaintMealContext,
  ComplaintStatus,
  Mess,
} from '../types';
import {
  createComplaint,
  formatFriendlyDate,
  formatTimestamp,
  getOffsetDateISO,
  updateStudentComplaint,
  withdrawComplaint,
} from '../services/messService';

interface ComplaintsViewProps {
  mess: Mess;
  user: User;
  complaints: Complaint[];
  initialMealContext?: ComplaintMealContext;
  initialOpenComposer?: boolean;
  onComposerHandled?: () => void;
}

const CATEGORIES: ComplaintCategory[] = [
  'Food Quality',
  'Hygiene & Cleanliness',
  'Portion Size',
  'Menu / Timing Mismatch',
  'Service & Staff',
  'Missed Meal',
];

const MEAL_CONTEXTS: ComplaintMealContext[] = [
  'Breakfast',
  'Lunch',
  'Snacks',
  'Dinner',
  'General',
];

const STATUS_FILTERS: (ComplaintStatus | 'All')[] = [
  'All',
  'Submitted',
  'Acknowledged',
  'In Review',
  'Resolved',
];

export function renderStatusBadge(status: ComplaintStatus) {
  switch (status) {
    case 'Submitted':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          Submitted
        </span>
      );
    case 'Acknowledged':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-800">
          <Eye className="w-3.5 h-3.5 text-sky-600" />
          Acknowledged
        </span>
      );
    case 'In Review':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800">
          <SearchCheck className="w-3.5 h-3.5 text-amber-600" />
          In Review
        </span>
      );
    case 'Resolved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Resolved
        </span>
      );
  }
}

export const ComplaintsView: React.FC<ComplaintsViewProps> = ({
  mess,
  user,
  complaints,
  initialMealContext = 'Lunch',
  initialOpenComposer = false,
  onComposerHandled,
}) => {
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'All'>('All');
  const [onlyMine, setOnlyMine] = useState<boolean>(false);
  const [composerOpen, setComposerOpen] = useState<boolean>(initialOpenComposer);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | null>(null);

  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<ComplaintCategory>('Food Quality');
  const [mealType, setMealType] = useState<ComplaintMealContext>(initialMealContext);
  const [mealDate, setMealDate] = useState<string>(getOffsetDateISO(0));
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialOpenComposer) {
      setComposerOpen(true);
      setMealType(initialMealContext);
      setEditingComplaint(null);
      onComposerHandled?.();
    }
  }, [initialOpenComposer, initialMealContext, onComposerHandled]);

  const openNewComposer = () => {
    setEditingComplaint(null);
    setTitle('');
    setCategory('Food Quality');
    setMealType(initialMealContext);
    setMealDate(getOffsetDateISO(0));
    setDescription('');
    setFormError(null);
    setComposerOpen(true);
  };

  const openEditComposer = (cmp: Complaint) => {
    setEditingComplaint(cmp);
    setTitle(cmp.title);
    setCategory(cmp.category);
    setMealType(cmp.mealType);
    setMealDate(cmp.mealDate);
    setDescription(cmp.description);
    setFormError(null);
    setComposerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      setFormError('Please enter a short summary title (at least 3 characters).');
      return;
    }
    if (description.trim().length < 5) {
      setFormError('Please describe the concern (at least 5 characters).');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingComplaint) {
        await updateStudentComplaint(mess.id, editingComplaint.id, {
          title,
          description,
          category,
          mealType,
          mealDate,
        });
      } else {
        await createComplaint(mess.id, user, {
          title,
          description,
          category,
          mealType,
          mealDate,
        });
      }
      setComposerOpen(false);
      setEditingComplaint(null);
      setTitle('');
      setDescription('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (complaintId: string) => {
    await withdrawComplaint(mess.id, complaintId);
    setConfirmWithdrawId(null);
  };

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (onlyMine && c.authorId !== user.uid) return false;
    return true;
  });

  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;
  const openCount = complaints.length - resolvedCount;

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Complaint Tracking &amp; Follow-up
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {mess.name} ·{' '}
            <span className="font-mono tabular-nums">{openCount} active</span> ·{' '}
            <span className="font-mono tabular-nums">{resolvedCount} resolved</span>
          </p>
        </div>

        <button
          type="button"
          onClick={openNewComposer}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 transition-colors min-h-[44px] whitespace-nowrap shrink-0"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Raise a Concern
        </button>
      </div>

      {/* Inline Composer Panel */}
      {composerOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                {editingComplaint ? 'Edit Submitted Concern' : 'Raise a Mess Concern'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Operators review logged concerns in sequence and post visible status updates.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setComposerOpen(false)}
              aria-label="Close concern form"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="cmp-category" className="block text-xs font-medium text-slate-700 mb-1.5">
                Category
              </label>
              <select
                id="cmp-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cmp-meal" className="block text-xs font-medium text-slate-700 mb-1.5">
                Meal Context
              </label>
              <select
                id="cmp-meal"
                value={mealType}
                onChange={(e) => setMealType(e.target.value as ComplaintMealContext)}
                className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {MEAL_CONTEXTS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cmp-date" className="block text-xs font-medium text-slate-700 mb-1.5">
                Date of Meal
              </label>
              <input
                id="cmp-date"
                type="date"
                value={mealDate}
                max={getOffsetDateISO(1)}
                onChange={(e) => setMealDate(e.target.value)}
                className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="cmp-title" className="text-xs font-medium text-slate-700">
                Issue Title
              </label>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {title.length}/{BLUEPRINT_LIMITS.COMPLAINT_TITLE_MAX}
              </span>
            </div>
            <input
              id="cmp-title"
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.COMPLAINT_TITLE_MAX}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Serving plates at Counter 1 were wet / not properly dried"
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="cmp-desc" className="text-xs font-medium text-slate-700">
                Details
              </label>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {description.length}/{BLUEPRINT_LIMITS.COMPLAINT_DESC_MAX}
              </span>
            </div>
            <textarea
              id="cmp-desc"
              rows={3}
              required
              maxLength={BLUEPRINT_LIMITS.COMPLAINT_DESC_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share clear, specific details so mess staff can inspect and fix the issue quickly."
              className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {formError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setComposerOpen(false)}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 disabled:opacity-60 transition-colors min-h-[44px]"
            >
              {submitting
                ? 'Saving...'
                : editingComplaint
                ? 'Update Concern'
                : 'Submit Concern'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {STATUS_FILTERS.map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                  active
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setOnlyMine((prev) => !prev)}
          className={`px-3.5 py-2 text-xs font-medium rounded-xl border transition-colors min-h-[40px] whitespace-nowrap self-start sm:self-auto ${
            onlyMine
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {onlyMine ? 'Showing My Concerns' : 'My Concerns Only'}
        </button>
      </div>

      {/* Complaint Feed */}
      {filteredComplaints.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-sm font-semibold text-slate-900">
            No complaints match the current filter.
          </p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            If you noticed a food quality, hygiene, or timing issue, log it here for transparent follow-up.
          </p>
          <button
            type="button"
            onClick={openNewComposer}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-700 text-white text-xs font-semibold rounded-xl hover:bg-teal-800 transition-colors min-h-[40px]"
          >
            Raise First Concern
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((cmp) => {
            const isAuthor = cmp.authorId === user.uid;
            const canStudentModify = isAuthor && cmp.status === 'Submitted';

            return (
              <article
                key={cmp.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{cmp.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{cmp.mealType}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {formatFriendlyDate(cmp.mealDate)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>By {cmp.authorName}</span>
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                      {cmp.title}
                    </h3>
                  </div>

                  <div className="shrink-0">{renderStatusBadge(cmp.status)}</div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">{cmp.description}</p>

                {cmp.operatorResponse && cmp.operatorResponse.trim().length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900">
                        Operator Response ({cmp.respondedByName || 'Mess Team'})
                      </span>
                      <span className="font-mono tabular-nums text-slate-400">
                        {formatTimestamp(cmp.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {cmp.operatorResponse}
                    </p>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <span className="font-mono tabular-nums">
                    Logged {formatTimestamp(cmp.createdAt)}
                  </span>

                  {canStudentModify && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditComposer(cmp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors min-h-[36px]"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>

                      {confirmWithdrawId === cmp.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleWithdraw(cmp.id)}
                            className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg min-h-[36px]"
                          >
                            Confirm Withdraw
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmWithdrawId(null)}
                            className="px-2 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 min-h-[36px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmWithdrawId(cmp.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors min-h-[36px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Withdraw
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
