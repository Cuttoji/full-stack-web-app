'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { AuthUser, Role, UserPermissions, DefaultRolePermissions, PermissionScope, DefaultRoleScope } from '@/lib/types';
import { canAccessWithScope, canApproveLeaveFor } from '@/lib/auth';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const verifyToken = useCallback(async (authToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.data);
        } else {
          logout();
        }
      } else {
        logout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Verify token is still valid
      verifyToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, [verifyToken]);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
    }

    const { user: userData, token: authToken } = data.data;
    
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for role-based access
export function useRoleAccess() {
  const { user } = useAuth();

  const hasRole = (roles: Role | Role[]): boolean => {
    if (!user) return false;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(user.role as Role);
  };

  // Role checks - ครบทุก role ในโครงสร้างใหม่
  const isAdmin = user?.role === Role.ADMIN;
  const isCustomerService = user?.role === Role.CUSTOMER_SERVICE;
  const isFinanceLeader = user?.role === Role.FINANCE_LEADER;
  const isFinance = user?.role === Role.FINANCE;
  const isSalesLeader = user?.role === Role.SALES_LEADER;
  const isSales = user?.role === Role.SALES;
  const isHeadTech = user?.role === Role.HEAD_TECH;
  const isLeader = user?.role === Role.LEADER;
  const isTech = user?.role === Role.TECH;

  // Group checks
  const isAnyFinance = isFinanceLeader || isFinance;
  const isAnySales = isSalesLeader || isSales;
  const isAnyTech = isHeadTech || isLeader || isTech;
  const isAnyLeader = isFinanceLeader || isSalesLeader || isHeadTech || isLeader;
  const canManageTeam = isAdmin || isFinanceLeader || isSalesLeader || isHeadTech || isLeader;

  return {
    hasRole,
    isAdmin,
    isCustomerService,
    isFinanceLeader,
    isFinance,
    isSalesLeader,
    isSales,
    isHeadTech,
    isLeader,
    isTech,
    // Group checks
    isAnyFinance,
    isAnySales,
    isAnyTech,
    isAnyLeader,
    canManageTeam,
  };
}

// Hook for permission-based access
export function usePermissions() {
  const { user } = useAuth();

  // ตรวจสอบ permission
  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (!user) return false;
    // ตรวจสอบ custom permissions ก่อน
    const extendedUser = user as AuthUser & { permissions?: UserPermissions };
    if (extendedUser.permissions && extendedUser.permissions[permission] !== undefined) {
      return extendedUser.permissions[permission] ?? false;
    }
    // ใช้ default permissions ตาม role
    return DefaultRolePermissions[user.role as Role]?.[permission] ?? false;
  };

  // ตรวจสอบว่าสามารถเข้าถึง resource ตาม scope ได้หรือไม่
  const canAccessResource = (
    resourceDepartmentId?: string,
    resourceSubUnitId?: string,
    resourceUserId?: string
  ): boolean => {
    if (!user) return false;
    const extendedUser = user as AuthUser & { permissionScope?: PermissionScope };
    return canAccessWithScope(
      user.role as Role,
      extendedUser.permissionScope || DefaultRoleScope[user.role as Role],
      resourceDepartmentId,
      resourceSubUnitId,
      resourceUserId,
      user.id
    );
  };

  // ตรวจสอบว่าสามารถอนุมัติใบลาของ user นั้นได้หรือไม่
  const canApproveLeave = (targetUserRole: Role, targetUserSupervisorId?: string): boolean => {
    if (!user) return false;
    return canApproveLeaveFor(
      user.role as Role,
      user.id,
      targetUserRole,
      targetUserSupervisorId
    );
  };

  return {
    hasPermission,
    canAccessResource,
    canApproveLeave,
    // Quick permission checks
    canViewTasks: hasPermission('canViewTasks'),
    canCreateTasks: hasPermission('canCreateTasks'),
    canEditTaskDetails: hasPermission('canEditTaskDetails'),
    canDeleteTasks: hasPermission('canDeleteTasks'),
    canAssignTasks: hasPermission('canAssignTasks'),
    canManageTasks: hasPermission('canManageTasks'),
    canViewAllCalendars: hasPermission('canViewAllCalendars'),
    canViewTeamCalendar: hasPermission('canViewTeamCalendar'),
    canBookVehicles: hasPermission('canBookVehicles'),
    canManageFleet: hasPermission('canManageFleet'),
    canApproveLeaveRequests: hasPermission('canApproveLeave'),
    canViewLeaveRequests: hasPermission('canViewLeaveRequests'),
    canManageUsers: hasPermission('canManageUsers'),
    canViewAllUsers: hasPermission('canViewAllUsers'),
    canManageDailyTechnician: hasPermission('canManageDailyTechnician'),
    canViewReports: hasPermission('canViewReports'),
    canExportData: hasPermission('canExportData'),
  };
}
