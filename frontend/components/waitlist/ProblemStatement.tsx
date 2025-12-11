'use client';

const PAIN_POINTS = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Wasted Travel Time',
    description: 'Pickers walk miles per shift to far-away products. High-velocity SKUs buried in the back cost you hours every day.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    ),
    title: 'Blind Decision Making',
    description: 'No visibility into actual pick patterns. Product placement decisions based on gut feel instead of real data.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Inefficient Layouts',
    description: 'Warehouse layouts that made sense years ago no longer match current order patterns. Reorganizing feels impossible.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Spreadsheet Chaos',
    description: 'Pick data trapped in spreadsheets. No easy way to visualize hot zones or identify optimization opportunities.',
  },
];

export default function ProblemStatement() {
  return (
    <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-red-400 uppercase tracking-wider">
            The Problem
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">
            Your warehouse is costing you more than you think
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Most warehouses operate at only 60-70% efficiency. The culprit?
            Poor product placement that forces pickers to walk unnecessary miles every day.
          </p>
        </div>

        {/* Pain points grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {PAIN_POINTS.map((point, idx) => (
            <div
              key={idx}
              className="group p-6 bg-slate-900 rounded-xl border border-slate-800
                         hover:border-red-500/30 transition-colors"
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-14 h-14 bg-red-500/10 rounded-lg
                                flex items-center justify-center text-red-400
                                group-hover:bg-red-500/20 transition-colors">
                  {point.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {point.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Transition statement */}
        <div className="mt-16 text-center">
          <p className="text-xl text-slate-300 font-medium">
            There&apos;s a better way.
          </p>
        </div>
      </div>
    </section>
  );
}
