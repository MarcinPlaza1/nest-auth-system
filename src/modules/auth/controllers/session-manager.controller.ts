import { Controller, Get, Post, Delete, Param, Query, UseGuards, Req, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SessionManagerService } from '../services/session-manager.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { Roles } from '../decorators/roles.decorator';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';
import { ActivityType } from '../enums/activity-type.enum';

@ApiTags('sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SessionManagerController {
  constructor(private readonly sessionManagerService: SessionManagerService) {}

  @Get('active')
  @ApiOperation({ summary: 'Pobierz aktywne sesje użytkownika' })
  @ApiResponse({ status: 200, description: 'Lista aktywnych sesji' })
  async getActiveSessions(@Req() req: any) {
    return this.sessionManagerService.getUserActiveSessions(req.user._id);
  }

  @Delete('logout/:sessionId')
  @ApiOperation({ summary: 'Wyloguj sesję' })
  @ApiResponse({ status: 200, description: 'Sesja została zakończona' })
  async logoutSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    await this.sessionManagerService.deactivateSession(sessionId, req.user._id);
    return { message: 'Sesja została zakończona' };
  }

  @Post('logout-all')
  @ApiOperation({ summary: 'Wyloguj wszystkie sesje oprócz aktualnej' })
  @ApiResponse({ status: 200, description: 'Wszystkie inne sesje zostały zakończone' })
  async logoutAllSessions(@Req() req: any) {
    await this.sessionManagerService.deactivateAllUserSessions(
      req.user._id,
      req.session?._id,
    );
    return { message: 'Wszystkie inne sesje zostały zakończone' };
  }

  @Get('activity')
  @ApiOperation({ summary: 'Pobierz historię aktywności użytkownika' })
  @ApiResponse({ status: 200, description: 'Historia aktywności' })
  async getActivityHistory(
    @Req() req: any,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('activityType') activityType?: string,
  ) {
    return this.sessionManagerService.getActivityHistory(req.user._id, {
      limit,
      skip,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      activityType: activityType as ActivityType,
    });
  }

  @Get('users/:userId/activity')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @RequirePermissions(Permission.VIEW_LOGS)
  @ApiOperation({ summary: 'Pobierz historię aktywności wybranego użytkownika (tylko dla adminów i moderatorów)' })
  @ApiResponse({ status: 200, description: 'Historia aktywności użytkownika' })
  async getUserActivityHistory(
    @Param('userId') userId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('activityType') activityType?: string,
  ) {
    return this.sessionManagerService.getActivityHistory(userId, {
      limit,
      skip,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      activityType: activityType as ActivityType,
    });
  }

  @Get('users/:userId/sessions')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @RequirePermissions(Permission.VIEW_LOGS)
  @ApiOperation({ summary: 'Pobierz aktywne sesje wybranego użytkownika (tylko dla adminów i moderatorów)' })
  @ApiResponse({ status: 200, description: 'Lista aktywnych sesji użytkownika' })
  async getUserActiveSessions(@Param('userId') userId: string) {
    return this.sessionManagerService.getUserActiveSessions(userId);
  }

  @Delete('users/:userId/sessions')
  @Roles(Role.ADMIN)
  @RequirePermissions(Permission.MANAGE_SYSTEM)
  @ApiOperation({ summary: 'Zakończ wszystkie sesje wybranego użytkownika (tylko dla adminów)' })
  @ApiResponse({ status: 200, description: 'Wszystkie sesje użytkownika zostały zakończone' })
  async terminateUserSessions(@Param('userId') userId: string) {
    await this.sessionManagerService.deactivateAllUserSessions(userId);
    return { message: 'Wszystkie sesje użytkownika zostały zakończone' };
  }
} 