import { PrismaClient, Mission, CustomerMission, MissionType, User, CustomerProfile } from '@prisma/client';
import { CreateMissionInput, UpdateMissionInput } from './mission.schema.js';

export type UserWithCustomerProfile = User & { customerProfile: CustomerProfile | null };
export type CustomerMissionWithMission = CustomerMission & { mission: Mission };

export class MissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findUser(id: number): Promise<UserWithCustomerProfile | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { customerProfile: true },
    });
  }

  findById(id: number): Promise<Mission | null> {
    return this.prisma.mission.findUnique({ where: { id } });
  }

  findByCampaignId(campaignId: number): Promise<Mission[]> {
    return this.prisma.mission.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'asc' },
    });
  }

  findActiveMissions(): Promise<Mission[]> {
    const now = new Date();
    return this.prisma.mission.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findCustomerMissions(customerId: number): Promise<CustomerMission[]> {
    return this.prisma.customerMission.findMany({ where: { customerId } });
  }

  findCustomerMission(customerId: number, missionId: number): Promise<CustomerMission | null> {
    return this.prisma.customerMission.findUnique({
      where: { customerId_missionId: { customerId, missionId } },
    });
  }

  create(input: CreateMissionInput): Promise<Mission> {
    return this.prisma.mission.create({
      data: {
        ...input,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      },
    });
  }

  update(id: number, input: UpdateMissionInput): Promise<Mission> {
    return this.prisma.mission.update({
      where: { id },
      data: {
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      },
    });
  }

  delete(id: number): Promise<Mission> {
    return this.prisma.mission.delete({ where: { id } });
  }

  findActiveMissionsByType(type: MissionType): Promise<Mission[]> {
    const now = new Date();
    return this.prisma.mission.findMany({
      where: { type, startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Record one qualifying LOS event against a mission for a customer.
   *
   * Creates the CustomerMission row on the first event (customers are enrolled
   * implicitly — there is no separate "join mission" step), then increments
   * progress and marks it CLAIMABLE once requiredCount is reached.
   * Rows that are already CLAIMABLE or CLAIMED are left untouched.
   *
   * Returns the row after the update, or null if it was already completed.
   */
  async recordProgress(customerId: number, mission: Mission): Promise<CustomerMission | null> {
    return this.prisma.$transaction(async (tx) => {
      const key = { customerId_missionId: { customerId, missionId: mission.id } };

      // Enroll on first event; a no-op if the row already exists.
      await tx.customerMission.upsert({
        where: key,
        create: { customerId, missionId: mission.id },
        update: {},
      });

      // Conditional increment: only IN_PROGRESS rows move, so a completed
      // mission can't be pushed past CLAIMABLE by repeated events.
      const { count } = await tx.customerMission.updateMany({
        where: { customerId, missionId: mission.id, status: 'IN_PROGRESS' },
        data: { progress: { increment: 1 } },
      });
      if (count === 0) return null;

      const row = await tx.customerMission.findUniqueOrThrow({ where: key });
      if (row.progress >= mission.requiredCount) {
        return tx.customerMission.update({ where: key, data: { status: 'CLAIMABLE' } });
      }
      return row;
    });
  }

  async claimMission(customerId: number, mission: Mission, newTier: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.customerMission.update({
        where: { customerId_missionId: { customerId, missionId: mission.id } },
        data: { status: 'CLAIMED', claimedAt: new Date() },
      }),
      this.prisma.customerProfile.update({
        where: { userId: customerId },
        data: { points: { increment: mission.points }, tier: newTier },
      }),
      this.prisma.pointsHistory.create({
        data: {
          customerId,
          source: 'MISSION',
          missionType: mission.type,
          title: mission.title,
          points: mission.points,
        },
      }),
    ]);
  }
}
