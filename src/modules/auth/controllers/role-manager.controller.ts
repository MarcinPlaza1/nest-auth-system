import { Controller, Post, Delete, Body, Param, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RoleManagerService } from '../services/role-manager.service';
import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { Roles } from '../decorators/roles.decorator';
import { RequirePermissions } from '../decorators/permissions.decorator';

@ApiTags('role-management')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class RoleManagerController {
  constructor(private readonly roleManagerService: RoleManagerService) {}

  @Post(':userId/assign/:role')
  @Roles(Role.ADMIN)
  @RequirePermissions(Permission.MANAGE_ROLES)
  @ApiOperation({ summary: 'Przypisz rolę użytkownikowi' })
  @ApiResponse({ status: 200, description: 'Rola została przypisana' })
  async assignRole(
    @Param('userId') userId: string,
    @Param('role') role: Role,
    @Request() req,
  ) {
    await this.roleManagerService.assignRole(userId, role, req.user._id);
    return { message: 'Rola została przypisana' };
  }

  @Post(':userId/remove/:role')
  @Roles(Role.ADMIN)
  @RequirePermissions(Permission.MANAGE_ROLES)
  @ApiOperation({ summary: 'Usuń rolę użytkownika' })
  @ApiResponse({ status: 200, description: 'Rola została usunięta' })
  async removeRole(
    @Param('userId') userId: string,
    @Param('role') role: Role,
    @Request() req,
  ) {
    await this.roleManagerService.removeRole(userId, role, req.user._id);
    return { message: 'Rola została usunięta' };
  }

  @Post(':userId/grant/:permission')
  @Roles(Role.ADMIN)
  @RequirePermissions(Permission.MANAGE_PERMISSIONS)
  @ApiOperation({ summary: 'Nadaj uprawnienie użytkownikowi' })
  @ApiResponse({ status: 200, description: 'Uprawnienie zostało nadane' })
  async grantPermission(
    @Param('userId') userId: string,
    @Param('permission') permission: Permission,
    @Request() req,
  ) {
    await this.roleManagerService.grantPermission(userId, permission, req.user._id);
    return { message: 'Uprawnienie zostało nadane' };
  }

  @Post(':userId/revoke/:permission')
  @Roles(Role.ADMIN)
  @RequirePermissions(Permission.MANAGE_PERMISSIONS)
  @ApiOperation({ summary: 'Odbierz uprawnienie użytkownikowi' })
  @ApiResponse({ status: 200, description: 'Uprawnienie zostało odebrane' })
  async revokePermission(
    @Param('userId') userId: string,
    @Param('permission') permission: Permission,
    @Request() req,
  ) {
    await this.roleManagerService.revokePermission(userId, permission, req.user._id);
    return { message: 'Uprawnienie zostało odebrane' };
  }

  @Get(':userId')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @RequirePermissions(Permission.READ_USER)
  @ApiOperation({ summary: 'Pobierz role i uprawnienia użytkownika' })
  @ApiResponse({ status: 200, description: 'Role i uprawnienia użytkownika' })
  async getUserRolesAndPermissions(@Param('userId') userId: string) {
    return this.roleManagerService.getUserRolesAndPermissions(userId);
  }
} 