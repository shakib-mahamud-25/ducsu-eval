# DUCSU 2025 Leadership Evaluation Platform

A **premium, anonymous, and secure** evaluation platform for rating DUCSU elected leaders. Built with zero-budget constraints using free-tier services.

## 🎯 Features

✅ **Anonymous Voting**: No authentication required, completely private
✅ **Fraud Prevention**: IP soft-capping, browser fingerprinting, incognito detection
✅ **Real-time Results**: Live aggregated voting statistics
✅ **Admin Dashboard**: Review flagged submissions and export results
✅ **Premium UI/UX**: 5-star slider with 0.1 precision, responsive design
✅ **Privacy-First**: Decoupled data storage, no user tracking
✅ **Free Stack**: Vercel, Firebase, Cloudflare, GitHub

---

## 📋 Prerequisites

- **Node.js 18+** (for development)
- **Firebase Account** (free tier)
- **Cloudflare Account** (for Turnstile)
- **GitHub Account** (for hosting images)
- **Vercel Account** (for deployment)

---

## 🚀 Setup Guide

### Step 1: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project called `ducsu-eval`
3. Enable **Realtime Database** (free tier)
4. Set database location to **Asia Southeast 1** (closest to Bangladesh)
5. Copy database credentials from **Project Settings → Service Accounts**

Add to `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=xxxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://xxx.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxxxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxxxx
```

6. **Set Database Rules**: Go to **Realtime Database → Rules** and paste from `firebase-rules.json`

### Step 2: Cloudflare Turnstile Setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Turnstile** (left sidebar)
3. Create a new site:
   - **Site name**: `DUCSU Evaluation`
   - **Domain**: Your domain (or `localhost` for testing)
4. Copy **Site Key** and **Secret Key**

Add to `.env.local`:
```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=xxxxx
TURNSTILE_SECRET_KEY=xxxxx
```

### Step 3: GitHub Image Setup

1. Create a GitHub repository called `ducsu-eval`
2. Create folder structure: `/public/images/`
3. Upload leader photos with naming:
   - `vp.jpg` (Vice-President)
   - `gs.jpg` (General Secretary)
   - `ags.jpg` (Assistant General Secretary)
   - `lwdm-sec.jpg`, `st-sec.jpg`, etc. (by secretarial ID)
   - `em-1.jpg`, `em-2.jpg`, etc. (executive members)

4. Update `public/leaders.json` with your GitHub username:
```json
{
  "id": "vp",
  "imageUrl": "https://raw.githubusercontent.com/YOUR_USERNAME/ducsu-eval/main/public/images/vp.jpg"
}
```

5. Set `NEXT_PUBLIC_LEADERS_JSON_URL` in `.env.local`:
```env
NEXT_PUBLIC_LEADERS_JSON_URL=https://raw.githubusercontent.com/YOUR_USERNAME/ducsu-eval/main/public/leaders.json
```

### Step 4: Admin Password & Voting Window

```env
ADMIN_PASSWORD=your_strong_password_here

NEXT_PUBLIC_VOTING_START=2025-01-15T00:00:00Z
NEXT_PUBLIC_VOTING_END=2025-01-18T23:59:59Z

NEXT_PUBLIC_IP_SOFT_CAP=8
NEXT_PUBLIC_IP_HARD_REVIEW_CAP=12
```

### Step 5: Install Dependencies

```bash
npm install
```

### Step 6: Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000` to test voting and `http://localhost:3000/admin` for the dashboard.

---

## 🚀 Deploy to Vercel

1. Push code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Click **New Project** → Import `ducsu-eval` repo
4. Add all **Environment Variables** from `.env.local`
5. Deploy!

**Your live site**: `https://ducsu-eval.vercel.app`

---

## 🛡️ Fraud Detection Architecture

### How It Works

```
Student Submits Vote
    ↓
1. Turnstile Bot Check ✓
2. IP Address Lookup ✓
3. Fingerprint Hash ✓
4. Incognito Detection ✓
    ↓
If Submissions from IP < 8:
   → Allow (no flag)
Else if < 12:
   → Allow + Flag for admin review
Else:
   → Block outright
    ↓
Vote Recorded Anonymously
(IP ≠ Rating, decoupled)
```

