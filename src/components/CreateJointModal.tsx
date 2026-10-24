import React, { useState } from 'react';
import {
  Heart,
  HelpCircle,
  Lock,
  Mail,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Loader2,
} from 'lucide-react';
import { auth } from '../services/firebase';

interface CreateJointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    relationship: string;
    inviteeEmail?: string;
    invitationMessage?: string;
  }) => Promise<boolean>;
  userEmail?: string | null;
}

const RELATIONSHIP_OPTIONS = [
  { id: 'Partner', label: 'Partner', max: 2, desc: 'For unmarried partners' },
  { id: 'Spouse', label: 'Spouse / Married', max: 2, desc: 'For married couples' },
  { id: 'Family', label: 'Family', max: 10, desc: 'For parents, children, siblings' },
  { id: 'Housemate', label: 'Housemate', max: 10, desc: 'For shared living arrangements' },
  { id: 'Roommate', label: 'Roommate', max: 10, desc: 'For shared living arrangements' },
  { id: 'Other', label: 'Other', max: 10, desc: 'For any other arrangement' },
];

export const CreateJointModal: React.FC<CreateJointModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userEmail,
}) => {
  const [name, setName] = useState('Our Household');
  const [relationship, setRelationship] = useState('Partner');
  const [customRelationship, setCustomRelationship] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [invitationMessage, setInvitationMessage] = useState(
    'Hi! Join me on PesoTrack so we can manage our shared household expenses, bills, and grocery list together.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Please provide a name for your joint account.');
      return;
    }

    const finalRelationship =
      relationship === 'Other' && customRelationship.trim()
        ? customRelationship.trim()
        : relationship;

    const trimmedEmail = inviteeEmail.trim().toLowerCase();
    if (trimmedEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setErrorMessage('Please enter a valid email address for your partner.');
        return;
      }
      if (userEmail && trimmedEmail === userEmail.toLowerCase()) {
        setErrorMessage('You cannot invite your own email address.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (auth.currentUser) {
        try {
          await auth.currentUser.getIdToken(true);
        } catch (tokenErr) {
          console.warn('[CreateJointModal] Token refresh attempt:', tokenErr);
        }
      }

      const success = await onSubmit({
        name: trimmedName,
        relationship: finalRelationship,
        inviteeEmail: trimmedEmail || undefined,
        invitationMessage: trimmedEmail ? invitationMessage.trim() : undefined,
      });
      if (success) {
        onClose();
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('expired') || msg.includes('token') || msg.includes('Unauthorized')) {
        setErrorMessage('Your session could not be verified. Please sign in again.');
      } else if (msg.includes('already has a pending invitation')) {
        setErrorMessage('This email already has a pending invitation.');
      } else if (msg.includes('already a member')) {
        setErrorMessage('This user is already a member of this joint account.');
      } else {
        setErrorMessage(msg || 'Unable to create joint account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="relative w-full max-w-lg bg-[#F6F4EE] dark:bg-[#15221B] rounded-3xl border border-[#E5E1D8] dark:border-[#223528] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#E5E1D8] dark:border-[#223528] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#174F32] text-[#83C95B] flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#252923] dark:text-white">
                Create Joint Account
              </h2>
              <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                Manage shared finances with your partner or household
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#777D75] hover:text-[#252923] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="px-5 py-2.5 bg-red-500/15 border-b border-red-500/20 text-xs font-semibold text-red-900 dark:text-red-200">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Strict Privacy Guarantee Box */}
          <div className="p-3.5 rounded-2xl bg-[#E8F3EC] dark:bg-[#183023] border border-[#C5E2D1] dark:border-[#264835] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#174F32] dark:text-[#83C95B] shrink-0 mt-0.5" />
            <div className="text-xs text-[#174F32] dark:text-[#C5E7D4] space-y-1">
              <p className="font-extrabold">100% Personal Privacy Guarantee</p>
              <p className="leading-relaxed opacity-90">
                Your personal accounts, wallets, salary, loans, and personal transactions are strictly private. Only accounts and transactions specifically added in this joint workspace are shared.
              </p>
            </div>
          </div>

          {/* Account Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#252923] dark:text-white flex items-center gap-1.5">
              <span>Joint Account Name</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Our Household, Karl & Partner"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-sm text-[#252923] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
            />
          </div>

          {/* Relationship Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#252923] dark:text-white">
              Relationship
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRelationship(opt.id)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${
                    relationship === opt.id
                      ? 'bg-[#174F32] text-white shadow-xs'
                      : 'bg-white dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-[#61685D] dark:text-[#9EA59B] hover:border-[#174F32]'
                  }`}
                >
                  <span className="font-extrabold text-[12px]">{opt.label}</span>
                  <span className={`text-[10px] mt-0.5 ${relationship === opt.id ? 'text-[#83C95B]' : 'text-[#777D75]'}`}>
                    Max {opt.max} members
                  </span>
                </button>
              ))}
            </div>
            {relationship === 'Other' && (
              <input
                type="text"
                value={customRelationship}
                onChange={(e) => setCustomRelationship(e.target.value)}
                placeholder="Specify relationship (e.g. Siblings, Flatmates)"
                className="mt-2 w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-xs text-[#252923] dark:text-white"
              />
            )}
          </div>

          {/* Partner Invitation Section */}
          <div className="pt-2 border-t border-[#E5E1D8] dark:border-[#223528] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#252923] dark:text-white flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#174F32] dark:text-[#83C95B]" />
                <span>Invite Partner (Optional)</span>
              </label>
              <span className="text-[11px] text-[#777D75]">You can also invite later</span>
            </div>

            <input
              type="email"
              value={inviteeEmail}
              onChange={(e) => setInviteeEmail(e.target.value)}
              placeholder="partner@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-sm text-[#252923] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
            />

            {inviteeEmail.trim() && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-[11px] font-bold text-[#777D75] dark:text-[#8FA095]">
                  Invitation Note
                </label>
                <textarea
                  rows={2}
                  value={invitationMessage}
                  onChange={(e) => setInvitationMessage(e.target.value)}
                  placeholder="Optional message to your partner..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-xs text-[#252923] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32]"
                />
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-[#283C2F] text-xs sm:text-sm font-bold text-[#777D75] dark:text-[#BAC0B6] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs sm:text-sm font-extrabold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Workspace...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#83C95B]" />
                  <span>{inviteeEmail.trim() ? 'Create & Send Invite' : 'Create Joint Account'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
