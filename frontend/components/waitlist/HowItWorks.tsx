'use client';

import Image from 'next/image';

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-slate-950 relative overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-20">
          <span className="text-sm font-semibold text-blue-400 uppercase tracking-wider">
            How It Works
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">
            From data to optimization in minutes
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            No complex setup. No consultants needed. Just actionable insights that improve your warehouse operations immediately.
          </p>
        </div>

        {/* Steps - Alternating rows */}
        <div className="space-y-16 md:space-y-24">

          {/* Step 1: Upload Your Data - Icon only, centered */}
          <div className="relative">
            <div className="max-w-2xl mx-auto text-center">
              {/* Step number badge */}
              <div className="inline-flex items-center justify-center px-4 py-1.5 bg-blue-600 rounded-full text-sm font-bold text-white mb-6">
                01
              </div>

              {/* Icon */}
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 border border-blue-500/20">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              {/* Content */}
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Upload Your Data
              </h3>
              <p className="text-lg text-slate-400 leading-relaxed max-w-xl mx-auto">
                Import your pick history via simple CSV upload or connect directly to your WMS. We support all major formats and can have you up and running in minutes.
              </p>
            </div>

            {/* Connector line to next step */}
            <div className="hidden md:block absolute left-1/2 -bottom-12 w-px h-12 bg-gradient-to-b from-blue-500/50 to-transparent" />
          </div>

          {/* Step 2: Visualize Heatmaps - Image LEFT, Text RIGHT */}
          <div className="relative grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Image */}
            <div className="relative group order-2 md:order-1">
              <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-blue-500/10 bg-slate-900">
                <Image
                  src="/images/img_sub_1.png"
                  alt="Warehouse layout editor showing bay grid with route markers and cart positions"
                  width={620}
                  height={496}
                  className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]"
                />
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
              {/* Decorative blur */}
              <div className="absolute -inset-4 bg-blue-500/10 rounded-3xl blur-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Content */}
            <div className="order-1 md:order-2">
              {/* Step number badge */}
              <div className="inline-flex items-center justify-center px-4 py-1.5 bg-blue-600 rounded-full text-sm font-bold text-white mb-6">
                02
              </div>

              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Visualize Heatmaps
              </h3>
              <p className="text-lg text-slate-400 leading-relaxed mb-6">
                See pick intensity by location instantly. Hot zones glow red, cold zones stay blue. Spot inefficiencies at a glance with our intuitive color-coded visualization.
              </p>

              {/* Feature highlights */}
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                  Draw your warehouse layout in minutes
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                  Interactive bay and aisle markers
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                  Real-time pick route visualization
                </li>
              </ul>
            </div>
          </div>

          {/* Step 3: Optimize & Save - Text LEFT, Image RIGHT */}
          <div className="relative grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Content */}
            <div>
              {/* Step number badge */}
              <div className="inline-flex items-center justify-center px-4 py-1.5 bg-blue-600 rounded-full text-sm font-bold text-white mb-6">
                03
              </div>

              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Optimize & Save
              </h3>
              <p className="text-lg text-slate-400 leading-relaxed mb-6">
                Get AI-powered slotting recommendations. Move high-velocity SKUs to prime locations. Reduce travel time dramatically with optimized pick paths.
              </p>

              {/* Feature highlights */}
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Calculate total walk distances
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Segment-by-segment path analysis
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Smart slotting recommendations
                </li>
              </ul>
            </div>

            {/* Image - wider banner format */}
            <div className="relative group">
              <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-green-500/10 bg-slate-900">
                <Image
                  src="/images/img_sub_2.png"
                  alt="Walk path analysis showing 133.6 FT total distance with cart-to-cart segment distances"
                  width={920}
                  height={290}
                  className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]"
                />
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-green-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
              {/* Decorative blur */}
              <div className="absolute -inset-4 bg-green-500/10 rounded-3xl blur-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Callout badge */}
              <div className="absolute -top-3 -right-3 md:top-4 md:right-4 px-3 py-1.5 bg-green-500 rounded-lg shadow-lg">
                <span className="text-sm font-bold text-white">40% Less Walking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Launch timeline */}
        <div className="mt-24 text-center">
          <div className="inline-flex items-center gap-4 px-6 py-4 bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
              <span className="text-green-400 font-semibold">In Development</span>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div className="text-slate-300">
              <span className="font-semibold text-white">Launching Q1 2025</span>
              <span className="text-slate-500 ml-2 hidden sm:inline">Join the waitlist for early access</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
