'use client';

import { useState } from 'react';
import { ChevronDownIcon } from './icons';

const FAQS = [
  {
    question: 'When will HeatmapSlotting launch?',
    answer: "We're targeting Q1 2025 for our public launch. Waitlist members will get early access before the general public.",
  },
  {
    question: 'How much will it cost?',
    answer: "We'll offer a free tier for small warehouses and individual users. Pricing for larger operations will be based on warehouse size and features needed. Waitlist members get 20% off for life.",
  },
  {
    question: 'What integrations do you support?',
    answer: 'We support CSV upload out of the box, plus direct API integrations with major WMS platforms including SAP, Oracle, and Manhattan Associates. Custom integrations are available.',
  },
  {
    question: 'Is my data secure?',
    answer: "Absolutely. We're SOC 2 Type II compliant, GDPR compliant, and all data is encrypted at rest and in transit. Your warehouse data never leaves your control.",
  },
  {
    question: 'How does the referral program work?',
    answer: 'Every friend who joins using your unique code moves you up 5 spots in line. Top referrers also get exclusive early beta access and extended free trials.',
  },
  {
    question: 'What if I need help getting started?',
    answer: "Every user gets onboarding support. Pro and Enterprise tiers include dedicated success managers who'll help you optimize your warehouse from day one.",
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-colors">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <span className="font-semibold text-white pr-4">{question}</span>
        <ChevronDownIcon
          className={`w-5 h-5 text-slate-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
      >
        <div className="px-6 pb-4">
          <p className="text-slate-400">{answer}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQSection() {
  return (
    <section className="py-24 bg-slate-950">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-400">
            Can&apos;t find what you&apos;re looking for?{' '}
            <a href="mailto:hello@heatmapslotting.com" className="text-blue-400 hover:underline">
              Contact us
            </a>
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <FAQItem key={idx} {...faq} />
          ))}
        </div>
      </div>
    </section>
  );
}
