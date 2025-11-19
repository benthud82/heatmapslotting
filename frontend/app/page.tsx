'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-blue-500 text-xl font-mono animate-pulse">Loading warehouse...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <Header
        title="Warehouse Heatmap Slotting"
        subtitle="Design and visualize optimal warehouse layouts"
      />

      {/* Main Content */}
      <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6">
        <div className="max-w-2xl mx-auto text-center">
          {/* Description */}
          <div className="mb-12">
            <p className="text-xl text-slate-300 leading-relaxed">
              Optimize your warehouse operations with our interactive slotting designer.
              Create, position, and manage warehouse elements to maximize efficiency and productivity.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              href="/heatmap"
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-mono font-bold text-lg rounded-lg shadow-xl shadow-blue-900/50 hover:shadow-2xl hover:shadow-blue-900/70 transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                VIEW HEATMAP
              </div>
            </Link>

            <Link
              href="/designer"
              className="group relative px-8 py-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white font-mono font-bold text-lg rounded-lg shadow-xl shadow-slate-900/50 hover:shadow-2xl hover:shadow-slate-900/70 transition-all duration-200 hover:scale-105 border-2 border-slate-600 hover:border-slate-500"
            >
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                OPEN DESIGNER
              </div>
            </Link>
          </div>

          {/* Features Preview */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Interactive Design</h3>
              <p className="text-sm text-slate-400">Drag, rotate, and position warehouse elements with precision</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Data Visualization</h3>
              <p className="text-sm text-slate-400">View heatmaps and analytics to optimize space utilization</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Real-time Sync</h3>
              <p className="text-sm text-slate-400">Changes automatically saved with live collaboration support</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}