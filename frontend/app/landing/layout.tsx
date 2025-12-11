import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: 'Join the Waitlist | HeatmapSlotting - Visual Warehouse Optimization',
  description:
    "Be first to access HeatmapSlotting's heatmap technology. Reduce pick times by up to 40% with visual warehouse optimization. Join operations leaders on our waitlist.",
  keywords: [
    'warehouse optimization',
    'slotting software',
    'warehouse heatmap',
    'pick optimization',
    'WMS integration',
    'supply chain software',
  ],
  openGraph: {
    title: 'HeatmapSlotting - Transform Your Warehouse Operations',
    description:
      'Visual heatmaps that help reduce pick times by up to 40%. Join the waitlist for early access.',
    url: 'https://heatmapslotting.com/landing',
    siteName: 'HeatmapSlotting',
    images: [
      {
        url: '/og-waitlist.png',
        width: 1200,
        height: 630,
        alt: 'HeatmapSlotting Waitlist',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HeatmapSlotting - Join the Waitlist',
    description: 'Visual warehouse optimization with heatmaps. Be first in line.',
    images: ['/og-waitlist.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${plusJakarta.variable} ${inter.variable} font-sans`}>
      {children}
    </div>
  );
}
