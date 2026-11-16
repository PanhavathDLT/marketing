import { Request, Response, NextFunction } from 'express';
import { success } from '@shared/utils/response.js';
import { User, MissionType } from '@prisma/client';
import { MissionService } from './mission.service.js';

const MISSION_TYPE_LABELS: Record<MissionType, string> = {
  REFERRAL:               'Referral',
  APPLICATION_SUBMISSION: 'Application Submission',
  LOAN_APPROVAL:          'Loan Approval',
  REPAYMENT:              'Repayment',
  COMPLETE_FORM1:         'Complete Form 1',
  COMPLETE_FORM2:         'Complete Form 2',
  COMPLETE_FORM3:         'Complete Form 3',
  COMPLETE_FORM4:         'Complete Form 4',
};

export class MissionController {
  constructor(private readonly service: MissionService) {}

  getMissionTypes = (_req: Request, res: Response) => {
    const types = (Object.keys(MISSION_TYPE_LABELS) as MissionType[]).map((value) => ({
      value,
      label: MISSION_TYPE_LABELS[value],
    }));
    success(res, types);
  };

  getMissionsForCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.getMissionsForCampaign(Number(req.params.campaignId)));
    } catch (err) { next(err); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.create(req.body), 201);
    } catch (err) { next(err); }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.update(Number(req.params.id), req.body));
    } catch (err) { next(err); }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.delete(Number(req.params.id));
      success(res, null);
    } catch (err) { next(err); }
  };

  getCustomerMissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.getCustomerMissions((req.user as User).id));
    } catch (err) { next(err); }
  };

  claimMission = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.claimMission((req.user as User).id, Number(req.params.missionId));
      success(res, {});
    } catch (err) { next(err); }
  };
}
