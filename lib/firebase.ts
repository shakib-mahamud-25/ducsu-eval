import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import {
  getDatabase,
  ref,
  set,
  update,
  remove,
  push,
  query,
  orderByChild,
  equalTo,
  get,
  onValue,
  Unsubscribe
} from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Exported so lib/auth.ts can attach Firebase Auth to the same app instance.
export const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

// ============================================
// ANALYTICS (browser-only, guarded)
// ============================================

let analytics: Analytics | null = null;

export const getAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (typeof window === 'undefined') return null;
  if (analytics) return analytics;
  if (!(await isSupported())) return null;
  analytics = getAnalytics(app);
  return analytics;
};

// ============================================
// VOTE TRACK TYPE
// ============================================
// "unverified" = the original fingerprint/IP/Turnstile flow (includes all
// pre-existing data via the one-time migration script).
// "verified" = DU email magic-link authenticated flow.

export type VoteTrack = 'verified' | 'unverified';

// ============================================
// SUBMISSION OPERATIONS
// ============================================

export interface Submission {
  id?: string;
  leader_id: string;
  score: number;
  createdAt: number;
  track: VoteTrack;
}

export const submitRating = async (
  leaderId: string,
  score: number,
  track: VoteTrack
): Promise<string> => {
  const submissionsRef = ref(database, 'submissions');
  const newRef = push(submissionsRef);

  const submission: Submission = {
    leader_id: leaderId,
    score: parseFloat(score.toFixed(1)),
    createdAt: Date.now(),
    track,
  };

  await set(newRef, submission);
  return newRef.key || '';
};

// Writes every rating from a completed evaluation session in a single
// multi-path update, so the whole batch either lands together or not at all.
export const batchSubmitRatings = async (
  ratings: { leaderId: string; score: number }[],
  track: VoteTrack
): Promise<string[]> => {
  const submissionsRef = ref(database, 'submissions');
  const createdAt = Date.now();
  const updates: Record<string, Submission> = {};
  const ids: string[] = [];

  for (const { leaderId, score } of ratings) {
    const newRef = push(submissionsRef);
    const key = newRef.key || '';
    ids.push(key);
    updates[key] = {
      leader_id: leaderId,
      score: parseFloat(score.toFixed(1)),
      createdAt,
      track,
    };
  }

  await update(submissionsRef, updates);
  return ids;
};

// ============================================
// FRAUD DETECTION OPERATIONS (unverified track only)
// ============================================

export interface FraudRecord {
  id?: string;
  fingerprint_hash: string;
  ip_address: string;
  visitor_id: string;
  submissionTimestamp: number;
}

export const logFraudDetection = async (
  fingerprintHash: string,
  ipAddress: string,
  visitorId: string
): Promise<string> => {
  const fraudRef = ref(database, 'fraud_detection');
  const newRef = push(fraudRef);

  const fraudRecord: FraudRecord = {
    fingerprint_hash: fingerprintHash,
    ip_address: ipAddress,
    visitor_id: visitorId,
    submissionTimestamp: Date.now(),
  };

  await set(newRef, fraudRecord);
  return newRef.key || '';
};

export const getSubmissionCountByIp = async (ipAddress: string): Promise<number> => {
  const fraudRef = ref(database, 'fraud_detection');
  const q = query(fraudRef, orderByChild('ip_address'), equalTo(ipAddress));

  const snapshot = await get(q);
  if (!snapshot.exists()) return 0;

  const uniqueFingerprints = new Set<string>();
  snapshot.forEach((child) => {
    const record = child.val();
    if (record?.fingerprint_hash) {
      uniqueFingerprints.add(record.fingerprint_hash);
    }
  });

  return uniqueFingerprints.size;
};

// ============================================
// FLAGGED SUBMISSIONS OPERATIONS (unverified track only)
// ============================================

export interface FlaggedSubmission {
  id?: string;
  ip_address: string;
  count_from_ip: number;
  fingerprints: string[];
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string;
  createdAt: number;
}

