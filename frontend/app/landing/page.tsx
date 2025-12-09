'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  HeroSection,
  ValueProposition,
  SocialProof,
  FAQSection,
  FinalCTA,
} from '@/components/waitlist';
import { getWaitlistStats } from '@/lib/waitlistApi';

export default function LandingPage() {
  const [totalSignups, setTotalSignups] = useState(0);
  const [showConfirmedBanner, setShowConfirmedBanner] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Fetch waitlist stats
    getWaitlistStats().then((stats) => {
      setTotalSignups(stats.totalSignups);
    });

    // Check for confirmation success
    if (searchParams.get('confirmed') === 'true') {
      setShowConfirmedBanner(true);
      setTimeout(() => setShowConfirmedBanner(false), 5000);
    }
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Email confirmed banner */}
      {showConfirmedBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white py-3 px-6 text-center animate-in slide-in-from-top">
          <p className="font-medium">
            Email confirmed! You&apos;re all set to receive updates.
          </p>
        </div>
      )}

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-40 py-6 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">HeatmapSlotting</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#testimonials"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Testimonials
            </a>
            <a
              href="#faq"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              FAQ
            </a>
          </nav>

          <a
            href="#waitlist-form"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Join Waitlist
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <HeroSection totalSignups={totalSignups} />

      {/* Value Proposition */}
      <div id="features">
        <ValueProposition />
      </div>

      {/* Social Proof */}
      <div id="testimonials">
        <SocialProof totalSignups={totalSignups} />
      </div>

      {/* FAQ */}
      <div id="faq">
        <FAQSection />
      </div>

      {/* Final CTA */}
      <FinalCTA signupCount={totalSignups} />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z"
                  />
                </svg>
              </div>
              <span className="text-lg font-bold text-white">HeatmapSlotting</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </a>
              <a
                href="mailto:hello@slottingpro.com"
                className="hover:text-white transition-colors"
              >
                Contact
              </a>
            </div>

            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} HeatmapSlotting. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'HeatmapSlotting',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              'AI-powered warehouse slotting and optimization software',
            offers: {
              '@type': 'Offer',
              availability: 'https://schema.org/PreOrder',
              price: '0',
              priceCurrency: 'USD',
            },
          }),
        }}
      />
    </main>
  );
}
