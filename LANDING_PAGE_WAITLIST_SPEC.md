# Enterprise Landing Page with Waitlist - Coding Agent Specification

## Executive Summary

This document provides comprehensive instructions for building a professional, enterprise-grade landing page with waitlist functionality. The landing page should establish credibility, build anticipation, and capture high-quality leads before product launch.

**Target Conversion Rate:** 15-25% (industry benchmark for waitlist pages)
**Primary Goal:** Email capture with high-intent lead qualification

---

## Part 1: Technical Foundation

### 1.1 Technology Stack

Build using the existing HeatmapSlotting stack for consistency:

```
Framework: Next.js 14+ (App Router)
Styling: Tailwind CSS with custom configuration
Database: Supabase (PostgreSQL)
Email Service: Resend, SendGrid, or Mailchimp (evaluate based on needs)
Analytics: Vercel Analytics + Google Analytics 4
Hosting: Vercel or existing production server
```

### 1.2 Project Structure

```
/app
  /waitlist
    page.tsx              # Main landing page
    layout.tsx            # SEO metadata, fonts
    loading.tsx           # Loading state
  /api
    /waitlist
      route.ts            # POST endpoint for signups
      /confirm
        route.ts          # Email confirmation handler
      /stats
        route.ts          # Admin stats endpoint (protected)
/components
  /waitlist
    HeroSection.tsx
    ValueProposition.tsx
    SocialProof.tsx
    FeaturePreview.tsx
    WaitlistForm.tsx
    SuccessModal.tsx
    FAQSection.tsx
    Footer.tsx
/lib
  /waitlist
    validation.ts         # Form validation (Zod schemas)
    email.ts             # Email service integration
    analytics.ts         # Event tracking
/styles
  waitlist.css           # Custom animations, effects
```

### 1.3 Database Schema

Create the following tables in Supabase:

```sql
-- Waitlist signups table
CREATE TABLE waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  company_name VARCHAR(200),
  company_size VARCHAR(50),           -- 'solo', '2-10', '11-50', '51-200', '200+'
  role VARCHAR(100),                   -- Job title/role
  use_case TEXT,                       -- Optional: how they plan to use it
  referral_source VARCHAR(100),        -- 'google', 'linkedin', 'twitter', 'referral', 'other'
  referral_code VARCHAR(50),           -- If referred by existing signup
  unique_referral_code VARCHAR(50) UNIQUE,  -- Their own referral code
  referral_count INTEGER DEFAULT 0,    -- Number of successful referrals
  email_confirmed BOOLEAN DEFAULT FALSE,
  confirmation_token UUID DEFAULT gen_random_uuid(),
  waitlist_position INTEGER,           -- Auto-calculated position
  priority_score INTEGER DEFAULT 0,    -- For prioritization (referrals bump this up)
  ip_address INET,
  user_agent TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create index for fast lookups
CREATE INDEX idx_waitlist_email ON waitlist_signups(email);
CREATE INDEX idx_waitlist_referral ON waitlist_signups(unique_referral_code);
CREATE INDEX idx_waitlist_position ON waitlist_signups(waitlist_position);

-- Function to auto-assign waitlist position
CREATE OR REPLACE FUNCTION assign_waitlist_position()
RETURNS TRIGGER AS $$
BEGIN
  NEW.waitlist_position := COALESCE(
    (SELECT MAX(waitlist_position) FROM waitlist_signups) + 1,
    1
  );
  -- Generate unique referral code
  NEW.unique_referral_code := UPPER(SUBSTRING(MD5(NEW.email || NOW()::TEXT) FOR 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_waitlist_position
  BEFORE INSERT ON waitlist_signups
  FOR EACH ROW
  EXECUTE FUNCTION assign_waitlist_position();

-- Row Level Security
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can insert/update
CREATE POLICY "Service role full access" ON waitlist_signups
  FOR ALL USING (auth.role() = 'service_role');
```

---

## Part 2: Design Specifications

### 2.1 Design Philosophy

**Aesthetic Direction:** Modern enterprise with warmth - Professional enough for B2B buyers, approachable enough for individuals. Avoid cold, sterile corporate aesthetics.

**Visual Principles:**
- Clean whitespace with strategic density
- Bold typography hierarchy
- Subtle depth through shadows and layers
- Micro-animations that delight without distracting
- Mobile-first responsive design

