import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { YieldAccrualService } from './yield-accrual.service';
import { yieldHistoryQuerySchema } from './yield.validator';

export class YieldController {
  constructor(private readonly service: YieldAccrualService) {}

  getSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, message: 'Invalid or expired token' }); return; }
    try {
      const summary = await this.service.getSummary(req.params.vaultId, userId);
      res.json({ success: true, data: { ...summary, estimatedAccrued: summary.estimatedAccrued, disclaimer: 'Yield shown is estimated unless marked settled or withdrawable; rates are not guaranteed.' } });
    } catch (error) {
      res.status(error instanceof Error && error.message === 'Vault not found' ? 404 : 500)
        .json({ success: false, message: error instanceof Error && error.message === 'Vault not found' ? 'Vault not found' : 'Internal server error' });
    }
  };

  getHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, message: 'Invalid or expired token' }); return; }
    const parsed = yieldHistoryQuerySchema.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ success: false, message: 'Invalid pagination parameters' }); return; }
    try {
      const history = await this.service.getHistory(req.params.vaultId, userId, parsed.data.page, parsed.data.limit);
      res.json({ success: true, data: history });
    } catch (error) {
      res.status(error instanceof Error && error.message === 'Vault not found' ? 404 : 500)
        .json({ success: false, message: error instanceof Error && error.message === 'Vault not found' ? 'Vault not found' : 'Internal server error' });
    }
  };
}