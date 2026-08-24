/**
 * Unit tests for StreakService
 *
 * Validates first deposit, consecutive days, missed days, duplicate
 * events, and freeze use. Uses in-memory repository/data-provider
 * implementations so no real database is needed.
 */

import { StreakService } from '../streak.service';
import {
  StreakDataProvider,
  StreakRepository,
  StreakDailyActivity,
  UserStreakFreeze,
  UserStreakState,
} from '../streak.types';

const FIXED_NOW = new Date('2026-08-24T12:00:00.000Z');

class InMemoryStreakRepository implements StreakRepository {
  private states = new Map<string, UserStreakState>();
  private activities: StreakDailyActivity[] = [];
  private freezes: UserStreakFreeze[] = [];
  private activityId = 0;
  private freezeId = 0;

  async findStreakState(userId: string): Promise<UserStreakState | null> {
    return this.states.get(userId) ?? null;
  }

  async upsertStreakState(state: UserStreakState): Promise<UserStreakState> {
    const existing = this.states.get(state.userId);
    this.states.set(state.userId, { ...state });
    return { ...state, createdAt: existing?.createdAt ?? state.createdAt };
  }

  async findDailyActivities(userId: string, fromDate: string, toDate: string): Promise<StreakDailyActivity[]> {
    return this.activities.filter(
      (a) => a.userId === userId && a.activityDate >= fromDate && a.activityDate <= toDate
    );
  }

  async recordDailyActivity(params: {
    userId: string;
    activityDate: string;
    depositId: string;
  }): Promise<StreakDailyActivity> {
    const existing = this.activities.find(
      (a) => a.userId === params.userId && a.depositId === params.depositId
    );
    if (existing) {
      return existing;
    }

    const activity: StreakDailyActivity = {
      id: `activity_${++this.activityId}`,
      userId: params.userId,
      activityDate: params.activityDate,
      depositId: params.depositId,
      createdAt: FIXED_NOW,
    };
    this.activities.push(activity);
    return activity;
  }

  async findActiveFreeze(userId: string): Promise<UserStreakFreeze | null> {
    const today = '2026-08-24';
    return (
      this.freezes.find(
        (f) =>
          f.userId === userId &&
          !f.isUsed &&
          f.approvedAt !== null &&
          f.freezeEndDate >= today
      ) ?? null
    );
  }

  async createFreeze(params: {
    userId: string;
    freezeStartDate: string;
    freezeEndDate: string;
    approvedAt: Date | null;
  }): Promise<UserStreakFreeze> {
    const freeze: UserStreakFreeze = {
      id: `freeze_${++this.freezeId}`,
      userId: params.userId,
      freezeStartDate: params.freezeStartDate,
      freezeEndDate: params.freezeEndDate,
      isUsed: false,
      approvedAt: params.approvedAt,
      usedAt: null,
      createdAt: FIXED_NOW,
    };
    this.freezes.push(freeze);
    return freeze;
  }

  async markFreezeUsed(freezeId: string, usedAt: Date): Promise<UserStreakFreeze | null> {
    const freeze = this.freezes.find((f) => f.id === freezeId && !f.isUsed);
    if (!freeze) {
      return null;
    }
    freeze.isUsed = true;
    freeze.usedAt = usedAt;
    return { ...freeze };
  }
}

class StaticStreakDataProvider implements StreakDataProvider {
  constructor(private readonly timezone: string) {}

  async getUserTimezone(_userId: string): Promise<string> {
    return this.timezone;
  }
}

function buildService(timezone = 'Africa/Lagos'): {
  service: StreakService;
  repository: InMemoryStreakRepository;
} {
  const repository = new InMemoryStreakRepository();
  const dataProvider = new StaticStreakDataProvider(timezone);
  const service = new StreakService(repository, dataProvider);
  return { service, repository };
}