export const flagSuspiciousIp = async (
  ipAddress: string,
  countFromIp: number,
  fingerprints: string[]
): Promise<string> => {
  const flaggedRef = ref(database, 'flagged_submissions');
  const newRef = push(flaggedRef);

  const flaggedSubmission: FlaggedSubmission = {
    ip_address: ipAddress,
    count_from_ip: countFromIp,
    fingerprints: fingerprints,
    status: 'pending',
    admin_note: '',
    createdAt: Date.now(),
  };

  await set(newRef, flaggedSubmission);
  return newRef.key || '';
};

export const getFlaggedSubmissions = async (): Promise<Map<string, FlaggedSubmission>> => {
  const flaggedRef = ref(database, 'flagged_submissions');
  const snapshot = await get(flaggedRef);

  const result = new Map<string, FlaggedSubmission>();
  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot) => {
      result.set(childSnapshot.key!, childSnapshot.val());
    });
  }
  return result;
};

// ============================================
// VERIFIED EMAIL DEDUP (one verified submission per DU email, ever)
// ============================================
// Only the SHA-256 hash of the email is stored — never the raw address —
// and it is never linked to the scores that email holder submitted.

export const hasEmailAlreadyVoted = async (emailHash: string): Promise<boolean> => {
  const entryRef = ref(database, `voted_emails/${emailHash}`);
  const snapshot = await get(entryRef);
  return snapshot.exists();
};

export const markEmailAsVoted = async (emailHash: string): Promise<void> => {
  const entryRef = ref(database, `voted_emails/${emailHash}`);
  await set(entryRef, { submittedAt: Date.now() });
};

// ============================================
// VOTING WINDOW CONFIG
// ============================================

export interface VotingWindowConfig {
  isOpen: boolean;
  startTime: number | null;
  endTime: number | null;
}

const DEFAULT_VOTING_WINDOW: VotingWindowConfig = {
  isOpen: true,
  startTime: null,
  endTime: null,
};

export const getVotingWindowConfig = async (): Promise<VotingWindowConfig> => {
  const configRef = ref(database, 'config/voting_window');
  const snapshot = await get(configRef);
  if (!snapshot.exists()) return DEFAULT_VOTING_WINDOW;
  return { ...DEFAULT_VOTING_WINDOW, ...snapshot.val() };
};

export const listenToVotingWindow = (
  callback: (config: VotingWindowConfig) => void
): Unsubscribe => {
  const configRef = ref(database, 'config/voting_window');
  return onValue(configRef, (snapshot) => {
    callback(snapshot.exists() ? { ...DEFAULT_VOTING_WINDOW, ...snapshot.val() } : DEFAULT_VOTING_WINDOW);
  });
};

export const setVotingWindowConfig = async (config: VotingWindowConfig): Promise<void> => {
  const configRef = ref(database, 'config/voting_window');
  await set(configRef, config);
};

// ============================================
// TRACKS CONFIG (admin on/off switch for the unverified/"quick vote" track)
// ============================================
// Lets an admin disable quick (unverified) voting at runtime without a
// redeploy, e.g. once verified turnout looks healthy. The verified
// (DU email) track can never be disabled from here — only unverified.

export interface TracksConfig {
  unverifiedEnabled: boolean;
}

const DEFAULT_TRACKS_CONFIG: TracksConfig = {
  unverifiedEnabled: true,
};

export const getTracksConfig = async (): Promise<TracksConfig> => {
  const configRef = ref(database, 'config/tracks');
  const snapshot = await get(configRef);
  if (!snapshot.exists()) return DEFAULT_TRACKS_CONFIG;
  return { ...DEFAULT_TRACKS_CONFIG, ...snapshot.val() };
};

export const listenToTracksConfig = (
  callback: (config: TracksConfig) => void
): Unsubscribe => {
  const configRef = ref(database, 'config/tracks');
  return onValue(configRef, (snapshot) => {
    callback(snapshot.exists() ? { ...DEFAULT_TRACKS_CONFIG, ...snapshot.val() } : DEFAULT_TRACKS_CONFIG);
  });
};

