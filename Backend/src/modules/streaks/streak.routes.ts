/**
 * Streak Routes
 *
 * Mount with:
 *   import { createStreakRouter } from './modules/streaks';
 *   app.use(STREAK_BASE_PATH, createStreakRouter(service));
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { StreakController } from './streak.controller';
import { StreakService } from './streak.service';

export const STREAK_BASE_PATH = '/api/v1/streaks';

export function createStreakRouter(service: StreakService): Router {
  const router = Router();
  const controller = new StreakController(service);

  router.get('/current', requireAuth, controller.getCurrentStreak);
  router.get('/freeze-status', requireAuth, controller.getFreezeStatus);
  router.post('/freeze', requireAuth, controller.requestFreeze);

  return router;
}
