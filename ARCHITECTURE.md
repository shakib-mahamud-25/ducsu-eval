# DUCSU Evaluation Platform - Technical Architecture

A comprehensive breakdown of the system design, data flow, and fraud prevention mechanisms.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DUCSU Evaluation Platform                 │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   USER INTERFACE     │
├──────────────────────┤
│ • Voting Page        │  ← 28 Leader Cards
│ • Rating Modal       │  ← 5-star Slider
│ • Results Dashboard  │  ← Real-time Stats
│ • Admin Dashboard    │  ← Fraud Review
└──────────┬───────────┘
           │
           ↓
┌──────────────────────────────────────────────────────────────┐
│              CLIENT-SIDE FRAUD DETECTION                     │
├──────────────────────────────────────────────────────────────┤
│ 1. Browser Fingerprint (FingerprintJS)                       │
│ 2. Incognito Mode Detection (IndexedDB quota)                │
│ 3. IP Address Detection (ipify API)                          │
│ 4. localStorage Voting Status                                │
│ 5. Cloudflare Turnstile Bot Check                            │
└──────────┬───────────────────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────────────────────────┐
│                 NEXT.JS API GATEWAY                          │
├──────────────────────────────────────────────────────────────┤
│ /api/submit-rating                                           │
│ • Verify Turnstile token                                     │
│ • Log fraud detection record                                 │
│ • Check IP submission count                                  │
│ • Enforce soft/hard caps                                     │
│ • Submit anonymous rating                                    │
│ • Flag suspicious IPs                                        │
└──────────┬───────────────────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────────────────────────┐
│                   FIREBASE REALTIME DB                       │
├──────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ submissions/ (persistent)                               │  │
│ │ • leader_id, score (1-5), createdAt                    │  │
│ │ • Decoupled from device data (anonymous)                │  │
│ └─────────────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ fraud_detection/ (TTL: 14 days, auto-delete)            │  │
│ │ • fingerprint_hash, ip_address, visitor_id              │  │
│ │ • Never directly linked to ratings                       │  │
│ └─────────────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ flagged_submissions/ (manual review)                     │  │
│ │ • ip_address, count_from_ip, fingerprints               │  │
│ │ • status: pending/approved/rejected                      │  │
│ └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                EXTERNAL SERVICES                             │
├─────────────────────────────────────────────────────────────┤
│ • GitHub: Raw images via CDN                                 │
│ • Cloudflare: Turnstile bot verification                     │
│ • Vercel: Next.js hosting & serverless functions             │
│ • ipify: Anonymous IP detection                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

### Voting Submission Flow

```
User selects leader
        ↓
Opens rating modal
        ↓
Selects score (1-5)
        ↓
Completes Turnstile
        ↓
Client generates fingerprint
        ↓
Gets IP address
        ↓
Gets visitor ID from localStorage
        ↓
POST /api/submit-rating
        ↓
        ├─ Verify Turnstile token
        │  └─ If fails → return 403
        ├─ Extract IP from request headers
        ├─ Query fraud_detection DB for IP count
        │  ├─ If ≥ 12 → return 429 (blocked)
        │  └─ If 8-12 → flag for admin review
        ├─ Log to fraud_detection/
        │  ├─ IP address
        │  ├─ fingerprint hash
        │  └─ visitor ID
        ├─ Write to submissions/
        │  ├─ leader_id
        │  ├─ score
        │  └─ createdAt
        └─ Return success
        ↓
Client marks as voted in localStorage
        ↓
Display success modal
```

### Results Display Flow

```
Admin opens /admin
        ↓
Authenticates with password
        ↓
Clicks "Flagged Submissions" tab
        ↓
Reads from flagged_submissions/ DB
        ↓
Displays IP addresses with >8 votes
        ↓
Can approve/reject each IP
        ↓
Clicks "Results" tab
        ↓
Real-time listener on submissions/ DB
        ↓
Aggregates by leader_id
        ↓
Calculates average score
        ↓
Displays live distribution charts
```

---

## 🔐 Privacy Architecture

### Data Decoupling Strategy

```
SUBMISSIONS TABLE (Public Analysis)
┌──────────────────────┬───────┬──────────────┐
│ submission_id        │ score │ leader_id    │
├──────────────────────┼───────┼──────────────┤
│ sub_abc123           │ 4.2   │ vp           │
│ sub_def456           │ 3.5   │ gs           │
│ sub_ghi789           │ 4.8   │ ags          │
└──────────────────────┴───────┴──────────────┘
[No IP, No timestamp, No device info]

FRAUD_DETECTION TABLE (Admin Only)
┌──────────────┬──────────────────┬──────────────┐
│ fraud_id     │ ip_address       │ fp_hash      │
├──────────────┼──────────────────┼──────────────┤
│ fraud_xyz    │ 192.168.1.100    │ hash_abc123  │
│ fraud_uvw    │ 203.100.50.25    │ hash_def456  │
└──────────────┴──────────────────┴──────────────┘
[No score, No leader_id, No rating data]

RESULT: No single query can correlate
IP → Rating, Device → Rating, etc.
```

