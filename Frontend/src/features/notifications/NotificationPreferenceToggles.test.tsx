import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NotificationPreferenceToggles } from './NotificationPreferenceToggles';

describe('NotificationPreferenceToggles', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders the component with title and description', () => {
    render(<NotificationPreferenceToggles />);

    expect(
      screen.getByText('Notification Preferences')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Manage which notifications you want to receive')
    ).toBeInTheDocument();
  });

  it('renders all three notification preference toggles', () => {
    render(<NotificationPreferenceToggles />);

    expect(screen.getByText('Streak Reminders')).toBeInTheDocument();
    expect(
      screen.getByText('Goal Progress Messages')
    ).toBeInTheDocument();
    expect(screen.getByText('Loan-Related Alerts')).toBeInTheDocument();
  });

  it('renders descriptions for each toggle option', () => {
    render(<NotificationPreferenceToggles />);

    expect(
      screen.getByText('Get reminded to keep your savings streak going')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Receive updates on your financial goals')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Stay informed about your loans and repayment schedules'
      )
    ).toBeInTheDocument();
  });

  it('toggles preference when button is clicked', () => {
    render(<NotificationPreferenceToggles />);

    const streakReminderToggle = screen.getByRole('switch', {
      name: /Streak Reminders/i,
    });

    expect(streakReminderToggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(streakReminderToggle);

    expect(streakReminderToggle).toHaveAttribute('aria-checked', 'false');
  });

  it('shows saving state when toggle is clicked', () => {
    render(<NotificationPreferenceToggles />);

    const streakReminderToggle = screen.getByRole('switch', {
      name: /Streak Reminders/i,
    });

    fireEvent.click(streakReminderToggle);

    expect(screen.getByText('Saving preferences...')).toBeInTheDocument();
  });


  it('disables toggles while saving', async () => {
    render(<NotificationPreferenceToggles />);

    const streakReminderToggle = screen.getByRole('switch', {
      name: /Streak Reminders/i,
    });

    fireEvent.click(streakReminderToggle);

    expect(streakReminderToggle).toBeDisabled();

    await vi.runAllTimersAsync();

    expect(streakReminderToggle).not.toBeDisabled();
  });

  it('has proper keyboard navigation support', () => {
    render(<NotificationPreferenceToggles />);

    const streakReminderToggle = screen.getByRole('switch', {
      name: /Streak Reminders/i,
    });

    expect(streakReminderToggle).toBeInTheDocument();
    streakReminderToggle.focus();
    expect(streakReminderToggle).toHaveFocus();
  });

  it('renders all toggles with proper aria roles', () => {
    render(<NotificationPreferenceToggles />);

    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(3);

    switches.forEach((toggle) => {
      expect(toggle).toHaveAttribute('aria-checked');
    });
  });

  it('renders icons for each notification type', () => {
    render(<NotificationPreferenceToggles />);

    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('renders info message at the bottom', () => {
    render(<NotificationPreferenceToggles />);

    expect(
      screen.getByText(
        /Changes are saved automatically when you toggle preferences/i
      )
    ).toBeInTheDocument();
  });

  it('has accessible status region for success messages', () => {
    render(<NotificationPreferenceToggles />);

    const streakReminderToggle = screen.getByRole('switch', {
      name: /Streak Reminders/i,
    });

    fireEvent.click(streakReminderToggle);
    vi.runAllTimersAsync();

    const statusContainer = screen.getByRole('status', { hidden: true });
    expect(statusContainer).toHaveAttribute('aria-live', 'polite');
  });

  it('applies correct styling classes based on toggle state', () => {
    render(<NotificationPreferenceToggles />);

    const streakReminderToggle = screen.getByRole('switch', {
      name: /Streak Reminders/i,
    });

    // Initially enabled (primary color)
    expect(streakReminderToggle).toHaveClass('bg-primary-500');

    fireEvent.click(streakReminderToggle);

    // After toggle, disabled (gray color)
    expect(streakReminderToggle).toHaveClass('bg-gray-300');
  });

  it('preserves other toggle states when one is toggled', () => {
    render(<NotificationPreferenceToggles />);

    const streakReminderToggle = screen.getByRole('switch', {
      name: /Streak Reminders/i,
    });
    const goalProgressToggle = screen.getByRole('switch', {
      name: /Goal Progress Messages/i,
    });
    const loanAlertsToggle = screen.getByRole('switch', {
      name: /Loan-Related Alerts/i,
    });

    fireEvent.click(streakReminderToggle);

    expect(streakReminderToggle).toHaveAttribute('aria-checked', 'false');
    expect(goalProgressToggle).toHaveAttribute('aria-checked', 'true');
    expect(loanAlertsToggle).toHaveAttribute('aria-checked', 'true');
  });
});
