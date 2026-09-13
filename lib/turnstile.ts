// Client-side: Expose window.grecaptcha for Turnstile widget
declare global {
  interface Window {
    turnstile?: {
      render: (containerId: string, options: Record<string, any>) => void;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
    };
  }
}

// ============================================
// CLIENT-SIDE TURNSTILE UTILITIES
// ============================================

export const renderTurnstile = (
  containerId: string,
  onSuccess?: (token: string) => void,
  onError?: () => void
): string => {
  if (!window.turnstile) {
    console.error('Turnstile not loaded');
    return '';
  }

  return window.turnstile.render(containerId, {
    sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    theme: 'light',
    onSuccess: (token: string) => {
      onSuccess?.(token);
    },
    onError: () => {
      onError?.();
    },
  }) as string;
};

export const getTurnstileToken = (widgetId?: string): string => {
  if (!window.turnstile) {
    console.error('Turnstile not loaded');
    return '';
  }

  return window.turnstile.getResponse(widgetId) || '';
};

export const resetTurnstile = (widgetId?: string): void => {
  if (window.turnstile) {
    window.turnstile.reset(widgetId);
  }
};

export const removeTurnstile = (widgetId?: string): void => {
  if (window.turnstile) {
    window.turnstile.remove(widgetId);
  }
};

// ============================================
// SERVER-SIDE TURNSTILE VERIFICATION
// ============================================

export interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
  score?: number;
  score_reason?: string[];
}

export const verifyTurnstileToken = async (
  token: string
): Promise<TurnstileVerifyResponse> => {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error_codes: ['VERIFICATION_FAILED'],
      };
    }

    const data = await response.json() as TurnstileVerifyResponse;
    return data;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return {
      success: false,
      error_codes: ['NETWORK_ERROR'],
    };
  }
};

// ============================================
// TURNSTILE SCRIPT LOADER
// ============================================

export const loadTurnstileScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      reject(new Error('Failed to load Turnstile script'));
    };

    document.head.appendChild(script);
  });
};
