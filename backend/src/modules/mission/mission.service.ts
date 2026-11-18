import { AppError } from '@shared/errors/AppError.js';
import { CreateMissionInput, UpdateMissionInput } from './mission.schema.js';
import { MissionRepository } from './mission.repository.js';
import { toMissionDTO, toCustomerMissionDTO, MissionDTO, CustomerMissionDTO } from './mission.mapper.js';

export class MissionService {
  constructor(private readonly repo: MissionRepository) {}

  async getMissionsForCampaign(campaignId: number): Promise<MissionDTO[]> {
    return (await this.repo.findByCampaignId(campaignId)).map(toMissionDTO);
  }

  async create(input: CreateMissionInput): Promise<MissionDTO> {
    return toMissionDTO(await this.repo.create(input));
  }

  async update(id: number, input: UpdateMissionInput): Promise<MissionDTO> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new AppError('Mission not found', 404);
    return toMissionDTO(await this.repo.update(id, input));
  }

  async delete(id: number): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new AppError('Mission not found', 404);
    await this.repo.delete(id);
  }

  async getCustomerMissions(customerId: number): Promise<CustomerMissionDTO[]> {
    const [missions, customerMissions] = await Promise.all([
      this.repo.findActiveMissions(),
      this.repo.findCustomerMissions(customerId),
    ]);

    const progressMap = new Map(
      customerMissions.map((cm) => [cm.missionId, { status: cm.status, progress: cm.progress }]),
    );

    return missions.map((m) => toCustomerMissionDTO(m, progressMap));
  }

  async claimMission(customerId: number, missionId: number): Promise<void> {
    const mission = await this.repo.findById(missionId);
    if (!mission) throw new AppError('Mission not found', 404);

    const customerMission = await this.repo.findCustomerMission(customerId, missionId);
    if (!customerMission || customerMission.status !== 'CLAIMABLE') {
      throw new AppError('Mission is not claimable', 409);
    }

    await this.repo.claimMission(customerId, mission);
  }
}
