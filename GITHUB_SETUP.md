# 🚀 Setting Up This Repository

Follow these steps to set up the DUCSU Evaluation Platform from GitHub.

---

## 📥 Clone This Repository

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/ducsu-eval.git

# Navigate to project
cd ducsu-eval
```

---

## ⚙️ Setup Environment Variables

### 1. Create `.env.local` file

```bash
# Copy the example file
cp .env.local.example .env.local

# Edit .env.local with your values (see below)
nano .env.local  # or open in your favorite editor
```

### 2. Fill in All 14 Variables

Get values from:
- **Firebase**: [console.firebase.google.com](https://console.firebase.google.com) → Project Settings
- **Cloudflare Turnstile**: [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile
- **Admin Password**: Create your own (16+ characters recommended)
- **Voting Dates**: Set your 3-day voting window
- **Leaders JSON URL**: Your GitHub raw content URL

```env
# Firebase (7 variables from Project Settings)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Cloudflare Turnstile (2 variables)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key

# Admin (1 variable)
ADMIN_PASSWORD=YourStrongPassword123!

# Voting Window (2 variables - ISO 8601 format)
NEXT_PUBLIC_VOTING_START=2025-01-15T00:00:00Z
NEXT_PUBLIC_VOTING_END=2025-01-18T23:59:59Z

# Leaders Data (1 variable)
NEXT_PUBLIC_LEADERS_JSON_URL=https://raw.githubusercontent.com/YOUR_USERNAME/ducsu-eval/main/public/leaders.json

# Fraud Prevention (2 variables)
NEXT_PUBLIC_IP_SOFT_CAP=8
NEXT_PUBLIC_IP_HARD_REVIEW_CAP=12
```

---

## 📸 Add Leader Images

### 1. Upload Images to GitHub

Via GitHub web interface:
1. Go to your repository
2. Click **Add file** → **Upload files**
3. Drag 28 leader photos into `public/images/`

**Image naming** (must match exactly):
```
vp.jpg                  ← Vice-President
gs.jpg                  ← General Secretary
ags.jpg                 ← Assistant General Secretary

lwdm-sec.jpg            ← Liberation War & DM Secretary
st-sec.jpg              ← Science & Technology Secretary
crrc-sec.jpg            ← Common Room, Reading Room, Cafeteria Secretary
ia-sec.jpg              ← International Affairs Secretary
lc-sec.jpg              ← Literature & Cultural Secretary
rp-sec.jpg              ← Research & Publications Secretary
sports-sec.jpg          ← Sports Secretary
transport-sec.jpg       ← Student Transport Secretary
sw-sec.jpg              ← Social Welfare Secretary
cd-sec.jpg              ← Career Development Secretary
he-sec.jpg              ← Health & Environment Secretary
hrla-sec.jpg            ← Human Rights & Legal Affairs Secretary

em-1.jpg through em-13.jpg    ← Executive Members 1-13
```

### 2. Update `public/leaders.json`

Edit the file and replace image URLs:
```json
{
  "imageUrl": "https://raw.githubusercontent.com/YOUR_USERNAME/ducsu-eval/main/public/images/vp.jpg"
}
```

---

## 🔧 Install Dependencies

```bash
npm install
```

This installs:
- Next.js 14
- React 18
- Firebase SDK
- FingerprintJS
- Tailwind CSS
- And more...

---

## 🚀 Run Locally

```bash
npm run dev
```

Visit: `http://localhost:3000`

Test:
- ✅ Can see all 28 leaders
- ✅ Can rate a leader (1-5, 0.1 steps)
- ✅ Turnstile widget appears
- ✅ Submit button works
- ✅ Second vote blocked
- ✅ Admin login at `/admin`

---

## 🔐 Deploy Firebase Security Rules

**Important**: Without this, anyone can modify the database!

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Realtime Database** → **Rules**
4. Copy content from `firebase-rules.json` in this repo
5. Paste into Firebase Rules editor
6. **Publish**

---

## 📤 Deploy to Vercel

### Option 1: Auto-Deploy (Recommended)

```bash
# Push to GitHub
git push origin main

# Vercel auto-deploys on push
# Watch deployment at: https://vercel.com/dashboard
```

### Option 2: Manual Deploy

1. Go to [vercel.com](https://vercel.com)
2. Click **New Project**
3. Import this GitHub repository
4. Add environment variables (copy from `.env.local`)
5. Click **Deploy**

---

## ✅ Verify Deployment

After deploying to Vercel:

```bash
# Your live site will be at:
https://ducsu-eval-XXXXX.vercel.app

# Admin dashboard:
https://ducsu-eval-XXXXX.vercel.app/admin
(Login with password from ADMIN_PASSWORD)
```

**Test from different devices/IPs** to verify fraud prevention.

---

## 📝 Environment Variables for Vercel

When deploying to Vercel, add all 14 variables from `.env.local`:

```
Vercel Dashboard
→ Project Settings
→ Environment Variables
→ Add all 14 variables
→ Redeploy
```

---

## 🧪 Pre-Launch Checklist

Before voting starts:

- [ ] `.env.local` filled with all credentials
- [ ] Leader images uploaded to `public/images/`
- [ ] `public/leaders.json` updated with correct image URLs
- [ ] Firebase security rules deployed
- [ ] Local testing passed (`npm run dev`)
- [ ] Vercel deployment successful
- [ ] Admin login works at `/admin`
- [ ] Turnstile widget appears in voting modal
- [ ] Incognito mode blocks voting
- [ ] Second vote attempt is blocked

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `README.md` | Full setup guide |
| `QUICKSTART.md` | 30-minute fast launch |
| `ARCHITECTURE.md` | Technical deep-dive |
| `DEPLOYMENT_CHECKLIST.md` | Pre-launch verification |
| `PROJECT_STRUCTURE.md` | File organization guide |

---

## 🆘 Troubleshooting

### "Firebase not initialized"
- Check all 7 Firebase variables in `.env.local`
- Verify they match Firebase console exactly
- Run `npm run dev` again

### "Turnstile widget not showing"
- Verify `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is correct
- Check Cloudflare domain matches your Vercel domain
- Open browser console for errors

### "Images not loading"
- Verify images are in `public/images/`
- Check file names match exactly (case-sensitive)
- Verify `NEXT_PUBLIC_LEADERS_JSON_URL` is correct
- Test raw GitHub URL in browser

### "Admin login fails"
- Password is case-sensitive
- Check `ADMIN_PASSWORD` in `.env.local`
- Clear browser cache/localStorage

### "Votes not saving"
- Check Firebase Database Rules were deployed (from `firebase-rules.json`)
- Verify `NEXT_PUBLIC_FIREBASE_DATABASE_URL` is correct
- Check Firebase quota (free tier: 1GB storage)

---

## 🔒 Security

⚠️ **Important**:
- Never commit `.env.local` to GitHub (use `.gitignore`)
- Never share `TURNSTILE_SECRET_KEY` publicly
- Use strong `ADMIN_PASSWORD` (16+ chars, mixed case/numbers)
- Deploy Firebase rules before voting starts

---

## 📞 Support

Need help? Check:
1. **QUICKSTART.md** (30-minute setup)
2. **ARCHITECTURE.md** (understand design)
3. **README.md** (complete details)
4. Firebase Console logs
5. Vercel Deployment logs

---

**Ready to go live? Follow DEPLOYMENT_CHECKLIST.md** ✅

Good luck with DUCSU 2025 evaluation! 🎓
