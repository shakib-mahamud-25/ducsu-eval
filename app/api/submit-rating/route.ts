import { NextRequest, NextResponse } from 'next/server';
import {
  submitRating,
  logFraudDetection,
  getSubmissionCountByIp,
  flagSuspiciousIp,
 // Submission,
} from '@/lib/firebase';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { hashFingerprint } from '@/lib/fingerprint';

interface SubmitRatingRequest {
  leaderId: string;
  score: number;
  turnstileToken: string;
  fingerprintHash: string;
  visitorId: string;
}

// Environment variables
const IP_SOFT_CAP = parseInt(process.env.NEXT_PUBLIC_IP_SOFT_CAP || '8', 10);
const IP_HARD_REVIEW_CAP = parseInt(process.env.NEXT_PUBLIC_IP_HARD_REVIEW_CAP || '12', 10);

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body: SubmitRatingRequest = await request.json();
    const { leaderId, score, turnstileToken, fingerprintHash, visitorId } = body;

    // 2. Validate inputs
    if (!leaderId || score === null || score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: leaderId, score' },
        { status: 400 }
      );
    }

    if (score < 1 || score > 5) {
      return NextResponse.json(
        { error: 'Score must be between 1 and 5' },
        { status: 400 }
      );
    }

    // 3. Verify Turnstile token (bot prevention)
    const turnstileVerification = await verifyTurnstileToken(turnstileToken);
    if (!turnstileVerification.success) {
      return NextResponse.json(
        { error: 'Bot verification failed', codes: turnstileVerification.error_codes },
        { status: 403 }
      );
    }

    // 4. Get client IP address
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // 5. Check submission count by IP
    const submissionCountByIp = await getSubmissionCountByIp(clientIp);

    // 6. Fraud detection logic
    let shouldFlag = false;
    let flagReason = '';

    if (submissionCountByIp >= IP_HARD_REVIEW_CAP) {
      // Hard cap: block outright if too many submissions
      return NextResponse.json(
        {
          error: 'Too many submissions from this IP address. Please try again later.',
          blocked: true,
        },
        { status: 429 }
      );
    } else if (submissionCountByIp >= IP_SOFT_CAP) {
      // Soft cap: allow but flag for admin review
      shouldFlag = true;
      flagReason = `Soft cap exceeded: ${submissionCountByIp + 1} submissions from IP ${clientIp}`;
    }

    // 7. Log fraud detection record
    await logFraudDetection(fingerprintHash, clientIp, visitorId);

    // 8. Submit the actual rating
    const submissionId = await submitRating(leaderId, score);

    // 9. Flag if necessary
    if (shouldFlag) {
      await flagSuspiciousIp(clientIp, submissionCountByIp + 1, [fingerprintHash]);
    }

    return NextResponse.json(
      {
        success: true,
        submissionId,
        flagged: shouldFlag,
        message: shouldFlag
          ? 'Your vote has been recorded (flagged for admin review)'
          : 'Your vote has been recorded successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error submitting rating:', error);
    return NextResponse.json(
      { error: 'Failed to submit rating. Please try again.' },
      { status: 500 }
    );
  }
}

// CORS options for preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
