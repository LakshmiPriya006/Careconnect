# CareConnect - Testing Guide

## 🐛 Fixed Issues

### 1. ✅ Dialog Ref Warning Fixed
**Error**: "Function components cannot be given refs" warning in Dialog component
**Fix**: Changed DialogContent to use DialogPrimitive.Overlay directly instead of the wrapped DialogOverlay component
**Status**: FIXED

### 2. 🔍 Address & Profile Dropdown - Debugging Added
**Issue**: Dropdowns not appearing in booking form
**Changes**: Added comprehensive debugging to ServiceRequestForm
**Status**: DEBUGGING IN PROGRESS

---

## 📋 How to Test Address & Profile Dropdowns

### Prerequisites: Add Data First!

Before testing, you MUST have data in your profile:

#### Step A: Add Locations
1. Login as client
2. Go to "Account" tab
3. Click "Locations" sub-tab
4. Click "Add Location"
5. Fill in:
   - Location Name: "Home"
   - Full Address: "123 Main St, City, State 12345"
   - ✓ Check "Set as primary location"
6. Click "Save Location"
7. Add 1-2 more locations for testing

#### Step B: Add Family Members (for "For Someone Else" testing)
1. Still in "Account" tab
2. Click "Family Members" sub-tab
3. Click "Add Profile"
4. Fill in:
   - Name: "Margaret Thompson"
   - Relationship: "Mother"
   - Phone: "555-0123"
   - Age: "75"
   - Gender: "Female"
   - Address: "456 Oak Ave, City, State 12345"
   - Notes: (optional)
5. Click "Save Profile"
6. Add 1-2 more family members for testing

---

## 🧪 Testing the Booking Form

### Test 1: Debug Box Check

1. Go to "Book Service" tab
2. **Look at the top of the page** - you should see a **PURPLE box**
3. Click on "🔍 Debug Info (Click to expand)"
4. Check the numbers:
   ```
   📍 Locations loaded: 3  ← Should match number of locations you added
   👨‍👩‍👧‍👦 Family members loaded: 2  ← Should match number you added
   📋 Selected location: (shows ID or 'none')
   👤 Request for: self (or 'other')
   ```

5. If locations loaded = 0 → Go back to Step A above
6. If family members loaded = 0 → Go back to Step B above

### Test 2: "For Myself" - Address Dropdown

1. Select "For Myself" radio button
2. Scroll down to find "Service Location" section
3. **Open browser console** (F12 → Console tab)
4. You should see logs like:
   ```
   🎨 RENDER: Location section - locations count: 3
   🎨 RENDER: Locations: [{id: "...", name: "Home", address: "..."}]
   ```

**Expected Result**:
- If count > 0: You should see a **DROPDOWN** with your saved addresses
- Dropdown should show options like:
  - "Home - 123 Main St, City, State (Primary)"
  - "Work - 789 Business Blvd, City, State"
  - "+ Add New Address"

**If dropdown doesn't appear**:
- Click "Log State to Console" button in debug box
- Copy ALL console logs
- Take a screenshot
- Report back

### Test 3: "For Someone Else" - Family Profile Dropdown

1. Select "For Someone Else" radio button
2. Look for "Recipient Information" blue box
3. **Check browser console** for:
   ```
   🎨 RENDER: Family member section - members count: 2
   🎨 RENDER: Family members: [{id: "...", name: "Margaret Thompson", ...}]
   ```

**Expected Result**:
- If count > 0: You should see dropdown "Select from Family Profiles"
- Dropdown should show:
  - "Enter New Person" (first option)
  - "Margaret Thompson (Mother)"
  - "John Thompson (Father)"
  - etc.

**When you select a profile**:
- All fields should auto-fill:
  - Name → "Margaret Thompson"
  - Phone → "555-0123"
  - Address → "456 Oak Ave..."
  - Age → "75"
  - Gender → "Female"

**If dropdown doesn't appear**:
- Click "Log State to Console" button in debug box
- Copy ALL console logs
- Take a screenshot
- Report back

### Test 4: Full Booking Flow

1. **For Myself**:
   - Select service
   - Choose "For Myself"
   - Select "Schedule for Later"
   - Pick a date (tomorrow)
   - Pick a time slot (e.g., "2:00 PM")
   - Select address from dropdown
   - Submit

2. **For Someone Else**:
   - Select service
   - Choose "For Someone Else"
   - Select family member from dropdown
   - Verify fields auto-fill
   - Select "Schedule for Later"
   - Pick date and time
   - Submit

---

## 🔍 What to Report if Issues Persist

### Checklist for Reporting:

- [ ] Screenshot of Debug Box (purple, expanded)
- [ ] Console logs (everything with 🔍 📍 👨‍👩‍👧‍👦 🎨 === symbols)
- [ ] Screenshot of the form where dropdown should be
- [ ] Which section: "For Myself" or "For Someone Else"
- [ ] How many locations in Account tab?
- [ ] How many family members in Account tab?

### Console Logs to Copy:

Look for and copy these logs:
```
🔍 Loading profile data for booking form...
📦 Profile response: ...
📍 Locations found: ...
📍 Locations data: ...
👨‍👩‍👧‍👦 Family members found: ...
🎨 RENDER: Location section - locations count: ...
🎨 RENDER: Locations: ...
🎨 RENDER: Family member section - members count: ...
🎨 RENDER: Family members: ...
=== DEBUG STATE === (if you clicked the button)
```

---

## ✅ Expected vs Actual

### ✅ Expected Behavior:

**For Myself with 3 saved locations**:
```
[ Service Location ]
┌────────────────────────────────────────┐
│ Home - 123 Main St, City (Primary) ▼  │ ← Dropdown appears
└────────────────────────────────────────┘
```

**For Someone Else with 2 family members**:
```
┌─ Recipient Information ─────────────────┐
│ Select from Family Profiles            │
│ ┌──────────────────────────────────┐   │
│ │ Enter New Person              ▼  │   │ ← Dropdown appears
│ └──────────────────────────────────┘   │
│                                         │
│ [Name: (auto-filled)]                   │
│ [Phone: (auto-filled)]                  │
│ [Address: (auto-filled)]                │
│ [Age: (auto-filled)] [Gender: (...)]    │
└─────────────────────────────────────────┘
```

### ❌ What NOT to See:

- Plain text input where dropdown should be (when you have saved data)
- Empty dropdowns
- Dropdowns with no options
- "Locations loaded: 0" when you added locations
- "Family members loaded: 0" when you added members

---

## 🚀 Quick Summary

1. **Add locations** in Account → Locations tab
2. **Add family members** in Account → Family Members tab
3. **Go to Book Service** tab
4. **Check Debug Box** - numbers should be > 0
5. **Test "For Myself"** - dropdown with addresses should appear
6. **Test "For Someone Else"** - dropdown with family profiles should appear
7. **Report issues** with screenshots + console logs

The code is correct - we just need to verify the data is loading and rendering properly!
