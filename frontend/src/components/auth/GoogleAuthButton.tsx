'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: string | number;
              logo_alignment?: 'left' | 'center';
            }
          ) => void;
          prompt: (notification?: (n: {
            isNotDisplayed: () => boolean;
            getNotDisplayedReason: () => string;
            isSkippedMoment: () => boolean;
            getSkippedReason: () => string;
            isDismissedMoment: () => boolean;
            getDismissedReason: () => string;
          }) => void) => void;
        };
      };
    };
  }
}

interface GoogleAuthButtonProps {
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  onError?: (msg: string) => void;
}

export default function GoogleAuthButton({ text = 'continue_with', onError }: GoogleAuthButtonProps) {
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const { googleLogin } = useAuth();
  const router = useRouter();
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  // Warm-up and prefetch dashboard route immediately on mount
  useEffect(() => {
    router.prefetch('/');
  }, [router]);

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      if (!response.credential) return;
      try {
        setIsLoading(true);
        await googleLogin(response.credential);
        router.replace('/');
        // Fail-safe immediate redirect guarantee if Next.js router transition stalls
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/login')) {
            window.location.replace('/');
          }
        }, 1200);
      } catch (err: unknown) {
        setIsLoading(false);
        const apiError = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
        const msg = apiError.response?.data?.error?.message || apiError.message || 'Google authentication failed.';
        onError?.(msg);
      }
    },
    [googleLogin, router, onError]
  );

  useEffect(() => {
    if (!googleClientId) return;

    let isSubscribed = true;
    const scriptId = 'google-gsi-client';

    const renderGoogleBtn = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current || !isSubscribed) return;

      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
        });

        // Ensure container is clean
        googleBtnRef.current.innerHTML = '';

        // Compute a responsive width that fits neatly inside container
        const containerWidth = googleBtnRef.current.parentElement?.clientWidth || 320;
        const buttonWidth = Math.min(360, Math.max(240, Math.floor(containerWidth)));

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          text: text,
          shape: 'pill',
          width: buttonWidth,
          logo_alignment: 'left',
        });

        if (isSubscribed) {
          setIsGsiLoaded(true);
        }
      } catch (e: unknown) {
        console.error('Error initializing Google Sign-In:', e);
      }
    };

    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        renderGoogleBtn();
      };
      document.head.appendChild(script);
    } else {
      renderGoogleBtn();
    }

    const handleResize = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        renderGoogleBtn();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isSubscribed = false;
      window.removeEventListener('resize', handleResize);
    };
  }, [googleClientId, handleCredentialResponse, text]);

  const handleManualClick = () => {
    if (!googleClientId) {
      onError?.(
        'Google Client ID is not configured. Please verify NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment.'
      );
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification?.isNotDisplayed?.()) {
          const reason = notification.getNotDisplayedReason();
          console.warn('Google prompt not displayed:', reason);
          if (reason === 'unregistered_origin') {
            onError?.(
              'Google Sign-In error: The current website domain is not added to "Authorized JavaScript origins" in your Google Cloud Console project.'
            );
          } else if (reason === 'opt_out_or_no_session') {
            onError?.(
              'No active Google session found. Please sign in to Google in your browser first or use email/password.'
            );
          } else if (reason === 'suppressed_by_user') {
            onError?.(
              'Google prompt was dismissed recently. Please wait a moment or sign in using email/password.'
            );
          } else {
            onError?.(`Google prompt not displayed: ${reason}`);
          }
        }
      });
    } else {
      onError?.('Google Sign-In is initializing. Please try again in a few seconds.');
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[44px] relative">
      {/* Official Google button rendered by Google SDK */}
      <div
        ref={googleBtnRef}
        className="w-full flex justify-center items-center overflow-hidden"
        style={{ minHeight: '44px' }}
      />

      {/* Instant glassmorphic feedback overlay during Google Auth & Vault Unlocking */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center gap-2.5 rounded-full bg-[var(--color-surface)]/95 border border-[var(--color-border)] shadow-lg backdrop-blur-md px-4 py-2 pointer-events-none">
          <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">
            Opening Vault...
          </span>
        </div>
      )}

      {/* Fallback button when Google script is loading or Client ID is missing */}
      {!isGsiLoaded && (
        <button
          type="button"
          onClick={handleManualClick}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] font-medium text-sm flex items-center justify-center gap-3 transition-all shadow-xs cursor-pointer disabled:opacity-60 absolute inset-0"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>
            {isLoading
              ? 'Connecting to Google...'
              : text === 'signup_with'
              ? 'Sign up with Google'
              : 'Sign in with Google'}
          </span>
        </button>
      )}
    </div>
  );
}
