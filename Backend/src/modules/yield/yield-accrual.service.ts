import { YieldRepository, YieldSummary, YieldVault, YieldVaultProvider } from './yield.types';
import { YieldRateService } from './yield-rate.service';

const CALCULATION_SCALE = 18;
const MONEY_SCALE = 2;

export class YieldAccrualService {
  constructor(
    private readonly repository: YieldRepository,
    private readonly vaultProvider: YieldVaultProvider,
    private readonly rateService?: YieldRateService
  ) {}

  async accrueForDate(accrualDate: Date): Promise<{ processed: number; accrued: number }> {
    const date = formatDate(accrualDate);
    const vaults = await this.vaultProvider.listEligibleVaults();
    let accrued = 0;

    for (const vault of vaults) {
      if (!isEligible(vault) || isZero(vault.confirmedBalance)) continue;
      const configuredRate = this.rateService
        ? await this.rateService.getAnnualRate(vault.id)
        : { rate: vault.annualRate, source: vault.rateSource };
      const amount = calculateDailyAccrual(vault.confirmedBalance, configuredRate.rate);
      if (amount === '0.00') continue;

      await this.repository.upsertAccrual({
        vaultId: vault.id,
        accrualDate: date,
        periodStart: date,
        periodEnd: date,
        rateSource: configuredRate.source,
        annualRate: configuredRate.rate,
        amount,
        status: 'ACCRUED',
      });
      accrued += 1;
    }

    return { processed: vaults.length, accrued };
  }

  async getSummary(vaultId: string, userId: string): Promise<YieldSummary> {
    await this.requireVault(vaultId, userId);
    return this.repository.getSummary(vaultId);
  }

  async getHistory(vaultId: string, userId: string, page: number, limit: number) {
    await this.requireVault(vaultId, userId);
    return this.repository.listHistory(vaultId, page, limit);
  }

  private async requireVault(vaultId: string, userId: string): Promise<YieldVault> {
    const vault = await this.vaultProvider.findVaultForUser(vaultId, userId);
    if (!vault) throw new Error('Vault not found');
    return vault;
  }
}

export function calculateDailyAccrual(balance: string, annualRate: string): string {
  const balanceScaled = toScaled(balance, CALCULATION_SCALE);
  const rateScaled = toScaled(annualRate, CALCULATION_SCALE);
  const dailyScaled = (balanceScaled * rateScaled) / 365n / 10n ** BigInt(CALCULATION_SCALE);
  return formatScaled(roundScaled(dailyScaled, CALCULATION_SCALE, MONEY_SCALE), MONEY_SCALE);
}

function isEligible(vault: YieldVault): boolean {
  return vault.status === 'ACTIVE' && vault.yieldType === 'FIXED';
}

function isZero(value: string): boolean {
  return toScaled(value, CALCULATION_SCALE) === 0n;
}

function toScaled(value: string, scale: number): bigint {
  const match = /^([0-9]+)(?:\.([0-9]+))?$/.exec(value);
  if (!match) throw new Error(`Invalid decimal value: ${value}`);
  const fraction = (match[2] ?? '').padEnd(scale, '0');
  if (fraction.length > scale && /[1-9]/.test(fraction.slice(scale))) {
    throw new Error(`Too many decimal places: ${value}`);
  }
  return BigInt(match[1]) * 10n ** BigInt(scale) + BigInt(fraction.slice(0, scale) || '0');
}

function roundScaled(value: bigint, fromScale: number, toScale: number): bigint {
  const divisor = 10n ** BigInt(fromScale - toScale);
  return (value + divisor / 2n) / divisor;
}

function formatScaled(value: bigint, scale: number): string {
  const divisor = 10n ** BigInt(scale);
  return `${value / divisor}.${(value % divisor).toString().padStart(scale, '0')}`;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}