import React from 'react';
import { ArrowRight, CheckCircle2, Clock, MessageSquareText, Star, Utensils } from 'lucide-react';

interface LandingAuthViewProps {
  onGoogleSignIn: () => Promise<void>;
  isSigningIn: boolean;
  authError: string | null;
}

export const LandingAuthView: React.FC<LandingAuthViewProps> = ({
  onGoogleSignIn,
  isSigningIn,
  authError,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Mess Fix
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#daily-menus" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Daily Menus
            </a>
            <a href="#meal-ratings" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Meal Ratings
            </a>
            <a href="#complaint-tracking" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Complaint Tracking
            </a>
          </nav>

          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={isSigningIn}
            className="px-4 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Split */}
        <section className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-sm font-medium text-teal-700 mb-3">
                Hostel &amp; Campus Mess Platform
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12] text-balance mb-6">
                One dependable place for daily menus, meal feedback, and complaint follow-up.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mb-8">
                Stop digging through buried WhatsApp chats and outdated notice boards. Students check verified meal schedules and rate food quality, while mess operators respond transparently to concerns.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  disabled={isSigningIn}
                  className="inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-60 transition-colors min-h-[48px] whitespace-nowrap"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.39 0 3.41 2.66 1.48 6.53l3.66 2.84C6.01 6.77 8.76 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.71 2.88c2.16-2 3.71-4.94 3.71-8.7z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.14 14.63c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09L1.48 7.61C.54 9.48 0 11.59 0 13.84s.54 4.36 1.48 6.23l3.66-2.84z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.71-2.88c-1.08.72-2.45 1.16-4.22 1.16-3.24 0-5.99-1.77-7.16-4.37L1.18 17.84C3.11 21.71 7.21 24 12 24z"
                    />
                  </svg>
                  <span>{isSigningIn ? 'Connecting to Google...' : 'Continue with Google'}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
                <span className="text-sm text-slate-500">
                  Free for students · Instant campus onboarding
                </span>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 max-w-xl"
                >
                  {authError}
                </div>
              )}
            </div>

            {/* Right Column: Clean Product Snapshot */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Today&apos;s Schedule</p>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Hostel Block A Mess
                    </h2>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-teal-700 font-medium">
                    4 Meals Listed
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <span>Lunch</span>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className="font-mono text-xs font-normal text-slate-500 tabular-nums">
                          12:30 PM – 02:30 PM
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        Dal Tadka, Paneer Butter Masala, Jeera Rice, Phulka Chapati, Green Salad
                      </p>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-slate-700 whitespace-nowrap shrink-0">
                      4.3 / 5
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <span>Dinner</span>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className="font-mono text-xs font-normal text-slate-500 tabular-nums">
                          07:30 PM – 09:30 PM
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        Rajma Masala, Steamed Rice, Aloo Gobhi, Roti, Gulab Jamun
                      </p>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap shrink-0">
                      Upcoming
                    </span>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span>Recent Complaint Follow-up</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolved
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">
                      Drinking water cooler near Counter 2 serviced
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Operator response: Filter cartridge replaced before dinner service.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Three Core Pillars */}
        <section className="border-t border-slate-200 bg-white py-14">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div id="daily-menus" className="space-y-2.5">
                <div className="flex items-center gap-2 text-teal-700">
                  <Utensils className="w-5 h-5" />
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    01. Daily Menus &amp; Timings
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Check what is being served for Breakfast, Lunch, Snacks, and Dinner along with exact service hours and operator announcements.
                </p>
              </div>

              <div id="meal-ratings" className="space-y-2.5">
                <div className="flex items-center gap-2 text-teal-700">
                  <Star className="w-5 h-5" />
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    02. Meal Ratings &amp; Hygiene
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Share quick, respectful ratings on taste, kitchen hygiene, and portion adequacy after every meal so patterns surface clearly.
                </p>
              </div>

              <div id="complaint-tracking" className="space-y-2.5">
                <div className="flex items-center gap-2 text-teal-700">
                  <MessageSquareText className="w-5 h-5" />
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    03. Trackable Complaints
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Log food quality, missed meal, or cleanliness issues and follow real status updates from Submitted to Resolved.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>Mess Fix · Student &amp; Hostel Mess Communication Platform</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Real-time menu &amp; complaint tracking
          </span>
        </div>
      </footer>
    </div>
  );
};
