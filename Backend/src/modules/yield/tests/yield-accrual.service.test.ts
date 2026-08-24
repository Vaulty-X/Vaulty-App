import { calculateDailyAccrual, YieldAccrualService } from '../yield-accrual.service';
import { YieldAccrual, YieldRepository, YieldSummary, YieldVault, YieldVaultProvider } from '../yield.types';

class InMemoryYieldRepository implements YieldRepository {
  readonly entries = new Map<string, YieldAccrual>();

  async upsertAccrual(input: Omit<YieldAccrual, 'id' | 'createdAt'>): Promise<YieldAccrual> {
    const key = `${input.vaultId}:${input.accrualDate}`;
    const existing = this.entries.get(key);
    const entry = { ...input, id: existing?.id ?? key, createdAt: existing?.createdAt ?? new Date() };
    this.entries.set(key, entry);
    return entry;
  }

  async getSummary(_vaultId: string): Promise<YieldSummary> {
    return { estimatedAccrued: '0.00', settled: '0.00', withdrawable: '0.00', total: '0.00' };
  }

  async listHistory(): Promise<never> {
    throw new Error('not used');
  }
}

class FixedVaultProvider implements YieldVaultProvider {
  constructor(private readonly vaults: YieldVault[]) {}
  async listEligibleVaults(): Promise<YieldVault[]> { return this.vaults; }
  async findVaultForUser(vaultId: string, userId: string): Promise<YieldVault | null> {
    return this.vaults.find((vault) => vault.id === vaultId && vault.userId === userId) ?? null;
  }
}

const vault = (overrides: Partial<YieldVault> = {}): YieldVault => ({
  id: 'vault-1', userId: 'user-1', status: 'ACTIVE', yieldType: 'FIXED',
  confirmedBalance: '1000.00', annualRate: '0.365', rateSource: 'test-rate', ...overrides,
});

describe('YieldAccrualService', () => {
  it('calculates decimal-safe daily accruals with monetary rounding', () => {
    expect(calculateDailyAccrual('1000.00', '0.365')).toBe('1.00');
    expect(calculateDailyAccrual('0.01', '0.05')).toBe('0.00');
  });

  it('processes only active fixed-yield vaults with confirmed balances', async () => {
    const repository = new InMemoryYieldRepository();
    const provider = new FixedVaultProvider([
      vault(),
      vault({ id: 'locked', status: 'LOCKED' }),
      vault({ id: 'variable', yieldType: 'VARIABLE' }),
      vault({ id: 'empty', confirmedBalance: '0.00' }),
    ]);
    const result = await new YieldAccrualService(repository, provider).accrueForDate(new Date('2026-08-24T12:00:00Z'));

    expect(result).toEqual({ processed: 4, accrued: 1 });
    expect(repository.entries.get('vault-1:2026-08-24')?.amount).toBe('1.00');
    expect(repository.entries.size).toBe(1);
  });

  it('is idempotent when the same vault and date are processed twice', async () => {
    const repository = new InMemoryYieldRepository();
    const service = new YieldAccrualService(repository, new FixedVaultProvider([vault()]));
    await service.accrueForDate(new Date('2026-08-24T00:00:00Z'));
    await service.accrueForDate(new Date('2026-08-24T23:59:59Z'));
    expect(repository.entries.size).toBe(1);
  });
});