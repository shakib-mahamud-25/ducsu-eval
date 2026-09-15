import * as FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise: Promise<FingerprintJS.Agent> | null = null;

// Initialize FingerprintJS on first call
export const initializeFingerprint = async (): Promise<FingerprintJS.Agent> => {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  return fpPromise;
};

// Get unique browser fingerprint
export const getFingerprint = async (): Promise<string> => {
  const fp = await initializeFingerprint();
  const result = await fp.get();
  return result.visitorId;
};

// ============================================
// INCOGNITO / PRIVATE MODE DETECTION
// ============================================

export const detectIncognitoMode = async (): Promise<boolean> => {
  // Method 1: IndexedDB quota test
  try {
    const test = indexedDB.open('test');
    return new Promise((resolve) => {
      let isIncognito = false;

      test.onsuccess = () => {
        resolve(false);
      };

      test.onerror = () => {
        // IndexedDB throws error in private mode
        isIncognito = true;
        resolve(true);
      };

      setTimeout(() => {
        resolve(isIncognito);
      }, 100);
    });
  } catch {
    return false;
  }
};

// Method 2: localStorage quota check (fallback)
export const detectIncognitoModeAlt = (): boolean => {
  try {
    const test = '__INCOGNITO_TEST__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return false;
  } catch {
    return true; // Likely incognito
  }
};

// ============================================
// VISITOR ID PERSISTENCE (localStorage)
// ============================================

const VISITOR_ID_KEY = 'ducsu_visitor_id';
const VOTED_KEY = 'ducsu_has_voted';
const SUBMISSION_TIME_KEY = 'ducsu_submission_time';

export const getOrCreateVisitorId = (): string => {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);

  if (!visitorId) {
    // Create new visitor ID based on fingerprint + timestamp
    visitorId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }

  return visitorId;
};

export const hasUserVoted = (): boolean => {
  return localStorage.getItem(VOTED_KEY) === 'true';
};

export const markAsVoted = (): void => {
  localStorage.setItem(VOTED_KEY, 'true');
  localStorage.setItem(SUBMISSION_TIME_KEY, Date.now().toString());
};

export const clearVoteStatus = (): void => {
  localStorage.removeItem(VOTED_KEY);
  localStorage.removeItem(SUBMISSION_TIME_KEY);
};

// ============================================
// PER-LEADER VOTE TRACKING (one vote per leader, up to 28 total)
// ============================================

const VOTED_LEADERS_KEY = 'ducsu_voted_leaders';

export const getVotedLeaderIds = (): string[] => {
  try {
    const raw = localStorage.getItem(VOTED_LEADERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const hasVotedForLeader = (leaderId: string): boolean => {
  return getVotedLeaderIds().includes(leaderId);
};

export const markLeaderAsVoted = (leaderId: string): void => {
  const voted = getVotedLeaderIds();
  if (!voted.includes(leaderId)) {
    voted.push(leaderId);
    localStorage.setItem(VOTED_LEADERS_KEY, JSON.stringify(voted));
  }
};

export const getSubmissionTime = (): number | null => {
  const time = localStorage.getItem(SUBMISSION_TIME_KEY);
  return time ? parseInt(time, 10) : null;
};

// ============================================
// IN-PROGRESS DRAFT TRACKING (sequential batch-submit flow)
// ============================================
// Ratings are held here for the whole 28-leader pass and are only written to
// Firebase once, at final submit. This lets a student go back and change a
// rating, skip a leader and return to it, or close the tab and resume later
// — all before anything is actually recorded as a vote.

const DRAFT_RATINGS_KEY = 'ducsu_draft_ratings';
const DRAFT_SKIPPED_KEY = 'ducsu_draft_skipped';
const DRAFT_POSITION_KEY = 'ducsu_draft_position';

export interface DraftRatings {
  [leaderId: string]: number;
}

export const getDraftRatings = (): DraftRatings => {
  try {
    const raw = localStorage.getItem(DRAFT_RATINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const setDraftRating = (leaderId: string, score: number): void => {
  const drafts = getDraftRatings();
  drafts[leaderId] = score;
  localStorage.setItem(DRAFT_RATINGS_KEY, JSON.stringify(drafts));

  // Rating a leader clears any "skipped" flag on them
  const skipped = getSkippedLeaderIds().filter((id) => id !== leaderId);
  localStorage.setItem(DRAFT_SKIPPED_KEY, JSON.stringify(skipped));
};

export const getSkippedLeaderIds = (): string[] => {
  try {
    const raw = localStorage.getItem(DRAFT_SKIPPED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const markLeaderSkipped = (leaderId: string): void => {
  const skipped = getSkippedLeaderIds();
  if (!skipped.includes(leaderId) && !(leaderId in getDraftRatings())) {
    skipped.push(leaderId);
    localStorage.setItem(DRAFT_SKIPPED_KEY, JSON.stringify(skipped));
  }
};

export const getDraftPosition = (): number => {
  const raw = localStorage.getItem(DRAFT_POSITION_KEY);
  return raw ? parseInt(raw, 10) : 0;
};

export const setDraftPosition = (index: number): void => {
  localStorage.setItem(DRAFT_POSITION_KEY, index.toString());
};

// Clears all in-progress draft state. Call this after a successful final
// submit (the draft has become real votes) or if the student wants to
// restart their evaluation from scratch.
export const clearDraftState = (): void => {
  localStorage.removeItem(DRAFT_RATINGS_KEY);
  localStorage.removeItem(DRAFT_SKIPPED_KEY);
  localStorage.removeItem(DRAFT_POSITION_KEY);
};

// ============================================
// IP ADDRESS DETECTION (client-side)
// ============================================

export const getUserIpAddress = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || null;
  } catch (error) {
    console.error('Failed to fetch IP address:', error);
    return null;
  }
};

// Alternative: Use WebRTC to detect IP (if needed)
export const getUserIpViaWebRTC = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const pc = new (window.RTCPeerConnection || (window as any).webkitRTCPeerConnection)({
      iceServers: [],
    });

    const iceCallback = (ice: RTCPeerConnectionIceEvent) => {
      if (!ice || !ice.candidate) {
        pc.close();
        resolve(null);
        return;
      }

      const ipMatch = ice.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
      if (ipMatch) {
        pc.close();
        resolve(ipMatch[0]);
      }
    };

    pc.onicecandidate = iceCallback;
    pc.createDataChannel('');
    pc.createOffer().then((offer) => pc.setLocalDescription(offer)).catch(() => {
      pc.close();
      resolve(null);
    });

    setTimeout(() => {
      pc.close();
      resolve(null);
    }, 3000);
  });
};

// ============================================
// DEVICE FINGERPRINT COMPOSITION
// ============================================

export interface DeviceFingerprint {
  fingerprintId: string;
  visitorId: string;
  ipAddress: string | null;
  isIncognito: boolean;
  userAgent: string;
  screenResolution: string;
  language: string;
  timezone: string;
  timestamp: number;
}

export const generateDeviceFingerprint = async (): Promise<DeviceFingerprint> => {
  const [fingerprintId, visitorId, ipAddress, isIncognito] = await Promise.all([
    getFingerprint(),
    Promise.resolve(getOrCreateVisitorId()),
    getUserIpAddress(),
    detectIncognitoMode(),
  ]);

  return {
    fingerprintId,
    visitorId,
    ipAddress,
    isIncognito,
    userAgent: navigator.userAgent,
    screenResolution: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: Date.now(),
  };
};

// Hash device fingerprint for storage
export const hashFingerprint = (fingerprint: string): string => {
  // Simple hash function (in production, use crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};
