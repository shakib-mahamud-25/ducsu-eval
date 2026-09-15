// ============================================
// DU EMAIL VALIDATION (unchanged from the Firebase version)
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

// ============================================
// CLERK EMAIL ONE-TIME-CODE FLOW
// ============================================
// The actual sign-in/sign-up/verify-code logic lives in
// lib/useDuEmailVerification.ts (it needs Clerk's useSignIn AND useSignUp
// hooks together, which is easier to keep in its own file). Re-exported
// here so other files can keep importing from '@/lib/auth' like before.

export { useDuEmailVerification } from './useDuEmailVerification';
