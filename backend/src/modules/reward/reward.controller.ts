import { Request, Response, NextFunction } from 'express';
import { success } from '../../shared/utils/response.js';
import { User } from '@prisma/client';
import { RewardService } from './reward.service.js';
import { MissionService } from '../mission/mission.service.js';

export class RewardController {
  constructor(
    private readonly rewardService: RewardService,
    private readonly missionService: MissionService,
  ) {}

  getPoints = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.rewardService.getPoints((req.user as User).id));
    } catch (err) { next(err); }
  };

  getPointsHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.rewardService.getPointsHistory((req.user as User).id));
    } catch (err) { next(err); }
  };

  getCheckIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.rewardService.getCheckIn((req.user as User).id));
    } catch (err) { next(err); }
  };

  checkIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.rewardService.checkIn((req.user as User).id);
      success(res, {});
    } catch (err) { next(err); }
  };

  // Missions routed under /reward/missions
  getCustomerMissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.missionService.getCustomerMissions((req.user as User).id));
    } catch (err) { next(err); }
  };

  claimMission = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.missionService.claimMission((req.user as User).id, Number(req.params.missionId));
      success(res, {});
    } catch (err) { next(err); }
  };

  getStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.rewardService.getStore());
    } catch (err) { next(err); }
  };

  getMyRewards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.rewardService.getMyRewards((req.user as User).id));
    } catch (err) { next(err); }
  };

  redeemReward = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
      await this.rewardService.redeemReward((req.user as User).id, Number(req.params.rewardId), idempotencyKey);
      success(res, {});
    } catch (err) { next(err); }
  };

  updateLoanCycle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loanCount = Number(req.body.loanCount);
      success(res, await this.rewardService.updateLoanCycle((req.user as User).id, loanCount));
    } catch (err) { next(err); }
  };

  getMyReferralCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.rewardService.getMyReferralCode((req.user as User).id));
    } catch (err) { next(err); }
  };

  applyReferralCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.rewardService.applyReferralCode((req.user as User).id, req.body.code));
    } catch (err) { next(err); }
  };
}
