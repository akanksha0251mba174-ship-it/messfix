import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { X } from 'lucide-react';
import { BLUEPRINT_LIMITS, MessType } from '../types';
import { createMess } from '../services/messService';

interface RegisterMessModalProps {
  user: User;
  onClose: () => void;
  onCreated: (messId: string) => void;
}

const MESS_TYPES: MessType[] = ['College Hostel', 'Campus Central', 'Private PG Mess'];

export const RegisterMessModal: React.FC<RegisterMessModalProps> = ({
  user,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [campusOrArea, setCampusOrArea] = useState('DBS Global University Campus');
  const [type, setType] = useState<MessType>('College Hostel');
  const [breakfastTiming, setBreakfastTiming] = useState('07:30 AM - 09:30 AM');
  const [lunchTiming, setLunchTiming] = useState('12:30 PM - 02:30 PM');
  const [snacksTiming, setSnacksTiming] = useState('05:00 PM - 06:00 PM');
  const [dinnerTiming, setDinnerTiming] = useState('07:30 PM - 09:30 PM');
  const [prefillTemplate, setPrefillTemplate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Please enter a mess name (at least 2 characters).');
      return;
    }
    if (campusOrArea.trim().length < 2) {
      setError('Please enter the campus or hostel location.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const messId = await createMess(user, {
        name,
        campusOrArea,
        type,
        breakfastTiming,
        lunchTiming,
        snacksTiming,
        dinnerTiming,
        announcement: 'Welcome to Mess Fix! Check daily menus and share your meal feedback.',
        prefillTemplate,
      });
      onCreated(messId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-mess-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 id="register-mess-title" className="font-display text-xl font-bold text-slate-900">
              Register a Hostel or Campus Mess
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              You will become the operator for this mess and can publish daily menus &amp; reply to students.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-mess-name" className="block text-xs font-medium text-slate-700 mb-1.5">
              Mess Name
            </label>
            <input
              id="new-mess-name"
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.MESS_NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., DGU Boys Hostel Block A Mess"
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-mess-area" className="block text-xs font-medium text-slate-700 mb-1.5">
                Campus / Area
              </label>
              <input
                id="new-mess-area"
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.CAMPUS_AREA_MAX}
                value={campusOrArea}
                onChange={(e) => setCampusOrArea(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label htmlFor="new-mess-type" className="block text-xs font-medium text-slate-700 mb-1.5">
                Facility Type
              </label>
              <select
                id="new-mess-type"
                value={type}
                onChange={(e) => setType(e.target.value as MessType)}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-bfast" className="block text-xs font-medium text-slate-700 mb-1">
                Breakfast Timing
              </label>
              <input
                id="new-bfast"
                type="text"
                maxLength={BLUEPRINT_LIMITS.TIMING_MAX}
                value={breakfastTiming}
                onChange={(e) => setBreakfastTiming(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label htmlFor="new-lunch" className="block text-xs font-medium text-slate-700 mb-1">
                Lunch Timing
              </label>
              <input
                id="new-lunch"
                type="text"
                maxLength={BLUEPRINT_LIMITS.TIMING_MAX}
                value={lunchTiming}
                onChange={(e) => setLunchTiming(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label htmlFor="new-snacks" className="block text-xs font-medium text-slate-700 mb-1">
                Snacks Timing
              </label>
              <input
                id="new-snacks"
                type="text"
                maxLength={BLUEPRINT_LIMITS.TIMING_MAX}
                value={snacksTiming}
                onChange={(e) => setSnacksTiming(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label htmlFor="new-dinner" className="block text-xs font-medium text-slate-700 mb-1">
                Dinner Timing
              </label>
              <input
                id="new-dinner"
                type="text"
                maxLength={BLUEPRINT_LIMITS.TIMING_MAX}
                value={dinnerTiming}
                onChange={(e) => setDinnerTiming(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={prefillTemplate}
              onChange={(e) => setPrefillTemplate(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-teal-700 rounded"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              Pre-fill 3 days of starter hostel menus (Yesterday, Today, Tomorrow) so students can browse and rate right away.
            </span>
          </label>

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 disabled:opacity-60 transition-colors min-h-[44px]"
            >
              {submitting ? 'Creating Mess...' : 'Create Mess'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
