export type YieldAccrualStatus = 'ACCRUED' | 'SETTLED' | 'WITHDRAWABLE';

export interface YieldVault {
  id: string;
  userId: string;
  status: string;
  yieldType: 'FIXED' | 'VARIABLE' | null;
  confirmedBalance: string;
  annualRate: string;
  rateSource: string;
}

export interface YieldAccrual {
  id: string;
  vaultId: string;
  accrualDate: string;
  periodStart: string;
  periodEnd: string;
  rateSource: string;
  annualRate: string;
  amount: string;
  status: YieldAccrualStatus;
  createdAt: Date;
}

export interface YieldSummary {
  estimatedAccrued: string;
  settled: string;
  withdrawable: string;
  total: string;
}

export interface YieldHistoryPage {
  items: YieldAccrual[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface YieldVaultProvider {
  listEligibleVaults(): Promise<YieldVault[]>;
  findVaultForUser(vaultId: string, userId: string): Promise<YieldVault | null>;
}

export interface YieldRepository {
  upsertAccrual(input: Omit<YieldAccrual, 'id' | 'createdAt'>): Promise<YieldAccrual>;
  getSummary(vaultId: string): Promise<YieldSummary>;
  listHistory(vaultId: string, page: number, limit: number): Promise<YieldHistoryPage>;
}