### What We Never Store

❌ Student names, IDs, emails  
❌ Phone numbers  
❌ Login credentials  
❌ Browsing history  
❌ Raw canvas fingerprint (only hash)  
❌ Exact submission timestamps  

### K-Anonymity

- Individual submissions never exposed
- Only aggregate statistics displayed
- Results shown as average + distribution
- No "first vote was at 12:34 PM" metadata

---

## 🛡️ Fraud Prevention Layers

### Layer 1: Bot Detection (Turnstile)

```
User submits vote
        ↓
Turnstile widget analyzes:
• Mouse movement patterns
• Click timing
• Device behavior
• Request headers
        ↓
If human-like: token issued
If bot-like: challenge required
```

**Blocks**: Automated scripts, headless browsers

---

### Layer 2: Browser Fingerprinting

```
First visit:
  FingerprintJS generates browser signature:
  • Canvas hash
  • WebGL context
  • Font list
  • Screen resolution
  • User agent
  ↓
  Create visitor_id in localStorage
  ↓
  Hash fingerprint for storage

Subsequent visits:
  Compare fingerprint
  ↓
  If changed → Different browser/device
  If same → Likely same person
```

**Blocks**: Same browser voting multiple times

---

### Layer 3: IP Soft-Capping

```
Count submissions from IP:
  < 8:     Allow (no flag)
  8-12:    Allow + Flag for admin review
  > 12:    Block outright (429)

Admin reviews flagged IPs:
  Large dorm (15 people, 10 votes) → Approve
  Same device voting 50x → Reject
  Legitimate distributed votes → Approve
```

**Prevents**: Coordinated attacks, vote stuffing

---

### Layer 4: Incognito Detection

```
User opens in private/incognito:
        ↓
Client detects via:
• localStorage write test
• IndexedDB quota check
• sessionStorage limits
        ↓
If incognito detected:
  → Show warning
  → Block voting
  → Suggest normal mode
```

**Rationale**: Incognito is often used for abuse; legitimate voters use normal mode

---

### Layer 5: Device Storage Persistence

```
localStorage['ducsu_has_voted'] = true
localStorage['ducsu_submission_time'] = timestamp
        ↓
On page reload:
  If ducsu_has_voted === true
    → Show "You already voted"
    → Disable voting
        ↓
Clear history clears this, but:
  • Fingerprint still identifies device
  • IP address logged in fraud_detection
  • Turnstile token required again
```

**Blocks**: Naive duplicate voting

---

## 📈 Soft-Cap + Flagging System

### Why Soft-Cap Instead of Hard-Cap?

**Hard-cap problem**: 
```
Dorm with 15 students on 1 IP
Can only vote if <8 registered
→ 7 students disenfranchised
→ Political backlash
```

**Soft-cap solution**:
```
Allow up to 10 submissions per IP
Admin manually reviews after voting
Separates:
  ✓ Legitimate dorm traffic (approve)
  ✗ Coordinated attacks (reject)
```

### Admin Review Decision Tree

```
IP has N submissions, M unique fingerprints

If N ≤ 8:
  → Auto-approved, not flagged

If 8 < N ≤ 12:
  If M = N (different fingerprints):
    → Likely different devices in dorm
    → Approve
  If M < N and M > 1 (mixed):
    → Could be shared dorm device
    → Review manually
  If M = 1 (same fingerprint):
    → Same person, different attempts
    → Reject

If N > 12:
  → Immediate rejection (hard block)
```

---

## 🗄️ Database Schema

### submissions
```javascript
{
  "sub_abc123def456": {
    "leader_id": "vp",
    "score": 4.3,
    "createdAt": 1705276800000
    // TTL: Keep forever (anonymous)
  }
}
```

**Indexes needed**:
- `leader_id` (for aggregation)

**Size estimate**: 1KB per vote × 5000 votes = 5MB

---

### fraud_detection
```javascript
{
  "fraud_xyz789abc": {
    "fingerprint_hash": "f3d8a9c2e5b1",
    "ip_address": "203.100.50.25",
    "visitor_id": "1705276800000_abc123",
    "submissionTimestamp": 1705276812000
    // TTL: 14 days (auto-delete)
  }
}
```

**Indexes needed**:
- `ip_address` (for IP counting)

**Size estimate**: 200 bytes per record × 5000 votes = 1MB (deletes after 14 days)

---

### flagged_submissions
```javascript
{
  "flag_123456": {
    "ip_address": "192.168.1.100",
    "count_from_ip": 9,
    "fingerprints": ["hash1", "hash2", "hash3"],
    "status": "pending", // pending | approved | rejected
    "admin_note": "Dorm room with 8 students",
    "createdAt": 1705276800000
  }
}
```

**Manual cleanup**: Delete after admin review

---

## 🔄 Real-time Updates

### Live Results Listener

