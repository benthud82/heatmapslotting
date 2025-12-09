'use client';

import { useState } from 'react';
import { LoadingSpinner } from './icons';
import { joinWaitlist, getUtmParams } from '@/lib/waitlistApi';
import SuccessModal from './SuccessModal';

export default function WaitlistFormInline() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ position: number; referralCode: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const utmParams = getUtmParams();

      const result = await joinWaitlist({
        email,
        firstName: email.split('@')[0], // Use email prefix as name for inline form
        referralCode: utmParams.referralCode || undefined,
        utmSource: utmParams.utmSource,
        utmMedium: utmParams.utmMedium,
        utmCampaign: utmParams.utmCampaign,
      });

      setSuccessData({
        position: result.position,
        referralCode: result.referralCode,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return <SuccessModal data={successData} onClose={() => setSuccessData(null)} inline />;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto lg:mx-0">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your work email"
          className="flex-1 px-5 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20
                     text-white placeholder-white/50
                     focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                     transition-all"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-400
                     text-white font-bold rounded-xl
                     hover:from-blue-600 hover:to-cyan-500
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all transform hover:scale-105
                     shadow-lg shadow-blue-500/25
                     flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {loading ? (
            <>
              <LoadingSpinner className="w-5 h-5" />
              Joining...
            </>
          ) : (
            'Get Early Access'
          )}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}
    </form>
  );
}
