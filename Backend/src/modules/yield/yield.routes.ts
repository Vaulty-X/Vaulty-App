import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { YieldAccrualService } from './yield-accrual.service';
import { YieldController } from './yield.controller';

export function createYieldRouter(service: YieldAccrualService): Router {
  const router = Router();
  const controller = new YieldController(service);
  router.get('/:vaultId/summary', requireAuth, controller.getSummary);
  router.get('/:vaultId/accruals', requireAuth, controller.getHistory);
  return router;
}