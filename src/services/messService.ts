import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  BLUEPRINT_LIMITS,
  Complaint,
  ComplaintCategory,
  ComplaintMealContext,
  ComplaintStatus,
  DailyMenu,
  MealRating,
  MealType,
  Mess,
  MessType,
  UserPrivateInfo,
  UserProfile,
} from '../types';

export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOffsetDateISO(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return formatDateISO(d);
}

export function formatFriendlyDate(isoDate: string): string {
  const today = getOffsetDateISO(0);
  const yesterday = getOffsetDateISO(-1);
  const tomorrow = getOffsetDateISO(1);
  if (isoDate === today) return 'Today';
  if (isoDate === yesterday) return 'Yesterday';
  if (isoDate === tomorrow) return 'Tomorrow';
  const [y, m, d] = isoDate.split('-').map(Number);
  const parsed = new Date(y, (m || 1) - 1, d || 1);
  return parsed.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function clampString(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

export function sanitizeMenuItems(rawText: string): string[] {
  return rawText
    .split(/[\n,]+/)
    .map((item) => item.trim().slice(0, BLUEPRINT_LIMITS.MENU_ITEM_LEN_MAX))
    .filter((item) => item.length > 0)
    .slice(0, BLUEPRINT_LIMITS.MENU_ITEMS_MAX);
}

export function slugifyMessId(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || 'mess'}_${suffix}`;
}

export function isPlatformAdmin(user: User | null): boolean {
  if (!user || !user.emailVerified) return false;
  return user.email === BOOTSTRAPPED_ADMIN_EMAIL;
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const userPath = `users/${user.uid}`;
  const privatePath = `users/${user.uid}/private/info`;
  const userRef = doc(db, 'users', user.uid);
  const privateRef = doc(db, 'users', user.uid, 'private', 'info');

  const safeName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Student',
    BLUEPRINT_LIMITS.DISPLAY_NAME_MAX
  );
  const safePhoto = user.photoURL ? clampString(user.photoURL, 500) : '';
  const safeEmail = clampString(user.email || 'user@example.com', 160);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const profilePayload: Record<string, unknown> = {
        uid: user.uid,
        displayName: safeName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (safePhoto) {
        profilePayload.photoUrl = safePhoto;
      }
      await setDoc(userRef, profilePayload);
    } else {
      await updateDoc(userRef, {
        displayName: safeName,
        ...(safePhoto ? { photoUrl: safePhoto } : {}),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  try {
    const privSnap = await getDoc(privateRef);
    if (!privSnap.exists()) {
      await setDoc(privateRef, {
        uid: user.uid,
        email: safeEmail,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(privateRef, {
        email: safeEmail,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }

  try {
    const refreshed = await getDoc(userRef);
    return refreshed.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }
}

export async function getUserPrivateInfo(uid: string): Promise<UserPrivateInfo | null> {
  const path = `users/${uid}/private/info`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'private', 'info'));
    return snap.exists() ? (snap.data() as UserPrivateInfo) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateActiveMess(uid: string, activeMessId: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      activeMessId: clampString(activeMessId, 128),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateHostelRoom(uid: string, hostelRoom: string): Promise<void> {
  const path = `users/${uid}/private/info`;
  try {
    await updateDoc(doc(db, 'users', uid, 'private', 'info'), {
      hostelRoom: clampString(hostelRoom, BLUEPRINT_LIMITS.HOSTEL_ROOM_MAX),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToActiveMesses(
  onData: (messes: Mess[]) => void
): Unsubscribe {
  const path = 'messes';
  const q = query(collection(db, 'messes'), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as Mess);
      items.sort((a, b) => a.name.localeCompare(b.name));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function checkIsMessOperator(messId: string, uid: string): Promise<boolean> {
  const path = `messes/${messId}/operators/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'messes', messId, 'operators', uid));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export interface CreateMessInput {
  id?: string;
  name: string;
  campusOrArea: string;
  type: MessType;
  breakfastTiming: string;
  lunchTiming: string;
  snacksTiming: string;
  dinnerTiming: string;
  announcement?: string;
  prefillTemplate?: boolean;
}

