# 🚀 DUCSU Evaluation Platform - Deployment Checklist

Complete this checklist before launching the voting platform.

---

## ✅ Pre-Deployment Phase (Day Before Voting)

### Firebase Setup
- [ ] Create Firebase project at `firebase.google.com`
- [ ] Enable **Realtime Database** (free tier)
- [ ] Copy all credentials to `.env.local`
- [ ] Deploy database rules from `firebase-rules.json`
- [ ] Test database read/write via Firebase console

### Cloudflare Turnstile
- [ ] Create Cloudflare account
- [ ] Add Turnstile site for your domain
- [ ] Copy **Site Key** and **Secret Key** to `.env.local`
- [ ] Test Turnstile on localhost:3000

### GitHub Setup
- [ ] Create GitHub repo `ducsu-eval`
- [ ] Create `/public/images/` folder
- [ ] Upload all 28 leader photos with correct naming
- [ ] Verify raw GitHub image URLs work
- [ ] Update `leaders.json` with GitHub image URLs
- [ ] Set `NEXT_PUBLIC_LEADERS_JSON_URL` in `.env.local`

### Environment Variables
- [ ] Copy `.env.local.example` to `.env.local`
- [ ] Fill in **all** environment variables
- [ ] Verify no placeholders remain
- [ ] Test with `npm run dev` locally

### Admin Setup
- [ ] Set strong `ADMIN_PASSWORD` (16+ characters)
- [ ] Record password in secure location
- [ ] Test admin login on localhost:3000/admin
- [ ] Verify admin dashboard loads correctly

### Voting Window
- [ ] Set `NEXT_PUBLIC_VOTING_START` (ISO format)
- [ ] Set `NEXT_PUBLIC_VOTING_END` (3 days later)
- [ ] Verify dates/times are correct

### Testing on Localhost
- [ ] `npm install` runs without errors
- [ ] `npm run dev` starts successfully
- [ ] Voting page loads at `http://localhost:3000`
- [ ] Can select a leader and open rating modal
- [ ] Rating slider works (1-5, 0.1 increments)
- [ ] Turnstile widget renders in modal
- [ ] Submit button functional
- [ ] Incognito detection blocks vote
- [ ] Second vote attempt blocked
- [ ] Admin dashboard accessible at `/admin`
- [ ] Can view flagged submissions (if any)

---

## 🚀 Vercel Deployment Phase

### Deploy to Vercel
- [ ] Push latest code to GitHub
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Click **New Project** → Import `ducsu-eval` repo
- [ ] Add **Environment Variables** section:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  - `TURNSTILE_SECRET_KEY`
  - `ADMIN_PASSWORD`
  - `NEXT_PUBLIC_VOTING_START`
  - `NEXT_PUBLIC_VOTING_END`
  - `NEXT_PUBLIC_LEADERS_JSON_URL`
  - `NEXT_PUBLIC_IP_SOFT_CAP`
  - `NEXT_PUBLIC_IP_HARD_REVIEW_CAP`
- [ ] Deploy project
- [ ] Wait for build to complete

### Post-Deployment Testing
- [ ] Visit live site: `https://YOUR_DOMAIN.vercel.app`
- [ ] Test voting flow end-to-end
- [ ] Verify Turnstile loads on live site
- [ ] Test on mobile device
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test from different networks/IPs
- [ ] Admin dashboard accessible at `/admin`

### Update Cloudflare Turnstile
- [ ] Add your Vercel domain to Cloudflare Turnstile
- [ ] Update Turnstile rules if needed (optional)

---

## 📊 Launch Day (Voting Starts)

### 1 Hour Before
- [ ] Monitor Firebase console for any issues
- [ ] Check Vercel deployment logs
- [ ] Test voting from multiple IPs/devices
- [ ] Verify admin dashboard shows 0 votes
- [ ] Ensure incognito detection is working

### During Voting (Monitor)
- [ ] Check Firebase vote count every hour
- [ ] Monitor flagged submissions on admin dashboard
- [ ] Watch for unusual patterns (e.g., same IP 50x)
- [ ] Keep browser open to admin dashboard

### If Issues Occur
- [ ] Check Vercel logs: `Deployments → Recent → Logs`
- [ ] Check Firebase quota usage
- [ ] Verify Turnstile is active
- [ ] Check email for Firebase/Vercel alerts

---

## 📈 During Voting Window

### Daily Tasks
- [ ] Review flagged submissions
- [ ] Approve/reject suspicious entries
- [ ] Monitor total votes vs. expected
- [ ] Check for duplicate IP patterns
- [ ] Monitor fraud_detection data size

### Admin Actions
- [ ] Log in to `/admin` daily
- [ ] Review **Flagged Submissions** tab
- [ ] Approve legitimate dorm IPs
- [ ] Reject coordinated attack attempts
- [ ] View live results on **Results** tab

### Decision Rules for Flagging
| Scenario | Action |
|----------|--------|
| IP has 8-10 votes, different fingerprints | ✅ Approve (likely dorm) |
| IP has 15+ votes, identical fingerprints | ❌ Reject (likely same person) |
| IP has 20+ votes across 3 days | ❌ Investigate, likely attack |
| Votes all within 2 minutes | ❌ Reject (bot behavior) |

---

## 🏁 After Voting Closes

### Results Phase
- [ ] Export results from admin dashboard (CSV)
- [ ] Share aggregated results with DU leadership
- [ ] Do NOT share individual submission details
- [ ] Delete fraud_detection data from Firebase

### Data Cleanup
- [ ] On Firebase Console → Database
- [ ] Delete `fraud_detection` node entirely
- [ ] Optionally delete `flagged_submissions` node
- [ ] Keep `submissions` node (anonymous ratings)

### Post-Mortem
- [ ] Count total votes received
- [ ] Analyze duplicate/fraud rate: `flagged / total`
- [ ] Identify if <10% duplicates achieved ✓
- [ ] Document any technical issues

---

## 🔒 Security Checklist

- [ ] Firebase rules are deployed and tested
- [ ] API keys are secret (not in GitHub)
- [ ] Admin password is strong & changed monthly
- [ ] Incognito mode detection is active
- [ ] IP soft-cap threshold is enforced
- [ ] Turnstile verification is required
- [ ] Fraud data is scheduled for deletion
- [ ] No personally identifiable data is stored

---

## 📞 Emergency Contacts

Keep these ready during voting:

- **Firebase Status**: [firebase.status.io](https://firebase.status.io)
- **Cloudflare Status**: [cloudflarestatus.com](https://cloudflarestatus.com)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)

---

## ✨ Nice-to-Have Extras (After Launch)

- [ ] Set up Slack/Discord notifications for flagged votes
- [ ] Create public results dashboard (anonymized)
- [ ] Send thank-you email to voters (via Firebase)
- [ ] Document lessons learned for next year
- [ ] Archive voting data for historical analysis

---

**All set? Launch the voting! 🚀**

*Mark the completion time below:*

**Deployment Started**: ________________  
**Testing Completed**: ________________  
**Voting Launched**: ________________  
**Voting Ended**: ________________  
**Results Published**: ________________
