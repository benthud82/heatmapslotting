'use client';

import Image from 'next/image';
import { CheckIcon } from './icons';
import WaitlistFormInline from './WaitlistFormInline';

interface HeroSectionProps {
  totalSignups: number;
}

export default function HeroSection({ totalSignups }: HeroSectionProps) {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* Animated grid pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Floating gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left: Copy */}
          <div className="text-center lg:text-left">
            {/* Pre-headline badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-sm text-white/90 font-medium">
                Launching Q1 2025
              </span>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
              Optimize Your Warehouse.
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                Visualize Your Success.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-xl mx-auto lg:mx-0">
              AI-powered heatmap technology that reduces pick times by up to 40%.
              {totalSignups > 0 && (
                <> Join {totalSignups.toLocaleString()}+ operations leaders already on the waitlist.</>
              )}
            </p>

            {/* CTA Form - Inline for hero */}
            <WaitlistFormInline />

            {/* Trust signals directly under CTA */}
            <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-white/60">
              <span className="flex items-center gap-1">
                <CheckIcon className="w-4 h-4 text-green-400" />
                No credit card required
              </span>
              <span className="flex items-center gap-1">
                <CheckIcon className="w-4 h-4 text-green-400" />
                Free forever tier
              </span>
              <span className="flex items-center gap-1">
                <CheckIcon className="w-4 h-4 text-green-400" />
                Priority access
              </span>
            </div>
          </div>

          {/* Right: Product preview */}
          <div className="relative hidden lg:block">
            {/* Browser mockup with product screenshot */}
            <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-blue-500/20 border border-white/10">
              <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-slate-400">slottingpro.com/dashboard</span>
                </div>
              </div>
              {/* Product screenshot */}
              <div className="bg-slate-900 relative">
                <Image
                  src="/images/img_hero.png"
                  alt="Warehouse heatmap visualization showing pick intensity by location - hot zones in red/orange, cold zones in blue"
                  width={600}
                  height={580}
                  className="w-full h-auto"
                  priority
                />
                {/* Subtle overlay gradient for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Floating stats card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">40%</p>
                  <p className="text-sm text-slate-500">Faster picks</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
