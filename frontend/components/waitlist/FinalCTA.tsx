'use client';

import { useState } from 'react';
import { LoadingSpinner } from './icons';
import { joinWaitlist, getUtmParams } from '@/lib/waitlistApi';
import SuccessModal from './SuccessModal';

interface FinalCTAProps {
  signupCount: number;
}

export default function FinalCTA({ signupCount }: FinalCTAProps) {
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
        firstName: email.split('@')[0],
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
    return (
      <section className="py-24 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6">
          <SuccessModal data={successData} onClose={() => setSuccessData(null)} inline />
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
          Ready to transform your warehouse operations?
        </h2>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          {signupCount > 0 ? (
            <>Join {signupCount.toLocaleString()}+ operations leaders who are already waiting for smarter warehouse slotting.</>
          ) : (
            <>Join operations leaders who are already waiting for smarter warehouse slotting.</>
          )}
        </p>

        {/* Inline email form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="flex-1 px-6 py-4 rounded-xl text-slate-900 placeholder-slate-400
                       focus:ring-4 focus:ring-white/30 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl
                       hover:bg-blue-50 disabled:opacity-70 disabled:cursor-not-allowed
                       transition-colors whitespace-nowrap
                       flex items-center justify-center gap-2"
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
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-200">{error}</p>
        )}

        <p className="mt-6 text-sm text-blue-200">
          We respect your privacy. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}
