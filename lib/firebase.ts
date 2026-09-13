import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  set, 
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
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

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
  return snapshot.size || 0;
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
