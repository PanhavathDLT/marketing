import bcrypt from 'bcryptjs';
import { env } from '@config/env.js';
import { AppError } from '@shared/errors/AppError.js';
import { invalidatePermissionCache } from '@shared/middleware/permission.middleware.js';
import { UserManagementRepository } from './user-management.repository.js';
import {
  toAdminUserDTO, toRoleDTO, groupPermissions, toCustomerDTO,
  AdminUserDTO, RoleDTO, PermissionGroupDTO, CustomerDTO,
} from './user-management.mapper.js';
import {
  CreateAdminUserInput, UpdateAdminUserInput,
  CreateRoleInput, UpdateRoleInput, SetRolePermissionsInput,
} from './user-management.schema.js';

export class UserManagementService {
  constructor(private readonly repo: UserManagementRepository) {}

  // ─── Users ─────────────────────────────────────────────────────────────────

  async listUsers(): Promise<AdminUserDTO[]> {
    return (await this.repo.findAllAdminUsers()).map(toAdminUserDTO);
  }

  async getUserById(id: number): Promise<AdminUserDTO> {
    const user = await this.repo.findAdminUserById(id);
    if (!user) throw new AppError('Admin user not found', 404);
    return toAdminUserDTO(user);
  }

  async createUser(input: CreateAdminUserInput): Promise<AdminUserDTO> {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) throw new AppError('Email already in use', 409);

    if (input.staffRoleId) {
      const role = await this.repo.findRoleById(input.staffRoleId);
      if (!role) throw new AppError('Staff role not found', 404);
    }

    const hashed = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
    const user = await this.repo.createAdminUser({
      name: input.name,
      email: input.email,
      password: hashed,
      staffRoleId: input.staffRoleId,
    });
    return toAdminUserDTO(user);
  }

  async updateUser(id: number, input: UpdateAdminUserInput, callerId: number): Promise<AdminUserDTO> {
    const existing = await this.repo.findAdminUserById(id);
    if (!existing) throw new AppError('Admin user not found', 404);

    if (input.email && input.email !== existing.staffProfile?.email) {
      const conflict = await this.repo.findByEmail(input.email);
      if (conflict) throw new AppError('Email already in use', 409);
    }

    if (input.staffRoleId) {
      const role = await this.repo.findRoleById(input.staffRoleId);
      if (!role) throw new AppError('Staff role not found', 404);
    }

    const data: Parameters<typeof this.repo.updateAdminUser>[1] = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.email !== undefined) data.email = input.email;
    if (input.password !== undefined) data.password = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
    if (input.staffRoleId !== undefined) data.staffRoleId = input.staffRoleId;

    const updated = await this.repo.updateAdminUser(id, data);
    return toAdminUserDTO(updated);
  }

  async deleteUser(id: number, callerId: number): Promise<void> {
    if (id === callerId) throw new AppError('You cannot delete your own account.', 400);
    const existing = await this.repo.findAdminUserById(id);
    if (!existing) throw new AppError('Admin user not found', 404);
    await this.repo.deleteAdminUser(id);
  }

  // ─── Customers ─────────────────────────────────────────────────────────────

  async listCustomers(): Promise<CustomerDTO[]> {
    return (await this.repo.findAllCustomers()).map(toCustomerDTO);
  }

  async getCustomerById(id: number): Promise<CustomerDTO> {
    const customer = await this.repo.findCustomerById(id);
    if (!customer) throw new AppError('Customer not found', 404);
    return toCustomerDTO(customer);
  }

  // ─── Roles ─────────────────────────────────────────────────────────────────

  async listRoles(): Promise<RoleDTO[]> {
    return (await this.repo.findAllRoles()).map((r) => toRoleDTO(r));
  }

  async getRoleById(id: number): Promise<RoleDTO> {
    const role = await this.repo.findRoleById(id);
    if (!role) throw new AppError('Role not found', 404);
    return toRoleDTO(role);
  }

  async createRole(input: CreateRoleInput): Promise<RoleDTO> {
    const name = input.name.toUpperCase();
    const existing = await this.repo.findRoleByName(name);
    if (existing) throw new AppError(`Role '${name}' already exists`, 409);

    const role = await this.repo.createRole({ name, description: input.description });
    return toRoleDTO({ ...role, permissions: [], _count: { users: 0 } });
  }

  async updateRole(id: number, input: UpdateRoleInput): Promise<RoleDTO> {
    const existing = await this.repo.findRoleById(id);
    if (!existing) throw new AppError('Role not found', 404);

    const data: Parameters<typeof this.repo.updateRole>[1] = {};
    if (input.name) {
      data.name = input.name.toUpperCase();
      const conflict = await this.repo.findRoleByName(data.name);
      if (conflict && conflict.id !== id) throw new AppError(`Role '${data.name}' already exists`, 409);
    }
    if (input.description !== undefined) data.description = input.description;

    await this.repo.updateRole(id, data);
    const updated = await this.repo.findRoleById(id);
    return toRoleDTO(updated!);
  }

  async deleteRole(id: number): Promise<void> {
    const existing = await this.repo.findRoleById(id);
    if (!existing) throw new AppError('Role not found', 404);

    const userCount = await this.repo.countUsersWithRole(id);
    if (userCount > 0) {
      throw new AppError(
        `Cannot delete role '${existing.name}': ${userCount} user(s) are still assigned to it.`,
        400,
      );
    }

    await this.repo.deleteRole(id);
    invalidatePermissionCache(id);
  }

  async setRolePermissions(id: number, input: SetRolePermissionsInput): Promise<RoleDTO> {
    const existing = await this.repo.findRoleById(id);
    if (!existing) throw new AppError('Role not found', 404);

    if (input.permissionIds.length > 0) {
      const found = await this.repo.findPermissionsByIds(input.permissionIds);
      if (found.length !== input.permissionIds.length) {
        throw new AppError('One or more permission IDs are invalid', 400);
      }
    }

    await this.repo.setRolePermissions(id, input.permissionIds);
    invalidatePermissionCache(id);

    const updated = await this.repo.findRoleById(id);
    return toRoleDTO(updated!);
  }

  // ─── Permissions ───────────────────────────────────────────────────────────

  async listPermissions(): Promise<PermissionGroupDTO[]> {
    const permissions = await this.repo.findAllPermissions();
    return groupPermissions(permissions);
  }
}
