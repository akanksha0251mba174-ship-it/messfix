import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  Building2,
  ClipboardCheck,
  LogOut,
  MessageSquareWarning,
  Plus,
  Settings2,
  Sparkles,
  Star,
  User as UserIcon,
  Utensils,
} from 'lucide-react';
import { auth, googleProvider } from './firebase';
import {
  BLUEPRINT_LIMITS,
  Complaint,
  ComplaintMealContext,
  DailyMenu,
  MealRating,
  MealType,
  Mess,
  UserPrivateInfo,
  UserProfile,
} from './types';
import {
  checkIsMessOperator,
  ensureUserProfile,
  getOffsetDateISO,
  getUserPrivateInfo,
  isPlatformAdmin,
  seedPilotCampusMesses,
  subscribeToActiveMesses,
  subscribeToComplaints,
  subscribeToDailyMenu,
  subscribeToRatings,
  updateActiveMess,
  updateHostelRoom,
} from './services/messService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingAuthView } from './components/LandingAuthView';
import { DailyMenuView } from './components/DailyMenuView';
import { MealRatingsView } from './components/MealRatingsView';
import { ComplaintsView } from './components/ComplaintsView';
import { OperatorDeskView } from './components/OperatorDeskView';
import { RegisterMessModal } from './components/RegisterMessModal';

type AppTab = 'menu' | 'ratings' | 'complaints' | 'operator';

