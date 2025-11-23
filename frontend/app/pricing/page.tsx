'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { loadStripe } from '@stripe/stripe-js';

const TIERS = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        features: ['1 Warehouse Layout', '50 Elements', '7 Days of Pick History'],
        cta: 'Current Plan',
        highlighted: false,
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 14,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
        features: ['5 Warehouse Layouts', '500 Elements', '90 Days of Pick History', 'Priority Support'],
        cta: 'Upgrade to Pro',
        highlighted: true,
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: null,
        features: ['Unlimited Layouts', 'Unlimited Elements', 'Unlimited History', 'Dedicated Support', 'SSO & Advanced Security'],
        cta: 'Contact Sales',
        highlighted: false,
    },
];

export default function PricingPage() {
    const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
    const [loading, setLoading] = useState<string | null>(null);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    const handleUpgrade = async (priceId: string, tierName: string) => {
        try {
            setLoading(tierName);

            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ priceId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create checkout session');
            }

            // Redirect to Stripe Checkout
            window.location.href = data.sessionUrl;
        } catch (err) {
            console.error('Upgrade error:', err);
            setAlertMessage('Failed to start upgrade. Please try again.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <Header title="Pricing" subtitle="Choose the plan that fits your needs" />

            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
                    <p className="text-xl text-slate-400">Start free, upgrade as you grow</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {TIERS.map((tier) => (
                        <div
                            key={tier.id}
                            className={`rounded-2xl p-8 ${tier.highlighted
                                ? 'bg-gradient-to-br from-blue-600 to-blue-800 ring-4 ring-blue-400 shadow-2xl shadow-blue-900/50 scale-105'
                                : 'bg-slate-900 border-2 border-slate-800'
                                }`}
                        >
                            {tier.highlighted && (
                                <div className="bg-yellow-400 text-slate-900 text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                                    MOST POPULAR
                                </div>
                            )}

                            <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                            <div className="mb-6">
                                {tier.price === null ? (
                                    <div className="text-3xl font-bold text-white">Contact Us</div>
                                ) : (
                                    <>
                                        <span className="text-5xl font-bold text-white">${tier.price}</span>
                                        <span className="text-slate-400">/month</span>
                                    </>
                                )}
                            </div>

                            <ul className="space-y-3 mb-8">
                                {tier.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-slate-300">
                                        <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {tier.id === 'free' ? (
                                <button
                                    disabled
                                    className="w-full py-3 px-6 bg-slate-700 text-slate-400 font-bold rounded-lg cursor-not-allowed"
                                >
                                    Current Plan
                                </button>
                            ) : tier.id === 'enterprise' ? (
                                <a
                                    href="mailto:sales@yourdomain.com"
                                    className="block w-full text-center py-3 px-6 bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    Contact Sales
                                </a>
                            ) : (
                                <button
                                    onClick={() => handleUpgrade(tier.stripePriceId!, tier.name)}
                                    disabled={loading === tier.name}
                                    className={`w-full py-3 px-6 font-bold rounded-lg transition-all ${tier.highlighted
                                        ? 'bg-white text-blue-600 hover:bg-slate-100 shadow-lg'
                                        : 'bg-blue-600 text-white hover:bg-blue-500'
                                        } ${loading === tier.name ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    {loading === tier.name ? 'Processing...' : tier.cta}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <Link href="/" className="text-blue-400 hover:text-blue-300 font-medium">
                        ← Back to Dashboard
                    </Link>
                </div>
            </main>

            {alertMessage && (
                <Modal
                    title="Notification"
                    onClose={() => setAlertMessage(null)}
                    width="max-w-sm"
                    footer={
                        <button
                            onClick={() => setAlertMessage(null)}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md"
                        >
                            OK
                        </button>
                    }
                >
                    <p className="text-slate-300">{alertMessage}</p>
                </Modal>
            )}
        </div>
    );
}
