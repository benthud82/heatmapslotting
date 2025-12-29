'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { LaborStandards, LaborStandardsUpdate, laborStandardsApi } from '@/lib/laborApi';

interface LaborConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  layoutId: string;
  currentStandards: LaborStandards | null;
  onSave: (standards: LaborStandards) => void;
}

type TabType = 'time' | 'allowances' | 'cost';

const DEFAULT_STANDARDS: LaborStandardsUpdate = {
  pick_time_seconds: 15.0,
  walk_speed_fpm: 264.0,
  pack_time_seconds: 30.0,
  putaway_time_seconds: 20.0,
  fatigue_allowance_percent: 10.0,
  delay_allowance_percent: 5.0,
  reslot_time_minutes: 12.0,
  hourly_labor_rate: 18.0,
  benefits_multiplier: 1.30,
  shift_hours: 8.0,
  target_efficiency_percent: 85.0,
};

export default function LaborConfigModal({
  isOpen,
  onClose,
  layoutId,
  currentStandards,
  onSave,
}: LaborConfigModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('time');
  const [formData, setFormData] = useState<LaborStandardsUpdate>(DEFAULT_STANDARDS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && currentStandards) {
      setFormData({
        pick_time_seconds: currentStandards.pick_time_seconds,
        walk_speed_fpm: currentStandards.walk_speed_fpm,
        pack_time_seconds: currentStandards.pack_time_seconds,
        putaway_time_seconds: currentStandards.putaway_time_seconds,
        fatigue_allowance_percent: currentStandards.fatigue_allowance_percent,
        delay_allowance_percent: currentStandards.delay_allowance_percent,
        reslot_time_minutes: currentStandards.reslot_time_minutes,
        hourly_labor_rate: currentStandards.hourly_labor_rate,
        benefits_multiplier: currentStandards.benefits_multiplier,
        shift_hours: currentStandards.shift_hours,
        target_efficiency_percent: currentStandards.target_efficiency_percent,
      });
    } else if (isOpen) {
      setFormData(DEFAULT_STANDARDS);
    }
    setError(null);
  }, [isOpen, currentStandards]);

  const handleChange = (field: keyof LaborStandardsUpdate, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setFormData((prev) => ({ ...prev, [field]: numValue }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const updated = await laborStandardsApi.update(layoutId, formData);
      onSave(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save standards');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(DEFAULT_STANDARDS);
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'time',
      label: 'Time Standards',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'allowances',
      label: 'Allowances',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: 'cost',
      label: 'Cost & Shift',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <Modal
      title="Labor Standards Configuration"
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-mono text-slate-400 hover:text-white transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono text-sm rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:cursor-not-allowed text-white font-mono text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </>
      }
    >
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-800/50 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-mono transition-colors ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'time' && (
          <>
            <p className="text-sm text-slate-500 mb-4">
              Configure the engineered time standards for each picking operation.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Pick Time"
                value={formData.pick_time_seconds || 0}
                onChange={(v) => handleChange('pick_time_seconds', v)}
                unit="seconds"
                description="Time to pick one item from shelf"
              />
              <InputField
                label="Walk Speed"
                value={formData.walk_speed_fpm || 0}
                onChange={(v) => handleChange('walk_speed_fpm', v)}
                unit="ft/min"
                description="Walking speed (264 = 3 mph)"
              />
              <InputField
                label="Pack Time"
                value={formData.pack_time_seconds || 0}
                onChange={(v) => handleChange('pack_time_seconds', v)}
                unit="seconds"
                description="Time to pack one item"
              />
              <InputField
                label="Put Away Time"
                value={formData.putaway_time_seconds || 0}
                onChange={(v) => handleChange('putaway_time_seconds', v)}
                unit="seconds"
                description="Time for put-away operations"
              />
              <InputField
                label="Reslot Time"
                value={formData.reslot_time_minutes || 0}
                onChange={(v) => handleChange('reslot_time_minutes', v)}
                unit="minutes"
                description="Time to relocate one item (for ROI)"
              />
            </div>
          </>
        )}

        {activeTab === 'allowances' && (
          <>
            <p className="text-sm text-slate-500 mb-4">
              Configure time allowances that account for non-productive time.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Fatigue Allowance"
                value={formData.fatigue_allowance_percent || 0}
                onChange={(v) => handleChange('fatigue_allowance_percent', v)}
                unit="%"
                description="Personal and fatigue time"
              />
              <InputField
                label="Delay Allowance"
                value={formData.delay_allowance_percent || 0}
                onChange={(v) => handleChange('delay_allowance_percent', v)}
                unit="%"
                description="Unavoidable delays"
              />
            </div>

            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <p className="text-sm text-slate-400">
                <span className="font-bold text-white">Total Allowance Multiplier: </span>
                {(
                  1 +
                  (formData.fatigue_allowance_percent || 0) / 100 +
                  (formData.delay_allowance_percent || 0) / 100
                ).toFixed(2)}
                x
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Standard time is multiplied by this factor to account for breaks and delays.
              </p>
            </div>
          </>
        )}

        {activeTab === 'cost' && (
          <>
            <p className="text-sm text-slate-500 mb-4">
              Configure labor costs and shift parameters for staffing and ROI calculations.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Hourly Rate"
                value={formData.hourly_labor_rate || 0}
                onChange={(v) => handleChange('hourly_labor_rate', v)}
                unit="$/hr"
                description="Base hourly labor rate"
                prefix="$"
              />
              <InputField
                label="Benefits Multiplier"
                value={formData.benefits_multiplier || 0}
                onChange={(v) => handleChange('benefits_multiplier', v)}
                unit="x"
                description="Total cost = rate x multiplier"
              />
              <InputField
                label="Shift Hours"
                value={formData.shift_hours || 0}
                onChange={(v) => handleChange('shift_hours', v)}
                unit="hours"
                description="Standard shift length"
              />
              <InputField
                label="Target Efficiency"
                value={formData.target_efficiency_percent || 0}
                onChange={(v) => handleChange('target_efficiency_percent', v)}
                unit="%"
                description="Efficiency goal percentage"
              />
            </div>

            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <p className="text-sm text-slate-400">
                <span className="font-bold text-white">Fully Loaded Rate: </span>$
                {((formData.hourly_labor_rate || 0) * (formData.benefits_multiplier || 1)).toFixed(2)}
                /hour
              </p>
              <p className="text-xs text-slate-500 mt-1">
                This rate is used for all labor cost calculations.
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// Input Field Component
interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: string) => void;
  unit: string;
  description: string;
  prefix?: string;
}

function InputField({ label, value, onChange, unit, description, prefix }: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-mono text-slate-300 mb-1">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          step="0.1"
          min="0"
          className={`w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pr-12 text-white font-mono text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none ${
            prefix ? 'pl-7' : 'pl-3'
          }`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">{unit}</span>
      </div>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  );
}
