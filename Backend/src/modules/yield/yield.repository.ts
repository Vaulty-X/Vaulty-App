import { PrismaClient } from '@prisma/client';
import { YieldAccrual, YieldHistoryPage, YieldRepository, YieldSummary } from './yield.types';

interface AccrualRow {
  id: string;
  vault_id: string;
  accrual_date: string | Date;
  period_start: string | Date;
  period_end: string | Date;
  rate_source: string;
  annual_rate: string | number;
  amount: string | number;
  status: YieldAccrual['status'];
  created_at: Date;
}

function dateString(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function toDomain(row: AccrualRow): YieldAccrual {
  return {
    id: row.id,
    vaultId: row.vault_id,
    accrualDate: dateString(row.accrual_date),
    periodStart: dateString(row.period_start),
    periodEnd: dateString(row.period_end),
    rateSource: row.rate_source,
    annualRate: String(row.annual_rate),
    amount: String(row.amount),
    status: row.status,
    createdAt: row.created_at,
  };
}

export class PrismaYieldRepository implements YieldRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertAccrual(input: Omit<YieldAccrual, 'id' | 'createdAt'>): Promise<YieldAccrual> {
    const rows = await this.prisma.$queryRaw<AccrualRow[]>`
      INSERT INTO yield_accrual_ledger
        (vault_id, accrual_date, period_start, period_end, rate_source, annual_rate, amount, status)
      VALUES
        (${input.vaultId}, ${input.accrualDate}::date, ${input.periodStart}::date,
         ${input.periodEnd}::date, ${input.rateSource}, ${input.annualRate}::numeric,
         ${input.amount}::numeric, ${input.status})
      ON CONFLICT (vault_id, accrual_date) DO UPDATE SET
        period_start = EXCLUDED.period_start,
        period_end = EXCLUDED.period_end,
        rate_source = EXCLUDED.rate_source,
        annual_rate = EXCLUDED.annual_rate
      RETURNING id, vault_id, accrual_date, period_start, period_end, rate_source,
                annual_rate, amount, status, created_at
    `;
    return toDomain(rows[0]);
  }

  async getSummary(vaultId: string): Promise<YieldSummary> {
    const rows = await this.prisma.$queryRaw<Array<{ status: string; total: string | number }>>`
      SELECT status, COALESCE(SUM(amount), 0)::text AS total
      FROM yield_accrual_ledger
      WHERE vault_id = ${vaultId}
      GROUP BY status
    `;
    const totals = new Map<string, string>();
    rows.forEach((row: { status: string; total: string | number }) => {
      totals.set(row.status, String(row.total));
    });
    const estimatedAccrued = totals.get('ACCRUED') ?? '0.00';
    const settled = totals.get('SETTLED') ?? '0.00';
    const withdrawable = totals.get('WITHDRAWABLE') ?? '0.00';
    return { estimatedAccrued, settled, withdrawable, total: addMoney(estimatedAccrued, settled, withdrawable) };
  }

  async listHistory(vaultId: string, page: number, limit: number): Promise<YieldHistoryPage> {
    const offset = (page - 1) * limit;
    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<AccrualRow[]>`
        SELECT id, vault_id, accrual_date, period_start, period_end, rate_source,
               annual_rate, amount, status, created_at
        FROM yield_accrual_ledger WHERE vault_id = ${vaultId}
        ORDER BY accrual_date DESC LIMIT ${limit} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM yield_accrual_ledger WHERE vault_id = ${vaultId}
      `,
    ]);
    const total = Number(countRows[0]?.count ?? 0);
    return { items: rows.map(toDomain), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }
}

function addMoney(...values: string[]): string {
  const cents = values.reduce((sum, value) => sum + BigInt(value.replace('.', '').padStart(3, '0')), 0n);
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
}