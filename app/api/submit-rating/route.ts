import { NextRequest, NextResponse } from 'next/server';
import { createClerkClient, verifyToken } from '@clerk/backend';
import {
  batchSubmitRatings,
  logFraudDetection,
  getSubmissionCountByIp,
  flagSuspiciousIp,
  getVotingWindowConfig,
  getTracksConfig,
  hasEmailAlreadyVoted,
  markEmailAsVoted,
  VoteTrack,
} from '@/lib/firebase';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { isValidDuEmail } from '@/lib/auth';
import crypto from 'crypto';

interface RatingEntry {
  leaderId: string;
  score: number;
}

interface SubmitRatingRequest {
  ratings: RatingEntry[];
  track: VoteTrack;
  // Unverified track fields
  turnstileToken?: string;
  fingerprintHash?: string;
  visitorId?: string;
  // Verified track fields
  clerkSessionToken?: string;
}

const IP_SOFT_CAP = parseInt(process.env.NEXT_PUBLIC_IP_SOFT_CAP || '8', 10);
const IP_HARD_REVIEW_CAP = parseInt(process.env.NEXT_PUBLIC_IP_HARD_REVIEW_CAP || '12', 10);

// ============================================
// CLERK (server-side session token verification for the verified track)
// ============================================
// Requires CLERK_SECRET_KEY env var (from the Clerk dashboard -> API Keys).

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Same hashing approach as lib/auth.ts's client-side hashEmail, so the
// same email always produces the same hash whether hashed on client or
// server. Node's crypto module is used here since Web Crypto's subtle API
// is also available in the Next.js Edge/Node runtime, but crypto is more
// broadly compatible for a standard Node serverless function.
const hashEmailServerSide = (email: string): string => {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
};

export async function POST(request: NextRequest) {
  try {
    // 1. Check the voting window before anything else
    const votingWindow = await getVotingWindowConfig();
    if (!votingWindow.isOpen) {
      return NextResponse.json(
        { error: 'Voting is currently closed.', votingClosed: true },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body: SubmitRatingRequest = await request.json();
    const { ratings, track } = body;

    if (track !== 'verified' && track !== 'unverified') {
      return NextResponse.json({ error: 'Invalid vote track.' }, { status: 400 });
    }

    // 2b. If the unverified track has been switched off by an admin, block
    // it here too — this stops anyone from bypassing the hidden UI button
    // by calling the API directly.
    if (track === 'unverified') {
      const tracksConfig = await getTracksConfig();
      if (!tracksConfig.unverifiedEnabled) {
        return NextResponse.json(
          { error: 'Quick vote is no longer available. Please use verified (DU email) voting.', trackDisabled: true },
          { status: 403 }
        );
      }
    }

    // 3. Validate ratings
    if (!Array.isArray(ratings) || ratings.length === 0) {
      return NextResponse.json(
        { error: 'No ratings were submitted.' },
        { status: 400 }
      );
    }

    for (const { leaderId, score } of ratings) {
      if (!leaderId || score === null || score === undefined) {
        return NextResponse.json(
          { error: 'Every rating needs a leaderId and a score.' },
          { status: 400 }
        );
      }
      if (score < 1 || score > 5) {
        return NextResponse.json(
          { error: 'Scores must be between 1 and 5.' },
          { status: 400 }
        );
      }
    }

    // ============================================
    // VERIFIED TRACK
    // ============================================
    if (track === 'verified') {
      const { clerkSessionToken } = body;
      if (!clerkSessionToken) {
        return NextResponse.json(
          { error: 'Missing verification token. Please sign in again.' },
          { status: 401 }
        );
      }

      let decodedEmail: string | undefined;
      try {
        // verifyToken checks the JWT signature/expiry against Clerk's
        // public keys. authenticateRequest (used elsewhere in Clerk apps)
        // is also an option, but since the token is sent explicitly in the
        // JSON body here (not as a cookie/header on this request), we
        // verify it directly.
        const claims = await verifyToken(clerkSessionToken, {
          secretKey: process.env.CLERK_SECRET_KEY,
        });

        const userId = claims.sub;
        const user = await clerkClient.users.getUser(userId);
        decodedEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress;
      } catch (err) {
        console.error('Clerk session token verification failed:', err);
        return NextResponse.json(
          { error: 'Your verification has expired. Please sign in again.' },
          { status: 401 }
        );
      }

      if (!decodedEmail || !isValidDuEmail(decodedEmail)) {
        return NextResponse.json(
          { error: 'This email is not a recognized DU student email.' },
          { status: 403 }
        );
      }

      const emailHash = hashEmailServerSide(decodedEmail);

      const alreadyVoted = await hasEmailAlreadyVoted(emailHash);
      if (alreadyVoted) {
        return NextResponse.json(
          { error: 'This email has already submitted a verified evaluation.', alreadyVoted: true },
          { status: 409 }
        );
      }

      const submissionIds = await batchSubmitRatings(ratings, 'verified');
      await markEmailAsVoted(emailHash);

      return NextResponse.json(
        {
          success: true,
          submissionIds,
          flagged: false,
          message: 'Your verified evaluation has been recorded. Thank you.',
        },
        { status: 200 }
      );
    }

    // ============================================
    // UNVERIFIED TRACK (original fingerprint/IP/Turnstile flow, unchanged)
    // ============================================
    const { turnstileToken, fingerprintHash, visitorId } = body;

    if (!turnstileToken || !fingerprintHash || !visitorId) {
      return NextResponse.json(
        { error: 'Missing required verification data.' },
        { status: 400 }
      );
    }

    const turnstileVerification = await verifyTurnstileToken(turnstileToken);
    if (!turnstileVerification.success) {
      return NextResponse.json(
        { error: 'Verification failed. Please try again.', codes: turnstileVerification.error_codes },
        { status: 403 }
      );
    }

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const submissionCountByIp = await getSubmissionCountByIp(clientIp);

    let shouldFlag = false;

    if (submissionCountByIp >= IP_HARD_REVIEW_CAP) {
      return NextResponse.json(
        {
          error: 'Too many submissions from this network. Please try again later.',
          blocked: true,
        },
        { status: 429 }
      );
    } else if (submissionCountByIp >= IP_SOFT_CAP) {
      shouldFlag = true;
    }

    await logFraudDetection(fingerprintHash, clientIp, visitorId);

    const submissionIds = await batchSubmitRatings(ratings, 'unverified');

    if (shouldFlag) {
      await flagSuspiciousIp(clientIp, submissionCountByIp + 1, [fingerprintHash]);
    }

    return NextResponse.json(
      {
        success: true,
        submissionIds,
        flagged: shouldFlag,
        message: shouldFlag
          ? 'Your evaluation has been recorded (flagged for admin review).'
          : 'Your evaluation has been recorded. Thank you.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error submitting ratings:', error);
    return NextResponse.json(
      { error: 'Something went wrong while saving your evaluation. Please try again.' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
