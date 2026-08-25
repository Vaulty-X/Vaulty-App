import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createYieldRouter } from '../yield.routes';
import { YieldAccrualService } from '../yield-accrual.service';
import { YieldAccrual, YieldRepository, YieldSummary, YieldVault, YieldVaultProvider } from '../yield.types';

const secret = 'yield-test-secret';
const testVault: YieldVault = {
  id: 'vault-1', userId: 'user-1', status: 'ACTIVE', yieldType: 'FIXED',
  confirmedBalance: '1000.00', annualRate: '0.365', rateSource: 'test',
};

class ApiProvider implements YieldVaultProvider {
  async listEligibleVaults(): Promise<YieldVault[]> { return [testVault]; }
  async findVaultForUser(vaultId: string, userId: string): Promise<YieldVault | null> {
    return vaultId === testVault.id && userId === testVault.userId ? testVault : null;
  }
}

class ApiRepository implements YieldRepository {
  async upsertAccrual(_input: Omit<YieldAccrual, 'id' | 'createdAt'>): Promise<YieldAccrual> { throw new Error('not used'); }
  async getSummary(_vaultId: string): Promise<YieldSummary> {
    return { estimatedAccrued: '1.00', settled: '0.25', withdrawable: '0.00', total: '1.25' };
  }
  async listHistory(_vaultId: string, page: number, limit: number) {
    return { items: [], pagination: { page, limit, total: 0, pages: 0 } };
  }
}

function buildApp(): Express {
  const app = express();
  app.use('/api/v1/yield', createYieldRouter(new YieldAccrualService(new ApiRepository(), new ApiProvider())));
  return app;
}

describe('yield history API', () => {
  beforeAll(() => { process.env.JWT_SECRET = secret; });

  it('requires auth and returns an authenticated vault history page', async () => {
    const app = buildApp();
    const missing = await request(app).get('/api/v1/yield/vault-1/accruals');
    expect(missing.status).toBe(401);

    const token = jwt.sign({ sub: 'user-1' }, secret);
    const response = await request(app)
      .get('/api/v1/yield/vault-1/accruals?page=2&limit=10')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.pagination).toEqual({ page: 2, limit: 10, total: 0, pages: 0 });
  });

  it('does not expose another user\'s vault', async () => {
    const token = jwt.sign({ sub: 'user-2' }, secret);
    const response = await request(buildApp())
      .get('/api/v1/yield/vault-1/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(404);
  });
});