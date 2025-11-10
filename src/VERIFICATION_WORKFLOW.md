# Provider Verification Workflow

## Overview
Providers MUST be verified by an admin before they can access the full dashboard and accept job requests. This document describes the complete verification workflow.

## Provider Registration Flow

### 1. Provider Signs Up
When a provider registers through the `ProviderRegistrationFlow`:
- They provide contact information, identity documents, skills, and certifications
- All stages are created with status `'submitted'` (if data is provided) or `'pending'`
- **IMPORTANT**: No stages are automatically approved during registration
- The provider is immediately directed to the "Verification Pending" screen

### 2. Initial Stage Status
After registration, all stages start as follows:
```javascript
stages: {
  stage1: 'submitted',  // Contact Verification (if OTP was verified)
  stage2: 'submitted',  // Identity & Background (if documents provided)
  stage3: 'submitted',  // Service Expertise (if skills/specialty provided)
  stage4: 'submitted',  // Behavioral Assessment
}
```

## Dashboard Access Control

### Provider Dashboard Logic (`ProviderDashboard.tsx`)
The provider dashboard checks verification status on load:

```javascript
const isFullyVerified = 
  verificationStatus?.stages?.stage1 === 'approved' &&
  verificationStatus?.stages?.stage2 === 'approved' &&
  verificationStatus?.stages?.stage3 === 'approved' &&
  verificationStatus?.stages?.stage4 === 'approved';
```

**If `isFullyVerified === false`:**
- Provider sees the `ProviderPendingStatus` screen
- Dashboard is completely hidden
- No job requests are accessible
- Header shows "CareConnect Provider - Verification Required" in orange

**If `isFullyVerified === true`:**
- Provider sees the full dashboard
- Can toggle availability
- Can view and accept job requests
- Can access all dashboard features

## Admin Verification Process

### 1. Admin Reviews Applications
Admins access pending verifications through:
- Admin Dashboard → "Provider Verification" section
- See list of all providers with stages in 'submitted' status

### 2. Admin Reviews Each Stage
For each verification stage, the admin can:
- **Approve**: Changes stage status from `'submitted'` → `'approved'`
- **Reject**: Changes stage status from `'submitted'` → `'rejected'`
- Add review notes explaining the decision

### 3. Provider Status Updates
When an admin approves a stage:
```javascript
// Server endpoint: /admin/verifications/review
verificationData.stages[stage] = action === 'approve' ? 'approved' : 'rejected';
```

### 4. Full Verification Complete
When ALL 4 stages are approved by admin:
- Server automatically sets `provider.verified = true`
- Provider can now access the full dashboard
- ProviderPendingStatus shows success message with "Access Full Dashboard" button

## Verification Stages

### Stage 1: Contact Verification
- Email verification
- Mobile phone verification
- Status: Admin must review and approve

### Stage 2: Identity & Background Check
- ID card verification
- Profile photo
- Background check
- Status: Admin must review and approve

### Stage 3: Service Expertise
- Services offered
- Skills and certifications
- Experience details
- Status: Admin must review and approve

### Stage 4: Behavioral Assessment
- Professional assessment
- Status: Admin must review and approve

## Provider Experience

### Pending Verification Screen (`ProviderPendingStatus.tsx`)
Providers see:
- Orange-themed warning screen
- "Verification In Progress" header
- Progress bar showing approved stages (0% to 100%)
- Alert: "Dashboard Access Locked" message
- List of all 4 stages with current status:
  - ✓ **Approved**: Green badge, completed by admin
  - ⏳ **Submitted**: Blue badge, awaiting admin review
  - ⚠️ **Action Required**: Red badge, rejected by admin
  - ⏸️ **Pending**: Gray badge, not yet submitted
- Admin notifications if any stage is rejected
- "What Happens Next?" information section
- Auto-refresh every 30 seconds to check for status updates

### After All Stages Approved
- Green success alert appears
- "Access Full Dashboard" button is shown
- Clicking button reloads page and shows full dashboard

## Testing Scenarios

### Test Case 1: New Provider Registration
1. Provider completes registration
2. Expected: Sees pending verification screen (NOT dashboard)
3. All stages show "Submitted" status
4. Cannot access job requests

### Test Case 2: Partial Admin Approval
1. Admin approves stages 1, 2, and 3
2. Stage 4 remains "submitted"
3. Expected: Provider still sees pending screen
4. Progress shows 75% complete
5. Cannot access dashboard

### Test Case 3: Full Admin Approval
1. Admin approves all 4 stages
2. Expected: Success message appears in pending screen
3. Provider clicks "Access Full Dashboard"
4. Full dashboard loads with job requests
5. Can now toggle availability and accept jobs

### Test Case 4: Stage Rejection
1. Admin rejects stage 2 with notes
2. Expected: Provider sees orange notification
3. Rejected stage shows "Action Required" badge
4. Admin notes are displayed
5. Provider cannot proceed until admin updates

## Security Notes

- **No Auto-Approval**: Stages are never automatically approved during registration
- **Admin-Only Approval**: Only admins can change stage status to 'approved'
- **Complete Verification Required**: ALL 4 stages must be 'approved' for dashboard access
- **Session Persistence**: Verification status is checked on every page load
- **Real-Time Updates**: Pending screen polls for updates every 30 seconds

## Code References

### Key Files
- `/components/ProviderDashboard.tsx` - Main dashboard with verification check
- `/components/ProviderPendingStatus.tsx` - Pending verification screen
- `/supabase/functions/server/index.tsx` - Server endpoints for verification
- `/components/AdminVerificationReview.tsx` - Admin review interface

### Key Endpoints
- `POST /auth/signup/provider` - Creates provider with 'submitted' stages
- `GET /verification/:providerId` - Gets provider verification status
- `POST /admin/verifications/review` - Admin approves/rejects stages
- `GET /admin/verifications/pending` - Lists pending verifications

## Changelog

### 2025-11-05 - Verification Flow Enforcement
- Changed all stages to start as 'submitted' instead of 'approved'
- Removed automatic approval of stage 4 during registration
- Enhanced pending screen messaging for clarity
- Added console logging for verification checks
- Updated header colors to indicate verification required state
