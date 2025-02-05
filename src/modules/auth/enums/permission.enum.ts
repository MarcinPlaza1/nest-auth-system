export enum Permission {
  // Uprawnienia użytkowników
  READ_USER = 'read:user',
  CREATE_USER = 'create:user',
  UPDATE_USER = 'update:user',
  DELETE_USER = 'delete:user',
  VIEW_PROFILE = 'view:profile',
  UPDATE_PROFILE = 'update:profile',
  
  // Uprawnienia moderacji
  BLOCK_USER = 'block:user',
  UNBLOCK_USER = 'unblock:user',
  VIEW_LOGS = 'view:logs',
  MANAGE_LOGS = 'manage:logs',
  DELETE_CONTENT = 'delete:content',
  EDIT_CONTENT = 'edit:content',
  
  // Uprawnienia wsparcia
  VIEW_TICKETS = 'view:tickets',
  MANAGE_TICKETS = 'manage:tickets',
  RESPOND_TICKETS = 'respond:tickets',
  
  // Uprawnienia premium
  ACCESS_PREMIUM = 'access:premium',
  SPECIAL_FEATURES = 'use:special_features',
  
  // Uprawnienia administracyjne
  MANAGE_ROLES = 'manage:roles',
  MANAGE_PERMISSIONS = 'manage:permissions',
  VIEW_METRICS = 'view:metrics',
  SYSTEM_SETTINGS = 'system:settings',
  MANAGE_SYSTEM = 'manage:system',
  VIEW_AUDIT_LOG = 'view:audit_log',
  MANAGE_API_KEYS = 'manage:api_keys',
} 