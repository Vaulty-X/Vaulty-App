import { YieldAccrualService } from '../../modules/yield/yield-accrual.service';

export async function runVaultYieldAccrualJob(
  service: YieldAccrualService,
  accrualDate = new Date(Date.now() - 86400000)
): Promise<{ processed: number; accrued: number }> {
  return service.accrueForDate(accrualDate);
}