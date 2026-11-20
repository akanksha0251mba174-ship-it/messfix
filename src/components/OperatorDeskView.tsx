import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { Check, ClipboardList, Lock, Plus, Send, Sparkles } from 'lucide-react';
import {
  BLUEPRINT_LIMITS,
  Complaint,
  ComplaintStatus,
  DailyMenu,
  MealRating,
  Mess,
  MessType,
} from '../types';
import {
  formatFriendlyDate,
  formatTimestamp,
  getOffsetDateISO,
  respondToComplaint,
  SAMPLE_MENU_TEMPLATES,
  sanitizeMenuItems,
  saveDailyMenu,
  updateMessSettings,
} from '../services/messService';
import { renderStatusBadge } from './ComplaintsView';

interface OperatorDeskViewProps {
  mess: Mess;
  user: User;
  isOperator: boolean;
  isAdmin: boolean;
  selectedDate: string;
  onSelectDate: (isoDate: string) => void;
  menu: DailyMenu | null;
  complaints: Complaint[];
  ratings: MealRating[];
  onOpenRegisterMess: () => void;
}

const MESS_TYPES: MessType[] = ['College Hostel', 'Campus Central', 'Private PG Mess'];
const STATUS_CHOICES: ComplaintStatus[] = ['Submitted', 'Acknowledged', 'In Review', 'Resolved'];

