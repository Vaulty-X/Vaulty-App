import { Router } from 'express';
import { AnchorWebhookController } from './anchor-webhook.controller';
import { AnchorDepositService } from './anchor-deposit.service';

export const ANCHOR_WEBHOOK_PATH = '/api/v1/integrations/anchor/webhooks/deposit';

export function createAnchorWebhookRouter(service: AnchorDepositService): Router {
  const router = Router();
  router.post('/deposit', new AnchorWebhookController(service).receive);
  return router;
}