export async function createMess(user: User, input: CreateMessInput): Promise<string> {
  const messId = input.id && BLUEPRINT_LIMITS.ID_REGEX.test(input.id)
    ? input.id
    : slugifyMessId(input.name);
  const path = `messes/${messId}`;
  const safeOwnerName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Mess Operator',
    BLUEPRINT_LIMITS.DISPLAY_NAME_MAX
  );

  const payload = {
    id: messId,
    name: clampString(input.name, BLUEPRINT_LIMITS.MESS_NAME_MAX),
    campusOrArea: clampString(input.campusOrArea, BLUEPRINT_LIMITS.CAMPUS_AREA_MAX),
    type: input.type,
    ownerId: user.uid,
    ownerName: safeOwnerName,
    breakfastTiming: clampString(input.breakfastTiming || '07:30 AM - 09:30 AM', BLUEPRINT_LIMITS.TIMING_MAX),
    lunchTiming: clampString(input.lunchTiming || '12:30 PM - 02:30 PM', BLUEPRINT_LIMITS.TIMING_MAX),
    snacksTiming: clampString(input.snacksTiming || '05:00 PM - 06:00 PM', BLUEPRINT_LIMITS.TIMING_MAX),
    dinnerTiming: clampString(input.dinnerTiming || '07:30 PM - 09:30 PM', BLUEPRINT_LIMITS.TIMING_MAX),
    announcement: clampString(input.announcement || '', BLUEPRINT_LIMITS.ANNOUNCEMENT_MAX),
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'messes', messId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  if (input.prefillTemplate) {
    await seedSampleMenusForMess(messId, user);
  }

  return messId;
}

