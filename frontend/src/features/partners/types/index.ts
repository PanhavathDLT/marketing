export interface PartnerChannelOption {
  value: string;
  label: string;
}

export interface PartnerCode {
  id: number;
  name: string;
  phone: string | null;
  channel: string | null;
  note: string | null;
  code: string;
  isActive: boolean;
  totalUsages: number;
  totalConversions: number;
  createdAt: string;
}

export interface PartnerCodePayload {
  name: string;
  phone?: string | null;
  channel?: string | null;
  note?: string | null;
  code?: string;
}

export interface PartnerUsage {
  customerId: number;
  customerName: string | null;
  phone: string;
  appliedAt: string;
  conversions: string[];
}

export interface PartnerDetail {
  id: number;
  name: string;
  code: string;
  channel: string | null;
  isActive: boolean;
  usages: PartnerUsage[];
}