### Privacy Model

**What We Store**:
- `submissions/`: leader_id, score, timestamp
- `fraud_detection/`: IP, fingerprint_hash, visitor_id (TTL: 14 days)
- `flagged_submissions/`: Admin review data

**What We Don't Store**:
- ❌ Student names, IDs, emails
- ❌ Direct IP→Rating linkage
- ❌ Personally identifiable metadata

---

## 📊 Admin Dashboard

**Login**: `https://yourdomain.com/admin`

**Password**: Set via `ADMIN_PASSWORD` env variable

### Features

- **Flagged Submissions**: View IPs with >8 votes, approve/reject
- **Live Results**: Real-time vote aggregates, export as CSV
- **Data Management**: Delete fraud detection logs

---

## 🎨 Customization

### Change Colors

Edit `tailwind.config.ts` color scheme or update gradient classes in components.

### Add Leader Custom Fields

Update `leaders.json` structure:
```json
{
  "id": "vp",
  "name": "...",
  "department": "Engineering",
  "achievements": ["Achieved X", "Improved Y"]
}
```

Then render in `components/LeaderCard.tsx`.

### Adjust Slider Precision

In `app/page.tsx`, change Turnstile step:
```jsx
<input type="range" step="0.05" /> // 0.05 increments
```

---

## 🔍 Monitoring & Analytics

### Check Vote Count

Firebase Console → Realtime Database → `submissions` → count entries

### Review Flagged IPs

Admin Dashboard → Flagged Submissions tab

### Monitor Performance

Vercel Dashboard → Analytics (bandwidth, response time)

---

## ❌ Troubleshooting

### "Firebase not initialized"
- Check `.env.local` has all Firebase keys
- Run `npm run dev` again

### "Turnstile widget not showing"
- Verify Cloudflare domain is correct
- Check browser console for errors

### "Images not loading"
- Ensure GitHub images are public and named correctly
- Test raw GitHub URL in browser

### "Admin login not working"
- Verify `ADMIN_PASSWORD` is set
- Check browser localStorage isn't interfering

---

## 📈 Expected Performance

- **Concurrent Users**: Free tier supports ~100 simultaneous
- **Daily Votes**: Firebase free tier: 100 connections, 1GB storage
- **Expected Duration**: Optimized for 3-day voting window
- **Data Retention**: Auto-deletes fraud logs after 14 days

---

## 🔐 Security Checklist

- [ ] Firebase rules deployed (from `firebase-rules.json`)
- [ ] Cloudflare Turnstile keys verified
- [ ] Admin password is strong (16+ chars, mixed case/numbers)
- [ ] GitHub images are HTTPS
- [ ] Vercel environment variables are set
- [ ] Voting window dates are correct
- [ ] IP soft-cap threshold tested

---

## 📝 Database Schema

### `submissions`
```
{
  "submissionId": {
    "leader_id": "vp",
    "score": 4.3,
    "createdAt": 1705276800000
  }
}
```

### `fraud_detection` (expires after 14 days)
```
{
  "fraudId": {
    "fingerprint_hash": "abc123",
    "ip_address": "192.168.1.1",
    "visitor_id": "visitor_xyz",
    "submissionTimestamp": 1705276800000
  }
}
```

### `flagged_submissions`
```
{
  "flagId": {
    "ip_address": "192.168.1.1",
    "count_from_ip": 10,
    "fingerprints": ["abc", "def"],
    "status": "pending" | "approved" | "rejected",
    "admin_note": "",
    "createdAt": 1705276800000
  }
}
```

---

## 📞 Support

For issues:
1. Check Firebase rules are correct
2. Verify all environment variables
3. Test in incognito mode (should block)
4. Check browser console for errors
5. Review Vercel deployment logs

---

## 📄 License

Open source for DUCSU 2025 evaluation use only.

---

## 🎓 Built With

- **Next.js 14**: React framework
- **Firebase**: Realtime database
- **Tailwind CSS**: Styling
- **FingerprintJS**: Device fingerprinting
- **Cloudflare Turnstile**: Bot prevention
- **Vercel**: Hosting

---

**DUCSU 2025 Leadership Evaluation Platform**  
*Anonymous • Secure • Privacy-First*
