import React, { useState, useEffect } from 'react';
import {
  Mail,
  RefreshCw,
  LogOut,
  Send,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  reloadCurrentUser,
  sendVerificationLink,
  logoutUser,
  formatAuthError,
  saveVerifiedSession,
} from '../services/authService';

interface EmailVerificationScreenProps {
  unverifiedUser: User;
  onVerified: (user: User) => void;
  onLogout: () => void;
}

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({
  unverifiedUser,
  onVerified,
  onLogout,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    `A verification email has been sent to ${unverifiedUser.email || 'your email'}.`
  );

  // Cooldown timer for Resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Check verification status
  const handleCheckStatus = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { user, emailVerified } = await reloadCurrentUser(unverifiedUser);
      if (emailVerified && user) {
        setSuccessMessage('Email verified successfully! Unlocking your cloud vault...');
        saveVerifiedSession(user);
        setTimeout(() => {
          onVerified(user);
        }, 800);
      } else {
        setErrorMessage(
          'Email not yet verified. Please open the email link in your inbox and click the verification link, then tap Refresh.'
        );
      }
    } catch (err: unknown) {
      setErrorMessage(
        'Could not reach verification server. Please check your network connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Resend verification email
  const handleResendLink = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await sendVerificationLink(unverifiedUser);
      setSuccessMessage(
        `A fresh verification link has been sent to ${unverifiedUser.email}. Please check your inbox and spam folder.`
      );
      setCooldown(60);
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setErrorMessage(formatted);
    } finally {
      setIsResending(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    onLogout();
  };

  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#F3F0F5] dark:bg-[#0E0F14] text-neutral-950 dark:text-neutral-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white dark:bg-[#12131A] rounded-[28px] shadow-2xl border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-7 text-neutral-900 dark:text-neutral-100 space-y-5 animate-in fade-in duration-200">
        {/* Brand & Envelope Icon */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
            <Mail className="w-8 h-8 stroke-[1.8]" />
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              PesoTrack Cloud Vault
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-950 dark:text-white mt-0.5">
              Verify Your Email
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
              We sent a verification link to{' '}
              <strong className="font-semibold text-neutral-900 dark:text-white font-mono break-all">
                {unverifiedUser.email}
              </strong>
            </p>
          </div>
        </div>

        {/* Offline Warning if currently disconnected */}
        {isOffline && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">No internet connection.</span>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                Initial email verification requires an active internet connection. Please connect to Wi-Fi or mobile data to verify.
              </p>
            </div>
          </div>
        )}

        {/* Status / Error / Success Banners */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <span className="leading-snug flex-1">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-snug flex-1">{successMessage}</span>
          </div>
        )}

        {/* Steps Guide */}
        <div className="p-4 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-white/[0.06] space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
              1
            </span>
            <span>Check your email inbox (and spam or junk folder).</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
              2
            </span>
            <span>Click the verification link in the email from Firebase.</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
              3
            </span>
            <span>Return to this window and tap <strong>Refresh Verification Status</strong> below.</span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs sm:text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Checking Verification...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Verification Status</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResendLink}
            disabled={cooldown > 0 || isResending}
            className="w-full py-3 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isResending ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sending email...</span>
              </>
            ) : cooldown > 0 ? (
              <span>Resend Verification Email ({cooldown}s)</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Resend Verification Email</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleLogoutClick}
            className="w-full py-2.5 px-4 rounded-xl text-neutral-500 hover:text-red-600 dark:hover:text-red-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out / Switch Account</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06] text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2E9E6B]" />
            <span>Offline access is enabled once verified on this device</span>
          </div>
        </div>
      </div>
    </div>
  );
};
