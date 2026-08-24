/**
 * Streak Controller
 *
 * Thin HTTP layer: extracts the authenticated user id, delegates to
 * StreakService, and formats responses using the `{ success, data }`
 * envelope. Never accepts a `userId` from the request body, params, or
 * query string — streak data returned is always the authenticated
 * caller's own.
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { StreakService } from './streak.service';

export class StreakController {
  constructor(private readonly service: StreakService) {}

  getCurrentStreak = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }

    try {
      const data = await this.service.getStreakState(userId);
      res.status(200).json({ success: true, data });
    } catch {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  getFreezeStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }

    try {
      const data = await this.service.getFreezeStatus(userId);
      res.status(200).json({ success: true, data });
    } catch {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  requestFreeze = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }

    try {
      const body = req.body as { durationDays?: number };
      const freeze = await this.service.requestFreeze(userId, body.durationDays ?? 1);
      res.status(201).json({ success: true, data: freeze });
    } catch {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
}
