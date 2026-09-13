# 🚀 DUCSU Evaluation Platform - Quick Start (30 mins)

Get your evaluation platform live in **30 minutes** with minimal setup.

---

## 📋 What You'll Need

- ✅ Google account (Firebase)
- ✅ Cloudflare account (free)
- ✅ GitHub account (for images)
- ✅ Vercel account (for hosting)
- ✅ 28 leader photos (JPG/PNG)

---

## ⏱️ Timeline

| Step | Time | Task |
|------|------|------|
| 1 | 5 min | Firebase setup |
| 2 | 5 min | Cloudflare Turnstile |
| 3 | 5 min | GitHub images |
| 4 | 5 min | Environment config |
| 5 | 5 min | Local test |
| 6 | 5 min | Vercel deploy |

---

## 🔥 The 6-Step Launch

### Step 1: Firebase (5 minutes)

```bash
# Go to:
https://console.firebase.google.com

# Click: Create Project
# Name: ducsu-eval
# Skip analytics

# In left sidebar: Realtime Database
# Click: Create Database
# Location: Asia Southeast 1
# Security: Start in test mode

# Go to: Project Settings (gear icon)
# Copy these values to clipboard:
- API Key
- Auth Domain
- Database URL
- Project ID
- Storage Bucket
- Messaging Sender ID
- App ID
```

Save them for Step 4.

---

### Step 2: Cloudflare Turnstile (5 minutes)

```bash
# Go to:
https://dash.cloudflare.com

# Left sidebar: Turnstile
# Click: Create Site
# Site name: DUCSU Eval
# Domain: localhost (for testing first)

# Copy:
- Site Key
- Secret Key
```

Save them for Step 4.

---

### Step 3: GitHub Images (5 minutes)

```bash
# Go to:
https://github.com/new

# Repository name: ducsu-eval
# Description: DUCSU Evaluation Platform
# Public: Yes
# Create

# Via GitHub web interface:
# 1. Click: Add file → Create new file
# 2. Path: public/images/vp.jpg
# (This creates the folder)
# 3. Click back to repo home
# 4. Click: Upload files
# 5. Drag all 28 leader photos

# Images should be named:
# vp.jpg, gs.jpg, ags.jpg
# lwdm-sec.jpg, st-sec.jpg, etc.
# em-1.jpg through em-13.jpg
```

---

### Step 4: Environment Setup (5 minutes)

Create `.env.local` in project root:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=xxxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxxxx
NEXT_PUBLIC_FIREBASE_DATABASE_URL=xxxxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxxxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxxxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxxxx

# Cloudflare
NEXT_PUBLIC_TURNSTILE_SITE_KEY=xxxxx
TURNSTILE_SECRET_KEY=xxxxx

# Admin
ADMIN_PASSWORD=StrongPassword123!

# Voting Window (adjust dates)
NEXT_PUBLIC_VOTING_START=2025-01-15T00:00:00Z
NEXT_PUBLIC_VOTING_END=2025-01-18T23:59:59Z

# GitHub Images
NEXT_PUBLIC_LEADERS_JSON_URL=https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/ducsu-eval/main/public/leaders.json

# Fraud Prevention
NEXT_PUBLIC_IP_SOFT_CAP=8
NEXT_PUBLIC_IP_HARD_REVIEW_CAP=12
```

---

### Step 5: Local Test (5 minutes)

```bash
# Terminal:
npm install
npm run dev

# Browser:
http://localhost:3000

# Test:
1. Click a leader
2. Set rating to 3.5
3. Complete Turnstile
4. Submit
5. Try again (should be blocked)
6. Check admin: http://localhost:3000/admin
```

---

### Step 6: Deploy to Vercel (5 minutes)

```bash
# GitHub:
# Push .env.local settings (as reference, never commit)

git add .
git commit -m "Initial DUCSU evaluation platform"
git push origin main

# Vercel:
# Go to: https://vercel.com/new
# Click: Import from GitHub
# Select: ducsu-eval
# Click: Import

# Environment Variables:
# Paste all 14 variables from .env.local
# Click: Deploy

# Wait 2-3 minutes...
# Your site: https://ducsu-eval-XXXXX.vercel.app
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Main page loads with all 28 leaders
- [ ] Can rate a leader (1-5, 0.1 steps)
- [ ] Turnstile appears in modal
- [ ] Second vote is blocked
- [ ] Admin login works
- [ ] Real-time results show up
- [ ] Images load from GitHub

---

## 🔧 Troubleshooting (2 minutes max)

| Problem | Fix |
|---------|-----|
| "Firebase not initialized" | Verify all 7 Firebase vars in `.env.local` |
| "Turnstile widget missing" | Check Cloudflare site key is correct |
| "Images not loading" | Ensure GitHub image URLs are public, test raw URL |
| "Admin login fails" | Password is case-sensitive, check for typos |
| "Votes not saving" | Firebase Database Rules not deployed (see README) |

---

## 📱 Test Voting Flow

1. **First Device**: Vote successfully
2. **Same Device**: Try again → Should be blocked ✓
3. **Different Browser** (same device): Try again → Should be blocked ✓
4. **Different IP**: Can vote ✓ (but gets flagged if >8 from same IP)
5. **Incognito Mode**: Should block ✓

---

## 🎉 You're Live!

**Share your link**:
```
https://ducsu-eval-XXXXX.vercel.app
```

**Admin link**:
```
https://ducsu-eval-XXXXX.vercel.app/admin
(Password: StrongPassword123!)
```

---

## 📊 Monitor During Voting

### Daily Checklist
- [ ] Check Firebase vote count increasing
- [ ] Review admin dashboard for flagged IPs
- [ ] Approve legitimate dorm submissions
- [ ] Reject obvious spam
- [ ] Backup results daily

### Export Results After Voting

```
1. Admin Dashboard → Results tab
2. Click: Export CSV
3. Save file
```

---

## 🚨 Emergency Actions

**If voting needs to stop**:
```
1. Go to Vercel dashboard
2. Deployments → Current
3. Click three dots → Rollback
(Or just close the site temporarily)
```

**If Turnstile fails**:
```
# Temporarily disable:
# Comment out Turnstile in app/page.tsx
# Deploy again
```

---

## 📞 Need Help?

Check `README.md` for full setup details or `DEPLOYMENT_CHECKLIST.md` for pre-launch verification.

---

**Ready? Good luck! 🎓**

*DUCSU 2025 Leadership Evaluation Platform*
