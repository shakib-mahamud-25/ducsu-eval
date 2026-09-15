import { NextRequest, NextResponse } from 'next/server';
import {
  batchSubmitRatings,
  logFraudDetection,
  getSubmissionCountByIp,
  flagSuspiciousIp,
  getVotingWindowConfig,
} from '@/lib/firebase';
import { verifyTurnstileToken } from '@/lib/turnstile';

interface RatingEntry {
  leaderId: string;
  score: number;
}

interface SubmitRatingRequest {
  ratings: RatingEntry[];
  turnstileToken: string;
  fingerprintHash: string;
  visitorId: string;
}

// Fallback caps if the admin hasn't set anything — real values are read
// from env for now, and can move to the same admin config node as the
// voting window if that becomes the preferred workflow.
const IP_SOFT_CAP = parseInt(process.env.NEXT_PUBLIC_IP_SOFT_CAP || '8', 10);
const IP_HARD_REVIEW_CAP = parseInt(process.env.NEXT_PUBLIC_IP_HARD_REVIEW_CAP || '12', 10);

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
    const { ratings, turnstileToken, fingerprintHash, visitorId } = body;

    // 3. Validate inputs
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

    // 4. Verify Turnstile token (bot prevention) — once for the whole batch
    const turnstileVerification = await verifyTurnstileToken(turnstileToken);
    if (!turnstileVerification.success) {
      return NextResponse.json(
        { error: 'Verification failed. Please try again.', codes: turnstileVerification.error_codes },
        { status: 403 }
      );
    }

    // 5. Get client IP address
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // 6. Check submission count by IP (counts distinct devices, not raw rows)
    const submissionCountByIp = await getSubmissionCountByIp(clientIp);

    // 7. Fraud detection logic
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

    // 8. Log a single fraud detection record for this device/session
    await logFraudDetection(fingerprintHash, clientIp, visitorId);

    // 9. Write every rating in one batch
    const submissionIds = await batchSubmitRatings(ratings);

    // 10. Flag if necessary
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

// CORS options for preflight requests
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
