import { Timestamp } from 'firebase/firestore';

export type MessType = 'College Hostel' | 'Campus Central' | 'Private PG Mess';
export type MealType = 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
export type ComplaintMealContext = MealType | 'General';
export type ComplaintCategory =
  | 'Food Quality'
  | 'Hygiene & Cleanliness'
  | 'Portion Size'
  | 'Menu / Timing Mismatch'
  | 'Service & Staff'
  | 'Missed Meal';
export type ComplaintStatus = 'Submitted' | 'Acknowledged' | 'In Review' | 'Resolved';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoUrl?: string;
  activeMessId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserPrivateInfo {
  uid: string;
  email: string;
  hostelRoom?: string;
  updatedAt: Timestamp;
}

export interface Mess {
  id: string;
  name: string;
  campusOrArea: string;
  type: MessType;
  ownerId: string;
  ownerName: string;
  breakfastTiming: string;
  lunchTiming: string;
  snacksTiming: string;
  dinnerTiming: string;
  announcement: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DailyMenu {
  messId: string;
  date: string; // YYYY-MM-DD
  breakfastItems: string[];
  lunchItems: string[];
  snacksItems: string[];
  dinnerItems: string[];
  specialNote: string;
  updatedBy: string;
  updatedByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MealRating {
  id: string;
  messId: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  rating: number;
  hygieneRating: number;
  portionAdequate: boolean;
  comment: string;
  authorId: string;
  authorName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Complaint {
  id: string;
  messId: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  mealType: ComplaintMealContext;
  mealDate: string; // YYYY-MM-DD
  status: ComplaintStatus;
  operatorResponse: string;
  respondedByName: string;
  authorId: string;
  authorName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
}

export const BLUEPRINT_LIMITS = {
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  DATE_REGEX: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
  DISPLAY_NAME_MAX: 80,
  HOSTEL_ROOM_MAX: 40,
  MESS_NAME_MAX: 100,
  CAMPUS_AREA_MAX: 100,
  TIMING_MAX: 50,
  ANNOUNCEMENT_MAX: 300,
  MENU_ITEMS_MAX: 12,
  MENU_ITEM_LEN_MAX: 60,
  SPECIAL_NOTE_MAX: 240,
  RATING_COMMENT_MAX: 400,
  COMPLAINT_TITLE_MAX: 120,
  COMPLAINT_DESC_MAX: 1000,
  OPERATOR_RESPONSE_MAX: 800,
} as const;
