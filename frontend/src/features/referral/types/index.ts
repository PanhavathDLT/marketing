export interface ReferralPerson {
  id: number;
  name: string;
  phone: string;
  referralCode?: string;
  tier: string;
}

export interface Referral {
  referrer: ReferralPerson;
  referee: Omit<ReferralPerson, "referralCode">;
  codeUsed: string;
  linkedAt: string;
}
