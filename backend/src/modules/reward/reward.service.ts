import { AppError } from '@shared/errors/AppError.js';
import { RewardRepository } from './reward.repository.js';
import { toPointsDTO, toStoreItemDTO, toRedemptionDTO, PointsDTO, StoreItemDTO, RedemptionDTO } from './reward.mapper.js';
import { CHECK_IN_POINTS, CYCLE_LENGTH, TIMEZONE } from './reward.config.js';
import { TierRepository, resolveTierName } from '@modules/tier/index.js';

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
    if (currentStreakDay >= CYCLE_LENGTH) return { streak: 0, todayDay: 1, checkedToday: false };
    return { streak: currentStreakDay, todayDay: currentStreakDay + 1, checkedToday: false };
  }

  return { streak: 0, todayDay: 1, checkedToday: false };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class RewardService {
  constructor(
    private readonly repo: RewardRepository,
    private readonly tierRepo: TierRepository,
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
    const user = await this.repo.findUser(customerId);
    if (!user) throw new AppError('User not found', 404);
    if (!user.customerProfile) throw new AppError('Customer profile not found', 404);
    const { streak, todayDay, checkedToday } = resolveStreak(
      user.customerProfile.lastCheckInDate,
      user.customerProfile.currentStreakDay,
    );

    return {
      streakDays: streak,
      canCheckInToday: !checkedToday,
      nextResetAt: nextMidnightPhnomPenh().toISOString(),
      days: CHECK_IN_POINTS.map((pts, i) => ({
        day: i + 1,
        points: pts,
        isChecked: i + 1 <= streak,
        isToday: i + 1 === todayDay,
      })),
    };
  }

  async checkIn(customerId: number): Promise<void> {
    const [user, tiers] = await Promise.all([this.repo.findUser(customerId), this.tierRepo.findAll()]);
    if (!user) throw new AppError('User not found', 404);
    if (!user.customerProfile) throw new AppError('Customer profile not found', 404);
    const { checkedToday, todayDay } = resolveStreak(
      user.customerProfile.lastCheckInDate,
      user.customerProfile.currentStreakDay,
    );
    if (checkedToday) throw new AppError('You have already checked in today.', 409);

    const pts = CHECK_IN_POINTS[todayDay - 1];
    const newTier = resolveTierName(user.customerProfile.points + pts, tiers);
    const checkInDate = new Date(`${todayInPhnomPenh()}T00:00:00+07:00`);
    await this.repo.performCheckIn(customerId, checkInDate, todayDay, pts, newTier);
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

    const tiers = await this.tierRepo.findAll();
    const newTier = resolveTierName(user.customerProfile.points - item.points, tiers);
    await this.repo.performRedeem(customerId, item, newTier, idempotencyKey);
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

    // referrer is a CustomerProfile — pass its id as the referrerProfileId
    await this.repo.updateUserReferredBy(customerId, referrer.id);
    return { referrerName: referrer.name ?? 'Unknown' };
  }
}
