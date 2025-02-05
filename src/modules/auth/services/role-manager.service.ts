import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../../users/services/users.service';
import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';
import { PermissionAudit, PermissionAuditDocument } from '../schemas/permission-audit.schema';

@Injectable()
export class RoleManagerService {
  private readonly logger = new Logger(RoleManagerService.name);

  private readonly rolePermissions = new Map<Role, Permission[]>([
    [
      Role.ADMIN,
      Object.values(Permission), // Admin ma wszystkie uprawnienia
    ],
    [
      Role.SUPER_MODERATOR,
      [
        Permission.READ_USER,
        Permission.UPDATE_USER,
        Permission.BLOCK_USER,
        Permission.UNBLOCK_USER,
        Permission.VIEW_LOGS,
        Permission.MANAGE_LOGS,
        Permission.DELETE_CONTENT,
        Permission.EDIT_CONTENT,
        Permission.VIEW_TICKETS,
        Permission.MANAGE_TICKETS,
        Permission.VIEW_METRICS,
        Permission.VIEW_AUDIT_LOG,
      ],
    ],
    [
      Role.MODERATOR,
      [
        Permission.READ_USER,
        Permission.BLOCK_USER,
        Permission.UNBLOCK_USER,
        Permission.VIEW_LOGS,
        Permission.DELETE_CONTENT,
        Permission.EDIT_CONTENT,
      ],
    ],
    [
      Role.SUPPORT,
      [
        Permission.READ_USER,
        Permission.VIEW_LOGS,
        Permission.VIEW_TICKETS,
        Permission.MANAGE_TICKETS,
        Permission.RESPOND_TICKETS,
      ],
    ],
    [
      Role.PREMIUM_USER,
      [
        Permission.READ_USER,
        Permission.VIEW_PROFILE,
        Permission.UPDATE_PROFILE,
        Permission.ACCESS_PREMIUM,
        Permission.SPECIAL_FEATURES,
      ],
    ],
    [
      Role.USER,
      [
        Permission.READ_USER,
        Permission.VIEW_PROFILE,
        Permission.UPDATE_PROFILE,
      ],
    ],
    [
      Role.GUEST,
      [
        Permission.VIEW_PROFILE,
      ],
    ],
  ]);

  private readonly roleHierarchy = new Map<Role, Role[]>([
    [Role.ADMIN, [Role.SUPER_MODERATOR, Role.MODERATOR, Role.SUPPORT, Role.PREMIUM_USER, Role.USER, Role.GUEST]],
    [Role.SUPER_MODERATOR, [Role.MODERATOR, Role.SUPPORT, Role.USER, Role.GUEST]],
    [Role.MODERATOR, [Role.USER, Role.GUEST]],
    [Role.SUPPORT, [Role.USER, Role.GUEST]],
    [Role.PREMIUM_USER, [Role.USER, Role.GUEST]],
    [Role.USER, [Role.GUEST]],
    [Role.GUEST, []],
  ]);

  constructor(
    private readonly usersService: UsersService,
    @InjectModel(PermissionAudit.name)
    private readonly permissionAuditModel: Model<PermissionAuditDocument>,
  ) {}

  private canManageRole(managerRole: Role, targetRole: Role): boolean {
    const managableRoles = this.roleHierarchy.get(managerRole) || [];
    return managableRoles.includes(targetRole);
  }

  async assignRole(userId: string, role: Role, performedBy: string, reason?: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Użytkownik nie został znaleziony');
    }

    await this.usersService.updateUserRole(userId, role);
    
    await this.permissionAuditModel.create({
      userId,
      action: 'ASSIGN_ROLE',
      resource: 'USER_ROLE',
      changes: { role },
      performedBy,
      reason,
    });

    this.logger.log(`Przypisano rolę ${role} użytkownikowi ${userId}`);
  }

  async removeRole(userId: string, performedBy: string, reason?: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Użytkownik nie został znaleziony');
    }

    const oldRoles = user.roles;
    await this.usersService.updateUserRole(userId, null);
    
    await this.permissionAuditModel.create({
      userId,
      action: 'REMOVE_ROLE',
      resource: 'USER_ROLE',
      changes: { oldRoles },
      performedBy,
      reason,
    });

    this.logger.log(`Usunięto role użytkownikowi ${userId}`);
  }

  async grantPermission(
    userId: string, 
    permission: Permission, 
    performedBy: string, 
    reason?: string
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Użytkownik nie został znaleziony');
    }

    const performer = await this.usersService.findById(performedBy);
    if (!performer) {
      throw new NotFoundException('Wykonujący operację nie został znaleziony');
    }

    // Sprawdź czy wykonujący ma to uprawnienie
    if (!performer.permissions.includes(permission)) {
      throw new ForbiddenException('Nie można nadać uprawnienia, którego się nie posiada');
    }

    if (!user.permissions.includes(permission)) {
      user.permissions.push(permission);
      await this.usersService.update(userId, user);

      // Zapisz w historii
      await this.permissionAuditModel.create({
        userId,
        performedBy,
        action: 'GRANT_PERMISSION',
        resource: 'USER_PERMISSION',
        changes: { permission },
        reason,
      });
    }
  }

  async revokePermission(
    userId: string, 
    permission: Permission, 
    performedBy: string, 
    reason?: string
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Użytkownik nie został znaleziony');
    }

    const performer = await this.usersService.findById(performedBy);
    if (!performer) {
      throw new NotFoundException('Wykonujący operację nie został znaleziony');
    }

    // Sprawdź czy wykonujący ma to uprawnienie
    if (!performer.permissions.includes(permission)) {
      throw new ForbiddenException('Nie można odebrać uprawnienia, którego się nie posiada');
    }

    user.permissions = user.permissions.filter((p) => p !== permission);
    await this.usersService.update(userId, user);

    // Zapisz w historii
    await this.permissionAuditModel.create({
      userId,
      performedBy,
      action: 'REVOKE_PERMISSION',
      resource: 'USER_PERMISSION',
      changes: { permission },
      reason,
    });
  }

  async getUserRolesAndPermissions(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Użytkownik nie został znaleziony');
    }

    return {
      roles: user.roles,
      permissions: user.permissions,
    };
  }

  async getPermissionAuditLog(userId: string) {
    return this.permissionAuditModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async validateUserAccess(userId: string, requiredPermissions: Permission[]): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      return false;
    }

    return requiredPermissions.every(permission => user.permissions.includes(permission));
  }
} 