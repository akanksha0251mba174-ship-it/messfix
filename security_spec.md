# Mess Fix — Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Identity Integrity**: Every user profile (`/users/{userId}`), private PII doc (`/users/{userId}/private/{docId}`), meal rating (`authorId`), and complaint (`authorId`) must strictly match `request.auth.uid`.
2. **PII Isolation**: User email addresses and hostel room details reside exclusively in `/users/{userId}/private/{docId}`, readable only by the owning user (`request.auth.uid == userId`) or a verified platform admin.
3. **Master Gate & Parent Existence**: All subcollections under `/messes/{messId}` (`/operators`, `/menus`, `/ratings`, `/complaints`) require the parent `/messes/{messId}` document to exist on create, and operator-only actions verify ownership or operator membership on the parent mess.
4. **Tiered Identity & Terminal State Locking on Complaints**:
   - Students can create complaints only with `status == 'Submitted'` and `operatorResponse == ''`.
   - Students can edit their own complaint only while `status == 'Submitted'`.
   - Only Mess Owners, designated Mess Operators, or Admins can change `status` or write `operatorResponse`.
   - Once a complaint reaches `status == 'Resolved'`, no non-admin updates are permitted.
5. **Temporal Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on update. `updatedAt` must equal `request.time` on both creation and update.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoofing on Rating**: Creating a `/messes/{messId}/ratings/{ratingId}` with `authorId: "other-user-uid"` instead of `request.auth.uid` → **PERMISSION_DENIED**.
2. **Self-Assigned Admin / Operator**: Creating `/messes/mess-1/operators/attacker-uid` as a regular student who does not own `mess-1` → **PERMISSION_DENIED**.
3. **Ghost Field Injection (Shadow Update)**: Creating or updating a complaint with an extra field `isVerified: true` → **PERMISSION_DENIED** (rejected by `keys().hasOnly(...)` / `affectedKeys().hasOnly(...)`).
4. **Email Spoofing Without Verification**: Authenticating with `email: "akanksha.0251mba174@dgu.ac.in"` and `email_verified: false` to edit another owner's mess → **PERMISSION_DENIED**.
5. **PII Blanket Read**: Signed-in student A calling `get` on `/users/student-B/private/info` → **PERMISSION_DENIED**.
6. **Student Escalating Complaint Status**: Complaint author updating their own complaint's `status` directly to `'Resolved'` → **PERMISSION_DENIED**.
7. **Post-Resolution Mutation**: Mess operator attempting to modify a complaint after `status == 'Resolved'` → **PERMISSION_DENIED**.
8. **Orphaned Subcollection Write**: Creating a rating under `/messes/nonexistent-mess-999/ratings/r1` → **PERMISSION_DENIED**.
9. **Resource Poisoning via Oversized ID**: Writing `/messes/{200-char-invalid-id}` or `/messes/mess$bad` → **PERMISSION_DENIED** (rejected by `isValidId()`).
10. **Menu Array Poisoning**: Updating `/messes/mess-1/menus/2026-11-20` with 50 items or non-string first element → **PERMISSION_DENIED**.
11. **Timestamp Forgery**: Creating a complaint with a backdated `createdAt` (`2020-01-01T00:00:00Z`) instead of `request.time` → **PERMISSION_DENIED**.
12. **Unscoped List Query Scraping**: Querying `/users` list or `/messes` without filtering `isActive == true` (as non-owner) → **PERMISSION_DENIED**.