function MessFixApp() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privateInfo, setPrivateInfo] = useState<UserPrivateInfo | null>(null);

  const [messes, setMesses] = useState<Mess[]>([]);
  const [messesLoaded, setMessesLoaded] = useState(false);
  const [activeMessId, setActiveMessId] = useState<string>('');
  const [isMessOperatorFlag, setIsMessOperatorFlag] = useState(false);

  const [activeTab, setActiveTab] = useState<AppTab>('menu');
  const [selectedDate, setSelectedDate] = useState<string>(() => getOffsetDateISO(0));
  const [dailyMenu, setDailyMenu] = useState<DailyMenu | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [ratings, setRatings] = useState<MealRating[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  // Cross-tab prefill state
  const [ratingPrefillMeal, setRatingPrefillMeal] = useState<MealType>('Lunch');
  const [complaintPrefillMeal, setComplaintPrefillMeal] = useState<ComplaintMealContext>('Lunch');
  const [openComplaintComposer, setOpenComplaintComposer] = useState(false);

  // Modals & Popovers
  const [showRegisterMess, setShowRegisterMess] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [savingRoom, setSavingRoom] = useState(false);
  const [seedingPilot, setSeedingPilot] = useState(false);

  // 1. Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // 2. Sync user profile & private info after sign-in
  useEffect(() => {
    if (!authReady || !user) {
      setProfile(null);
      setPrivateInfo(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const prof = await ensureUserProfile(user);
      const priv = await getUserPrivateInfo(user.uid);
      if (!cancelled) {
        setProfile(prof);
        setPrivateInfo(priv);
        setRoomInput(priv?.hostelRoom || '');
        if (prof.activeMessId) {
          setActiveMessId(prof.activeMessId);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, user]);

  // 3. Subscribe to active messes ONLY when authenticated
  useEffect(() => {
    if (!authReady || !user) {
      setMesses([]);
      setMessesLoaded(false);
      return;
    }

    const unsub = subscribeToActiveMesses((list) => {
      setMesses(list);
      setMessesLoaded(true);
    });
    return () => unsub();
  }, [authReady, user]);

  // Ensure activeMessId selects a valid mess when messes list loads
  useEffect(() => {
    if (!messesLoaded || messes.length === 0) return;
    const stillValid = messes.some((m) => m.id === activeMessId);
    if (!stillValid) {
      const preferred =
        profile?.activeMessId && messes.some((m) => m.id === profile.activeMessId)
          ? profile.activeMessId
          : messes[0].id;
      setActiveMessId(preferred);
    }
  }, [messes, messesLoaded, activeMessId, profile?.activeMessId]);

  const activeMess = useMemo(
    () => messes.find((m) => m.id === activeMessId) || null,
    [messes, activeMessId]
  );

  const adminUser = useMemo(() => isPlatformAdmin(user), [user]);

  // 4. Check operator status on active mess
  useEffect(() => {
    if (!authReady || !user || !activeMess) {
      setIsMessOperatorFlag(false);
      return;
    }
    if (activeMess.ownerId === user.uid || adminUser) {
      setIsMessOperatorFlag(true);
      return;
    }

    let cancelled = false;
    checkIsMessOperator(activeMess.id, user.uid).then((result) => {
      if (!cancelled) setIsMessOperatorFlag(result);
    });
    return () => {
      cancelled = true;
    };
  }, [authReady, user, activeMess, adminUser]);

  // 5. Subscribe to Daily Menu, Ratings, Complaints for active mess
  useEffect(() => {
    if (!authReady || !user || !activeMessId) {
      setDailyMenu(null);
      return;
    }
    setLoadingMenu(true);
    const unsub = subscribeToDailyMenu(activeMessId, selectedDate, (menu) => {
      setDailyMenu(menu);
      setLoadingMenu(false);
    });
    return () => unsub();
  }, [authReady, user, activeMessId, selectedDate]);

  useEffect(() => {
    if (!authReady || !user || !activeMessId) {
      setRatings([]);
      return;
    }
    const unsub = subscribeToRatings(activeMessId, setRatings);
    return () => unsub();
  }, [authReady, user, activeMessId]);

  useEffect(() => {
    if (!authReady || !user || !activeMessId) {
      setComplaints([]);
      return;
    }
    const unsub = subscribeToComplaints(activeMessId, setComplaints);
    return () => unsub();
  }, [authReady, user, activeMessId]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      if (message.includes('popup-closed-by-user')) {
        setAuthError('Google sign-in popup was closed before finishing. Please try again.');
      } else if (message.includes('popup-blocked')) {
        setAuthError('Your browser blocked the Google sign-in popup. Please allow popups and try again.');
      } else {
        setAuthError(message);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setAccountMenuOpen(false);
    await signOut(auth);
  };

  const handleSelectMess = async (messId: string) => {
    setActiveMessId(messId);
    if (user) {
      await updateActiveMess(user.uid, messId);
    }
  };

  const handleSaveHostelRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingRoom(true);
    try {
      await updateHostelRoom(user.uid, roomInput);
      setPrivateInfo((prev) => (prev ? { ...prev, hostelRoom: roomInput } : prev));
    } finally {
      setSavingRoom(false);
    }
  };

  const handleSeedPilot = async () => {
    if (!user) return;
    setSeedingPilot(true);
    try {
      const firstId = await seedPilotCampusMesses(user);
      await handleSelectMess(firstId);
    } finally {
      setSeedingPilot(false);
    }
  };

  const handleComposerHandled = useCallback(() => {
    setOpenComplaintComposer(false);
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="font-display text-xl font-bold text-slate-900">Mess Fix</p>
          <p className="text-xs text-slate-500">Connecting your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LandingAuthView
        onGoogleSignIn={handleGoogleSignIn}
        isSigningIn={isSigningIn}
        authError={authError}
      />
    );
  }

  const navItems: { id: AppTab; label: string; mobileLabel: string; icon: React.ReactNode }[] = [
    { id: 'menu', label: 'Daily Menu', mobileLabel: 'Menu', icon: <Utensils className="w-5 h-5" /> },
    { id: 'ratings', label: 'Meal Ratings', mobileLabel: 'Ratings', icon: <Star className="w-5 h-5" /> },
    {
      id: 'complaints',
      label: 'Complaints',
      mobileLabel: 'Issues',
      icon: <MessageSquareWarning className="w-5 h-5" />,
    },
    {
      id: 'operator',
      label: 'Operator Desk',
      mobileLabel: 'Operator',
      icon: <Settings2 className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-10">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Mess Fix
          </button>

          {/* Zone 2: Clean single-line nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1.5 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    active
                      ? 'text-slate-900 border-teal-700 font-semibold'
                      : 'text-slate-600 border-transparent hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary Account / Sign Out control */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-medium text-slate-800 transition-colors min-h-[40px] whitespace-nowrap shrink-0"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                />
              ) : (
                <UserIcon className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span className="max-w-[120px] truncate">
                {user.displayName?.split(' ')[0] || 'Account'}
              </span>
            </button>

            {accountMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-lg p-4 space-y-4 z-50">
                <div className="border-b border-slate-100 pb-3">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {user.displayName || 'Student'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  <p className="text-[11px] text-teal-700 font-medium mt-1">
                    {adminUser
                      ? 'Platform Admin & Operator'
                      : isMessOperatorFlag
                      ? 'Mess Operator'
                      : 'Student Member'}
                  </p>
                </div>

                <form onSubmit={handleSaveHostelRoom} className="space-y-2">
                  <label
                    htmlFor="hostel-room-input"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Hostel / Room (Private, optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="hostel-room-input"
                      type="text"
                      maxLength={BLUEPRINT_LIMITS.HOSTEL_ROOM_MAX}
                      value={roomInput}
                      onChange={(e) => setRoomInput(e.target.value)}
                      placeholder="e.g., Block A - 204"
                      className="flex-1 h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    <button
                      type="submit"
                      disabled={savingRoom}
                      className="px-3 h-9 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-60"
                    >
                      {savingRoom ? '...' : 'Save'}
                    </button>
                  </div>
                </form>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors min-h-[40px]"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Workspace Toolbar: Mess Selector + Register Mess */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 shrink-0">
              <Building2 className="w-4 h-4 text-teal-700" />
              <span>Active Mess</span>
            </div>

            {messes.length > 0 ? (
              <select
                aria-label="Select active mess"
                value={activeMessId}
                onChange={(e) => handleSelectMess(e.target.value)}
                className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 max-w-full sm:max-w-xs"
              >
                {messes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.type})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-slate-500">
                {messesLoaded ? 'No messes registered yet' : 'Loading messes...'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {privateInfo?.hostelRoom && (
              <span className="hidden lg:inline text-xs text-slate-500">
                Room: {privateInfo.hostelRoom}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowRegisterMess(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl transition-colors min-h-[40px] whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-teal-700" />
              Register a Mess
            </button>
          </div>
        </div>

        {/* Empty State if no Messes exist in Firestore yet */}
        {messesLoaded && messes.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-5">
            <ClipboardCheck className="w-10 h-10 text-teal-700 mx-auto" />
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Welcome to Mess Fix
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                No hostel or campus messes have been set up in this workspace yet. Register your hostel mess or load the starter campus pilot messes to begin tracking menus, ratings, and complaints.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSeedPilot}
                disabled={seedingPilot}
                className="inline-flex items-center gap-2 px-5 py-3 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 disabled:opacity-60 transition-colors min-h-[46px]"
              >
                <Sparkles className="w-4 h-4" />
                {seedingPilot ? 'Setting up Pilot Messes...' : 'Load Pilot Campus Messes'}
              </button>
              <button
                type="button"
                onClick={() => setShowRegisterMess(true)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-slate-300 text-slate-800 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors min-h-[46px]"
              >
                <Plus className="w-4 h-4" />
                Create Custom Mess
              </button>
            </div>
          </div>
        ) : activeMess ? (
          <>
            {activeTab === 'menu' && (
              <DailyMenuView
                mess={activeMess}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                menu={dailyMenu}
                loadingMenu={loadingMenu}
                ratings={ratings}
                isOperator={isMessOperatorFlag}
                onRateMeal={(mealType) => {
                  setRatingPrefillMeal(mealType);
                  setActiveTab('ratings');
                }}
                onReportIssue={(mealType) => {
                  setComplaintPrefillMeal(mealType);
                  setOpenComplaintComposer(true);
                  setActiveTab('complaints');
                }}
                onOpenOperatorMenuEditor={() => setActiveTab('operator')}
              />
            )}

            {activeTab === 'ratings' && (
              <MealRatingsView
                mess={activeMess}
                user={user}
                ratings={ratings}
                initialMealType={ratingPrefillMeal}
                initialDate={selectedDate}
              />
            )}

            {activeTab === 'complaints' && (
              <ComplaintsView
                mess={activeMess}
                user={user}
                complaints={complaints}
                initialMealContext={complaintPrefillMeal}
                initialOpenComposer={openComplaintComposer}
                onComposerHandled={handleComposerHandled}
              />
            )}

            {activeTab === 'operator' && (
              <OperatorDeskView
                mess={activeMess}
                user={user}
                isOperator={isMessOperatorFlag}
                isAdmin={adminUser}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                menu={dailyMenu}
                complaints={complaints}
                ratings={ratings}
                onOpenRegisterMess={() => setShowRegisterMess(true)}
              />
            )}
          </>
        ) : null}
      </main>

      {/* Mobile Bottom Navigation Bar (44px+ touch targets, <= 15% viewport height) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200"
      >
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors ${
                  active ? 'text-teal-700 font-semibold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span className="text-[10px] tracking-tight whitespace-nowrap">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Register Mess Modal */}
      {showRegisterMess && (
        <RegisterMessModal
          user={user}
          onClose={() => setShowRegisterMess(false)}
          onCreated={async (messId) => {
            setShowRegisterMess(false);
            await handleSelectMess(messId);
            setActiveTab('menu');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MessFixApp />
    </ErrorBoundary>
  );
}
