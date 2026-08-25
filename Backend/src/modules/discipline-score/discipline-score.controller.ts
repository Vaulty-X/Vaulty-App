/**
 * Discipline Score Controller
 *
 * Thin HTTP layer: extracts the authenticated user id, delegates to
 * `DisciplineScoreService`, and formats the response using the
 * `{ success, data }` / `{ success, message }` envelope documented in
 * the Backend README. Never accepts a `userId` from the request body,
 * params, or query string — the score returned is always the
 * authenticated caller's own.
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { DISCIPLINE_SCORE_DISCLAIMER } from './discipline-score.constants';
import { DisciplineScoreService } from './discipline-score.service';

export class DisciplineScoreController {
  constructor(private readonly service: DisciplineScoreService) {}

  /**
   * GET /api/v1/discipline-score
   * Returns the authenticated user's latest score, factor breakdown,
   * and last-updated time.
   */
  getMyScore = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }

    try {
      const snapshot = await this.service.getLatestScoreForUser(userId);

      res.status(200).json({
        success: true,
        data: {
          score: snapshot.score,
          factors: snapshot.factors,
          updatedAt: snapshot.createdAt,
          disclaimer: DISCIPLINE_SCORE_DISCLAIMER,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
}