export async function updateMessSettings(
  messId: string,
  updates: {
    name: string;
    campusOrArea: string;
    type: MessType;
    breakfastTiming: string;
    lunchTiming: string;
    snacksTiming: string;
    dinnerTiming: string;
    announcement: string;
  }
): Promise<void> {
  const path = `messes/${messId}`;
  try {
    await updateDoc(doc(db, 'messes', messId), {
      name: clampString(updates.name, BLUEPRINT_LIMITS.MESS_NAME_MAX),
      campusOrArea: clampString(updates.campusOrArea, BLUEPRINT_LIMITS.CAMPUS_AREA_MAX),
      type: updates.type,
      breakfastTiming: clampString(updates.breakfastTiming, BLUEPRINT_LIMITS.TIMING_MAX),
      lunchTiming: clampString(updates.lunchTiming, BLUEPRINT_LIMITS.TIMING_MAX),
      snacksTiming: clampString(updates.snacksTiming, BLUEPRINT_LIMITS.TIMING_MAX),
      dinnerTiming: clampString(updates.dinnerTiming, BLUEPRINT_LIMITS.TIMING_MAX),
      announcement: clampString(updates.announcement, BLUEPRINT_LIMITS.ANNOUNCEMENT_MAX),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToDailyMenu(
  messId: string,
  date: string,
  onData: (menu: DailyMenu | null) => void
): Unsubscribe {
  const path = `messes/${messId}/menus/${date}`;
  return onSnapshot(
    doc(db, 'messes', messId, 'menus', date),
    (snap) => {
      onData(snap.exists() ? (snap.data() as DailyMenu) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function saveDailyMenu(
  messId: string,
  date: string,
  user: User,
  input: {
    breakfastItems: string[];
    lunchItems: string[];
    snacksItems: string[];
    dinnerItems: string[];
    specialNote: string;
  }
): Promise<void> {
  const path = `messes/${messId}/menus/${date}`;
  const ref = doc(db, 'messes', messId, 'menus', date);
  const safeUpdater = clampString(
    user.displayName || user.email?.split('@')[0] || 'Mess Operator',
    BLUEPRINT_LIMITS.DISPLAY_NAME_MAX
  );

  const normalizeItems = (items: string[]) =>
    items
      .map((i) => clampString(i, BLUEPRINT_LIMITS.MENU_ITEM_LEN_MAX))
      .filter((i) => i.length > 0)
      .slice(0, BLUEPRINT_LIMITS.MENU_ITEMS_MAX);

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        messId,
        date,
        breakfastItems: normalizeItems(input.breakfastItems),
        lunchItems: normalizeItems(input.lunchItems),
        snacksItems: normalizeItems(input.snacksItems),
        dinnerItems: normalizeItems(input.dinnerItems),
        specialNote: clampString(input.specialNote, BLUEPRINT_LIMITS.SPECIAL_NOTE_MAX),
        updatedBy: user.uid,
        updatedByName: safeUpdater,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        breakfastItems: normalizeItems(input.breakfastItems),
        lunchItems: normalizeItems(input.lunchItems),
        snacksItems: normalizeItems(input.snacksItems),
        dinnerItems: normalizeItems(input.dinnerItems),
        specialNote: clampString(input.specialNote, BLUEPRINT_LIMITS.SPECIAL_NOTE_MAX),
        updatedBy: user.uid,
        updatedByName: safeUpdater,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToRatings(
  messId: string,
  onData: (ratings: MealRating[]) => void
): Unsubscribe {
  const path = `messes/${messId}/ratings`;
  const q = query(
    collection(db, 'messes', messId, 'ratings'),
    where('messId', '==', messId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MealRating, 'id'>),
      }));
      items.sort(
        (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
      );
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function submitMealRating(
  messId: string,
  user: User,
  input: {
    date: string;
    mealType: MealType;
    rating: number;
    hygieneRating: number;
    portionAdequate: boolean;
    comment: string;
  }
): Promise<void> {
  const ratingId = `${input.date}_${input.mealType}_${user.uid}`;
  const path = `messes/${messId}/ratings/${ratingId}`;
  const ref = doc(db, 'messes', messId, 'ratings', ratingId);
  const safeAuthor = clampString(
    user.displayName || user.email?.split('@')[0] || 'Student',
    BLUEPRINT_LIMITS.DISPLAY_NAME_MAX
  );

  const clampedRating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const clampedHygiene = Math.min(5, Math.max(1, Math.round(input.hygieneRating)));

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        messId,
        date: input.date,
        mealType: input.mealType,
        rating: clampedRating,
        hygieneRating: clampedHygiene,
        portionAdequate: Boolean(input.portionAdequate),
        comment: clampString(input.comment, BLUEPRINT_LIMITS.RATING_COMMENT_MAX),
        authorId: user.uid,
        authorName: safeAuthor,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        rating: clampedRating,
        hygieneRating: clampedHygiene,
        portionAdequate: Boolean(input.portionAdequate),
        comment: clampString(input.comment, BLUEPRINT_LIMITS.RATING_COMMENT_MAX),
        authorName: safeAuthor,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToComplaints(
  messId: string,
  onData: (complaints: Complaint[]) => void
): Unsubscribe {
  const path = `messes/${messId}/complaints`;
  const q = query(
    collection(db, 'messes', messId, 'complaints'),
    where('messId', '==', messId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Complaint, 'id'>),
      }));
      items.sort(
        (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
      );
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createComplaint(
  messId: string,
  user: User,
  input: {
    title: string;
    description: string;
    category: ComplaintCategory;
    mealType: ComplaintMealContext;
    mealDate: string;
  }
): Promise<void> {
  const complaintId = `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `messes/${messId}/complaints/${complaintId}`;
  const safeAuthor = clampString(
    user.displayName || user.email?.split('@')[0] || 'Student',
    BLUEPRINT_LIMITS.DISPLAY_NAME_MAX
  );

  try {
    await setDoc(doc(db, 'messes', messId, 'complaints', complaintId), {
      messId,
      title: clampString(input.title, BLUEPRINT_LIMITS.COMPLAINT_TITLE_MAX),
      description: clampString(input.description, BLUEPRINT_LIMITS.COMPLAINT_DESC_MAX),
      category: input.category,
      mealType: input.mealType,
      mealDate: input.mealDate,
      status: 'Submitted' as ComplaintStatus,
      operatorResponse: '',
      respondedByName: '',
      authorId: user.uid,
      authorName: safeAuthor,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateStudentComplaint(
  messId: string,
  complaintId: string,
  input: {
    title: string;
    description: string;
    category: ComplaintCategory;
    mealType: ComplaintMealContext;
    mealDate: string;
  }
): Promise<void> {
  const path = `messes/${messId}/complaints/${complaintId}`;
  try {
    await updateDoc(doc(db, 'messes', messId, 'complaints', complaintId), {
      title: clampString(input.title, BLUEPRINT_LIMITS.COMPLAINT_TITLE_MAX),
      description: clampString(input.description, BLUEPRINT_LIMITS.COMPLAINT_DESC_MAX),
      category: input.category,
      mealType: input.mealType,
      mealDate: input.mealDate,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function withdrawComplaint(messId: string, complaintId: string): Promise<void> {
  const path = `messes/${messId}/complaints/${complaintId}`;
  try {
    await deleteDoc(doc(db, 'messes', messId, 'complaints', complaintId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function respondToComplaint(
  messId: string,
  complaintId: string,
  user: User,
  input: {
    status: ComplaintStatus;
    operatorResponse: string;
  }
): Promise<void> {
  const path = `messes/${messId}/complaints/${complaintId}`;
  const safeResponder = clampString(
    user.displayName || user.email?.split('@')[0] || 'Mess Operator',
    BLUEPRINT_LIMITS.DISPLAY_NAME_MAX
  );

  const payload: Record<string, unknown> = {
    status: input.status,
    operatorResponse: clampString(input.operatorResponse, BLUEPRINT_LIMITS.OPERATOR_RESPONSE_MAX),
    respondedByName: safeResponder,
    updatedAt: serverTimestamp(),
  };

  if (input.status === 'Resolved') {
    payload.resolvedAt = serverTimestamp();
  }

  try {
    await updateDoc(doc(db, 'messes', messId, 'complaints', complaintId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export const SAMPLE_MENU_TEMPLATES: Record<
  number,
  {
    breakfastItems: string[];
    lunchItems: string[];
    snacksItems: string[];
    dinnerItems: string[];
    specialNote: string;
  }
> = {
  [-1]: {
    breakfastItems: ['Poha with Sev & Lemon', 'Boiled Eggs / Sprouts', 'Bread Butter & Jam', 'Masala Chai'],
    lunchItems: ['Chole Masala', 'Steamed Rice', 'Jeera Aloo', 'Tawa Roti', 'Boondi Raita'],
    snacksItems: ['Bread Pakora', 'Tamarind Chutney', 'Hot Tea'],
    dinnerItems: ['Dal Makhani', 'Butter Naan / Chapati', 'Veg Pulao', 'Cucumber Salad'],
    specialNote: 'Hot drinking water available at counter 2.',
  },
  [0]: {
    breakfastItems: ['Aloo Paratha (2 pcs)', 'Fresh Curd & Pickle', 'Seasonal Fruit Bowl', 'Ginger Tea / Coffee'],
    lunchItems: ['Dal Tadka', 'Paneer Butter Masala', 'Jeera Rice', 'Phulka Chapati', 'Green Salad'],
    snacksItems: ['Crispy Samosa', 'Mint Coriander Chutney', 'Masala Chai'],
    dinnerItems: ['Rajma Masala', 'Steamed Basmati Rice', 'Aloo Gobhi Dry', 'Whole Wheat Roti', 'Gulab Jamun'],
    specialNote: 'Special Friday dinner dessert served from 8:00 PM onwards.',
  },
  [1]: {
    breakfastItems: ['Masala Dosa', 'Coconut Chutney & Sambar', 'Banana', 'Filter Coffee / Tea'],
    lunchItems: ['Kadhi Pakora', 'Steamed Rice', 'Bhindi Fry', 'Tawa Roti', 'Onion Salad'],
    snacksItems: ['Aloo Tikki Chaat', 'Sweet & Spicy Chutney', 'Lemon Tea'],
    dinnerItems: ['Moong Dal Fry', 'Matar Paneer', 'Veg Biryani', 'Chapati', 'Buttermilk'],
    specialNote: 'Weekend lunch counter closes strictly at 2:30 PM.',
  },
};

export async function seedSampleMenusForMess(messId: string, user: User): Promise<void> {
  const offsets = [-1, 0, 1];
  for (const offset of offsets) {
    const iso = getOffsetDateISO(offset);
    const template = SAMPLE_MENU_TEMPLATES[offset] || SAMPLE_MENU_TEMPLATES[0];
    await saveDailyMenu(messId, iso, user, template);
  }
}

export async function seedPilotCampusMesses(user: User): Promise<string> {
  const hostelA = await createMess(user, {
    id: 'dgu_boys_hostel_mess',
    name: 'DGU Hostel Block A Mess',
    campusOrArea: 'DBS Global University Campus',
    type: 'College Hostel',
    breakfastTiming: '07:30 AM - 09:30 AM',
    lunchTiming: '12:30 PM - 02:30 PM',
    snacksTiming: '05:00 PM - 06:00 PM',
    dinnerTiming: '07:30 PM - 09:30 PM',
    announcement: 'Today dinner includes Gulab Jamun. Please share meal ratings after eating!',
    prefillTemplate: true,
  });

  await createMess(user, {
    id: 'dgu_girls_hostel_mess',
    name: 'DGU Hostel Block B Mess',
    campusOrArea: 'DBS Global University Campus',
    type: 'College Hostel',
    breakfastTiming: '07:45 AM - 09:30 AM',
    lunchTiming: '12:30 PM - 02:30 PM',
    snacksTiming: '05:00 PM - 06:00 PM',
    dinnerTiming: '07:30 PM - 09:15 PM',
    announcement: 'Extra curd & buttermilk counter open during lunch hours.',
    prefillTemplate: true,
  });

  return hostelA;
}

export function formatTimestamp(ts?: Timestamp | null): string {
  if (!ts) return 'Just now';
  const date = ts.toDate();
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
