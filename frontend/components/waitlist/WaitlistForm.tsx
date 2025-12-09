'use client';

import { useState } from 'react';
import { LoadingSpinner } from './icons';
import { joinWaitlist, getUtmParams, WaitlistSignupData } from '@/lib/waitlistApi';
import SuccessModal from './SuccessModal';

type CompanySize = WaitlistSignupData['companySize'];

interface FormState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  data?: {
    position: number;
    referralCode: string;
  };
}

export default function WaitlistForm() {
  const [formData, setFormData] = useState<Partial<WaitlistSignupData>>({});
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });
  const [step, setStep] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState({ status: 'loading' });

    try {
      const utmParams = getUtmParams();

      const result = await joinWaitlist({
        email: formData.email!,
        firstName: formData.firstName!,
        companyName: formData.companyName,
        companySize: formData.companySize,
        role: formData.role,
        referralCode: formData.referralCode || utmParams.referralCode || undefined,
        utmSource: utmParams.utmSource,
        utmMedium: utmParams.utmMedium,
        utmCampaign: utmParams.utmCampaign,
      });

      setFormState({
        status: 'success',
        data: {
          position: result.position,
          referralCode: result.referralCode,
        },
      });
    } catch (error) {
      setFormState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Something went wrong',
      });
    }
  };

  if (formState.status === 'success' && formState.data) {
    return <SuccessModal data={formState.data} />;
  }

  return (
    <section id="waitlist-form" className="py-24 bg-slate-900">
      <div className="max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Join the Waitlist
          </h2>
          <p className="text-slate-400">
            Get early access and founding member benefits
          </p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-slate-600'}`} />
            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-blue-500' : 'bg-slate-600'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-slate-600'}`} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <>
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                    Work email
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700
                               text-white placeholder-slate-500
                               focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                               transition-colors"
                  />
                </div>

                {/* First name */}
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-slate-300 mb-2">
                    First name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    required
                    value={formData.firstName || ''}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Jane"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700
                               text-white placeholder-slate-500
                               focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                               transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!formData.email || !formData.firstName}
                  className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700
                             disabled:text-slate-500 disabled:cursor-not-allowed
                             text-white font-semibold rounded-lg transition-colors"
                >
                  Continue
                </button>
              </>
            )}

            {step === 2 && (
              <>
                {/* Company size */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Company size (optional)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'solo' as CompanySize, label: 'Just me' },
                      { value: '2-10' as CompanySize, label: '2-10' },
                      { value: '11-50' as CompanySize, label: '11-50' },
                      { value: '51-200' as CompanySize, label: '51-200' },
                      { value: '200+' as CompanySize, label: '200+' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, companySize: option.value })}
                        className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors
                          ${formData.companySize === option.value
                            ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                            : 'border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-slate-300 mb-2">
                    Your role (optional)
                  </label>
                  <select
                    id="role"
                    value={formData.role || ''}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700
                               text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select your role</option>
                    <option value="operations">Operations / Warehouse</option>
                    <option value="supply-chain">Supply Chain</option>
                    <option value="logistics">Logistics</option>
                    <option value="executive">Executive / C-Suite</option>
                    <option value="it">IT / Engineering</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Referral code */}
                <div>
                  <label htmlFor="referral" className="block text-sm font-medium text-slate-300 mb-2">
                    Referral code (optional)
                  </label>
                  <input
                    type="text"
                    id="referral"
                    value={formData.referralCode || ''}
                    onChange={(e) => setFormData({ ...formData, referralCode: e.target.value.toUpperCase() })}
                    placeholder="FRIEND123"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700
                               text-white placeholder-slate-500 uppercase tracking-wider
                               focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Have a friend already on the list? Use their code to skip ahead!
                  </p>
                </div>

                {/* Error message */}
                {formState.status === 'error' && (
                  <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                    <p className="text-sm text-red-400">{formState.error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 px-6 bg-slate-700 hover:bg-slate-600
                               text-white font-semibold rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={formState.status === 'loading'}
                    className="flex-[2] py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800
                               text-white font-semibold rounded-lg transition-colors
                               flex items-center justify-center gap-2"
                  >
                    {formState.status === 'loading' ? (
                      <>
                        <LoadingSpinner className="w-5 h-5" />
                        Joining...
                      </>
                    ) : (
                      'Join the Waitlist'
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Privacy notice */}
            <p className="text-xs text-slate-500 text-center">
              By joining, you agree to our{' '}
              <a href="/privacy" className="underline hover:text-slate-400">Privacy Policy</a>.
              We&apos;ll never spam you.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
