/**
 * Discipline Score Routes
 *
 * Mount with:
 *   import { createDisciplineScoreRouter } from './modules/discipline-score';
 *   app.use(DISCIPLINE_SCORE_BASE_PATH, createDisciplineScoreRouter(service));
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { DisciplineScoreController } from './discipline-score.controller';
import { DisciplineScoreService } from './discipline-score.service';

export function createDisciplineScoreRouter(service: DisciplineScoreService): Router {
  const router = Router();
  const controller = new DisciplineScoreController(service);

  router.get('/', requireAuth, controller.getMyScore);

  return router;
}
