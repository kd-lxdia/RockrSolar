# 🔍 Post-Deployment Verification Guide

After deploying your Sales Dashboard to production, use this guide to verify everything works correctly.

## ✅ Automated Checks

Visit these URLs in your browser and verify responses:

### 1. Application Health
```
https://your-domain.com/
```
**Expected**: Dashboard loads, displays UI (may show "No data" if fresh database)

### 2. Database Connection
```
https://your-domain.com/api/db/init
```
**Expected Response**:
```json
{"success":true,"message":"Database initialized successfully"}
```

**If Error**: Check environment variables, database credentials, and logs.

---

## 🧪 Manual Testing Checklist

### Test 1: Add Item & Type
- [ ] Go to **Settings** page
- [ ] Select or add new Item (e.g., "Test Item")
- [ ] Add Type (e.g., "Test Type")
- [ ] **Refresh page** → Item/Type should still appear

**Status**: ✅ PASS / ❌ FAIL

### Test 2: Add HSN Code
- [ ] In Settings, select Item + Type
- [ ] Enter HSN code (e.g., "12345678")
- [ ] Click Save
- [ ] **Refresh page** → HSN code should persist

**Status**: ✅ PASS / ❌ FAIL

### Test 3: Stock IN
- [ ] Go to **Dashboard** → **Stock IN** tab
- [ ] Add Source (e.g., "Warehouse A")
- [ ] Add Supplier
- [ ] Create Stock IN event with quantity
- [ ] **Refresh page** → Event should appear in history

**Status**: ✅ PASS / ❌ FAIL

### Test 4: Stock OUT
- [ ] Go to **Stock OUT** tab
- [ ] Create Stock OUT event
- [ ] Verify current stock decreases
- [ ] **Refresh page** → Changes should persist

**Status**: ✅ PASS / ❌ FAIL

### Test 5: Create BOM
- [ ] Go to **BOM** page
- [ ] Click "Create New BOM"
- [ ] Fill in project details
- [ ] Save BOM
- [ ] **Refresh page** → BOM should be listed

**Status**: ✅ PASS / ❌ FAIL

### Test 6: Export Excel
- [ ] Go to Dashboard
- [ ] Click "Export to Excel" button
- [ ] Verify Excel file downloads
- [ ] Open file → Check HSN codes are included

**Status**: ✅ PASS / ❌ FAIL

### Test 7: Print BOM
- [ ] Open any BOM record
- [ ] Click "Print" button
- [ ] Verify PDF preview opens
- [ ] Check all calculated values are correct

**Status**: ✅ PASS / ❌ FAIL

---

## 📊 Performance Verification

### Load Time Benchmarks
- [ ] Homepage loads in < 3 seconds
- [ ] Dashboard with data loads in < 4 seconds
- [ ] Excel export generates in < 5 seconds
- [ ] BOM calculations complete instantly

### Database Query Performance
- [ ] Stock IN/OUT forms respond quickly (< 1 second)
- [ ] Historical data table loads smoothly
- [ ] Settings page loads all items/types quickly

---

## 🔍 Browser Console Check

Open browser Developer Tools (F12) → Console tab:

**Expected**: No red errors (some warnings OK)

**If Errors**:
- API errors (404, 500) → Check API routes and database
- CORS errors → Check deployment platform settings
- Network errors → Check internet connection

---

## 📱 Mobile Responsiveness

Test on mobile device or browser DevTools (F12 → Toggle device):

- [ ] Dashboard displays correctly on mobile
- [ ] Stock IN/OUT forms are usable
- [ ] Tables scroll horizontally
- [ ] Buttons are tappable
- [ ] Dropdowns work properly

---

## 🔐 Security Verification

### Environment Variables
- [ ] `POSTGRES_URL` is set (not using mock database)
- [ ] Database credentials are not exposed in client code
- [ ] Firebase keys (if used) are properly scoped

### Database Access
- [ ] Cannot access database directly from browser
- [ ] API routes properly validate inputs
- [ ] No sensitive data in browser console/network tab

---

## 📈 Monitoring Setup

### Vercel Projects
1. Go to Vercel Dashboard → Your Project
2. Click **Analytics** tab → View real-time metrics
3. Click **Logs** → Monitor function execution
4. Check **Speed Insights** → Performance data

### Railway Projects
1. Go to Railway Dashboard → Your Project
2. Click on web service
3. View **Deployments** → Check build logs
4. View **Metrics** → CPU, Memory, Network usage

---

## 🚨 Common Issues & Solutions

### Issue: "Using mock database" appears
**Solution**: 
- Set `POSTGRES_URL` environment variable
- Redeploy application
- Clear browser cache

### Issue: Data doesn't persist after refresh
**Solution**:
1. Visit `/api/db/init` endpoint
2. Check browser console for API errors
3. Verify database connection in platform logs

### Issue: Export Excel has blank HSN codes
**Solution**:
1. Go to Settings page
2. Add HSN codes for each Item+Type combination
3. Export again

### Issue: BOM calculations show NaN or wrong values
**Solution**:
1. Check all input fields have valid numbers
2. Ensure panel wattage and project KW are filled
3. Clear browser cache and retry

---

## ✅ Production Readiness Checklist

Before going live with real users:

- [ ] Database initialized successfully
- [ ] All CRUD operations work (Create, Read, Update, Delete)
- [ ] Data persists across page refreshes
- [ ] HSN codes save and appear in exports
- [ ] Excel export works with real data
- [ ] BOM calculations are accurate
- [ ] Mobile responsive on all pages
- [ ] No console errors on key pages
- [ ] Performance is acceptable (< 5 sec load)
- [ ] Backup strategy in place (database provider)

---

## 📞 Support Resources

**If all tests pass**: 🎉 Your deployment is successful!

**If tests fail**:
1. Check [POSTGRESQL_DEPLOYMENT.md](./POSTGRESQL_DEPLOYMENT.md) troubleshooting section
2. Review platform logs (Vercel/Railway dashboard)
3. Verify environment variables are correctly set
4. Check database connection credentials
5. Open GitHub issue with error details

---

**Last Updated**: October 2025
