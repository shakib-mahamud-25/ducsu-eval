import {
  getAuth,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { app } from './firebase';

export const auth = getAuth(app);

// ============================================
// DU EMAIL VALIDATION
// ============================================
// DU student emails look like: <something>-<digits>@<dept-code>.du.ac.bd
// e.g. mdshakib-2021013155@ir.du.ac.bd
// Department code is a short alphabetic abbreviation (ir, cse, eee, etc.).
// We validate the shape rather than a fixed department list so it doesn't
// break for departments we don't know about.

const DU_EMAIL_REGEX = /^[a-zA-Z][a-zA-Z0-9._-]*@[a-zA-Z]{2,10}\.du\.ac\.bd$/;

export const isValidDuEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  return DU_EMAIL_REGEX.test(email.trim().toLowerCase());
};

// ============================================
// EMAIL LINK STORAGE (needed to complete sign-in on the /verify page)
// ============================================
// Firebase's email-link flow requires the same email address to be
// available when the link is opened (ideally same device/browser). We
// stash it in localStorage before sending the link.

const PENDING_EMAIL_KEY = 'ducsu_pending_verification_email';

export const storePendingEmail = (email: string): void => {
  localStorage.setItem(PENDING_EMAIL_KEY, email.trim().toLowerCase());
};

export const getPendingEmail = (): string | null => {
  return localStorage.getItem(PENDING_EMAIL_KEY);
};

export const clearPendingEmail = (): void => {
  localStorage.removeItem(PENDING_EMAIL_KEY);
};

// ============================================
// SENDING THE SIGN-IN LINK
// ============================================

export const sendVerificationLink = async (email: string): Promise<void> => {
  const trimmed = email.trim().toLowerCase();

  if (!isValidDuEmail(trimmed)) {
    throw new Error('Please use your official DU student email (e.g. name-id@dept.du.ac.bd).');
  }

  const actionCodeSettings = {
    // Must be an authorized domain in Firebase Auth settings.
    url: `${window.location.origin}/verify`,
    handleCodeInApp: true,
  };

  await sendSignInLinkToEmail(auth, trimmed, actionCodeSettings);
  storePendingEmail(trimmed);
};

// ============================================
// COMPLETING SIGN-IN (called from /verify)
// ============================================

export interface VerifyResult {
  success: boolean;
  user?: User;
  error?: string;
}

export const completeSignInFromLink = async (fallbackEmail?: string): Promise<VerifyResult> => {
  const currentUrl = window.location.href;

  if (!isSignInWithEmailLink(auth, currentUrl)) {
    return { success: false, error: 'This link is invalid or has expired.' };
  }

  let email = getPendingEmail() || fallbackEmail || '';

  if (!email) {
    return {
      success: false,
      error: 'We could not confirm your email automatically. Please re-enter the DU email you used.',
    };
  }

  try {
    const result = await signInWithEmailLink(auth, email, currentUrl);
    clearPendingEmail();
    return { success: true, user: result.user };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Sign-in failed. Please request a new link.',
    };
  }
};

export const isEmailLinkUrl = (url: string): boolean => {
  try {
    return isSignInWithEmailLink(auth, url);
  } catch {
    return false;
  }
};

export const getCurrentUser = (): User | null => auth.currentUser;

export const signOutVerifiedUser = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

// ============================================
// EMAIL HASHING (for anonymous dedup storage)
// ============================================
// We never store the raw email tied to a vote. We hash it (SHA-256) and
// only store the hash in voted_emails, purely to answer "has this student
// already submitted a verified evaluation?"

export const hashEmail = async (email: string): Promise<string> => {
  const normalized = email.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};
