'use client';

import { useState } from 'react';
import { CheckCircleIcon, ClipboardIcon, TwitterIcon, LinkedInIcon, LinkIcon } from './icons';

interface SuccessModalProps {
  data: {
    position: number;
    referralCode: string;
  };
  onClose?: () => void;
  inline?: boolean;
}

export default function SuccessModal({ data, onClose, inline = false }: SuccessModalProps) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/landing?ref=${data.referralCode}`
    : '';

  const copyCode = async () => {
    await navigator.clipboard.writeText(data.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(
      `Just joined the @HeatmapSlotting waitlist! Optimize your warehouse with visual heatmaps. Join me:`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    );
  };

  const content = (
    <div className={inline ? 'text-left' : 'text-center'}>
      {/* Success animation */}
      <div className={`w-20 h-20 bg-green-100 rounded-full flex items-center justify-center ${inline ? '' : 'mx-auto'} mb-6`}>
        <CheckCircleIcon className="w-10 h-10 text-green-600" />
      </div>

      <h3 className="text-2xl font-bold text-white mb-2">
        You&apos;re on the list!
      </h3>

      <p className="text-slate-300 mb-6">
        Your position: <span className="font-bold text-blue-400">#{data.position}</span>
      </p>

      {/* Referral section */}
      <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
        <h4 className="font-semibold text-white mb-2">
          Skip ahead in line!
        </h4>
        <p className="text-sm text-slate-400 mb-4">
          For every friend who joins with your code, you&apos;ll move up 5 spots.
        </p>

        <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-3 border border-slate-700">
          <input
            type="text"
            readOnly
            value={data.referralCode}
            className="flex-1 bg-transparent font-mono text-lg font-bold text-blue-400 text-center"
          />
          <button
            onClick={copyCode}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title="Copy code"
          >
            {copied ? (
              <span className="text-green-400 text-sm">Copied!</span>
            ) : (
              <ClipboardIcon className="w-5 h-5 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Social sharing */}
      <div className="flex justify-center gap-3">
        <button
          onClick={shareOnTwitter}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
        >
          <TwitterIcon className="w-5 h-5 text-slate-300" />
          <span className="text-sm text-slate-300">Tweet</span>
        </button>
        <button
          onClick={shareOnLinkedIn}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
        >
          <LinkedInIcon className="w-5 h-5 text-slate-300" />
          <span className="text-sm text-slate-300">Share</span>
        </button>
        <button
          onClick={copyLink}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
        >
          <LinkIcon className="w-5 h-5 text-slate-300" />
          <span className="text-sm text-slate-300">{linkCopied ? 'Copied!' : 'Copy Link'}</span>
        </button>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="mt-6 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Close
        </button>
      )}
    </div>
  );

  if (inline) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 max-w-md mx-auto lg:mx-0">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-700 animate-in fade-in zoom-in-95">
        {content}
      </div>
    </div>
  );
}
