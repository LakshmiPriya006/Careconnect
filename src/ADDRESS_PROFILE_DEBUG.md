# Address & Profile Dropdown Debug Guide

## Issue
Address dropdown and family profile dropdown not showing in booking form.

## Quick Test Steps

### Step 1: Check if you have saved data

**Before testing the booking form**, first add some data:

1. **Login as client**
2. **Go to "Account" tab** (or Profile section)
3. **Add at least one location/address**:
   - Look for "Locations" or "Addresses" section
   - Click "Add Location" or similar
   - Enter: Name (e.g., "Home"), Address, mark as Primary
   - Save

4. **Add at least one family member** (optional, for "booking for someone else"):
   - Look for "Family Members" section
   - Click "Add Family Member"
   - Enter: Name, Relationship, Phone, Address, Age, Gender
   - Save

### Step 2: Test the Booking Form

1. **Go to "Book Service" tab**
2. **Look for DEBUG INFO box** at the top (purple box)
3. **Click to expand it**
4. **Check the numbers**:
   ```
   📍 Locations loaded: ??? (should be > 0 if you added locations)
   👨‍👩‍👧‍👦 Family members loaded: ??? (should be > 0 if you added members)
   ```

### Step 3: Check Browser Console

1. **Open browser console** (F12 or right-click → Inspect → Console)
2. **You should see these logs automatically**:
   ```
   🔍 Loading profile data for booking form...
   📦 Profile response: {...}
   📍 Locations found: X
   📍 Locations data: [...]
   👨‍👩‍👧‍👦 Family members found: X
   ```

3. **Click the "Log State to Console" button** in the debug box
4. **Check the logged data**:
   ```
   === DEBUG STATE ===
   Locations: [...]
   Family Members: [...]
   ```

### Step 4: Test "For Myself" - Address Dropdown

1. **Select "For Myself"**
2. **Scroll to "Service Location" section**
3. **Check console for**:
   ```
   🎨 RENDER: Location section - locations count: X
   🎨 RENDER: Locations: [...]
   ```

**Expected**:
- If locations count > 0: You should see a **dropdown** with your saved addresses
- If locations count = 0: You should see a **text input** with tip message

**If dropdown is missing even though count > 0**:
- Take a screenshot
- Copy the console logs
- Share both

### Step 5: Test "For Someone Else" - Family Profile Dropdown

1. **Select "For Someone Else"**
2. **Look for "Recipient Information" section**
3. **Check console for**:
   ```
   🎨 RENDER: Family member section - members count: X
   🎨 RENDER: Family members: [...]
   ```

**Expected**:
- If members count > 0: You should see a **dropdown** "Select from Family Profiles"
- If members count = 0: Dropdown won't show, but you'll see a tip message

**If dropdown is missing even though count > 0**:
- Take a screenshot
- Copy the console logs
- Share both

---

## Common Issues and Solutions

### Issue 1: "Locations loaded: 0" and "Family members loaded: 0"

**Cause**: No data saved in profile yet

**Solution**: 
1. Go to Account/Profile tab
2. Add at least one location
3. Add at least one family member (if testing "for someone else")
4. Refresh the booking form
5. Check debug box again

### Issue 2: Console shows "No profile data in response"

**Cause**: Profile API call failing or no profile exists

**Solution**:
1. Check if you're logged in
2. Check network tab for failed API calls
3. Look for error messages in console
4. Try logging out and back in

### Issue 3: Console shows "Error loading profile data"

**Cause**: API error

**Solution**:
1. Check the full error message in console
2. Check network tab for the failed request
3. Share the error details

### Issue 4: Data shows in debug but dropdown doesn't render

**Cause**: Rendering issue

**Solution**:
1. Check if `requestFor` is set correctly ("self" or "other")
2. Take a screenshot showing:
   - The debug box (expanded)
   - The missing dropdown area
   - The browser console
3. Share all three

---

## What to Report

If the dropdowns are still not showing, please provide:

1. **Screenshot of the debug box** (purple box, expanded)
2. **Console logs** - Copy everything that starts with:
   - 🔍 Loading profile data...
   - 📍 Locations...
   - 👨‍👩‍👧‍👦 Family members...
   - 🎨 RENDER...
3. **What you see** vs **What you expect to see**
4. **Which test case** ("For Myself" or "For Someone Else")

---

## Quick Visual Test

**For Myself** should show:
```
[ Who is this service for? ]
● For Myself  ○ For Someone Else

[ What type of help do you need? ]
[Service cards...]

[ When do you need this service? ]
○ ASAP  ● Schedule for Later

[ Service Location ]
┌─────────────────────────────────┐
│ Select address               ▼  │  ← This dropdown should appear
└─────────────────────────────────┘
```

**For Someone Else** should show:
```
[ Who is this service for? ]
○ For Myself  ● For Someone Else

┌─────────────────────────────────────┐
│ Recipient Information               │
│                                     │
│ Select from Family Profiles         │
│ ┌───────────────────────────────┐  │
│ │ Choose profile or enter new ▼ │  │  ← This dropdown should appear
│ └───────────────────────────────┘  │
│                                     │
│ [ Name field ]                      │
│ [ Phone field ]                     │
│ [ Address field ]                   │
│ [ Age ] [ Gender ]                  │
└─────────────────────────────────────┘
```

