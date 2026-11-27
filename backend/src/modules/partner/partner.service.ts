import { randomBytes } from 'crypto';
import { AppError } from '../../shared/errors/AppError.js';
import { PartnerRepository } from './partner.repository.js';
import { CreatePartnerInput, UpdatePartnerInput } from './partner.schema.js';

// Generate a unique 6-character alphanumeric code with "PC" prefix, e.g. "PC4R9X"
async function generateUniqueCode(repo: PartnerRepository): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  do {
    const bytes = randomBytes(4);
    code = 'PC' + Array.from(bytes)
      .map((b) => chars[b % chars.length])
      .join('');
  } while (await repo.codeExists(code));
  return code;
}

export class PartnerService {
  constructor(private readonly repo: PartnerRepository) {}

  async list(filter?: { isActive?: boolean }) {
    const rows = await this.repo.findAll(filter);
    return rows.map((r) => ({
      id:               r.id,
      name:             r.name,
      phone:            r.phone,
      channel:          r.channel,
      code:             r.code,
      isActive:         r.isActive,
      totalUsages:      r.totalUsages,
      totalConversions: r.totalConversions,
      createdAt:        r.createdAt,
    }));
  }

  async getById(id: number) {
    const row = await this.repo.findById(id);
    if (!row) throw new AppError('Partner not found', 404);
    return row;
  }

  async create(input: CreatePartnerInput) {
    if (input.code) {
      // Manual code — validate uniqueness
      const taken = await this.repo.codeExists(input.code);
      if (taken) throw new AppError('This code is already in use. Please choose a different one.', 409);
      return this.repo.create({ ...input, code: input.code });
    }
    // Auto-generate a unique PC**** code
    const code = await generateUniqueCode(this.repo);
    return this.repo.create({ ...input, code });
  }

  async update(id: number, input: UpdatePartnerInput) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new AppError('Partner not found', 404);
    return this.repo.update(id, input);
  }

  async deactivate(id: number) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new AppError('Partner not found', 404);
    return this.repo.deactivate(id);
  }

  async getUsages(id: number) {
    const partner = await this.repo.findById(id);
    if (!partner) throw new AppError('Partner not found', 404);
    const usages = await this.repo.findUsagesWithConversions(id);
    return {
      id:       partner.id,
      name:     partner.name,
      code:     partner.code,
      channel:  partner.channel,
      isActive: partner.isActive,
      usages,
    };
  }
}
