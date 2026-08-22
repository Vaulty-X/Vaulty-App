/**
 * Discipline Score Repository
 *
 * Persists and reads discipline score snapshots. Uses parameterized raw
 * SQL against the `discipline_score_snapshots` table (see
 * `src/database/migrations/20260818_create_discipline_score_snapshots.sql`)
 * rather than a Prisma model, since no `schema.prisma` currently exists
 * in this repo. All queries are scoped by `userId`, which callers must
 * always source from the authenticated request — never from a client-
 * supplied parameter — so a user can only ever read or create their own
 * snapshots (see `discipline-score.service.ts` / `discipline-score.controller.ts`).
 */

import { PrismaClient } from '@prisma/client';
import {
  DisciplineScoreFactorBreakdown,
  DisciplineScoreRepository,
  DisciplineScoreResult,
  DisciplineScoreSnapshot,
} from './discipline-score.types';

interface DisciplineScoreSnapshotRow {
  id: string;
  user_id: string;
  score: number;
  factors: DisciplineScoreFactorBreakdown[];
  created_at: Date;
}

function toDomain(row: DisciplineScoreSnapshotRow): DisciplineScoreSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    score: row.score,
    factors: row.factors,
    createdAt: row.created_at,
  };
}

export class PrismaDisciplineScoreRepository implements DisciplineScoreRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findLatestByUserId(userId: string): Promise<DisciplineScoreSnapshot | null> {
    const rows = await this.prisma.$queryRaw<DisciplineScoreSnapshotRow[]>`
      SELECT id, user_id, score, factors, created_at
      FROM discipline_score_snapshots
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const [row] = rows;
    return row ? toDomain(row) : null;
  }

  async createSnapshot(
    userId: string,
    result: DisciplineScoreResult
  ): Promise<DisciplineScoreSnapshot> {
    const factorsJson = JSON.stringify(result.factors);

    const rows = await this.prisma.$queryRaw<DisciplineScoreSnapshotRow[]>`
      INSERT INTO discipline_score_snapshots (user_id, score, factors, created_at)
      VALUES (${userId}, ${result.score}, ${factorsJson}::jsonb, ${result.calculatedAt})
      RETURNING id, user_id, score, factors, created_at
    `;

    const [row] = rows;
    return toDomain(row);
  }
}
