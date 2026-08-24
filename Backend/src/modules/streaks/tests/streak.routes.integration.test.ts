/**
 * Integration tests for GET /api/v1/streaks/current and
 * GET /api/v1/streaks/freeze-status
 *
 * Exercises the real Express router + auth middleware + controller +
 * service wiring, against fake in-memory repository/data-provider
 * implementations (no real database needed).
 */

import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createStreakRouter } from '../streak.routes';
import { StreakService } from '../streak.service';
import {
  StreakDataProvider,
  StreakRepository,
  UserStreakState,
} from '../streak.types';

const JWT_SECRET = 'test-secret';

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' });
}

class InMemoryStreakRepository implements StreakRepository {
  private states = new Map<string, UserStreakState>();
  private activities: Array<{ userId: string; activityDate: string; depositId: string }> = [];
  private freezes: any[] = [];

  async findStreakState(userId: string): Promise<UserStreakState | null> {
    return this.states.get(userId) ?? null;
  }

  async upsertStreakState(state: UserStreakState): Promise<UserStreakState> {
    this.states.set(state.userId, { ...state });
    return { ...state };
  }

  async findDailyActivities(userId: string, fromDate: string, toDate: string) {
    return this.activities
      .filter((a) => a.userId === userId && a.activityDate >= fromDate && a.activityDate <= toDate)
      .map((a) => ({ id: 'act_1', ...a, createdAt: new Date() }));
  }

  async recordDailyActivity(params: {
    userId: string;
    activityDate: string;
    depositId: string;
  }) {
    this.activities.push(params);
    return { id: 'act_1', ...params, createdAt: new Date() };
  }

  async findActiveFreeze(userId: string) {
    const today = '2026-08-24';
    return this.freezes.find((f: any) => f.userId === userId && !f.isUsed && f.approvedAt && f.freezeEndDate >= today) ?? null;
  }

  async createFreeze(params: any) {
    const freeze = { id: 'freeze_1', ...params, isUsed: false, usedAt: null, createdAt: new Date() };
    this.freezes.push(freeze);
    return freeze;
  }

  async markFreezeUsed(freezeId: string, usedAt: Date) {
    const freeze = this.freezes.find((f: any) => f.id === freezeId);
    if (freeze) {
      freeze.isUsed = true;
      freeze.usedAt = usedAt;
    }
    return freeze ?? null;
  }

  seedState(state: UserStreakState) {
    this.states.set(state.userId, state);
  }

  seedFreeze(freeze: any) {
    this.freezes.push(freeze);
  }
}

class StaticStreakDataProvider implements StreakDataProvider {
  constructor(private readonly timezone: string) {}

  async getUserTimezone(_userId: string): Promise<string> {
    return this.timezone;
  }
}

function buildApp(): { app: Express; repository: InMemoryStreakRepository } {
  const repository = new InMemoryStreakRepository();
  const dataProvider = new StaticStreakDataProvider('Africa/Lagos');
  const service = new StreakService(repository, dataProvider);

  const app = express();
  app.use(express.json());
  app.use('/api/v1/streaks', createStreakRouter(service));

  return { app, repository };
}

describe('GET /api/v1/streaks', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  describe('GET /api/v1/streaks/current', () => {
    it('returns 401 when no Authorization header is present', async () => {
      const { app } = buildApp();
      const res = await request(app).get('/api/v1/streaks/current');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ success: false, message: 'Invalid or expired token' });
    });

    it('returns 401 for a malformed or invalid token', async () => {
      const { app } = buildApp();
      const res = await request(app)
        .get('/api/v1/streaks/current')
        .set('Authorization', 'Bearer not-a-real-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns the streak data for the authenticated user', async () => {
      const { app, repository } = buildApp();
      const token = signToken('user-a');

      repository.seedState({
        userId: 'user-a',
        currentStreak: 5,
        longestStreak: 12,
        lastActivityDate: '2026-08-23',
        lastStreakDate: '2026-08-23',
        createdAt: new Date('2026-08-01'),
        updatedAt: new Date('2026-08-23'),
      });

      const res = await request(app)
        .get('/api/v1/streaks/current')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentStreak).toBe(5);
      expect(res.body.data.longestStreak).toBe(12);
      expect(res.body.data.lastActivityDate).toBe('2026-08-23');
      expect(res.body.data.nextMilestone).toEqual({
        days: 7,
        name: '7-Day Streak',
        description: 'Saved for a full week!',
        daysRemaining: 2,
      });
      expect(res.body.data.isMaxed).toBe(false);
    });

    it('returns zero streak for a user with no state', async () => {
      const { app } = buildApp();
      const token = signToken('user-new');

      const res = await request(app)
        .get('/api/v1/streaks/current')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.currentStreak).toBe(0);
      expect(res.body.data.longestStreak).toBe(0);
      expect(res.body.data.lastActivityDate).toBeNull();
      expect(res.body.data.nextMilestone).toEqual({
        days: 7,
        name: '7-Day Streak',
        description: 'Saved for a full week!',
        daysRemaining: 7,
      });
    });

    it("never leaks another user's streak data", async () => {
      const { app, repository } = buildApp();

      repository.seedState({
        userId: 'user-a',
        currentStreak: 10,
        longestStreak: 10,
        lastActivityDate: '2026-08-23',
        lastStreakDate: '2026-08-23',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      repository.seedState({
        userId: 'user-b',
        currentStreak: 3,
        longestStreak: 3,
        lastActivityDate: '2026-08-23',
        lastStreakDate: '2026-08-23',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const tokenA = signToken('user-a');
      const tokenB = signToken('user-b');

      const resA = await request(app)
        .get('/api/v1/streaks/current')
        .set('Authorization', `Bearer ${tokenA}`);
      const resB = await request(app)
        .get('/api/v1/streaks/current')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resA.body.data.currentStreak).toBe(10);
      expect(resB.body.data.currentStreak).toBe(3);
    });
  });

  describe('GET /api/v1/streaks/freeze-status', () => {
    it('returns 401 when no Authorization header is present', async () => {
      const { app } = buildApp();
      const res = await request(app).get('/api/v1/streaks/freeze-status');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ success: false, message: 'Invalid or expired token' });
    });

    it('returns no eligible freeze when none exists', async () => {
      const { app } = buildApp();
      const token = signToken('user-a');

      const res = await request(app)
        .get('/api/v1/streaks/freeze-status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasEligibleFreeze).toBe(false);
      expect(res.body.data.freeze).toBeNull();
    });

    it('returns an eligible freeze when one exists', async () => {
      const { app, repository } = buildApp();
      const token = signToken('user-a');

      repository.seedFreeze({
        id: 'freeze_1',
        userId: 'user-a',
        freezeStartDate: '2026-08-24',
        freezeEndDate: '2026-08-31',
        isUsed: false,
        approvedAt: new Date('2026-08-20'),
        usedAt: null,
        createdAt: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/streaks/freeze-status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasEligibleFreeze).toBe(true);
      expect(res.body.data.freeze).not.toBeNull();
      expect(res.body.data.freeze.freezeStartDate).toBe('2026-08-24');
      expect(res.body.data.freeze.freezeEndDate).toBe('2026-08-31');
    });
  });
});
