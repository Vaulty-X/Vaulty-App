'use client';

import { useState, useRef } from 'react';
import { Bell, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface NotificationPreference {
  streakReminders: boolean;
  goalProgressMessages: boolean;
  loanAlerts: boolean;
}

interface SaveState {
  isSaving: boolean;
  success: boolean;
  error: string | null;
}

export function NotificationPreferenceToggles() {
  const [preferences, setPreferences] = useState<NotificationPreference>({
    streakReminders: true,
    goalProgressMessages: true,
    loanAlerts: true,
  });

  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    success: false,
    error: null,
  });

  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggle = (key: keyof NotificationPreference) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };

    setPreferences(newPreferences);
    savePreferences(newPreferences);
  };

  const savePreferences = async (
    prefsToSave: NotificationPreference
  ): Promise<void> => {
    setSaveState({ isSaving: true, success: false, error: null });

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock success response
      setSaveState({ isSaving: false, success: true, error: null });

      // Clear success message after 3 seconds
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }

      errorTimeoutRef.current = setTimeout(() => {
        setSaveState((prev) => ({ ...prev, success: false }));
      }, 3000);

      // Here you would normally call your API
      // const response = await fetch('/api/notifications/preferences', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(prefsToSave),
      // });
      // if (!response.ok) throw new Error('Failed to save preferences');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save preferences';
      setSaveState({
        isSaving: false,
        success: false,
        error: errorMessage,
      });

      // Clear error message after 5 seconds
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }

      errorTimeoutRef.current = setTimeout(() => {
        setSaveState((prev) => ({ ...prev, error: null }));
      }, 5000);

      // Revert the preference change on error
      setPreferences((prev) => {
        const changedKey = (Object.keys(prefsToSave) as Array<keyof NotificationPreference>).find(
          (k) =>
            prefsToSave[k] !== prev[k]
        );
        if (changedKey) {
          return {
            ...prev,
            [changedKey]: !prev[changedKey],
          };
        }
        return prev;
      });
    }
  };

  const toggleOptions = [
    {
      key: 'streakReminders' as const,
      label: 'Streak Reminders',
      description: 'Get reminded to keep your savings streak going',
      icon: '🔥',
    },
    {
      key: 'goalProgressMessages' as const,
      label: 'Goal Progress Messages',
      description: 'Receive updates on your financial goals',
      icon: '🎯',
    },
    {
      key: 'loanAlerts' as const,
      label: 'Loan-Related Alerts',
      description: 'Stay informed about your loans and repayment schedules',
      icon: '📋',
    },
  ];

  return (
    <div className="card max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="text-primary-500" size={24} />
        <div>
          <h2 className="text-xl font-semibold">Notification Preferences</h2>
          <p className="text-sm text-gray-500">
            Manage which notifications you want to receive
          </p>
        </div>
      </div>

      {/* Status Messages */}
      <div className="mb-6 space-y-2 min-h-[2.5rem]">
        {saveState.isSaving && (
          <div
            className="flex items-center gap-2 p-3 bg-blue-50 text-blue-800 rounded-lg"
            role="status"
            aria-live="polite"
            aria-label="Saving preferences"
          >
            <Loader size={18} className="animate-spin" />
            <span className="text-sm font-medium">Saving preferences...</span>
          </div>
        )}

        {saveState.success && !saveState.isSaving && (
          <div
            className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg"
            role="status"
            aria-live="polite"
            aria-label="Preferences saved successfully"
          >
            <CheckCircle size={18} />
            <span className="text-sm font-medium">
              Preferences saved successfully
            </span>
          </div>
        )}

        {saveState.error && (
          <div
            className="flex items-center gap-2 p-3 bg-red-50 text-red-800 rounded-lg"
            role="alert"
            aria-live="assertive"
            aria-label={`Error: ${saveState.error}`}
          >
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{saveState.error}</span>
          </div>
        )}
      </div>

      {/* Toggle Options */}
      <div className="space-y-4">
        {toggleOptions.map((option) => (
          <div
            key={option.key}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-2xl">{option.icon}</span>
              <div>
                <label
                  htmlFor={option.key}
                  className="block font-medium text-gray-900 cursor-pointer"
                >
                  {option.label}
                </label>
                <p className="text-sm text-gray-600">{option.description}</p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              id={option.key}
              onClick={() => handleToggle(option.key)}
              disabled={saveState.isSaving}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                preferences[option.key]
                  ? 'bg-primary-500'
                  : 'bg-gray-300'
              } ${saveState.isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              role="switch"
              aria-checked={preferences[option.key]}
              aria-labelledby={option.key}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  preferences[option.key] ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          ℹ️ Changes are saved automatically when you toggle preferences. You can
          manage these settings at any time.
        </p>
      </div>
    </div>
  );
}