### 2.2 Color System

```css
:root {
  /* Primary - Deep professional blue with energy */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-900: #1e3a8a;
  
  /* Accent - Warm coral for CTAs and highlights */
  --color-accent-400: #fb7185;
  --color-accent-500: #f43f5e;
  --color-accent-600: #e11d48;
  
  /* Neutrals - Warm grays */
  --color-neutral-50: #fafafa;
  --color-neutral-100: #f5f5f5;
  --color-neutral-200: #e5e5e5;
  --color-neutral-400: #a3a3a3;
  --color-neutral-600: #525252;
  --color-neutral-800: #262626;
  --color-neutral-900: #171717;
  
  /* Success/Trust indicators */
  --color-success-500: #22c55e;
  
  /* Background gradients */
  --gradient-hero: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
  --gradient-subtle: linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%);
}
```

### 2.3 Typography

```css
/* Use Google Fonts - distinctive but readable */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500&display=swap');

:root {
  /* Headlines - Plus Jakarta Sans (modern, geometric, friendly) */
  --font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  
  /* Body - Inter (highly readable, professional) */
  --font-body: 'Inter', system-ui, sans-serif;
  
  /* Type Scale */
  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.875rem;     /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.125rem;     /* 18px */
  --text-xl: 1.25rem;      /* 20px */
  --text-2xl: 1.5rem;      /* 24px */
  --text-3xl: 1.875rem;    /* 30px */
  --text-4xl: 2.25rem;     /* 36px */
  --text-5xl: 3rem;        /* 48px */
  --text-6xl: 3.75rem;     /* 60px */
  --text-7xl: 4.5rem;      /* 72px */
}
```

### 2.4 Spacing System

Use 8px base unit:
- `4px` (0.5) - Micro spacing
- `8px` (1) - Tight
- `16px` (2) - Default
- `24px` (3) - Comfortable
- `32px` (4) - Section padding
- `48px` (6) - Large sections
- `64px` (8) - Hero padding
- `96px` (12) - Major section breaks

---

## Part 3: Page Structure & Components

### 3.1 Above-the-Fold Hero Section

**CRITICAL:** Must answer within 5 seconds:
1. What is this product?
2. Who is it for?
3. Why should I care?

```tsx
// components/waitlist/HeroSection.tsx

interface HeroSectionProps {
  totalSignups: number;
  recentSignups: Array<{ name: string; company: string; avatar?: string }>;
}

export function HeroSection({ totalSignups, recentSignups }: HeroSectionProps) {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* Animated grid pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        {/* Floating gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
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
              Join {totalSignups.toLocaleString()}+ operations leaders already on the waitlist.
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
          <div className="relative">
            {/* Browser mockup with product screenshot */}
            <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-blue-500/20 border border-white/10">
              <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-slate-400">heatmapslotting.com/dashboard</span>
                </div>
              </div>
              {/* Actual product screenshot/mockup */}
              <Image 
                src="/product-preview.png" 
                alt="HeatmapSlotting Dashboard Preview"
                width={800}
                height={500}
                className="w-full"
                priority
              />
            </div>
            
            {/* Floating stats card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUpIcon className="w-6 h-6 text-green-600" />
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
      
      {/* Social proof bar at bottom of hero */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/5 backdrop-blur-sm border-t border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8">
          <span className="text-sm text-white/60">Trusted by teams at</span>
          {/* Logo carousel - use grayscale, reveal on hover */}
          <div className="flex items-center gap-8 opacity-60">
            {/* Add 4-6 recognizable company logos */}
            <img src="/logos/company1.svg" alt="Company 1" className="h-6" />
            <img src="/logos/company2.svg" alt="Company 2" className="h-6" />
            <img src="/logos/company3.svg" alt="Company 3" className="h-6" />
            <img src="/logos/company4.svg" alt="Company 4" className="h-6" />
          </div>
        </div>
      </div>
    </section>
  );
}
```

### 3.2 Value Proposition Section

Present the core benefits with supporting evidence:

