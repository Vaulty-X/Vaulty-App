/**
 * Integration tests for GET /api/v1/discipline-score
 *
 * Exercises the real Express router + auth middleware + controller +
 * service wiring, against fake in-memory repository/data-provider
 * implementations of the `DisciplineScoreRepository` /
 * `DisciplineScoreDataProvider` interfaces (no real database needed).
 */

import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createDisciplineScoreRouter } from '../discipline-score.routes';
import { DisciplineScoreService } from '../discipline-score.service';
import {
  DisciplineScoreDataProvider,
  DisciplineScoreInputs,
  DisciplineScoreRepository,
  DisciplineScoreResult,
  DisciplineScoreSnapshot,
} from '../discipline-score.types';

const JWT_SECRET = 'test-secret';

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' });
}

class InMemoryDisciplineScoreRepository implements DisciplineScoreRepository {
  private readonly snapshotsByUser = new Map<string, DisciplineScoreSnapshot>();
  private counter = 0;

  async findLatestByUserId(userId: string): Promise<DisciplineScoreSnapshot | null> {
    return this.snapshotsByUser.get(userId) ?? null;
  }

  async createSnapshot(
    userId: string,
    result: DisciplineScoreResult
  ): Promise<DisciplineScoreSnapshot> {
    this.counter += 1;
    const snapshot: DisciplineScoreSnapshot = {
      id: `snapshot_${this.counter}`,
      userId,
      score: result.score,
      factors: result.factors,
      createdAt: result.calculatedAt,
    };
    this.snapshotsByUser.set(userId, snapshot);
    return snapshot;
  }
}

class StaticDisciplineScoreDataProvider implements DisciplineScoreDataProvider {
  public callCountByUser = new Map<string, number>();

  constructor(private readonly inputsByUser: Record<string, DisciplineScoreInputs>) {}

  async getInputsForUser(userId: string): Promise<DisciplineScoreInputs> {
    this.callCountByUser.set(userId, (this.callCountByUser.get(userId) ?? 0) + 1);
    const inputs = this.inputsByUser[userId];
    if (!inputs) {
      throw new Error(`No fixture inputs configured for user ${userId}`);
    }
    return inputs;
  }
}

const userAInputs: DisciplineScoreInputs = {
  savingConsistency: { expectedPeriods: 10, activePeriods: 8 },
  streak: { currentStreakDays: 30 },
  goalProgress: { goals: [{ targetAmount: 1000, currentAmount: 500 }] },
  repaymentHistory: null,
};

const userBInputs: DisciplineScoreInputs = {
  savingConsistency: { expectedPeriods: 10, activePeriods: 2 },
  streak: { currentStreakDays: 5 },
  goalProgress: null,
  repaymentHistory: { confirmedRepayments: 4, onTimeRepayments: 4 },
};

function buildApp(): { app: Express; dataProvider: StaticDisciplineScoreDataProvider } {
  const repository = new InMemoryDisciplineScoreRepository();
  const dataProvider = new StaticDisciplineScoreDataProvider({
    'user-a': userAInputs,
    'user-b': userBInputs,
  });
  const service = new DisciplineScoreService(repository, dataProvider);

  const app = express();
  app.use(express.json());
  app.use('/api/v1/discipline-score', createDisciplineScoreRouter(service));

  return { app, dataProvider };
}

describe('GET /api/v1/discipline-score', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('returns 401 when no Authorization header is present', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/api/v1/discipline-score');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: 'Invalid or expired token' });
  });

  it('returns 401 for a malformed or invalid token', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .get('/api/v1/discipline-score')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns the score, factor breakdown, and update time for the authenticated user', async () => {
    const { app } = buildApp();
    const token = signToken('user-a');

    const res = await request(app)
      .get('/api/v1/discipline-score')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // savingConsistency 80*0.4375 + streakLength 50*0.3125 + goalProgress 50*0.25
    // = 35 + 15.625 + 12.5 = 63.125 -> rounds to 63
    expect(res.body.data.score).toBe(63);
    expect(res.body.data.score).toBeGreaterThanOrEqual(0);
    expect(res.body.data.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(res.body.data.factors)).toBe(true);
    expect(res.body.data.factors).toHaveLength(4);
    expect(res.body.data.updatedAt).toBeDefined();
    expect(res.body.data.disclaimer).toMatch(/not a credit score/i);
    expect(res.body.data.disclaimer).toMatch(/never.*automated lending/i);
  });

  it("never leaks another user's score data, and each user only ever sees their own", async () => {
    const { app } = buildApp();

    const tokenA = signToken('user-a');
    const tokenB = signToken('user-b');

    const resA = await request(app)
      .get('/api/v1/discipline-score')
      .set('Authorization', `Bearer ${tokenA}`);
    const resB = await request(app)
      .get('/api/v1/discipline-score')
      .set('Authorization', `Bearer ${tokenB}`);

    // Distinct, fixture-derived scores confirm each request was scoped
    // to the token's own user, not a shared/cached result.
    expect(resA.body.data.score).toBe(63);
    expect(resB.body.data.score).toBe(36);

    // Calling again for user A returns the same persisted snapshot,
    // never user B's data.
    const resA2 = await request(app)
      .get('/api/v1/discipline-score')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(resA2.body.data.score).toBe(resA.body.data.score);
  });

  it('persists a snapshot on first request and reuses it on the next request', async () => {
    const { app, dataProvider } = buildApp();
    const token = signToken('user-a');

    await request(app).get('/api/v1/discipline-score').set('Authorization', `Bearer ${token}`);
    await request(app).get('/api/v1/discipline-score').set('Authorization', `Bearer ${token}`);

    // The data provider (ledger read) is only hit once per request in
    // this test, but the repository should have short-circuited the
    // second call by returning the already-persisted snapshot rather
    // than silently recomputing and re-inserting on every read.
    expect(dataProvider.callCountByUser.get('user-a')).toBe(1);
  });
});
