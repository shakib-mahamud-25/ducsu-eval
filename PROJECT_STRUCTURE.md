# 📁 DUCSU Evaluation Platform - Project Structure

Complete file directory and usage guide.

---

## 📂 Full Directory Tree

```
ducsu-eval/
│
├── 📄 .env.local.example              ← Copy to .env.local and fill
├── 📄 .gitignore                      ← Git ignore rules
├── 📄 package.json                    ← Dependencies (npm install)
├── 📄 tsconfig.json                   ← TypeScript config
├── 📄 next.config.js                  ← Next.js config
├── 📄 tailwind.config.ts              ← Tailwind CSS theme
├── 📄 postcss.config.js               ← PostCSS (Tailwind processor)
├── 📄 firebase-rules.json             ← Firebase security rules
│
├── 📁 app/                            ← Next.js App Router
│   ├── 📄 layout.tsx                  ← Root layout, metadata
│   ├── 📄 globals.css                 ← Global styles, animations
│   ├── 📄 page.tsx                    ← Main voting page (/)
│   │
│   ├── 📁 api/
│   │   └── 📁 submit-rating/
│   │       └── 📄 route.ts            ← Vote submission endpoint
│   │
│   └── 📁 admin/
│       └── 📄 page.tsx                ← Admin dashboard (/admin)
│
├── 📁 components/                     ← Reusable React components
│   ├── 📄 LeaderCard.tsx              ← Leader profile card
│   └── 📄 RatingSlider.tsx            ← 5-star slider (0.1 increments)
│
├── 📁 lib/                            ← Utility functions
│   ├── 📄 firebase.ts                 ← Firebase operations
│   ├── 📄 fingerprint.ts              ← Device fingerprinting
│   ├── 📄 turnstile.ts                ← Cloudflare Turnstile
│   └── 📄 types.ts                    ← TypeScript interfaces (optional)
│
├── 📁 public/                         ← Static assets
│   ├── 📄 leaders.json                ← Leader data with image URLs
│   └── 📁 images/                     ← Leader photos
│       ├── vp.jpg
│       ├── gs.jpg
│       ├── ags.jpg
│       ├── lwdm-sec.jpg
│       ├── ... (28 total images)
│       └── em-13.jpg
│
├── 📄 README.md                       ← Full setup guide
├── 📄 QUICKSTART.md                   ← 30-minute quick start
├── 📄 DEPLOYMENT_CHECKLIST.md         ← Pre-launch verification
├── 📄 ARCHITECTURE.md                 ← Technical deep-dive
└── 📄 PROJECT_STRUCTURE.md            ← This file

---

## 📋 File Guide

### Configuration Files

| File | Purpose |
|------|---------|
| `.env.local` | Secret keys, Firebase, Turnstile, admin password |
| `.gitignore` | Don't commit .env.local, node_modules |
| `package.json` | npm dependencies & scripts |
| `tsconfig.json` | TypeScript strict mode, path aliases |
| `next.config.js` | Image optimization, API routes |
| `tailwind.config.ts` | Color schemes, animations |
| `postcss.config.js` | Tailwind CSS processing |
| `firebase-rules.json` | Database security rules |

### Application Files

#### Pages & Layouts
| File | Purpose | Route |
|------|---------|-------|
| `app/layout.tsx` | Root layout, metadata | All routes |
| `app/page.tsx` | Main voting interface | `/` |
| `app/admin/page.tsx` | Admin dashboard | `/admin` |
| `app/globals.css` | Global styles, animations | All pages |

#### API Routes
| File | Purpose | Endpoint |
|------|---------|----------|
| `api/submit-rating/route.ts` | Vote submission, fraud check | `POST /api/submit-rating` |

#### Components (Reusable UI)
| File | Purpose | Props |
|------|---------|-------|
| `components/LeaderCard.tsx` | Leader profile display | id, name, position, image, score |
| `components/RatingSlider.tsx` | 5-star slider widget | value, onChange, disabled |

#### Utilities (Business Logic)
| File | Purpose | Functions |
|------|---------|-----------|
| `lib/firebase.ts` | Firebase operations | submitRating, logFraudDetection, getLeaderScores |
| `lib/fingerprint.ts` | Device fingerprinting | getFingerprint, detectIncognitoMode, getUserIpAddress |
| `lib/turnstile.ts` | Turnstile verification | renderTurnstile, verifyTurnstileToken |

### Data Files

| File | Purpose | Format |
|------|---------|--------|
| `public/leaders.json` | Leader metadata & image URLs | JSON array of 28 leaders |
| `public/images/*.jpg` | Leader photographs | JPEG, ~200KB each |

### Documentation

| File | Purpose | Read When |
|------|---------|-----------|
| `README.md` | Complete setup guide | Before starting |
| `QUICKSTART.md` | 30-minute fast setup | Want to launch quickly |
| `DEPLOYMENT_CHECKLIST.md` | Pre-launch verification | Day before voting |
| `ARCHITECTURE.md` | Technical deep-dive | Want to understand design |

---

## 🔧 Development Workflow

### Initial Setup
```bash
# 1. Clone/download project
cd ducsu-eval

# 2. Copy env template
cp .env.local.example .env.local

# 3. Fill .env.local with credentials
# (Firebase, Turnstile, admin password, etc.)

# 4. Install dependencies
npm install

# 5. Start dev server
npm run dev

# 6. Test at http://localhost:3000
```

### Development Commands
```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Build for production
npm start        # Run production build locally
npm run lint     # TypeScript/ESLint check
```

### Adding a New Feature

**Example: Add email notifications**

```
1. Create new file: lib/email.ts
2. Write sendNotificationEmail() function
3. Import in api/submit-rating/route.ts
4. Call after successful vote
5. Test locally
6. Deploy to Vercel
```

### Modifying Styles

**Change colors**:
- Edit `tailwind.config.ts` → colors section
- Or modify Tailwind classes in component files

**Add animations**:
- Add @keyframes in `app/globals.css`
- Use in components: `className="animate-fadeIn"`

---

## 🚀 Deployment Flow

### To Vercel
```bash
# 1. Push to GitHub
git add .
git commit -m "Feature: Add X"
git push origin main

# 2. Vercel auto-deploys on main branch
# (Set up via GitHub integration)

# 3. Configure environment variables
# Vercel Dashboard → Project → Settings → Environment Variables

# 4. Deployment live!
# https://ducsu-eval.vercel.app
```

---

## 📊 Database Schema (Firebase)

```
/submissions (Read-only, anonymous)
├── submission_id_1
│   ├── leader_id: "vp"
│   ├── score: 4.3
│   └── createdAt: 1705276800000
└── submission_id_2
    ├── leader_id: "gs"
    ├── score: 3.7
    └── createdAt: 1705276810000

/fraud_detection (Admin only, TTL: 14 days)
├── fraud_id_1
│   ├── fingerprint_hash: "f3d8a9c2"
│   ├── ip_address: "203.100.50.25"
│   ├── visitor_id: "1705276800000_abc"
│   └── submissionTimestamp: 1705276812000
└── fraud_id_2
    └── ...

/flagged_submissions (Admin review)
├── flag_id_1
│   ├── ip_address: "192.168.1.100"
│   ├── count_from_ip: 9
│   ├── fingerprints: ["hash1", "hash2"]
│   ├── status: "pending"
│   ├── admin_note: ""
│   └── createdAt: 1705276800000
└── flag_id_2
    └── ...
```

---

## 🔐 Environment Variables Reference

| Variable | Type | Example | Required |
|----------|------|---------|----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | String | `AIzaSy...` | ✓ |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | String | `ducsu-eval.firebaseapp.com` | ✓ |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | String | `https://ducsu-eval.firebaseio.com` | ✓ |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | String | `ducsu-eval` | ✓ |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | String | `ducsu-eval.appspot.com` | ✓ |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | String | `1234567890` | ✓ |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | String | `1:123:web:abc...` | ✓ |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | String | `0x4AAA...` | ✓ |
| `TURNSTILE_SECRET_KEY` | String | `0x4AAA...` | ✓ |
| `ADMIN_PASSWORD` | String | `MyStrongPass123!` | ✓ |
| `NEXT_PUBLIC_VOTING_START` | String | `2025-01-15T00:00:00Z` | ✓ |
| `NEXT_PUBLIC_VOTING_END` | String | `2025-01-18T23:59:59Z` | ✓ |
| `NEXT_PUBLIC_LEADERS_JSON_URL` | String | `https://raw.github...` | ✓ |
| `NEXT_PUBLIC_IP_SOFT_CAP` | Number | `8` | ✓ |
| `NEXT_PUBLIC_IP_HARD_REVIEW_CAP` | Number | `12` | ✓ |

---

## 📈 Code Statistics

```
Total Files: 18
├── TypeScript: 8 files (.ts/.tsx)
├── Configuration: 5 files
├── Data: 2 files (JSON)
├── Styles: 1 file (CSS)
└── Documentation: 4 files (Markdown)

Total Lines: ~3,500
├── Application Code: ~1,800
├── Comments: ~300
└── Configuration: ~400
```

---

## 🧪 File Testing Checklist

Before deployment, test each file:

```
✓ .env.local
  - All 14 variables filled
  - No placeholder values
  - No accidental commits to GitHub

✓ app/page.tsx (voting)
  - All 28 leaders load
  - Rating slider works (1-5, 0.1 steps)
  - Turnstile appears
  - Submit works
  - Second vote blocked

✓ app/admin/page.tsx (admin)
  - Login works with password
  - Flagged submissions appear
  - Results update real-time
  - Export CSV works

✓ components/LeaderCard.tsx
  - Images load from GitHub
  - Cards are responsive
  - Selection indicator works

✓ components/RatingSlider.tsx
  - Slider moves smoothly
  - Score updates correctly
  - Color changes by rating

✓ lib/firebase.ts
  - submitRating stores vote
  - fraud_detection logs data
  - getLeaderScores calculates correctly

✓ lib/fingerprint.ts
  - Fingerprint generated
  - Incognito detected
  - IP address fetched
  - localStorage persists

✓ lib/turnstile.ts
  - Turnstile widget renders
  - Token verified on backend
  - Bot check blocks spam

✓ api/submit-rating/route.ts
  - Vote saved to Firebase
  - IP count checked
  - Fraud record created
  - Response has correct status
```

---

## 📞 Where to Find Help

| Issue | File to Check |
|-------|---------------|
| Firebase not connecting | `.env.local` + `lib/firebase.ts` |
| Turnstile not showing | `.env.local` + `lib/turnstile.ts` |
| Images not loading | `public/leaders.json` + `QUICKSTART.md` |
| Votes not saving | `firebase-rules.json` + `api/submit-rating/route.ts` |
| Admin login fails | `.env.local` ADMIN_PASSWORD + `app/admin/page.tsx` |
| Styling issues | `app/globals.css` + `tailwind.config.ts` |
| Incognito not blocked | `lib/fingerprint.ts` `detectIncognitoMode()` |
| IP counting wrong | `lib/firebase.ts` `getSubmissionCountByIp()` |

---

## 🎯 Quick Navigation

**I want to...**
- Setup the project → Read `QUICKSTART.md`
- Understand the design → Read `ARCHITECTURE.md`
- Deploy to production → Read `DEPLOYMENT_CHECKLIST.md`
- Modify a component → Find in `/components`
- Add a feature → Find in `/lib` or create new
- Change styling → Edit `app/globals.css` or component files
- Debug Firebase → Check `lib/firebase.ts` + Firebase console
- Debug bot protection → Check `lib/turnstile.ts` + Cloudflare dashboard

---

**DUCSU 2025 Leadership Evaluation Platform**  
*Structure v1.0 • Ready for Production*