```tsx
// components/waitlist/ValueProposition.tsx

const VALUE_PROPS = [
  {
    icon: HeatmapIcon,
    title: "Visual Intelligence",
    description: "Transform raw data into actionable heatmaps. See exactly where inefficiencies hide in your warehouse layout.",
    stat: "3x",
    statLabel: "faster analysis"
  },
  {
    icon: RouteIcon,
    title: "Smart Slotting",
    description: "AI-powered recommendations that optimize product placement based on real pick patterns.",
    stat: "40%",
    statLabel: "reduced walk time"
  },
  {
    icon: SyncIcon,
    title: "Real-Time Updates",
    description: "Live data synchronization means your heatmaps always reflect current operations.",
    stat: "99.9%",
    statLabel: "uptime SLA"
  },
  {
    icon: IntegrationIcon,
    title: "Seamless Integration",
    description: "Works with your existing WMS. Simple CSV upload or direct API connection.",
    stat: "<5min",
    statLabel: "to first insights"
  }
];

export function ValueProposition() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Everything you need to optimize warehouse operations
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Stop guessing where products should go. Start making data-driven decisions 
            that measurably improve efficiency.
          </p>
        </div>
        
        {/* Feature grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {VALUE_PROPS.map((prop, idx) => (
            <div 
              key={idx}
              className="group relative p-8 bg-slate-50 rounded-2xl border border-slate-100 
                         hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 
                         transition-all duration-300"
            >
              {/* Icon */}
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6
                              group-hover:scale-110 transition-transform">
                <prop.icon className="w-7 h-7 text-white" />
              </div>
              
              {/* Content */}
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                {prop.title}
              </h3>
              <p className="text-slate-600 mb-4">
                {prop.description}
              </p>
              
              {/* Stat badge */}
              <div className="inline-flex items-baseline gap-1">
                <span className="text-2xl font-bold text-blue-600">{prop.stat}</span>
                <span className="text-sm text-slate-500">{prop.statLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

### 3.3 Social Proof Section

**CRITICAL for enterprise conversions:**

```tsx
// components/waitlist/SocialProof.tsx

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar: string;
  metric?: { value: string; label: string };
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "We reduced our average pick time by 35% within the first month. The ROI was immediate and obvious.",
    author: "Sarah Chen",
    role: "VP of Operations",
    company: "TechLogistics Inc.",
    avatar: "/testimonials/sarah.jpg",
    metric: { value: "35%", label: "pick time reduction" }
  },
  // Add 2-3 more testimonials
];

