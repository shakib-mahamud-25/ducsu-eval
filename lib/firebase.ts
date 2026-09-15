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

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

// ============================================
// ANALYTICS (browser-only, guarded)
// ============================================
// Analytics reads from window/IndexedDB and breaks during Next.js's
// server-side render, so it can only initialize once we're actually
// running in a browser. isSupported() also guards against browsers that
// block the storage Analytics needs (e.g. some private-browsing modes).

let analytics: Analytics | null = null;

export const getAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (typeof window === 'undefined') return null;
  if (analytics) return analytics;
  if (!(await isSupported())) return null;
  analytics = getAnalytics(app);
  return analytics;
};

// ============================================
// SUBMISSION OPERATIONS
// ============================================

export interface Submission {
  id?: string;
  leader_id: string;
  score: number;
  createdAt: number;
}

export const submitRating = async (
  leaderId: string,
  score: number
): Promise<string> => {
  const submissionsRef = ref(database, 'submissions');
  const newRef = push(submissionsRef);

  const submission: Submission = {
    leader_id: leaderId,
    score: parseFloat(score.toFixed(1)),
    createdAt: Date.now(),
  };

  await set(newRef, submission);
  return newRef.key || '';
};

// Writes every rating from a completed evaluation session in a single
// multi-path update, so the whole batch either lands together or not at all.
// Returns the generated submission IDs in the same order as the input.
export const batchSubmitRatings = async (
  ratings: { leaderId: string; score: number }[]
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
    };
  }

  await update(submissionsRef, updates);
  return ids;
};

// ============================================
// FRAUD DETECTION OPERATIONS
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

  // Count DISTINCT devices (fingerprints) from this IP, not raw submission count.
  // One legitimate voter can submit up to 28 times (once per leader), so counting
  // raw submissions would falsely flag a single real person as many "voters".
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
// FLAGGED SUBMISSIONS OPERATIONS
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
// VOTING WINDOW CONFIG (admin-editable, replaces env vars)
// ============================================

export interface VotingWindowConfig {
  isOpen: boolean;
  startTime: number | null; // epoch ms, optional informational display
  endTime: number | null; // epoch ms, optional informational display
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
// FLAGGED SUBMISSION DELETION (admin fraud review)
// ============================================
// Scoped deliberately to flagged/suspicious IPs only — this is not a
// general-purpose "browse every voter" capability. It deletes the
// fraud_detection records tied to a flagged IP plus the flag entry itself.
// It does not delete the anonymous rating submissions those records may be
// associated with, since submissions are not linked back to any device.

export const deleteFlaggedEntry = async (flagId: string, ipAddress: string): Promise<void> => {
  // Remove the flag record
  await remove(ref(database, `flagged_submissions/${flagId}`));

  // Remove matching fraud_detection records for that IP
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
// RESULTS / ANALYTICS OPERATIONS
// ============================================

export interface LeaderScore {
  leaderId: string;
  totalVotes: number;
  averageScore: number;
  scoreDistribution: {
    [key: string]: number; // "1.0": 5, "1.1": 3, etc.
  };
}

export const getLeaderScores = async (): Promise<Map<string, LeaderScore>> => {
  const submissionsRef = ref(database, 'submissions');
  const snapshot = await get(submissionsRef);

  const scoresByLeader = new Map<string, LeaderScore>();

  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot) => {
      const submission = childSnapshot.val() as Submission;
      const leaderId = submission.leader_id;
      const score = submission.score;

      if (!scoresByLeader.has(leaderId)) {
        scoresByLeader.set(leaderId, {
          leaderId,
          totalVotes: 0,
          averageScore: 0,
          scoreDistribution: {},
        });
      }

      const leaderData = scoresByLeader.get(leaderId)!;
      leaderData.totalVotes += 1;

      const scoreKey = score.toFixed(1);
      leaderData.scoreDistribution[scoreKey] =
        (leaderData.scoreDistribution[scoreKey] || 0) + 1;
    });

    // Calculate averages
    scoresByLeader.forEach((leaderData) => {
      let totalScore = 0;
      Object.entries(leaderData.scoreDistribution).forEach(([score, count]) => {
        totalScore += parseFloat(score) * count;
      });
      leaderData.averageScore = leaderData.totalVotes > 0
        ? totalScore / leaderData.totalVotes
        : 0;
    });
  }

  return scoresByLeader;
};

// Real-time listener for live results
export const listenToScores = (
  callback: (scores: Map<string, LeaderScore>) => void
): Unsubscribe => {
  const submissionsRef = ref(database, 'submissions');

  return onValue(submissionsRef, async (snapshot) => {
    const scoresByLeader = new Map<string, LeaderScore>();

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const submission = childSnapshot.val() as Submission;
        const leaderId = submission.leader_id;
        const score = submission.score;

        if (!scoresByLeader.has(leaderId)) {
          scoresByLeader.set(leaderId, {
            leaderId,
            totalVotes: 0,
            averageScore: 0,
            scoreDistribution: {},
          });
        }

        const leaderData = scoresByLeader.get(leaderId)!;
        leaderData.totalVotes += 1;

        const scoreKey = score.toFixed(1);
        leaderData.scoreDistribution[scoreKey] =
          (leaderData.scoreDistribution[scoreKey] || 0) + 1;
      });

      // Calculate averages
      scoresByLeader.forEach((leaderData) => {
        let totalScore = 0;
        Object.entries(leaderData.scoreDistribution).forEach(([score, count]) => {
          totalScore += parseFloat(score) * count;
        });
        leaderData.averageScore = leaderData.totalVotes > 0
          ? totalScore / leaderData.totalVotes
          : 0;
      });
    }

    callback(scoresByLeader);
  });
};
