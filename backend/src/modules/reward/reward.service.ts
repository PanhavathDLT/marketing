import { AppError } from '../../shared/errors/AppError.js';
import { RewardRepository } from './reward.repository.js';
import { toPointsDTO, toStoreItemDTO, toRedemptionDTO, PointsDTO, StoreItemDTO, RedemptionDTO } from './reward.mapper.js';
import { TIMEZONE } from './reward.config.js';
import { TierRepository, resolveTierByLoanCount } from '../tier/index.js';
import { SettingsRepository } from '../settings/settings.repository.js';
import { MissionRepository } from '../mission/mission.repository.js';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayInPhnomPenh(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

function nextMidnightPhnomPenh(): Date {
  const tomorrowStr = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  return new Date(`${tomorrowStr}T00:00:00+07:00`);
}

function resolveStreak(lastCheckInDate: Date | null, currentStreakDay: number) {
  const today = todayInPhnomPenh();
  if (!lastCheckInDate) return { streak: 0, todayDay: 1, checkedToday: false };

  const last = lastCheckInDate.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  if (last === today) return { streak: currentStreakDay, todayDay: currentStreakDay, checkedToday: true };

  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  if (last === yesterday) {
    if (currentStreakDay >= 7) return { streak: 0, todayDay: 1, checkedToday: false };
    return { streak: currentStreakDay, todayDay: currentStreakDay + 1, checkedToday: false };
  }

  return { streak: 0, todayDay: 1, checkedToday: false };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class RewardService {
  constructor(
    private readonly repo: RewardRepository,
    private readonly tierRepo: TierRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly missionRepo: MissionRepository,
  ) {}

  async getPoints(customerId: number): Promise<PointsDTO> {
    const [user, tiers] = await Promise.all([this.repo.findUser(customerId), this.tierRepo.findAll()]);
    if (!user) throw new AppError('User not found', 404);
    if (!user.customerProfile) throw new AppError('Customer profile not found', 404);
    return toPointsDTO(user.customerProfile, tiers);
  }

  async getPointsHistory(customerId: number) {
    return this.repo.getPointsHistory(customerId);
  }

  async getCheckIn(customerId: number) {
    const [user, config] = await Promise.all([
      this.repo.findUser(customerId),
      this.settingsRepo.getCheckInConfig(),
    ]);
    if (!user) throw new AppError('User not found', 404);
    if (!user.customerProfile) throw new AppError('Customer profile not found', 404);
    if (!config) throw new AppError('Check-in config not found', 404);

    const checkInPoints = [config.day1, config.day2, config.day3, config.day4, config.day5, config.day6, config.day7];
    const { streak, todayDay, checkedToday } = resolveStreak(
      user.customerProfile.lastCheckInDate,
      user.customerProfile.currentStreakDay,
    );

    return {
      streakDays: streak,
      canCheckInToday: !checkedToday,
      nextResetAt: nextMidnightPhnomPenh().toISOString(),
      days: checkInPoints.map((pts, i) => ({
        day: i + 1,
        points: pts,
        isChecked: i + 1 <= streak,
        isToday: i + 1 === todayDay,
      })),
    };
  }

  async checkIn(customerId: number): Promise<void> {
    const [user, config] = await Promise.all([
      this.repo.findUser(customerId),
      this.settingsRepo.getCheckInConfig(),
    ]);
    if (!user) throw new AppError('User not found', 404);
    if (!user.customerProfile) throw new AppError('Customer profile not found', 404);
    if (!config) throw new AppError('Check-in config not found', 404);

    const checkInPoints = [config.day1, config.day2, config.day3, config.day4, config.day5, config.day6, config.day7];
    const { checkedToday, todayDay } = resolveStreak(
      user.customerProfile.lastCheckInDate,
      user.customerProfile.currentStreakDay,
    );
    if (checkedToday) throw new AppError('You have already checked in today.', 409);

    const pts = checkInPoints[todayDay - 1];
    // UTC midnight of the PP date — Postgres @db.Date receives exactly the right date regardless of server timezone
    const checkInDate = new Date(`${todayInPhnomPenh()}T00:00:00.000Z`);
    await this.repo.performCheckIn(customerId, checkInDate, todayDay, pts);
  }

  async getStore(): Promise<StoreItemDTO[]> {
    return (await this.repo.findActiveStoreItems()).map(toStoreItemDTO);
  }

  async getMyRewards(customerId: number): Promise<RedemptionDTO[]> {
    return (await this.repo.findRedemptionsByCustomer(customerId)).map(toRedemptionDTO);
  }

  async redeemReward(customerId: number, rewardId: number, idempotencyKey?: string): Promise<void> {
    if (idempotencyKey) {
      const existing = await this.repo.findRedemptionByIdempotencyKey(idempotencyKey);
      if (existing) return;
    }

    const item = await this.repo.findRewardItem(rewardId);
    if (!item) throw new AppError('Reward not found', 404);
    if (!item.isActive || item.stock <= 0) throw new AppError('Reward is out of stock', 409);

    const user = await this.repo.findUser(customerId);
    if (!user) throw new AppError('User not found', 404);
    if (!user.customerProfile) throw new AppError('Customer profile not found', 404);
    if (user.customerProfile.points < item.points) {
      throw new AppError('You do not have enough points for this reward.', 422);
    }

    await this.repo.performRedeem(customerId, item, idempotencyKey);
  }

  async updateLoanCycle(customerId: number, loanCount: number) {
    const [user, tiers] = await Promise.all([
      this.repo.findUser(customerId),
      this.tierRepo.findAll(),
    ]);
    if (!user) throw new AppError('User not found', 404);
    if (!user.customerProfile) throw new AppError('Customer profile not found', 404);

    const newTierName = resolveTierByLoanCount(loanCount, tiers);
    const currentTier = tiers.find((t) => t.name === user.customerProfile!.tier);
    const newTier = tiers.find((t) => t.name === newTierName);
    const isTierUp = (newTier?.minLoanCount ?? 0) > (currentTier?.minLoanCount ?? 0);
    const bonusPoints = isTierUp ? (newTier?.rewardPoints ?? 0) : 0;

    await this.repo.updateLoanCycle(customerId, loanCount, newTierName, bonusPoints);
    return { loanCycleCount: loanCount, tier: newTierName, bonusPointsAwarded: bonusPoints };
  }

  async getMyReferralCode(customerId: number) {
    const user = await this.repo.findUser(customerId);
    if (!user) throw new AppError('User not found', 404);
    if (!user.customerProfile) throw new AppError('Customer profile not found', 404);
    return { code: user.customerProfile.referralCode };
  }

  async applyReferralCode(customerId: number, code: string) {
    const customer = await this.repo.findUser(customerId);
    if (!customer) throw new AppError('User not found', 404);
    if (!customer.customerProfile) throw new AppError('Customer profile not found', 404);
    if (customer.customerProfile.referralCode === code) {
      throw new AppError('You cannot use your own referral code.', 422);
    }
    if (customer.customerProfile.referredById) {
      throw new AppError('You are already linked to a referrer.', 409);
    }

    const referrer = await this.repo.findUserByReferralCode(code);
    if (!referrer) throw new AppError('Referral code not found.', 404);

    const [config, activeMissions] = await Promise.all([
      this.settingsRepo.getReferralConfig(),
      this.missionRepo.findActiveMissionsByType('REFERRAL'),
    ]);

    const refereeBonus = config?.refereeBonus ?? 0;
    // Referrer gets auto bonus from config only when no active REFERRAL mission exists.
    // When a mission is active, the referrer earns points by completing and claiming it.
    const referrerBonus = activeMissions.length === 0 ? (config?.referrerBonus ?? 0) : 0;

    await this.repo.applyReferralCodeWithBonus(
      customerId,
      referrer.id,
      referrer.userId,
      refereeBonus,
      referrerBonus,
    );

    // Record mission progress for the referrer against every active REFERRAL mission
    for (const mission of activeMissions) {
      await this.missionRepo.recordProgress(referrer.userId, mission);
    }

    return {
      referrerName:  referrer.name ?? null,
      referrerPhone: referrer.phone ?? null,
      refereeBonus,
      referrerBonus,
    };
  }
}