```javascript
onValue(database.ref('submissions'), (snapshot) => {
  // Recalculate aggregates
  submissions.forEach(sub => {
    totals[sub.leader_id].count += 1
    totals[sub.leader_id].sum += sub.score
    totals[sub.leader_id].avg = sum / count
  })
  
  // Update UI in real-time
  displayResults(totals)
})

// Runs every time a submission is added
// Result: Live-updating dashboard
```

**Concurrency**: Firebase handles 100 simultaneous connections (free tier)

---

## 📱 Client-Side Architecture

### Key Components

| Component | Purpose | State |
|-----------|---------|-------|
| `RatingSlider` | 5-star slider, 0.1 increments | Local |
| `LeaderCard` | Display leader + score | Props |
| `VotingModal` | Rating + submission UI | Local |
| `AdminDashboard` | Flagged reviews + results | Firebase listener |

### State Management

**No Redux/Context API needed because**:
- Voting is one-time event
- Results are read-only (admin)
- Firebase handles real-time sync
- Component-level state is sufficient

---

## 🚀 Deployment Topology

```
┌─────────────────────────────────────────────────┐
│              VERCEL (Hosting)                   │
├─────────────────────────────────────────────────┤
│ • Next.js App (Web + API routes)                │
│ • 100GB bandwidth/month free                    │
│ • Automatic HTTPS                              │
│ • Edge functions available (not needed here)   │
└──────────┬──────────────────────────────────────┘
           │
           ├─→ Firebase (Database)
           │   • Real-time DB free tier
           │   • 1GB storage
           │   • 100 concurrent connections
           │
           ├─→ Cloudflare (Bot Check)
           │   • Turnstile free: 1M/month
           │   • No signup required from users
           │
           ├─→ GitHub (Image CDN)
           │   • Raw content unlimited
           │   • Auto-cached by browsers
           │
           └─→ ipify (IP Detection)
               • Free tier: 1000/day
               • Used for fraud detection
```

---

## 🧪 Testing Strategy

### Unit Tests (Not included, but recommended)

```typescript
// Test fingerprinting
test('same browser returns same fingerprint', async () => {
  const fp1 = await getFingerprint()
  const fp2 = await getFingerprint()
  expect(fp1).toBe(fp2)
})

// Test incognito detection
test('incognito mode is detected', async () => {
  const isIncognito = await detectIncognitoMode()
  expect(isIncognito).toBe(true)
})
```

### Integration Tests (Manual)

```
Device 1 (Chrome): Vote for VP (score 3.5) ✓
Device 1 (Chrome): Try again → Blocked ✓
Device 1 (Firefox): Try again → Blocked (different browser, same IP)
Device 2 (Safari, different IP): Vote for GS ✓
IP with 10 votes: Flag appears in admin ✓
Admin reviews & approves: Vote counts toward result ✓
```

---

## 📊 Expected Performance

### Concurrent Users

```
Free tier limits:
• Firebase: 100 concurrent connections
• Vercel: 1000 concurrent
• Turnstile: 1M requests/month

Expected capacity:
• 100 simultaneous voters
• 500 votes/hour (reasonable for 3-day window)
```

### Data Size

```
5000 total votes:
• submissions: 5MB
• fraud_detection: 1MB (auto-deletes)
• flagged: 100KB (manual)
• Total: ~6MB ✓ (within 1GB free quota)
```

### Response Times

```
Vote submission: 200-500ms
• Turnstile verification: 100ms
• IP lookup: 50ms
• DB write: 100ms
• Response: 50ms

Results aggregation: 100-200ms
• Read all submissions: 50ms
• Calculate averages: 50ms
• UI update: 100ms
```

---

## 🔒 Security Assumptions

1. **Turnstile is not bypassable**: Cloudflare's bot detection is mature
2. **FingerprintJS is accurate**: Browser fingerprinting is hard to spoof
3. **Firebase rules are enforced**: Only API can write data
4. **Admin password is strong**: 16+ characters, mixed case/numbers
5. **HTTPS is mandatory**: Vercel enforces TLS

### Known Limitations

⚠️ **VPN/Proxy users**: Can spoof IP, but fingerprint still identifies
⚠️ **Technical users**: Can switch browsers, clear storage, use incognito
⚠️ **Shared WiFi**: Large dorm might exceed soft cap legitimately
⚠️ **Mobile hotspot overlap**: Two students on same hotspot might be flagged

---

## 📈 Future Enhancements

1. **Email verification** (opt-in): Require @du.ac.bd email for submission
2. **Multi-round voting**: Phase votes (e.g., Vote for 3 leaders each day)
3. **Public leaderboard**: Show results in real-time with anonymization
4. **Detailed analytics**: Breakdown by department, year, etc.
5. **AI moderation**: Detect bot patterns automatically
6. **Two-factor fraud detection**: SMS/email code + voting together

---

## 📞 Questions?

Check `README.md` for setup or `QUICKSTART.md` for fast deployment.

---

**DUCSU 2025 Leadership Evaluation Platform**  
*Architecture v1.0 • September 2026*
