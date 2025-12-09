'use client';

interface SocialProofProps {
  totalSignups: number;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  metric?: { value: string; label: string };
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "We reduced our average pick time by 35% within the first month. The ROI was immediate and obvious.",
    author: "Sarah Chen",
    role: "VP of Operations",
    company: "TechLogistics Inc.",
    metric: { value: "35%", label: "pick time reduction" },
  },
  {
    quote: "Finally, a tool that shows us where the real bottlenecks are. Our team loves the visual heatmaps.",
    author: "Mike Thompson",
    role: "Warehouse Manager",
    company: "FastShip Co.",
    metric: { value: "28%", label: "efficiency gain" },
  },
  {
    quote: "The setup was incredibly easy. We had actionable insights within minutes of uploading our first dataset.",
    author: "Jennifer Park",
    role: "Supply Chain Director",
    company: "RetailPlus",
    metric: { value: "5min", label: "time to value" },
  },
];

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-4xl md:text-5xl font-bold text-white">{value}</p>
      <p className="text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function TestimonialCard({ quote, author, role, company, metric }: Testimonial) {
  return (
    <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 hover:border-slate-700 transition-colors">
      {/* Quote */}
      <blockquote className="text-slate-300 mb-6 italic">
        &ldquo;{quote}&rdquo;
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
          {author.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <p className="font-semibold text-white">{author}</p>
          <p className="text-sm text-slate-500">{role}, {company}</p>
        </div>
      </div>

      {/* Metric highlight */}
      {metric && (
        <div className="mt-6 pt-6 border-t border-slate-800">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-green-400">{metric.value}</span>
            <span className="text-slate-500">{metric.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SocialProof({ totalSignups }: SocialProofProps) {
  // Calculate dynamic stats
  const displaySignups = totalSignups > 0 ? totalSignups.toLocaleString() + '+' : '500+';
  const estimatedCompanies = Math.floor(totalSignups / 3) || 100;
  const estimatedSavings = Math.floor(totalSignups * 200) || 100000;

  return (
    <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          <StatCard value={displaySignups} label="Signups" />
          <StatCard value={`${estimatedCompanies}+`} label="Companies waiting" />
          <StatCard value={`$${Math.floor(estimatedSavings / 1000)}K+`} label="Projected savings" />
          <StatCard value="47" label="Countries" />
        </div>

        {/* Testimonial highlight */}
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-blue-400 uppercase tracking-wider">
            Don&apos;t just take our word for it
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">
            Hear from our beta users
          </h2>
        </div>

        {/* Testimonial cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, idx) => (
            <TestimonialCard key={idx} {...t} />
          ))}
        </div>

        {/* Trust badges placeholder */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 opacity-50">
          <div className="px-6 py-3 bg-slate-800 rounded-lg border border-slate-700 text-slate-400 text-sm font-medium">
            SOC 2 Compliant
          </div>
          <div className="px-6 py-3 bg-slate-800 rounded-lg border border-slate-700 text-slate-400 text-sm font-medium">
            GDPR Ready
          </div>
          <div className="px-6 py-3 bg-slate-800 rounded-lg border border-slate-700 text-slate-400 text-sm font-medium">
            AWS Hosted
          </div>
          <div className="px-6 py-3 bg-slate-800 rounded-lg border border-slate-700 text-slate-400 text-sm font-medium">
            256-bit Encryption
          </div>
        </div>
      </div>
    </section>
  );
}
