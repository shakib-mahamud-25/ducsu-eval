'use client';

import { useState, useCallback } from 'react';
import { useSignIn, useSignUp, useAuth } from '@clerk/nextjs';
import { isValidDuEmail } from './auth';

// ============================================
// CLERK EMAIL ONE-TIME-CODE VERIFICATION
// ============================================
// Replaces Firebase's sendSignInLinkToEmail / signInWithEmailLink flow.
//
// Clerk splits "email doesn't exist yet" (sign-up) from "email already has
// an account" (sign-in) into two different flows. A voter's DU email may or
// may not have been seen by Clerk before, so we try sign-in first; if Clerk
// says the identifier doesn't exist, we fall back to sign-up. Either way,
// the UX for the voter is identical: enter email -> enter 6-digit code.

type Step = 'enter-email' | 'enter-code';

export interface UseDuEmailVerificationResult {
  step: Step;
  isLoading: boolean;
  error: string | null;
  isSignedIn: boolean;
  sendCode: (email: string) => Promise<boolean>;
  verifyCode: (code: string) => Promise<boolean>;
  reset: () => void;
}

export function useDuEmailVerification(): UseDuEmailVerificationResult {
  const { signIn, setActive: setActiveFromSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveFromSignUp, isLoaded: signUpLoaded } = useSignUp();
  const { isSignedIn } = useAuth();

  const [step, setStep] = useState<Step>('enter-email');
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep('enter-email');
    setMode(null);
    setIsLoading(false);
    setError(null);
  }, []);

  const sendCode = useCallback(
    async (rawEmail: string): Promise<boolean> => {
      const email = rawEmail.trim().toLowerCase();
      setError(null);

      if (!isValidDuEmail(email)) {
        setError('Please use your official DU student email (e.g. name-id@dept.du.ac.bd).');
        return false;
      }

      if (!signInLoaded || !signUpLoaded || !signIn || !signUp) {
        setError('Still loading, please try again in a moment.');
        return false;
      }

      setIsLoading(true);
      try {
        // Try sign-in first (email already known to Clerk).
        try {
          const attempt = await signIn.create({ identifier: email });
          const emailFactor = attempt.supportedFirstFactors?.find(
            (f) => f.strategy === 'email_code'
          );
          if (!emailFactor || !('emailAddressId' in emailFactor)) {
            throw new Error('Email code sign-in is not available for this account.');
          }
          await signIn.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: emailFactor.emailAddressId,
          });
          setMode('sign-in');
          setStep('enter-code');
          return true;
        } catch (signInErr: unknown) {
          // Clerk throws a "form_identifier_not_found" style error when the
          // email has no existing account — fall back to sign-up.
          const isNotFound = isClerkNotFoundError(signInErr);
          if (!isNotFound) throw signInErr;

          const attempt = await signUp.create({ emailAddress: email });
          await attempt.prepareEmailAddressVerification({ strategy: 'email_code' });
          setMode('sign-up');
          setStep('enter-code');
          return true;
        }
      } catch (err) {
        setError(extractClerkMessage(err) || 'Could not send the verification code. Please try again.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [signIn, signUp, signInLoaded, signUpLoaded]
  );

  const verifyCode = useCallback(
    async (code: string): Promise<boolean> => {
      setError(null);
      const trimmedCode = code.trim();
      if (!trimmedCode) {
        setError('Please enter the code from your email.');
        return false;
      }

      setIsLoading(true);
      try {
        if (mode === 'sign-in') {
          if (!signIn) {
            setError('Your session expired. Please request a new code.');
            return false;
          }
          const result = await signIn.attemptFirstFactor({
            strategy: 'email_code',
            code: trimmedCode,
          });
          if (result.status === 'complete') {
            await setActiveFromSignIn({ session: result.createdSessionId });
            return true;
          }
          setError('Incorrect or expired code. Please try again.');
          return false;
        }

        if (mode === 'sign-up') {
          if (!signUp) {
            setError('Your session expired. Please request a new code.');
            return false;
          }
          const result = await signUp.attemptEmailAddressVerification({ code: trimmedCode });
          if (result.status === 'complete') {
            await setActiveFromSignUp({ session: result.createdSessionId });
            return true;
          }
          setError('Incorrect or expired code. Please try again.');
          return false;
        }

        setError('Something went wrong. Please request a new code.');
        return false;
      } catch (err) {
        setError(extractClerkMessage(err) || 'Incorrect or expired code. Please try again.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [mode, signIn, signUp, setActiveFromSignIn, setActiveFromSignUp]
  );

  return {
    step,
    isLoading,
    error,
    isSignedIn: !!isSignedIn,
    sendCode,
    verifyCode,
    reset,
  };
}

// ---- Clerk error helpers ----

function isClerkNotFoundError(err: unknown): boolean {
  const clerkErr = err as { errors?: { code?: string }[] };
  return !!clerkErr?.errors?.some(
    (e) => e.code === 'form_identifier_not_found' || e.code === 'resource_not_found'
  );
}

function extractClerkMessage(err: unknown): string | null {
  const clerkErr = err as { errors?: { message?: string; longMessage?: string }[] };
  const first = clerkErr?.errors?.[0];
  return first?.longMessage || first?.message || null;
}