describe('StreakService', () => {
  describe('recordDeposit', () => {
    it('starts a new streak of 1 on the first deposit', async () => {
      const { service } = buildService();
      const result = await service.recordDeposit({
        depositId: 'dep_1',
        userId: 'user-1',
        confirmedAt: FIXED_NOW,
        amount: 100,
      });

      expect(result.activityDate).toBe('2026-08-24');
      const state = await service.getStreakState('user-1');
      expect(state.currentStreak).toBe(1);
      expect(state.longestStreak).toBe(1);
      expect(state.lastActivityDate).toBe('2026-08-24');
    });

    it('extends the streak on a consecutive day', async () => {
      const { service } = buildService();
      await service.recordDeposit({
        depositId: 'dep_1',
        userId: 'user-1',
        confirmedAt: FIXED_NOW,
        amount: 100,
      });

      const nextDay = new Date(FIXED_NOW);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      await service.recordDeposit({
        depositId: 'dep_2',
        userId: 'user-1',
        confirmedAt: nextDay,
        amount: 200,
      });

      const state = await service.getStreakState('user-1');
      expect(state.currentStreak).toBe(2);
      expect(state.longestStreak).toBe(2);
      expect(state.lastActivityDate).toBe('2026-08-25');
    });

    it('resets the streak after a missed day', async () => {
      const { service } = buildService();
      await service.recordDeposit({
        depositId: 'dep_1',
        userId: 'user-1',
        confirmedAt: FIXED_NOW,
        amount: 100,
      });

      const missedDay = new Date(FIXED_NOW);
      missedDay.setUTCDate(missedDay.getUTCDate() + 3);
      await service.recordDeposit({
        depositId: 'dep_2',
        userId: 'user-1',
        confirmedAt: missedDay,
        amount: 300,
      });

      const state = await service.getStreakState('user-1');
      expect(state.currentStreak).toBe(1);
      expect(state.longestStreak).toBe(1);
      expect(state.lastActivityDate).toBe('2026-08-27');
    });

    it('ignores duplicate deposit ids', async () => {
      const { service, repository } = buildService();
      await service.recordDeposit({
        depositId: 'dep_1',
        userId: 'user-1',
        confirmedAt: FIXED_NOW,
        amount: 100,
      });

      const firstCount = (await repository.findDailyActivities('user-1', '2026-08-01', '2026-08-31')).length;

      await service.recordDeposit({
        depositId: 'dep_1',
        userId: 'user-1',
        confirmedAt: FIXED_NOW,
        amount: 100,
      });

      const secondCount = (await repository.findDailyActivities('user-1', '2026-08-01', '2026-08-31')).length;
      expect(secondCount).toBe(firstCount);
      expect(secondCount).toBe(1);
    });

    it('updates longest streak correctly', async () => {
      const { service } = buildService();

      for (let i = 0; i < 5; i++) {
        const day = new Date(FIXED_NOW);
        day.setUTCDate(day.getUTCDate() + i);
        await service.recordDeposit({
          depositId: `dep_${i + 1}`,
          userId: 'user-1',
          confirmedAt: day,
          amount: 100,
        });
      }

      const state = await service.getStreakState('user-1');
      expect(state.currentStreak).toBe(5);
      expect(state.longestStreak).toBe(5);
    });
  });

  describe('getStreakState', () => {
    it('returns zero streak for a user with no activity', async () => {
      const { service } = buildService();
      const state = await service.getStreakState('user-new');
      expect(state.currentStreak).toBe(0);
      expect(state.longestStreak).toBe(0);
      expect(state.lastActivityDate).toBeNull();
    });
  });

  describe('getFreezeStatus', () => {
    it('returns no freeze when none exists', async () => {
      const { service } = buildService();
      const status = await service.getFreezeStatus('user-1');
      expect(status.hasEligibleFreeze).toBe(false);
      expect(status.freeze).toBeNull();
    });

    it('returns an eligible freeze when one exists', async () => {
      const { service, repository } = buildService();
      await repository.createFreeze({
        userId: 'user-1',
        freezeStartDate: '2026-08-24',
        freezeEndDate: '2026-08-31',
        approvedAt: FIXED_NOW,
      });

      const status = await service.getFreezeStatus('user-1');
      expect(status.hasEligibleFreeze).toBe(true);
      expect(status.freeze).not.toBeNull();
      expect(status.freeze!.freezeStartDate).toBe('2026-08-24');
      expect(status.freeze!.freezeEndDate).toBe('2026-08-31');
    });
  });

  describe('evaluateUserStreak', () => {
    it('extends streak when previous day had activity', async () => {
      const { service, repository } = buildService();

      await repository.recordDailyActivity({
        userId: 'user-1',
        activityDate: '2026-08-22',
        depositId: 'dep_1',
      });
      await repository.upsertStreakState({
        userId: 'user-1',
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: '2026-08-22',
        lastStreakDate: '2026-08-22',
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      });

      await repository.recordDailyActivity({
        userId: 'user-1',
        activityDate: '2026-08-23',
        depositId: 'dep_2',
      });

      const evaluationDate = new Date('2026-08-24T00:00:00.000Z');
      const result = await service.evaluateUserStreak('user-1', evaluationDate);

      expect(result.streakUpdated).toBe(true);
      expect(result.newCurrentStreak).toBe(2);
    });

    it('resets streak when previous day had no activity and no freeze', async () => {
      const { service, repository } = buildService();

      await repository.recordDailyActivity({
        userId: 'user-1',
        activityDate: '2026-08-22',
        depositId: 'dep_1',
      });
      await repository.upsertStreakState({
        userId: 'user-1',
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: '2026-08-22',
        lastStreakDate: '2026-08-22',
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      });

      const evaluationDate = new Date('2026-08-24T00:00:00.000Z');
      const result = await service.evaluateUserStreak('user-1', evaluationDate);

      expect(result.streakUpdated).toBe(true);
      expect(result.newCurrentStreak).toBe(0);
    });

    it('uses freeze to preserve streak through a missed day', async () => {
      const { service, repository } = buildService();

      await repository.recordDailyActivity({
        userId: 'user-1',
        activityDate: '2026-08-22',
        depositId: 'dep_1',
      });
      await repository.upsertStreakState({
        userId: 'user-1',
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: '2026-08-22',
        lastStreakDate: '2026-08-22',
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      });

      await repository.createFreeze({
        userId: 'user-1',
        freezeStartDate: '2026-08-23',
        freezeEndDate: '2026-08-31',
        approvedAt: FIXED_NOW,
      });

      const evaluationDate = new Date('2026-08-24T00:00:00.000Z');
      const result = await service.evaluateUserStreak('user-1', evaluationDate);

      expect(result.freezeUsed).toBe(true);
      expect(result.newCurrentStreak).toBe(1);
    });

    it('does not use an expired freeze', async () => {
      const { service, repository } = buildService();

      await repository.recordDailyActivity({
        userId: 'user-1',
        activityDate: '2026-08-22',
        depositId: 'dep_1',
      });
      await repository.upsertStreakState({
        userId: 'user-1',
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: '2026-08-22',
        lastStreakDate: '2026-08-22',
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      });

      await repository.createFreeze({
        userId: 'user-1',
        freezeStartDate: '2026-01-01',
        freezeEndDate: '2026-01-07',
        approvedAt: FIXED_NOW,
      });

      const evaluationDate = new Date('2026-08-24T00:00:00.000Z');
      const result = await service.evaluateUserStreak('user-1', evaluationDate);

      expect(result.freezeUsed).toBe(false);
      expect(result.newCurrentStreak).toBe(0);
    });

    it('is idempotent for the same evaluation date', async () => {
      const { service, repository } = buildService();

      await repository.recordDailyActivity({
        userId: 'user-1',
        activityDate: '2026-08-22',
        depositId: 'dep_1',
      });
      await repository.upsertStreakState({
        userId: 'user-1',
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: '2026-08-22',
        lastStreakDate: '2026-08-22',
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      });

      await repository.recordDailyActivity({
        userId: 'user-1',
        activityDate: '2026-08-23',
        depositId: 'dep_2',
      });

      const evaluationDate = new Date('2026-08-24T00:00:00.000Z');
      const first = await service.evaluateUserStreak('user-1', evaluationDate);
      const second = await service.evaluateUserStreak('user-1', evaluationDate);

      expect(first.newCurrentStreak).toBe(2);
      expect(second.newCurrentStreak).toBe(2);
      expect(second.streakUpdated).toBe(false);
    });
  });

  describe('requestFreeze', () => {
    it('creates a pending freeze', async () => {
      const { service } = buildService();
      const freeze = await service.requestFreeze('user-1', 3);
      expect(freeze.freezeStartDate).toBe('2026-08-24');
      expect(freeze.freezeEndDate).toBe('2026-08-27');
      expect(freeze.isUsed).toBe(false);
      expect(freeze.approvedAt).toBeNull();
    });
  });
});
