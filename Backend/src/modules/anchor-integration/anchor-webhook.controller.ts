import { Request, Response } from 'express';
import { AnchorDepositService, AnchorOutOfOrderError, AnchorWebhookPayloadError } from './anchor-deposit.service';
import { AnchorSignatureValidationError } from './anchor-signature.service';

export interface RawBodyRequest extends Request { rawBody?: string; }

export class AnchorWebhookController {
  constructor(private readonly service: AnchorDepositService) {}

  receive = async (req: RawBodyRequest, res: Response): Promise<void> => {
    try {
      const rawBody = req.rawBody ?? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      const result = await this.service.ingest(rawBody, req.header('x-anchor-signature'), req.header('x-anchor-timestamp'));
      res.status(200).json({ acknowledgment: result.acknowledgment });
    } catch (error) {
      if (error instanceof AnchorSignatureValidationError || error instanceof AnchorWebhookPayloadError) {
        res.status(400).json({ acknowledgment: 'rejected' });
        return;
      }
      if (error instanceof AnchorOutOfOrderError) {
        res.status(409).json({ acknowledgment: 'out_of_order' });
        return;
      }
      res.status(500).json({ acknowledgment: 'rejected' });
    }
  };
}