export function SocialProof() {
  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          <StatCard value="10,000+" label="Signups" />
          <StatCard value="500+" label="Companies waiting" />
          <StatCard value="$2M+" label="Projected savings" />
          <StatCard value="47" label="Countries" />
        </div>
        
        {/* Testimonial highlight */}
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
            Don't just take our word for it
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">
            Hear from our beta users
          </h2>
        </div>
        
        {/* Testimonial cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, idx) => (
            <TestimonialCard key={idx} {...t} />
          ))}
        </div>
        
        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8">
          <img src="/badges/soc2.svg" alt="SOC 2 Compliant" className="h-12" />
          <img src="/badges/gdpr.svg" alt="GDPR Compliant" className="h-12" />
          <img src="/badges/aws.svg" alt="AWS Partner" className="h-12" />
        </div>
      </div>
    </section>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-4xl md:text-5xl font-bold text-slate-900">{value}</p>
      <p className="text-slate-600 mt-1">{label}</p>
    </div>
  );
}

function TestimonialCard({ quote, author, role, company, avatar, metric }: Testimonial) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
      {/* Quote */}
      <blockquote className="text-slate-700 mb-6">
        "{quote}"
      </blockquote>
      
      {/* Author */}
      <div className="flex items-center gap-4">
        <img src={avatar} alt={author} className="w-12 h-12 rounded-full" />
        <div>
          <p className="font-semibold text-slate-900">{author}</p>
          <p className="text-sm text-slate-500">{role}, {company}</p>
        </div>
      </div>
      
      {/* Metric highlight */}
      {metric && (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-green-600">{metric.value}</span>
            <span className="text-slate-600">{metric.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3.4 Main Waitlist Form Component

```tsx
// components/waitlist/WaitlistForm.tsx

'use client';

import { useState } from 'react';
import { z } from 'zod';

const waitlistSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  firstName: z.string().min(1, 'First name is required').max(100),
  companyName: z.string().optional(),
  companySize: z.enum(['solo', '2-10', '11-50', '51-200', '200+']).optional(),
  role: z.string().optional(),
  referralCode: z.string().optional(),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

interface FormState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  data?: {
    position: number;
    referralCode: string;
  };
}

export function WaitlistForm() {
  const [formData, setFormData] = useState<Partial<WaitlistFormData>>({});
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });
  const [step, setStep] = useState(1); // Multi-step form for qualification

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState({ status: 'loading' });

    try {
      // Validate
      const validated = waitlistSchema.parse(formData);

      // Get UTM params from URL
      const urlParams = new URLSearchParams(window.location.search);
      const enrichedData = {
        ...validated,
        utmSource: urlParams.get('utm_source'),
        utmMedium: urlParams.get('utm_medium'),
        utmCampaign: urlParams.get('utm_campaign'),
      };

      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Something went wrong');
      }

      const result = await response.json();
      
      setFormState({
        status: 'success',
        data: {
          position: result.position,
          referralCode: result.referralCode,
        },
      });

      // Track conversion
      trackEvent('waitlist_signup', {
        company_size: formData.companySize,
        source: urlParams.get('utm_source') || 'direct',
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        setFormState({
          status: 'error',
          error: error.errors[0].message,
        });
      } else {
        setFormState({
          status: 'error',
          error: error instanceof Error ? error.message : 'Something went wrong',
        });
      }
    }
  };

  if (formState.status === 'success') {
    return <SuccessState data={formState.data!} />;
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <>
            {/* Email - Most critical field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Work email
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition-colors"
              />
            </div>

            {/* First name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                First name
              </label>
              <input
                type="text"
                id="firstName"
                required
                value={formData.firstName || ''}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Jane"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!formData.email || !formData.firstName}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300
                         text-white font-semibold rounded-lg transition-colors"
            >
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            {/* Company size - Important for prioritization */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Company size (optional)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'solo', label: 'Just me' },
                  { value: '2-10', label: '2-10' },
                  { value: '11-50', label: '11-50' },
                  { value: '51-200', label: '51-200' },
                  { value: '200+', label: '200+' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, companySize: option.value as any })}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors
                      ${formData.companySize === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-2">
                Your role (optional)
              </label>
              <select
                id="role"
                value={formData.role || ''}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label htmlFor="referral" className="block text-sm font-medium text-slate-700 mb-2">
                Referral code (optional)
              </label>
              <input
                type="text"
                id="referral"
                value={formData.referralCode || ''}
                onChange={(e) => setFormData({ ...formData, referralCode: e.target.value.toUpperCase() })}
                placeholder="FRIEND123"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           uppercase tracking-wider"
              />
              <p className="mt-1 text-xs text-slate-500">
                Have a friend already on the list? Use their code to skip ahead!
              </p>
            </div>

            {/* Error message */}
            {formState.status === 'error' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{formState.error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-4 px-6 bg-slate-100 hover:bg-slate-200
                           text-slate-700 font-semibold rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={formState.status === 'loading'}
                className="flex-[2] py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
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
          <a href="/privacy" className="underline hover:text-slate-700">Privacy Policy</a>.
          We'll never spam you.
        </p>
      </form>
    </div>
  );
}

function SuccessState({ data }: { data: { position: number; referralCode: string } }) {
  const shareUrl = `${window.location.origin}?ref=${data.referralCode}`;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto text-center">
      {/* Success animation */}
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircleIcon className="w-10 h-10 text-green-600" />
      </div>

      <h3 className="text-2xl font-bold text-slate-900 mb-2">
        You're on the list! 🎉
      </h3>

      <p className="text-slate-600 mb-6">
        Your position: <span className="font-bold text-blue-600">#{data.position}</span>
      </p>

      {/* Referral section */}
      <div className="bg-slate-50 rounded-xl p-6 mb-6">
        <h4 className="font-semibold text-slate-900 mb-2">
          Skip ahead in line!
        </h4>
        <p className="text-sm text-slate-600 mb-4">
          For every friend who joins with your code, you'll move up 5 spots.
        </p>

        <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-slate-200">
          <input
            type="text"
            readOnly
            value={data.referralCode}
            className="flex-1 bg-transparent font-mono text-lg font-bold text-blue-600 text-center"
          />
          <button
            onClick={() => navigator.clipboard.writeText(data.referralCode)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ClipboardIcon className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Social sharing */}
      <div className="flex justify-center gap-3">
        <SocialShareButton
          platform="twitter"
          url={shareUrl}
          text="Just joined the @SlottingPRO waitlist! Optimize your warehouse with AI-powered heatmaps. Join me:"
        />
        <SocialShareButton
          platform="linkedin"
          url={shareUrl}
          text="Excited to try SlottingPRO's warehouse optimization platform. Join the waitlist:"
        />
        <CopyLinkButton url={shareUrl} />
      </div>
    </div>
  );
}
```

### 3.5 FAQ Section

```tsx
// components/waitlist/FAQSection.tsx

const FAQS = [
  {
    question: "When will SlottingPRO launch?",
    answer: "We're targeting Q1 2025 for our public launch. Waitlist members will get early access starting in late 2024."
  },
  {
    question: "How much will it cost?",
    answer: "We'll offer a free tier for small warehouses and individual users. Pricing for larger operations will be based on warehouse size and features needed. Waitlist members get 20% off for life."
  },
  {
    question: "What integrations do you support?",
    answer: "We support CSV upload out of the box, plus direct API integrations with major WMS platforms including SAP, Oracle, and Manhattan Associates. Custom integrations are available."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We're SOC 2 Type II compliant, GDPR compliant, and all data is encrypted at rest and in transit. Your warehouse data never leaves your control."
  },
  {
    question: "How does the referral program work?",
    answer: "Every friend who joins using your unique code moves you up 5 spots in line. Top referrers also get exclusive early beta access and extended free trials."
  }
];

export function FAQSection() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-600">
            Can't find what you're looking for?{' '}
            <a href="mailto:hello@slottingpro.com" className="text-blue-600 hover:underline">
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

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <span className="font-semibold text-slate-900">{question}</span>
        <ChevronDownIcon
          className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-4">
          <p className="text-slate-600">{answer}</p>
        </div>
      )}
    </div>
  );
}
```

### 3.6 Final CTA Section

```tsx
// components/waitlist/FinalCTA.tsx

export function FinalCTA({ signupCount }: { signupCount: number }) {
  return (
    <section className="py-24 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
          Ready to transform your warehouse operations?
        </h2>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Join {signupCount.toLocaleString()}+ operations leaders who are already waiting 
          for smarter warehouse slotting.
        </p>
        
        {/* Inline email form */}
        <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            required
            className="flex-1 px-6 py-4 rounded-xl text-slate-900 placeholder-slate-400
                       focus:ring-4 focus:ring-white/30 focus:outline-none"
          />
          <button
            type="submit"
            className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl
                       hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            Get Early Access
          </button>
        </form>
        
        <p className="mt-6 text-sm text-blue-200">
          🔒 We respect your privacy. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}
```

---

## Part 4: API Implementation

### 4.1 Waitlist Signup Endpoint

```typescript
// app/api/waitlist/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

const signupSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  companyName: z.string().max(200).optional(),
  companySize: z.enum(['solo', '2-10', '11-50', '51-200', '200+']).optional(),
  role: z.string().max(100).optional(),
  referralCode: z.string().max(50).optional(),
  utmSource: z.string().max(100).nullable().optional(),
  utmMedium: z.string().max(100).nullable().optional(),
  utmCampaign: z.string().max(100).nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = signupSchema.parse(body);

    // Check for existing signup
    const { data: existing } = await supabase
      .from('waitlist_signups')
      .select('id, email_confirmed, waitlist_position, unique_referral_code')
      .eq('email', data.email.toLowerCase())
      .single();

    if (existing) {
      // Return existing position if already signed up
      return NextResponse.json({
        message: 'You\'re already on the list!',
        position: existing.waitlist_position,
        referralCode: existing.unique_referral_code,
        alreadyExists: true,
      });
    }

    // Handle referral
    let referrerId: string | null = null;
    if (data.referralCode) {
      const { data: referrer } = await supabase
        .from('waitlist_signups')
        .select('id')
        .eq('unique_referral_code', data.referralCode.toUpperCase())
        .single();

      if (referrer) {
        referrerId = referrer.id;
        // Increment referrer's count and bump their position
        await supabase.rpc('process_referral', { referrer_id: referrerId });
      }
    }

    // Get IP and user agent for fraud prevention
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Insert new signup
    const { data: signup, error } = await supabase
      .from('waitlist_signups')
      .insert({
        email: data.email.toLowerCase(),
        first_name: data.firstName,
        company_name: data.companyName,
        company_size: data.companySize,
        role: data.role,
        referral_code: data.referralCode?.toUpperCase(),
        ip_address: ip,
        user_agent: userAgent,
        utm_source: data.utmSource,
        utm_medium: data.utmMedium,
        utm_campaign: data.utmCampaign,
      })
      .select('waitlist_position, unique_referral_code, confirmation_token')
      .single();

    if (error) {
      console.error('Signup error:', error);
      throw new Error('Failed to process signup');
    }

    // Send confirmation email
    await sendConfirmationEmail({
      email: data.email,
      firstName: data.firstName,
      position: signup.waitlist_position,
      referralCode: signup.unique_referral_code,
      confirmationToken: signup.confirmation_token,
    });

    return NextResponse.json({
      message: 'Successfully joined the waitlist!',
      position: signup.waitlist_position,
      referralCode: signup.unique_referral_code,
    });

  } catch (error) {
    console.error('Waitlist signup error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

async function sendConfirmationEmail(params: {
  email: string;
  firstName: string;
  position: number;
  referralCode: string;
  confirmationToken: string;
}) {
  const confirmUrl = `${process.env.NEXT_PUBLIC_URL}/api/waitlist/confirm?token=${params.confirmationToken}`;
  const referralUrl = `${process.env.NEXT_PUBLIC_URL}?ref=${params.referralCode}`;

  await resend.emails.send({
    from: 'SlottingPRO <hello@slottingpro.com>',
    to: params.email,
    subject: `You're #${params.position} on the SlottingPRO waitlist!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .position { font-size: 48px; font-weight: bold; color: #2563eb; }
            .button { 
              display: inline-block; 
              padding: 16px 32px; 
              background: #2563eb; 
              color: white; 
              text-decoration: none; 
              border-radius: 8px;
              font-weight: 600;
            }
            .referral-box {
              background: #f1f5f9;
              border-radius: 12px;
              padding: 24px;
              margin: 24px 0;
              text-align: center;
            }
            .referral-code {
              font-family: monospace;
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              letter-spacing: 2px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to SlottingPRO, ${params.firstName}! 🎉</h1>
            </div>
            
            <p>You're officially on the waitlist. Here's your position:</p>
            
            <p style="text-align: center;" class="position">#${params.position}</p>
            
            <p style="text-align: center;">
              <a href="${confirmUrl}" class="button">Confirm Your Email</a>
            </p>
            
            <div class="referral-box">
              <h3>Want to skip ahead?</h3>
              <p>Share your unique referral code with friends. For every person who joins, you'll move up 5 spots!</p>
              <p class="referral-code">${params.referralCode}</p>
              <p style="margin-top: 16px;">
                <a href="${referralUrl}">Share this link →</a>
              </p>
            </div>
            
            <p>We'll keep you updated on our progress. Expect to hear from us with:</p>
            <ul>
              <li>🎁 Early access invitations</li>
              <li>📊 Exclusive beta features</li>
              <li>💰 Founding member discounts</li>
            </ul>
            
            <p>Questions? Just reply to this email.</p>
            
            <p>– The SlottingPRO Team</p>
          </div>
        </body>
      </html>
    `,
  });
}
```

### 4.2 Email Confirmation Endpoint

```typescript
// app/api/waitlist/confirm/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/waitlist?error=invalid-token', request.url));
  }

  const { data, error } = await supabase
    .from('waitlist_signups')
    .update({
      email_confirmed: true,
      confirmed_at: new Date().toISOString(),
    })
    .eq('confirmation_token', token)
    .eq('email_confirmed', false)
    .select('email')
    .single();

  if (error || !data) {
    return NextResponse.redirect(new URL('/waitlist?error=invalid-token', request.url));
  }

  return NextResponse.redirect(new URL('/waitlist?confirmed=true', request.url));
}
```

---

## Part 5: Analytics & Tracking

### 5.1 Event Tracking Setup

```typescript
// lib/waitlist/analytics.ts

type EventName = 
  | 'waitlist_page_view'
  | 'waitlist_form_start'
  | 'waitlist_signup'
  | 'waitlist_referral_share'
  | 'waitlist_referral_copy';

interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

export function trackEvent(eventName: EventName, properties?: EventProperties) {
  // Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties);
  }

  // Vercel Analytics (if using)
  if (typeof window !== 'undefined' && window.va) {
    window.va('event', { name: eventName, ...properties });
  }

  // Optional: Send to your own analytics endpoint
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: eventName, properties, timestamp: Date.now() }),
  }).catch(() => {}); // Fire and forget
}

// Track page views with referral attribution
export function trackPageView() {
  const urlParams = new URLSearchParams(window.location.search);
  
  trackEvent('waitlist_page_view', {
    referral_code: urlParams.get('ref') || undefined,
    utm_source: urlParams.get('utm_source') || undefined,
    utm_medium: urlParams.get('utm_medium') || undefined,
    utm_campaign: urlParams.get('utm_campaign') || undefined,
  });
}
```

### 5.2 Conversion Tracking Script

Add to `app/waitlist/layout.tsx`:

```tsx
// app/waitlist/layout.tsx

import Script from 'next/script';

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Google Analytics 4 */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
        `}
      </Script>

      {children}
    </>
  );
}
```

---

## Part 6: SEO & Meta Configuration

### 6.1 Metadata Configuration

```tsx
// app/waitlist/page.tsx

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join the Waitlist | SlottingPRO - AI-Powered Warehouse Optimization',
  description: 'Be first to access SlottingPRO\'s revolutionary heatmap technology. Reduce pick times by 40%, optimize warehouse layouts with AI. Join 10,000+ operations leaders on our waitlist.',
  keywords: [
    'warehouse optimization',
    'slotting software',
    'warehouse heatmap',
    'pick optimization',
    'WMS integration',
    'supply chain software',
  ],
  openGraph: {
    title: 'SlottingPRO - Transform Your Warehouse Operations',
    description: 'AI-powered heatmaps that reduce pick times by 40%. Join the waitlist for early access.',
    url: 'https://slottingpro.com/waitlist',
    siteName: 'SlottingPRO',
    images: [
      {
        url: '/og-waitlist.png', // 1200x630
        width: 1200,
        height: 630,
        alt: 'SlottingPRO Waitlist',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SlottingPRO - Join the Waitlist',
    description: 'AI-powered warehouse optimization. Be first in line.',
    images: ['/twitter-card.png'], // 1200x600
  },
  robots: {
    index: true,
    follow: true,
  },
};
```

### 6.2 Structured Data

```tsx
// Add to page component

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SlottingPRO',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'AI-powered warehouse slotting and optimization software',
  offers: {
    '@type': 'Offer',
    availability: 'https://schema.org/PreOrder',
    price: '0',
    priceCurrency: 'USD',
  },
};

// In the component:
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
/>
```

---

## Part 7: Performance Requirements

### 7.1 Core Web Vitals Targets

| Metric | Target | Max |
|--------|--------|-----|
| LCP (Largest Contentful Paint) | < 2.0s | 2.5s |
| FID (First Input Delay) | < 50ms | 100ms |
| CLS (Cumulative Layout Shift) | < 0.05 | 0.1 |
| TTFB (Time to First Byte) | < 200ms | 600ms |

### 7.2 Performance Optimizations

```tsx
// Image optimization
import Image from 'next/image';

// Use blur placeholder for hero images
<Image
  src="/product-preview.png"
  alt="Product Preview"
  width={800}
  height={500}
  priority  // Load above-fold images immediately
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."  // Generate with plaiceholder
/>

// Lazy load below-fold images
<Image
  src="/testimonial-avatar.jpg"
  loading="lazy"
  ...
/>
```

### 7.3 Font Loading Strategy

```tsx
// app/waitlist/layout.tsx

import { Plus_Jakarta_Sans, Inter } from 'next/font/google';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

export default function Layout({ children }) {
  return (
    <html className={`${plusJakarta.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

---

## Part 8: Accessibility Requirements

### 8.1 WCAG 2.1 AA Compliance Checklist

- [ ] All images have descriptive alt text
- [ ] Color contrast ratios meet 4.5:1 for text, 3:1 for large text
- [ ] Form inputs have associated labels
- [ ] Focus states are clearly visible
- [ ] Page is navigable via keyboard
- [ ] Skip link provided for main content
- [ ] Semantic HTML structure (header, main, section, etc.)
- [ ] ARIA labels where needed
- [ ] Error messages are announced to screen readers

### 8.2 Implementation Example

```tsx
// Accessible form field
<div className="space-y-2">
  <label 
    htmlFor="email" 
    className="block text-sm font-medium text-slate-700"
  >
    Email address
    <span className="text-red-500 ml-1" aria-hidden="true">*</span>
    <span className="sr-only">(required)</span>
  </label>
  <input
    type="email"
    id="email"
    name="email"
    required
    aria-required="true"
    aria-invalid={errors.email ? 'true' : 'false'}
    aria-describedby={errors.email ? 'email-error' : undefined}
    className="..."
  />
  {errors.email && (
    <p id="email-error" className="text-sm text-red-600" role="alert">
      {errors.email}
    </p>
  )}
</div>
```

---

## Part 9: Testing Checklist

### 9.1 Functional Testing

- [ ] Form submission works correctly
- [ ] Duplicate email handling works
- [ ] Referral code validation works
- [ ] Email confirmation flow works
- [ ] Position calculation is accurate
- [ ] Social sharing links work
- [ ] Analytics events fire correctly

### 9.2 Visual Testing

- [ ] Responsive at 320px, 768px, 1024px, 1440px
- [ ] Dark mode / system preference respected (if implemented)
- [ ] Animations smooth at 60fps
- [ ] No layout shifts during load
- [ ] Images load correctly
- [ ] Fonts load without flash

### 9.3 Performance Testing

- [ ] Lighthouse score > 90 (all categories)
- [ ] Bundle size < 150KB (initial load)
- [ ] No render-blocking resources
- [ ] Images properly optimized

### 9.4 Security Testing

- [ ] Rate limiting on API endpoints
- [ ] Input sanitization
- [ ] CSRF protection
- [ ] No sensitive data in client-side code
- [ ] Proper error handling (no stack traces exposed)

---

## Part 10: Deployment Checklist

### 10.1 Environment Variables Required

```env
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Email
RESEND_API_KEY=

# Analytics
NEXT_PUBLIC_GA_ID=

# General
NEXT_PUBLIC_URL=https://slottingpro.com
```

### 10.2 Pre-Launch Checklist

- [ ] Database tables created and migrations run
- [ ] Email templates tested with real emails
- [ ] DNS configured for email sending domain
- [ ] SSL certificate active
- [ ] Error monitoring set up (Sentry recommended)
- [ ] Analytics verified working
- [ ] Social preview images uploaded
- [ ] OG tags tested with social card validators
- [ ] Mobile testing complete on real devices
- [ ] Load testing passed (simulate 1000 concurrent users)
- [ ] Backup and recovery plan documented

---

## Part 11: Post-Launch Optimization

### 11.1 A/B Testing Priorities

Test in this order (highest impact first):

1. **Headline copy** - Test 3-5 variations
2. **CTA button color and text** - "Join Waitlist" vs "Get Early Access" vs "Reserve My Spot"
3. **Social proof placement** - Above vs below fold
4. **Form length** - Email only vs email + name vs full qualification
5. **Urgency elements** - With/without countdown, position number

### 11.2 Metrics to Track

| Metric | Target | Red Flag |
|--------|--------|----------|
| Conversion Rate | 15-25% | < 8% |
| Email Confirmation Rate | > 60% | < 40% |
| Referral Share Rate | > 20% | < 5% |
| Bounce Rate | < 50% | > 70% |
| Time on Page | > 90s | < 30s |

---

## Summary

This specification provides a complete blueprint for building an enterprise-grade waitlist landing page. Key success factors:

1. **Above-fold clarity** - Answer "what, who, why" in 5 seconds
2. **Social proof** - Lead with credibility signals
3. **Low-friction signup** - Email + name minimum, qualify later
4. **Viral mechanics** - Referral codes that actually work
5. **Performance** - Fast load, smooth animations
6. **Accessibility** - Inclusive by default

Execute this spec in phases:
1. **MVP (Week 1):** Hero + basic form + email confirmation
2. **Enhancement (Week 2):** Social proof + FAQ + referral system
3. **Polish (Week 3):** Animations + A/B testing setup + analytics
4. **Optimization (Ongoing):** Test, iterate, improve conversion
