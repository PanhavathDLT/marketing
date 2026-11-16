import { User, CustomerProfile, StaffProfile } from '@prisma/client';

export type UserDTO = {
  id: number;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: string;
  tier: string;
  points: number;
  referralCode: string;
};

type UserWithProfiles = User & {
  customerProfile?: CustomerProfile | null;
  staffProfile?: StaffProfile | null;
};

export function toUserDTO(user: UserWithProfiles): UserDTO {
  const cp = user.customerProfile;
  const sp = user.staffProfile;
  return {
    id: user.id,
    email: sp?.email ?? null,
    name: cp?.name ?? sp?.name ?? null,
    phone: cp?.phone ?? null,
    role: user.role,
    tier: cp?.tier ?? 'BRONZE',
    points: cp?.points ?? 0,
    referralCode: cp?.referralCode ?? '',
  };
}
