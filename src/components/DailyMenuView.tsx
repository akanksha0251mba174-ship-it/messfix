import React from 'react';
import { Clock, Megaphone, MessageSquareWarning, Star, UtensilsCrossed } from 'lucide-react';
import { DailyMenu, MealRating, MealType, Mess } from '../types';
import { formatFriendlyDate, getOffsetDateISO } from '../services/messService';

interface DailyMenuViewProps {
  mess: Mess;
  selectedDate: string;
  onSelectDate: (isoDate: string) => void;
  menu: DailyMenu | null;
  loadingMenu: boolean;
  ratings: MealRating[];
  isOperator: boolean;
  onRateMeal: (mealType: MealType) => void;
  onReportIssue: (mealType: MealType) => void;
  onOpenOperatorMenuEditor: () => void;
}

const MEAL_CONFIG: {
  type: MealType;
  timingKey: 'breakfastTiming' | 'lunchTiming' | 'snacksTiming' | 'dinnerTiming';
  itemsKey: 'breakfastItems' | 'lunchItems' | 'snacksItems' | 'dinnerItems';
}[] = [
  { type: 'Breakfast', timingKey: 'breakfastTiming', itemsKey: 'breakfastItems' },
  { type: 'Lunch', timingKey: 'lunchTiming', itemsKey: 'lunchItems' },
  { type: 'Snacks', timingKey: 'snacksTiming', itemsKey: 'snacksItems' },
  { type: 'Dinner', timingKey: 'dinnerTiming', itemsKey: 'dinnerItems' },
];

export const DailyMenuView: React.FC<DailyMenuViewProps> = ({
  mess,
  selectedDate,
  onSelectDate,
  menu,
  loadingMenu,
  ratings,
  isOperator,
  onRateMeal,
  onReportIssue,
  onOpenOperatorMenuEditor,
}) => {
  const dateOptions = [-1, 0, 1, 2, 3].map((offset) => {
    const iso = getOffsetDateISO(offset);
    return { iso, label: formatFriendlyDate(iso) };
  });

  const getMealRatingSummary = (mealType: MealType) => {
    const matching = ratings.filter(
      (r) => r.date === selectedDate && r.mealType === mealType
    );
    if (matching.length === 0) return null;
    const avg = matching.reduce((acc, r) => acc + r.rating, 0) / matching.length;
    return { avg: avg.toFixed(1), count: matching.length };
  };

  return (
    <div className="space-y-6">
      {/* Date Switcher & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Daily Menu &amp; Meal Timings
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {mess.name} · {mess.campusOrArea}
          </p>
        </div>

        <div
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto"
          role="tablist"
          aria-label="Select menu date"
        >
          {dateOptions.map((opt) => {
            const active = selectedDate === opt.iso;
            return (
              <button
                key={opt.iso}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectDate(opt.iso)}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                  active
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Mess Announcement */}
      {mess.announcement && mess.announcement.trim().length > 0 && (
        <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 flex items-start gap-3">
          <Megaphone className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-teal-800">
              Mess Operator Announcement
            </p>
            <p className="text-sm text-slate-800 mt-0.5 leading-relaxed">
              {mess.announcement}
            </p>
          </div>
        </div>
      )}

      {/* Daily Special Note */}
      {menu?.specialNote && menu.specialNote.trim().length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Note for {formatFriendlyDate(selectedDate)}: </span>
            {menu.specialNote}
          </p>
          <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
            Updated by {menu.updatedByName}
          </span>
        </div>
      )}

      {/* Loading State */}
      {loadingMenu ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-6 h-56 animate-pulse"
            >
              <div className="h-5 w-28 bg-slate-200 rounded mb-3" />
              <div className="h-4 w-44 bg-slate-100 rounded mb-6" />
              <div className="space-y-2">
                <div className="h-3.5 w-3/4 bg-slate-100 rounded" />
                <div className="h-3.5 w-2/3 bg-slate-100 rounded" />
                <div className="h-3.5 w-1/2 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MEAL_CONFIG.map((meal) => {
            const items = menu ? menu[meal.itemsKey] : [];
            const timing = mess[meal.timingKey] || 'Timing not set';
            const summary = getMealRatingSummary(meal.type);

            return (
              <section
                key={meal.type}
                className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="font-display text-lg font-bold text-slate-900">
                        {meal.type}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-mono tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{timing}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {summary ? (
                        <div className="text-xs font-mono tabular-nums text-slate-700">
                          <span className="font-semibold text-slate-900">{summary.avg} / 5</span>
                          <span className="text-slate-400 mx-1" aria-hidden="true">·</span>
                          <span className="text-slate-500">{summary.count} {summary.count === 1 ? 'rating' : 'ratings'}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No ratings yet</span>
                      )}
                    </div>
                  </div>

                  <div className="py-5">
                    {items.length > 0 ? (
                      <ul className="space-y-2">
                        {items.map((dish, idx) => (
                          <li
                            key={`${meal.type}-${idx}`}
                            className="flex items-baseline gap-2.5 text-sm text-slate-800"
                          >
                            <span className="text-teal-700 font-mono text-xs select-none" aria-hidden="true">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span>{dish}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="py-4 text-sm text-slate-500 flex items-center gap-2.5">
                        <UtensilsCrossed className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Menu not published yet for {formatFriendlyDate(selectedDate)}.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onRateMeal(meal.type)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors min-h-[40px] whitespace-nowrap"
                  >
                    <Star className="w-3.5 h-3.5" />
                    Rate {meal.type}
                  </button>

                  <div className="flex items-center gap-2">
                    {isOperator && items.length === 0 && (
                      <button
                        type="button"
                        onClick={onOpenOperatorMenuEditor}
                        className="px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4 min-h-[40px] whitespace-nowrap"
                      >
                        Post Menu
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onReportIssue(meal.type)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors min-h-[40px] whitespace-nowrap"
                    >
                      <MessageSquareWarning className="w-3.5 h-3.5" />
                      Report Issue
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
