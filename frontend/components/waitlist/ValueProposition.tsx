'use client';

import { HeatmapIcon, RouteIcon, SyncIcon, IntegrationIcon } from './icons';

const VALUE_PROPS = [
  {
    icon: HeatmapIcon,
    title: 'Visual Intelligence',
    description: 'Transform raw data into actionable heatmaps. See exactly where inefficiencies hide in your warehouse layout.',
    stat: '3x',
    statLabel: 'faster analysis',
  },
  {
    icon: RouteIcon,
    title: 'Smart Slotting',
    description: 'AI-powered recommendations that optimize product placement based on real pick patterns.',
    stat: '40%',
    statLabel: 'reduced walk time',
  },
  {
    icon: SyncIcon,
    title: 'Real-Time Updates',
    description: 'Live data synchronization means your heatmaps always reflect current operations.',
    stat: '99.9%',
    statLabel: 'uptime SLA',
  },
  {
    icon: IntegrationIcon,
    title: 'Seamless Integration',
    description: 'Works with your existing WMS. Simple CSV upload or direct API connection.',
    stat: '<5min',
    statLabel: 'to first insights',
  },
];

export default function ValueProposition() {
  return (
    <section className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Everything you need to optimize warehouse operations
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Stop guessing where products should go. Start making data-driven decisions
            that measurably improve efficiency.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {VALUE_PROPS.map((prop, idx) => (
            <div
              key={idx}
              className="group relative p-8 bg-slate-900 rounded-2xl border border-slate-800
                         hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10
                         transition-all duration-300"
            >
              {/* Icon */}
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6
                              group-hover:scale-110 transition-transform">
                <prop.icon className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-white mb-3">
                {prop.title}
              </h3>
              <p className="text-slate-400 mb-4">
                {prop.description}
              </p>

              {/* Stat badge */}
              <div className="inline-flex items-baseline gap-1">
                <span className="text-2xl font-bold text-blue-400">{prop.stat}</span>
                <span className="text-sm text-slate-500">{prop.statLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
