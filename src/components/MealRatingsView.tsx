import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { Check, Star } from 'lucide-react';
import { BLUEPRINT_LIMITS, MealRating, MealType, Mess } from '../types';
import {
  formatFriendlyDate,
  formatTimestamp,
  getOffsetDateISO,
  submitMealRating,
} from '../services/messService';

interface MealRatingsViewProps {
  mess: Mess;
  user: User;
  ratings: MealRating[];
  initialMealType: MealType;
  initialDate: string;
}

const MEALS: MealType[] = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

export const MealRatingsView: React.FC<MealRatingsViewProps> = ({
  mess,
  user,
  ratings,
  initialMealType,
  initialDate,
}) => {
  const [selectedMeal, setSelectedMeal] = useState<MealType>(initialMealType);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [rating, setRating] = useState<number>(4);
  const [hygieneRating, setHygieneRating] = useState<number>(4);
  const [portionAdequate, setPortionAdequate] = useState<boolean>(true);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [filterMeal, setFilterMeal] = useState<MealType | 'All'>('All');

  useEffect(() => {
    setSelectedMeal(initialMealType);
  }, [initialMealType]);

  useEffect(() => {
    setSelectedDate(initialDate);
  }, [initialDate]);

  // Pre-populate if user already rated this date + meal
  useEffect(() => {
    const existing = ratings.find(
      (r) =>
        r.date === selectedDate &&
        r.mealType === selectedMeal &&
        r.authorId === user.uid
    );
    if (existing) {
      setRating(existing.rating);
      setHygieneRating(existing.hygieneRating);
      setPortionAdequate(existing.portionAdequate);
      setComment(existing.comment);
    } else {
      setRating(4);
      setHygieneRating(4);
      setPortionAdequate(true);
      setComment('');
    }
  }, [selectedDate, selectedMeal, ratings, user.uid]);

  const dateChoices = [-1, 0, 1].map((offset) => {
    const iso = getOffsetDateISO(offset);
    return { iso, label: `${formatFriendlyDate(iso)} (${iso})` };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSavedFeedback(null);
    try {
      await submitMealRating(mess.id, user, {
        date: selectedDate,
        mealType: selectedMeal,
        rating,
        hygieneRating,
        portionAdequate,
        comment,
      });
      setSavedFeedback(`Saved your ${selectedMeal} feedback for ${formatFriendlyDate(selectedDate)}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const totalCount = ratings.length;
  const avgFood =
    totalCount > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1)
      : '—';
  const avgHygiene =
    totalCount > 0
      ? (ratings.reduce((sum, r) => sum + r.hygieneRating, 0) / totalCount).toFixed(1)
      : '—';
  const portionRate =
    totalCount > 0
      ? `${Math.round((ratings.filter((r) => r.portionAdequate).length / totalCount) * 100)}%`
      : '—';

  const visibleRatings =
    filterMeal === 'All'
      ? ratings
      : ratings.filter((r) => r.mealType === filterMeal);

  const StarSelector = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (n: number) => void;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-800">{label}</span>
        <span className="text-xs font-mono tabular-nums text-slate-500">{value} / 5</span>
      </div>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= value;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              aria-label={`${label} ${star} out of 5`}
              className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center transition-colors ${
                active
                  ? 'bg-amber-50 border-amber-300 text-amber-600'
                  : 'bg-white border-slate-200 text-slate-300 hover:text-slate-400'
              }`}
            >
              <Star className={`w-5 h-5 ${active ? 'fill-amber-500 text-amber-500' : ''}`} />
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header + Summary Metrics Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Meal Ratings &amp; Student Feedback
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Constructive meal ratings help {mess.name} spot recurring quality or hygiene gaps early.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 lg:gap-8 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <div>
              <p className="text-xs text-slate-500">Food Quality</p>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {avgFood} <span className="text-xs font-normal text-slate-400">/ 5</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Hygiene Score</p>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {avgHygiene} <span className="text-xs font-normal text-slate-400">/ 5</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Portion Adequate</p>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {portionRate}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Reviews</p>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {totalCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split: Form (5 cols) + Feed (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
        >
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Share Meal Feedback
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              One review per meal per day — updating replaces your earlier score for that meal.
            </p>
          </div>

          <div>
            <label htmlFor="rating-date" className="block text-sm font-medium text-slate-800 mb-1.5">
              Meal Date
            </label>
            <select
              id="rating-date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {dateChoices.map((dc) => (
                <option key={dc.iso} value={dc.iso}>
                  {dc.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-800 mb-1.5">Meal</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MEALS.map((meal) => {
                const active = selectedMeal === meal;
                return (
                  <button
                    key={meal}
                    type="button"
                    onClick={() => setSelectedMeal(meal)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors min-h-[42px] whitespace-nowrap ${
                      active
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {meal}
                  </button>
                );
              })}
            </div>
          </div>

          <StarSelector label="Food Taste & Quality" value={rating} onChange={setRating} />
          <StarSelector label="Hygiene & Cleanliness" value={hygieneRating} onChange={setHygieneRating} />

          <div>
            <span className="block text-sm font-medium text-slate-800 mb-1.5">
              Was the portion size adequate?
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPortionAdequate(true)}
                className={`px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors min-h-[44px] ${
                  portionAdequate
                    ? 'bg-teal-50 border-teal-600 text-teal-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Yes, adequate
              </button>
              <button
                type="button"
                onClick={() => setPortionAdequate(false)}
                className={`px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors min-h-[44px] ${
                  !portionAdequate
                    ? 'bg-amber-50 border-amber-500 text-amber-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Too small
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="rating-comment" className="text-sm font-medium text-slate-800">
                Comments (optional)
              </label>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {comment.length}/{BLUEPRINT_LIMITS.RATING_COMMENT_MAX}
              </span>
            </div>
            <textarea
              id="rating-comment"
              rows={3}
              maxLength={BLUEPRINT_LIMITS.RATING_COMMENT_MAX}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g., Dal was well cooked, chapatis were fresh and warm."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {savedFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{savedFeedback}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 disabled:opacity-60 transition-colors min-h-[48px]"
          >
            {submitting ? 'Submitting Feedback...' : 'Submit Meal Rating'}
          </button>
        </form>

        {/* Feedback Feed */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Recent Student Feedback
            </h3>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {(['All', ...MEALS] as const).map((meal) => {
                const active = filterMeal === meal;
                return (
                  <button
                    key={meal}
                    type="button"
                    onClick={() => setFilterMeal(meal)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {meal}
                  </button>
                );
              })}
            </div>
          </div>

          {visibleRatings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <p className="text-sm font-medium text-slate-900">
                No meal ratings recorded yet{filterMeal !== 'All' ? ` for ${filterMeal}` : ''}.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Be the first student to rate today&apos;s meal quality and hygiene.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
              {visibleRatings.map((item) => (
                <article key={item.id} className="p-5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-900">{item.mealType}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatFriendlyDate(item.date)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.authorName}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                      <span className="text-slate-900 font-semibold">
                        Taste {item.rating}/5
                      </span>
                      <span className="text-slate-300" aria-hidden="true">|</span>
                      <span className="text-slate-700">
                        Hygiene {item.hygieneRating}/5
                      </span>
                      <span className="text-slate-300" aria-hidden="true">|</span>
                      <span className={item.portionAdequate ? 'text-teal-700' : 'text-amber-700'}>
                        {item.portionAdequate ? 'Portion OK' : 'Small Portion'}
                      </span>
                    </div>
                  </div>

                  {item.comment ? (
                    <p className="text-sm text-slate-700 leading-relaxed">{item.comment}</p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No written comment added.</p>
                  )}

                  <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                    Updated {formatTimestamp(item.updatedAt)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
