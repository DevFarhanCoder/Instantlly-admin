# 🚀 Staging Deployment Guide - Admin Panel

## Overview
This guide will help you deploy the Admin Panel with Referral System to the staging environment.

**Staging Backend:** https://api-test.instantllycards.com  
**Admin Panel will be deployed to:** Vercel (or your hosting platform)

---

## Prerequisites ✅

1. **Backend is deployed at staging:**
   - URL: `https://api-test.instantllycards.com`
   - Referral API endpoints are working (`/api/credits/config`)

2. **Vercel CLI installed** (if using Vercel):
   ```powershell
   npm install -g vercel
   ```

3. **Admin credentials:**
   - Admin Key: `Farhan_90` (as set in `.env.staging`)

---

## Step 1: Verify Backend is Running 🔍

Test if your staging backend is accessible:

```powershell
# Test health endpoint
curl https://api-test.instantllycards.com/health

# Test credits config endpoint
curl https://api-test.instantllycards.com/api/credits/config
```

**Expected Response:**
```json
{
  "success": true,
  "config": {
    "signupBonus": 200,
    "referralReward": 300,
    "lastUpdatedBy": "admin",
    "lastUpdatedAt": "2025-12-20T..."
  }
}
```

---

## Step 2: Deploy Admin Panel to Vercel 🚀

### Option A: Using Vercel Dashboard (Recommended)

1. **Push code to GitHub:**
   ```powershell
   cd c:\Users\hp\OneDrive\Desktop\instantlycards\Instantlly-admin
   git add .
   git commit -m "Add staging environment configuration for referral system"
   git push origin shalini-dev
   ```

2. **Login to Vercel:**
   - Go to https://vercel.com
   - Import the `Instantlly-admin` repository

3. **Configure Environment Variables:**
   In Vercel Dashboard → Settings → Environment Variables, add:
   
   | Variable Name | Value |
   |---------------|-------|
   | `NEXT_PUBLIC_API_BASE` | `https://api-test.instantllycards.com` |
   | `NEXT_PUBLIC_ADMIN_KEY` | `Farhan_90` |
   
   - Set these for **Preview** and **Production** deployments

4. **Deploy:**
   - Vercel will automatically deploy when you push to your branch
   - Or click "Deploy" button in Vercel dashboard

### Option B: Using Vercel CLI

```powershell
# Navigate to admin folder
cd c:\Users\hp\OneDrive\Desktop\instantlycards\Instantlly-admin

# Login to Vercel (first time only)
vercel login

# Deploy to staging
vercel

# When prompted:
# - Set up and deploy? Y
# - Which scope? Select your account
# - Link to existing project? Y (if exists) or N (create new)
# - What's your project name? instantlly-admin-staging
# - In which directory is your code located? ./
# - Auto-detected Next.js. Continue? Y

# Set environment variables (first time only)
vercel env add NEXT_PUBLIC_API_BASE production
# Enter: https://api-test.instantllycards.com

vercel env add NEXT_PUBLIC_ADMIN_KEY production
# Enter: Farhan_90

# Deploy to production URL
vercel --prod
```

---

## Step 3: Test Admin Panel in Staging 🧪

Once deployed, you'll get a URL like: `https://instantlly-admin-staging.vercel.app`

### Test Login:
1. Navigate to your admin URL
2. Enter admin credentials
3. Login should work

### Test Referral System:
1. Go to "Referral System" page
2. Verify current values show: Self Download = 200, Introducer = 300
3. Change values (e.g., Self Download = 250, Introducer = 350)
4. Click "Update Credit Configuration"
5. Success message should appear
6. Refresh page - new values should persist

---

## Step 4: Verify Backend Updated 🔍

Test that backend config was updated:

```powershell
# Check updated config
curl https://api-test.instantllycards.com/api/credits/config
```

**Expected Response:**
```json
{
  "success": true,
  "config": {
    "signupBonus": 250,
    "referralReward": 350,
    "lastUpdatedBy": "admin",
    "lastUpdatedAt": "2025-12-20T..."
  }
}
```

---

## Step 5: Update Mobile App to Use Staging 📱

After admin is deployed, update mobile app `.env` file:

**File:** `InstantllyCards/.env`

```env
EXPO_PUBLIC_API_BASE=https://api-test.instantllycards.com
```

Then rebuild and test the mobile app:

```powershell
cd c:\Users\hp\OneDrive\Desktop\instantlycards\InstantllyCards

# Clear cache and rebuild
npm run android
# or
npm run ios
```

---

## Environment Configuration Summary 📋

| Environment | Backend URL | Admin Panel URL | Mobile App |
|-------------|-------------|-----------------|------------|
| **Local** | `http://localhost:8080` | `http://localhost:3000` | Use `.env.local` |
| **Staging** | `https://api-test.instantllycards.com` | Vercel staging URL | Use staging API |
| **Production** | `https://api.instantllycards.com` | Vercel production URL | Use production API |

---

## Troubleshooting 🔧

### 1. Admin can't connect to backend
**Error:** "Failed to load current configuration"

**Solution:**
- Check backend URL is correct in Vercel env vars
- Verify backend is running: `curl https://api-test.instantllycards.com/health`
- Check browser console for CORS errors

### 2. Unauthorized errors
**Error:** "Unauthorized - Admin access required"

**Solution:**
- Verify `NEXT_PUBLIC_ADMIN_KEY` matches backend's `ADMIN_SECRET_KEY`
- Check backend logs for authentication errors

### 3. Changes not reflecting in mobile app
**Solution:**
- Verify mobile app is using correct `EXPO_PUBLIC_API_BASE`
- Clear mobile app cache and rebuild
- Check mobile app fetches config on mount

### 4. Build fails on Vercel
**Error:** Build errors

**Solution:**
- Check Vercel build logs
- Verify all dependencies are in `package.json`
- Try building locally first: `npm run build`

---

## Quick Commands Reference 💻

```powershell
# Deploy admin to Vercel
cd c:\Users\hp\OneDrive\Desktop\instantlycards\Instantlly-admin
vercel --prod

# Test backend health
curl https://api-test.instantllycards.com/health

# Test credits config
curl https://api-test.instantllycards.com/api/credits/config

# Update mobile app env and rebuild
cd c:\Users\hp\OneDrive\Desktop\instantlycards\InstantllyCards
# Edit .env file, then:
npm run android
```

---

## Next Steps 🎯

1. ✅ Deploy admin panel to staging
2. ✅ Test referral system updates in admin
3. ✅ Update mobile app to use staging API
4. ✅ Test full flow: Admin changes → Mobile app reflects changes
5. 🚀 Once tested, deploy to production

---

## Support 💬

If you encounter any issues:
1. Check the troubleshooting section above
2. Review Vercel deployment logs
3. Check backend logs at your hosting provider
4. Verify environment variables are set correctly