export const OperatorDeskView: React.FC<OperatorDeskViewProps> = ({
  mess,
  user,
  isOperator,
  isAdmin,
  selectedDate,
  onSelectDate,
  menu,
  complaints,
  ratings,
  onOpenRegisterMess,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'menus' | 'complaints' | 'settings'>('menus');

  // Menu form state
  const [breakfastText, setBreakfastText] = useState('');
  const [lunchText, setLunchText] = useState('');
  const [snacksText, setSnacksText] = useState('');
  const [dinnerText, setDinnerText] = useState('');
  const [specialNote, setSpecialNote] = useState('');
  const [savingMenu, setSavingMenu] = useState(false);
  const [menuSavedMsg, setMenuSavedMsg] = useState<string | null>(null);

  // Settings form state
  const [messName, setMessName] = useState(mess.name);
  const [campusOrArea, setCampusOrArea] = useState(mess.campusOrArea);
  const [messType, setMessType] = useState<MessType>(mess.type);
  const [breakfastTiming, setBreakfastTiming] = useState(mess.breakfastTiming);
  const [lunchTiming, setLunchTiming] = useState(mess.lunchTiming);
  const [snacksTiming, setSnacksTiming] = useState(mess.snacksTiming);
  const [dinnerTiming, setDinnerTiming] = useState(mess.dinnerTiming);
  const [announcement, setAnnouncement] = useState(mess.announcement);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);

  // Complaint response drafts keyed by complaint ID
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, ComplaintStatus>>({});
  const [savingComplaintId, setSavingComplaintId] = useState<string | null>(null);

  useEffect(() => {
    if (menu) {
      setBreakfastText(menu.breakfastItems.join(', '));
      setLunchText(menu.lunchItems.join(', '));
      setSnacksText(menu.snacksItems.join(', '));
      setDinnerText(menu.dinnerItems.join(', '));
      setSpecialNote(menu.specialNote || '');
    } else {
      setBreakfastText('');
      setLunchText('');
      setSnacksText('');
      setDinnerText('');
      setSpecialNote('');
    }
    setMenuSavedMsg(null);
  }, [menu, selectedDate]);

  useEffect(() => {
    setMessName(mess.name);
    setCampusOrArea(mess.campusOrArea);
    setMessType(mess.type);
    setBreakfastTiming(mess.breakfastTiming);
    setLunchTiming(mess.lunchTiming);
    setSnacksTiming(mess.snacksTiming);
    setDinnerTiming(mess.dinnerTiming);
    setAnnouncement(mess.announcement);
    setSettingsSavedMsg(null);
  }, [mess]);

  if (!isOperator && !isAdmin) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="font-display text-xl font-bold text-slate-900">
          Operator Access Required for {mess.name}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          You are currently signed in as a student member for <span className="font-medium text-slate-900">{mess.name}</span> (managed by {mess.ownerName}). Only the mess owner or designated operators can publish menus and respond to official complaints here.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onOpenRegisterMess}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 transition-colors min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            Register &amp; Manage Your Own Mess
          </button>
        </div>
      </div>
    );
  }

  const handleLoadTemplate = () => {
    const tpl = SAMPLE_MENU_TEMPLATES[0];
    setBreakfastText(tpl.breakfastItems.join(', '));
    setLunchText(tpl.lunchItems.join(', '));
    setSnacksText(tpl.snacksItems.join(', '));
    setDinnerText(tpl.dinnerItems.join(', '));
    setSpecialNote(tpl.specialNote);
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMenu(true);
    setMenuSavedMsg(null);
    try {
      await saveDailyMenu(mess.id, selectedDate, user, {
        breakfastItems: sanitizeMenuItems(breakfastText),
        lunchItems: sanitizeMenuItems(lunchText),
        snacksItems: sanitizeMenuItems(snacksText),
        dinnerItems: sanitizeMenuItems(dinnerText),
        specialNote,
      });
      setMenuSavedMsg(`Menu published for ${formatFriendlyDate(selectedDate)} (${selectedDate}).`);
    } finally {
      setSavingMenu(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSavedMsg(null);
    try {
      await updateMessSettings(mess.id, {
        name: messName,
        campusOrArea,
        type: messType,
        breakfastTiming,
        lunchTiming,
        snacksTiming,
        dinnerTiming,
        announcement,
      });
      setSettingsSavedMsg('Mess timings and announcement updated for all students.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRespondComplaint = async (cmp: Complaint) => {
    const nextStatus = statusDrafts[cmp.id] || (cmp.status === 'Submitted' ? 'Acknowledged' : cmp.status);
    const nextReply =
      responseDrafts[cmp.id] !== undefined ? responseDrafts[cmp.id] : cmp.operatorResponse;

    setSavingComplaintId(cmp.id);
    try {
      await respondToComplaint(mess.id, cmp.id, user, {
        status: nextStatus,
        operatorResponse: nextReply,
      });
    } finally {
      setSavingComplaintId(null);
    }
  };

  // Recurring issues summary table data
  const categoryBreakdown = complaints.reduce<Record<string, { total: number; open: number }>>(
    (acc, c) => {
      if (!acc[c.category]) acc[c.category] = { total: 0, open: 0 };
      acc[c.category].total += 1;
      if (c.status !== 'Resolved') acc[c.category].open += 1;
      return acc;
    },
    {}
  );

  const dateOptions = [-1, 0, 1, 2, 3].map((offset) => {
    const iso = getOffsetDateISO(offset);
    return { iso, label: formatFriendlyDate(iso) };
  });

  const openComplaints = complaints.filter((c) => c.status !== 'Resolved').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Operator Desk
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Managing <span className="font-medium text-slate-900">{mess.name}</span> ·{' '}
            <span className="font-mono tabular-nums">{openComplaints} open complaints</span> ·{' '}
            <span className="font-mono tabular-nums">{ratings.length} meal ratings</span>
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('menus')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap min-h-[38px] ${
              activeSubTab === 'menus'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily Menus
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('complaints')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap min-h-[38px] ${
              activeSubTab === 'complaints'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Complaint Queue ({openComplaints})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('settings')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap min-h-[38px] ${
              activeSubTab === 'settings'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Timings &amp; Notice
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Daily Menu Editor */}
      {activeSubTab === 'menus' && (
        <form
          onSubmit={handleSaveMenu}
          className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {dateOptions.map((opt) => (
                <button
                  key={opt.iso}
                  type="button"
                  onClick={() => onSelectDate(opt.iso)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                    selectedDate === opt.iso
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleLoadTemplate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors min-h-[40px] self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Fill Sample Menu
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Separate dishes with commas or new lines (up to {BLUEPRINT_LIMITS.MENU_ITEMS_MAX} items per meal).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="op-breakfast" className="block text-sm font-medium text-slate-800 mb-1.5">
                Breakfast ({mess.breakfastTiming})
              </label>
              <textarea
                id="op-breakfast"
                rows={3}
                value={breakfastText}
                onChange={(e) => setBreakfastText(e.target.value)}
                placeholder="Aloo Paratha, Fresh Curd, Pickle, Ginger Tea"
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label htmlFor="op-lunch" className="block text-sm font-medium text-slate-800 mb-1.5">
                Lunch ({mess.lunchTiming})
              </label>
              <textarea
                id="op-lunch"
                rows={3}
                value={lunchText}
                onChange={(e) => setLunchText(e.target.value)}
                placeholder="Dal Tadka, Paneer Butter Masala, Jeera Rice, Roti, Salad"
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label htmlFor="op-snacks" className="block text-sm font-medium text-slate-800 mb-1.5">
                Evening Snacks ({mess.snacksTiming})
              </label>
              <textarea
                id="op-snacks"
                rows={3}
                value={snacksText}
                onChange={(e) => setSnacksText(e.target.value)}
                placeholder="Samosa, Mint Chutney, Masala Chai"
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label htmlFor="op-dinner" className="block text-sm font-medium text-slate-800 mb-1.5">
                Dinner ({mess.dinnerTiming})
              </label>
              <textarea
                id="op-dinner"
                rows={3}
                value={dinnerText}
                onChange={(e) => setDinnerText(e.target.value)}
                placeholder="Rajma Masala, Steamed Rice, Aloo Gobhi, Chapati, Gulab Jamun"
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="op-special-note" className="text-sm font-medium text-slate-800">
                Special Day Note (optional)
              </label>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {specialNote.length}/{BLUEPRINT_LIMITS.SPECIAL_NOTE_MAX}
              </span>
            </div>
            <input
              id="op-special-note"
              type="text"
              maxLength={BLUEPRINT_LIMITS.SPECIAL_NOTE_MAX}
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              placeholder="e.g., Fresh fruit bowl served during breakfast; dinner sweet at 8 PM."
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {menuSavedMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{menuSavedMsg}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingMenu}
              className="px-6 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 disabled:opacity-60 transition-colors min-h-[44px]"
            >
              {savingMenu ? 'Publishing...' : `Publish Menu for ${formatFriendlyDate(selectedDate)}`}
            </button>
          </div>
        </form>
      )}

      {/* Sub-Tab 2: Complaint Queue & Recurring Issue Summary */}
      {activeSubTab === 'complaints' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-4">
            {complaints.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900">
                  No student complaints logged yet.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Submitted concerns will appear here for acknowledgement and resolution.
                </p>
              </div>
            ) : (
              complaints.map((cmp) => {
                const isResolved = cmp.status === 'Resolved';
                const currentDraftStatus = statusDrafts[cmp.id] || cmp.status;
                const currentDraftReply =
                  responseDrafts[cmp.id] !== undefined
                    ? responseDrafts[cmp.id]
                    : cmp.operatorResponse;

                return (
                  <div
                    key={cmp.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-medium text-slate-800">{cmp.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{cmp.mealType}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{cmp.mealDate}</span>
                          <span aria-hidden="true">·</span>
                          <span>Student: {cmp.authorName}</span>
                        </div>
                        <h3 className="font-display text-base font-bold text-slate-900 mt-1">
                          {cmp.title}
                        </h3>
                      </div>
                      {renderStatusBadge(cmp.status)}
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed">{cmp.description}</p>

                    {isResolved && !isAdmin ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600">
                        <span className="font-semibold text-slate-900">
                          Closed response ({cmp.respondedByName}):{' '}
                        </span>
                        {cmp.operatorResponse || 'Marked as resolved.'}
                        <span className="block font-mono text-[11px] text-slate-400 mt-1">
                          Resolved {formatTimestamp(cmp.resolvedAt || cmp.updatedAt)} · Ticket locked
                        </span>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label
                              htmlFor={`status-${cmp.id}`}
                              className="block text-xs font-medium text-slate-700 mb-1"
                            >
                              Update Status
                            </label>
                            <select
                              id={`status-${cmp.id}`}
                              value={currentDraftStatus}
                              onChange={(e) =>
                                setStatusDrafts((prev) => ({
                                  ...prev,
                                  [cmp.id]: e.target.value as ComplaintStatus,
                                }))
                              }
                              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                            >
                              {STATUS_CHOICES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label
                              htmlFor={`reply-${cmp.id}`}
                              className="block text-xs font-medium text-slate-700 mb-1"
                            >
                              Official Operator Response
                            </label>
                            <input
                              id={`reply-${cmp.id}`}
                              type="text"
                              maxLength={BLUEPRINT_LIMITS.OPERATOR_RESPONSE_MAX}
                              value={currentDraftReply}
                              onChange={(e) =>
                                setResponseDrafts((prev) => ({
                                  ...prev,
                                  [cmp.id]: e.target.value,
                                }))
                              }
                              placeholder="Explain action taken or schedule for fix..."
                              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] text-slate-400">
                            {currentDraftStatus === 'Resolved'
                              ? 'Marking Resolved locks this ticket from further edits.'
                              : 'Students see status and response immediately.'}
                          </span>
                          <button
                            type="button"
                            disabled={savingComplaintId === cmp.id}
                            onClick={() => handleRespondComplaint(cmp)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors min-h-[38px]"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {savingComplaintId === cmp.id ? 'Saving...' : 'Save Update'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Recurring Issue Patterns Table */}
          <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Recurring Issue Breakdown
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Spot repeated service concerns by category.
              </p>
            </div>

            {Object.keys(categoryBreakdown).length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No complaint data yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-left">
                    <th className="py-2 font-medium">Category</th>
                    <th className="py-2 font-medium text-right">Open</th>
                    <th className="py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(categoryBreakdown).map(([cat, stats]) => (
                    <tr key={cat}>
                      <td className="py-2.5 text-slate-800 font-medium">{cat}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-amber-700">
                        {stats.open}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-slate-900 font-semibold">
                        {stats.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </aside>
        </div>
      )}

      {/* Sub-Tab 3: Timings & Announcement Settings */}
      {activeSubTab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 max-w-3xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="set-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                Mess Name
              </label>
              <input
                id="set-name"
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.MESS_NAME_MAX}
                value={messName}
                onChange={(e) => setMessName(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label htmlFor="set-type" className="block text-xs font-medium text-slate-700 mb-1.5">
                Facility Type
              </label>
              <select
                id="set-type"
                value={messType}
                onChange={(e) => setMessType(e.target.value as MessType)}
                className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {MESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="set-area" className="block text-xs font-medium text-slate-700 mb-1.5">
              Campus / Hostel / Area
            </label>
            <input
              id="set-area"
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.CAMPUS_AREA_MAX}
              value={campusOrArea}
              onChange={(e) => setCampusOrArea(e.target.value)}
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="set-bfast" className="block text-xs font-medium text-slate-700 mb-1.5">
                Breakfast Timing
              </label>
              <input
                id="set-bfast"
                type="text"
                maxLength={BLUEPRINT_LIMITS.TIMING_MAX}
                value={breakfastTiming}
                onChange={(e) => setBreakfastTiming(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label htmlFor="set-lunch" className="block text-xs font-medium text-slate-700 mb-1.5">
                Lunch Timing
              </label>
              <input
                id="set-lunch"
                type="text"
                maxLength={BLUEPRINT_LIMITS.TIMING_MAX}
                value={lunchTiming}
                onChange={(e) => setLunchTiming(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label htmlFor="set-snacks" className="block text-xs font-medium text-slate-700 mb-1.5">
                Evening Snacks Timing
              </label>
              <input
                id="set-snacks"
                type="text"
                maxLength={BLUEPRINT_LIMITS.TIMING_MAX}
                value={snacksTiming}
                onChange={(e) => setSnacksTiming(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label htmlFor="set-dinner" className="block text-xs font-medium text-slate-700 mb-1.5">
                Dinner Timing
              </label>
              <input
                id="set-dinner"
                type="text"
                maxLength={BLUEPRINT_LIMITS.TIMING_MAX}
                value={dinnerTiming}
                onChange={(e) => setDinnerTiming(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="set-ann" className="text-xs font-medium text-slate-700">
                Live Mess Announcement (shown on Daily Menu)
              </label>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {announcement.length}/{BLUEPRINT_LIMITS.ANNOUNCEMENT_MAX}
              </span>
            </div>
            <textarea
              id="set-ann"
              rows={2}
              maxLength={BLUEPRINT_LIMITS.ANNOUNCEMENT_MAX}
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="e.g., Sunday brunch timing shifted to 9:00 AM - 11:30 AM."
              className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {settingsSavedMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{settingsSavedMsg}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 disabled:opacity-60 transition-colors min-h-[44px]"
            >
              {savingSettings ? 'Saving Settings...' : 'Save Mess Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
