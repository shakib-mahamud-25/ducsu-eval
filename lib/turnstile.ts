declare global {
  interface Window {
    turnstile?: {
      render: (containerId: string, options: Record<string, any>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
    };
  }
}

export const renderTurnstile = (
  containerId: string,
  onSuccess?: (token: string) => void,
  onError?: () => void
): string => {
  if (!window.turnstile) {
    console.error('Turnstile not loaded');
    return '';
  }

  return window.turnstile.render(`#${containerId}`, {
    sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    theme: 'light',
    callback: (token: string) => {
      onSuccess?.(token);
    },
    'error-callback': () => {
      onError?.();
    },
  });
};

export const getTurnstileToken = (widgetId?: string): string => {
  if (!window.turnstile) {
    return '';
  }

  try {
    return window.turnstile.getResponse(widgetId) || '';
  } catch {
    return '';
  }
};

export const resetTurnstile = (widgetId?: string): void => {
  try {
    if (window.turnstile && widgetId) {
      window.turnstile.reset(widgetId);
    }
  } catch (err) {
    console.warn('Turnstile reset skipped (widget likely already gone):', err);
  }
};

export const removeTurnstile = (widgetId?: string): void => {
  try {
    if (window.turnstile && widgetId) {
      window.turnstile.remove(widgetId);
    }
  } catch (err) {
    console.warn('Turnstile remove skipped (widget likely already gone):', err);
  }
};

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
