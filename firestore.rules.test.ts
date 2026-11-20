/**
 * Adversarial Security Rules Test Suite for Mess Fix
 * Verifies the "Dirty Dozen" payloads against Firestore Rules logic.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const dirtyDozenCases: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Meal Rating',
    collectionPath: '/messes/dgu_hostel_a/ratings/2026-11-20_Lunch_victim',
    operation: 'create',
    auth: { uid: 'attacker_1', email: 'attacker@dgu.ac.in', email_verified: true },
    payload: {
      messId: 'dgu_hostel_a',
      date: '2026-11-20',
      mealType: 'Lunch',
      rating: 1,
      hygieneRating: 1,
      portionAdequate: false,
      comment: 'Spoofed rating',
      authorId: 'victim_uid',
      authorName: 'Victim',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Self-Assigned Mess Operator',
    collectionPath: '/messes/dgu_hostel_a/operators/attacker_1',
    operation: 'create',
    auth: { uid: 'attacker_1', email: 'attacker@dgu.ac.in', email_verified: true },
    payload: {
      uid: 'attacker_1',
      messId: 'dgu_hostel_a',
      displayName: 'Attacker',
      roleLabel: 'Mess Manager',
      addedBy: 'attacker_1',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Update Ghost Field Injection',
    collectionPath: '/messes/dgu_hostel_a/complaints/comp_1',
    operation: 'create',
    auth: { uid: 'student_1', email: 's1@dgu.ac.in', email_verified: true },
    payload: {
      messId: 'dgu_hostel_a',
      title: 'Cold Dal',
      description: 'Lunch dal was served cold today.',
      category: 'Food Quality',
      mealType: 'Lunch',
      mealDate: '2026-11-20',
      status: 'Submitted',
      operatorResponse: '',
      respondedByName: '',
      authorId: 'student_1',
      authorName: 'Student One',
      isVerified: true,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unverified Admin Email Spoofing',
    collectionPath: '/messes/dgu_hostel_a',
    operation: 'update',
    auth: { uid: 'spoof_uid', email: 'akanksha.0251mba174@dgu.ac.in', email_verified: false },
    payload: { announcement: 'Fake notice' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Cross-User PII Read Attempt',
    collectionPath: '/users/student_2/private/info',
    operation: 'get',
    auth: { uid: 'student_1', email: 's1@dgu.ac.in', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Student Self-Resolving Own Complaint',
    collectionPath: '/messes/dgu_hostel_a/complaints/comp_1',
    operation: 'update',
    auth: { uid: 'student_1', email: 's1@dgu.ac.in', email_verified: true },
    payload: { status: 'Resolved' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Mutating Terminal Resolved Complaint',
    collectionPath: '/messes/dgu_hostel_a/complaints/resolved_comp',
    operation: 'update',
    auth: { uid: 'operator_1', email: 'op1@dgu.ac.in', email_verified: true },
    payload: { status: 'In Review', operatorResponse: 'Reopening' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Orphaned Rating Under Nonexistent Mess',
    collectionPath: '/messes/nonexistent_999/ratings/r1',
    operation: 'create',
    auth: { uid: 'student_1', email: 's1@dgu.ac.in', email_verified: true },
    payload: { messId: 'nonexistent_999', rating: 4 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'ID Poisoning With Invalid Characters',
    collectionPath: '/messes/bad$id!with/symbols',
    operation: 'create',
    auth: { uid: 'student_1', email: 's1@dgu.ac.in', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Oversized Menu Array Poisoning',
    collectionPath: '/messes/dgu_hostel_a/menus/2026-11-20',
    operation: 'update',
    auth: { uid: 'operator_1', email: 'op1@dgu.ac.in', email_verified: true },
    payload: { breakfastItems: new Array(25).fill('Poha') },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Backdated Timestamp Forgery',
    collectionPath: '/messes/dgu_hostel_a/complaints/comp_2',
    operation: 'create',
    auth: { uid: 'student_1', email: 's1@dgu.ac.in', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unscoped User Directory List Scraping',
    collectionPath: '/users',
    operation: 'list',
    auth: { uid: 'student_1', email: 's1@dgu.ac.in', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
