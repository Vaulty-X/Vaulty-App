import { validateYieldRate } from './yield-rate.validator';

export interface YieldRateService {
  getAnnualRate(vaultId: string): Promise<{ rate: string; source: string }>;
}

export class StaticYieldRateService implements YieldRateService {
  constructor(private readonly rate: string, private readonly source = 'configured-fixed-rate') {}

  async getAnnualRate(_vaultId: string): Promise<{ rate: string; source: string }> {
    const numericRate = Number(this.rate);
    validateYieldRate(numericRate);
    return { rate: this.rate, source: this.source };
  }
}