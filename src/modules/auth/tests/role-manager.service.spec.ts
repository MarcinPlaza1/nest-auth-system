import { Test, TestingModule } from '@nestjs/testing';
import { RoleManagerService } from '../services/role-manager.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PermissionAudit, PermissionAuditDocument } from '../schemas/permission-audit.schema';
import { UsersService } from '../../users/services/users.service';
import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('RoleManagerService', () => {
  let service: RoleManagerService;
  let usersService: UsersService;
  let permissionAuditModel: Model<PermissionAuditDocument>;

  const mockUsersService = {
    findById: jest.fn(),
    updateUserRole: jest.fn(),
    update: jest.fn(),
  };

  const mockPermissionAuditModel = {
    create: jest.fn(),
    find: jest.fn(),
    sort: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleManagerService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: getModelToken(PermissionAudit.name),
          useValue: mockPermissionAuditModel,
        },
      ],
    }).compile();

    service = module.get<RoleManagerService>(RoleManagerService);
    usersService = module.get<UsersService>(UsersService);
    permissionAuditModel = module.get<Model<PermissionAuditDocument>>(
      getModelToken(PermissionAudit.name),
    );

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignRole', () => {
    it('should assign role to user and create audit log', async () => {
      const userId = 'testUserId';
      const role = Role.USER;
      const performedBy = 'adminId';
      const reason = 'New user registration';
      const mockUser = { _id: userId };

      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUsersService.updateUserRole.mockResolvedValue(undefined);
      mockPermissionAuditModel.create.mockResolvedValue({});

      await service.assignRole(userId, role, performedBy, reason);

      expect(mockUsersService.findById).toHaveBeenCalledWith(userId);
      expect(mockUsersService.updateUserRole).toHaveBeenCalledWith(userId, role);
      expect(mockPermissionAuditModel.create).toHaveBeenCalledWith({
        userId,
        action: 'ASSIGN_ROLE',
        resource: 'USER_ROLE',
        changes: { role },
        performedBy,
        reason,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'nonexistentUserId';
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.assignRole(userId, Role.USER, 'adminId'))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle database errors during role assignment', async () => {
      const userId = 'testUserId';
      mockUsersService.findById.mockResolvedValue({ _id: userId });
      mockUsersService.updateUserRole.mockRejectedValue(new Error('Database error'));

      await expect(service.assignRole(userId, Role.USER, 'adminId'))
        .rejects.toThrow('Database error');
    });
  });

  describe('removeRole', () => {
    it('should remove user role and create audit log', async () => {
      const userId = 'testUserId';
      const performedBy = 'adminId';
      const reason = 'User deactivation';
      const mockUser = { _id: userId, roles: [Role.USER] };

      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUsersService.updateUserRole.mockResolvedValue(undefined);
      mockPermissionAuditModel.create.mockResolvedValue({});

      await service.removeRole(userId, performedBy, reason);

      expect(mockUsersService.findById).toHaveBeenCalledWith(userId);
      expect(mockUsersService.updateUserRole).toHaveBeenCalledWith(userId, null);
      expect(mockPermissionAuditModel.create).toHaveBeenCalledWith({
        userId,
        action: 'REMOVE_ROLE',
        resource: 'USER_ROLE',
        changes: { oldRoles: mockUser.roles },
        performedBy,
        reason,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'nonexistentUserId';
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.removeRole(userId, 'adminId'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('grantPermission', () => {
    it('should grant permission to user and create audit log', async () => {
      const userId = 'testUserId';
      const performedBy = 'adminId';
      const permission = Permission.READ_USER;
      const reason = 'Special access grant';
      const mockUser = {
        _id: userId,
        permissions: [],
      };
      const mockPerformer = {
        _id: performedBy,
        permissions: [permission],
      };

      mockUsersService.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockPerformer);
      mockUsersService.update.mockResolvedValue(undefined);
      mockPermissionAuditModel.create.mockResolvedValue({});

      await service.grantPermission(userId, permission, performedBy, reason);

      expect(mockUsersService.update).toHaveBeenCalledWith(userId, {
        ...mockUser,
        permissions: [permission],
      });
      expect(mockPermissionAuditModel.create).toHaveBeenCalledWith({
        userId,
        performedBy,
        action: 'GRANT_PERMISSION',
        resource: 'USER_PERMISSION',
        changes: { permission },
        reason,
      });
    });

    it('should throw ForbiddenException when performer lacks permission', async () => {
      const userId = 'testUserId';
      const performedBy = 'adminId';
      const permission = Permission.READ_USER;
      const mockUser = { _id: userId, permissions: [] };
      const mockPerformer = { _id: performedBy, permissions: [] };

      mockUsersService.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockPerformer);

      await expect(service.grantPermission(userId, permission, performedBy))
        .rejects.toThrow(ForbiddenException);
    });

    it('should not grant duplicate permission', async () => {
      const userId = 'testUserId';
      const performedBy = 'adminId';
      const permission = Permission.READ_USER;
      const mockUser = {
        _id: userId,
        permissions: [permission],
      };
      const mockPerformer = {
        _id: performedBy,
        permissions: [permission],
      };

      mockUsersService.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockPerformer);

      await service.grantPermission(userId, permission, performedBy);

      expect(mockUsersService.update).not.toHaveBeenCalled();
      expect(mockPermissionAuditModel.create).not.toHaveBeenCalled();
    });
  });

  describe('revokePermission', () => {
    it('should revoke permission from user and create audit log', async () => {
      const userId = 'testUserId';
      const performedBy = 'adminId';
      const permission = Permission.READ_USER;
      const reason = 'Access revocation';
      const mockUser = {
        _id: userId,
        permissions: [permission],
      };
      const mockPerformer = {
        _id: performedBy,
        permissions: [permission],
      };

      mockUsersService.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockPerformer);
      mockUsersService.update.mockResolvedValue(undefined);
      mockPermissionAuditModel.create.mockResolvedValue({});

      await service.revokePermission(userId, permission, performedBy, reason);

      expect(mockUsersService.update).toHaveBeenCalledWith(userId, {
        ...mockUser,
        permissions: [],
      });
      expect(mockPermissionAuditModel.create).toHaveBeenCalledWith({
        userId,
        performedBy,
        action: 'REVOKE_PERMISSION',
        resource: 'USER_PERMISSION',
        changes: { permission },
        reason,
      });
    });

    it('should throw ForbiddenException when performer lacks permission', async () => {
      const userId = 'testUserId';
      const performedBy = 'adminId';
      const permission = Permission.READ_USER;
      const mockUser = { _id: userId, permissions: [permission] };
      const mockPerformer = { _id: performedBy, permissions: [] };

      mockUsersService.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockPerformer);

      await expect(service.revokePermission(userId, permission, performedBy))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserRolesAndPermissions', () => {
    it('should return user roles and permissions', async () => {
      const userId = 'testUserId';
      const mockUser = {
        _id: userId,
        roles: [Role.USER],
        permissions: [Permission.READ_USER],
      };

      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await service.getUserRolesAndPermissions(userId);

      expect(result).toEqual({
        roles: mockUser.roles,
        permissions: mockUser.permissions,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'nonexistentUserId';
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.getUserRolesAndPermissions(userId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getPermissionAuditLog', () => {
    it('should return audit log for user', async () => {
      const userId = 'testUserId';
      const mockAuditLog = [
        { userId, action: 'GRANT_PERMISSION', timestamp: new Date() },
      ];

      mockPermissionAuditModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockAuditLog),
      });

      const result = await service.getPermissionAuditLog(userId);

      expect(result).toEqual(mockAuditLog);
      expect(mockPermissionAuditModel.find).toHaveBeenCalledWith({ userId });
    });

    it('should handle empty audit log', async () => {
      const userId = 'testUserId';

      mockPermissionAuditModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getPermissionAuditLog(userId);

      expect(result).toEqual([]);
    });
  });

  describe('validateUserAccess', () => {
    it('should return true when user has all required permissions', async () => {
      const userId = 'testUserId';
      const requiredPermissions = [Permission.READ_USER, Permission.UPDATE_USER];
      const mockUser = {
        _id: userId,
        permissions: [Permission.READ_USER, Permission.UPDATE_USER, Permission.DELETE_USER],
      };

      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await service.validateUserAccess(userId, requiredPermissions);

      expect(result).toBe(true);
    });

    it('should return false when user lacks required permissions', async () => {
      const userId = 'testUserId';
      const requiredPermissions = [Permission.READ_USER, Permission.UPDATE_USER];
      const mockUser = {
        _id: userId,
        permissions: [Permission.READ_USER],
      };

      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await service.validateUserAccess(userId, requiredPermissions);

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      const userId = 'nonexistentUserId';
      const requiredPermissions = [Permission.READ_USER];

      mockUsersService.findById.mockResolvedValue(null);

      const result = await service.validateUserAccess(userId, requiredPermissions);

      expect(result).toBe(false);
    });

    it('should handle empty required permissions array', async () => {
      const userId = 'testUserId';
      const mockUser = {
        _id: userId,
        permissions: [Permission.READ_USER],
      };

      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await service.validateUserAccess(userId, []);

      expect(result).toBe(true);
    });
  });
}); 