export const setTracksConfig = async (config: TracksConfig): Promise<void> => {
  const configRef = ref(database, 'config/tracks');
  await set(configRef, config);
};

// ============================================
// FLAGGED SUBMISSION DELETION (admin fraud review, unverified track only)
// ============================================

export const deleteFlaggedEntry = async (flagId: string, ipAddress: string): Promise<void> => {
  await remove(ref(database, `flagged_submissions/${flagId}`));

  const fraudRef = ref(database, 'fraud_detection');
  const q = query(fraudRef, orderByChild('ip_address'), equalTo(ipAddress));
  const snapshot = await get(q);

  if (snapshot.exists()) {
    const deletions: Record<string, null> = {};
    snapshot.forEach((child) => {
      deletions[child.key!] = null;
    });
    await update(fraudRef, deletions);
  }
};

export const deleteMultipleFlaggedEntries = async (
  entries: { flagId: string; ipAddress: string }[]
): Promise<void> => {
  for (const entry of entries) {
    await deleteFlaggedEntry(entry.flagId, entry.ipAddress);
  }
};

// ============================================
// RESULTS / ANALYTICS OPERATIONS — split by track
// ============================================

export interface LeaderScore {
  leaderId: string;
  totalVotes: number;
  averageScore: number;
  scoreDistribution: {
    [key: string]: number;
  };
}

// One entry per leader, holding BOTH tracks side by side. This is what
// components consume — no need to juggle two separate Maps in the UI layer.
export interface DualTrackLeaderScore {
  leaderId: string;
  unverified: LeaderScore;
  verified: LeaderScore;
}

const emptyLeaderScore = (leaderId: string): LeaderScore => ({
  leaderId,
  totalVotes: 0,
  averageScore: 0,
  scoreDistribution: {},
});

const accumulate = (
  scoresByLeader: Map<string, DualTrackLeaderScore>,
  submission: Submission
) => {
  const leaderId = submission.leader_id;
  const track: VoteTrack = submission.track === 'verified' ? 'verified' : 'unverified';

  if (!scoresByLeader.has(leaderId)) {
    scoresByLeader.set(leaderId, {
      leaderId,
      unverified: emptyLeaderScore(leaderId),
      verified: emptyLeaderScore(leaderId),
    });
  }

  const entry = scoresByLeader.get(leaderId)!;
  const bucket = entry[track];
  bucket.totalVotes += 1;

  const scoreKey = submission.score.toFixed(1);
  bucket.scoreDistribution[scoreKey] = (bucket.scoreDistribution[scoreKey] || 0) + 1;
};

const finalizeAverages = (scoresByLeader: Map<string, DualTrackLeaderScore>) => {
  scoresByLeader.forEach((entry) => {
    (['unverified', 'verified'] as const).forEach((track) => {
      const bucket = entry[track];
      let total = 0;
      Object.entries(bucket.scoreDistribution).forEach(([score, count]) => {
        total += parseFloat(score) * count;
      });
      bucket.averageScore = bucket.totalVotes > 0 ? total / bucket.totalVotes : 0;
    });
  });
};

export const getLeaderScores = async (): Promise<Map<string, DualTrackLeaderScore>> => {
  const submissionsRef = ref(database, 'submissions');
  const snapshot = await get(submissionsRef);

  const scoresByLeader = new Map<string, DualTrackLeaderScore>();

  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot) => {
      accumulate(scoresByLeader, childSnapshot.val() as Submission);
    });
    finalizeAverages(scoresByLeader);
  }

  return scoresByLeader;
};

// Real-time listener for live results, split by track
export const listenToScores = (
  callback: (scores: Map<string, DualTrackLeaderScore>) => void
): Unsubscribe => {
  const submissionsRef = ref(database, 'submissions');

  return onValue(submissionsRef, (snapshot) => {
    const scoresByLeader = new Map<string, DualTrackLeaderScore>();

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        accumulate(scoresByLeader, childSnapshot.val() as Submission);
      });
      finalizeAverages(scoresByLeader);
    }

    callback(scoresByLeader);
  });
};
