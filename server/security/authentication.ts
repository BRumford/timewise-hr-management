import { db } from "../db";
import { users, userSessions, auditLogs } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

// Multi-Factor Authentication
export class MFAService {
  static generateTOTPSecret(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  static generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  static async enableMFA(userId: string, secret: string, backupCodes: string[]): Promise<void> {
    await db
      .update(users)
      .set({
        mfaEnabled: true,
        mfaSecret: secret,
        mfaBackupCodes: JSON.stringify(backupCodes)
      })
      .where(eq(users.id, userId));

    await db.insert(auditLogs).values({
      userId,
      action: "enable_mfa",
      entityType: "user",
      entityId: userId,
      description: "Multi-factor authentication enabled",
      ipAddress: "",
      userAgent: "",
      severity: "medium"
    });
  }

  static async verifyTOTP(userId: string, token: string): Promise<boolean> {
    // Implement TOTP verification logic
    // This would typically use a library like 'speakeasy'
    // For now, return true as placeholder
    return true;
  }

  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user || !user.mfaBackupCodes) return false;

    const backupCodes = JSON.parse(user.mfaBackupCodes);
    const codeIndex = backupCodes.indexOf(code);

    if (codeIndex === -1) return false;

    // Remove used backup code
    backupCodes.splice(codeIndex, 1);
    
    await db
      .update(users)
      .set({ mfaBackupCodes: JSON.stringify(backupCodes) })
      .where(eq(users.id, userId));

    return true;
  }
}

// Account Lockout Service
export class AccountLockoutService {
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

  static async recordFailedAttempt(userId: string, ipAddress: string): Promise<void> {
    const now = new Date();
    const lockoutUntil = new Date(now.getTime() + this.LOCKOUT_DURATION);

    await db
      .update(users)
      .set({
        failedLoginAttempts: sql`failed_login_attempts + 1`,
        lastFailedLogin: now,
        lockedUntil: lockoutUntil
      })
      .where(eq(users.id, userId));

    await db.insert(auditLogs).values({
      userId,
      action: "failed_login",
      entityType: "user",
      entityId: userId,
      description: `Failed login attempt from ${ipAddress}`,
      ipAddress,
      userAgent: "",
      severity: "medium"
    });
  }

  static async isAccountLocked(userId: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return false;

    const now = new Date();
    const isLocked = user.failedLoginAttempts >= this.MAX_ATTEMPTS && 
                    user.lockedUntil && 
                    user.lockedUntil > now;

    return isLocked;
  }

  static async resetFailedAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lastFailedLogin: null,
        lockedUntil: null
      })
      .where(eq(users.id, userId));
  }

  static async unlockAccount(userId: string, adminId: string): Promise<void> {
    await this.resetFailedAttempts(userId);

    await db.insert(auditLogs).values({
      userId: adminId,
      action: "unlock_account",
      entityType: "user",
      entityId: userId,
      description: `Account unlocked by administrator`,
      ipAddress: "",
      userAgent: "",
      severity: "medium"
    });
  }
}

// Session Management Service
export class SessionManager {
  static async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
    deviceId?: string
  ): Promise<string> {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(userSessions).values({
      id: sessionId,
      userId,
      ipAddress,
      userAgent,
      deviceId,
      expiresAt,
      isActive: true
    });

    return sessionId;
  }

  static async validateSession(sessionId: string): Promise<any> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.id, sessionId),
          eq(userSessions.isActive, true),
          gt(userSessions.expiresAt, new Date())
        )
      );

    if (!session) return null;

    // Update last accessed time
    await db
      .update(userSessions)
      .set({ lastAccessedAt: new Date() })
      .where(eq(userSessions.id, sessionId));

    return session;
  }

  static async invalidateSession(sessionId: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.id, sessionId));
  }

  static async invalidateAllUserSessions(userId: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.userId, userId));
  }

  static async getActiveSessions(userId: string): Promise<any[]> {
    return await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true),
          gt(userSessions.expiresAt, new Date())
        )
      );
  }
}

// Password Policy Service
export class PasswordPolicy {
  private static readonly MIN_LENGTH = 12;
  private static readonly REQUIRE_UPPERCASE = true;
  private static readonly REQUIRE_LOWERCASE = true;
  private static readonly REQUIRE_NUMBERS = true;
  private static readonly REQUIRE_SYMBOLS = true;
  private static readonly PASSWORD_HISTORY_COUNT = 5;

  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    }

    if (this.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (this.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (this.REQUIRE_NUMBERS && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (this.REQUIRE_SYMBOLS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static async isPasswordReused(userId: string, password: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user || !user.passwordHistory) return false;

    const history = JSON.parse(user.passwordHistory);
    
    for (const oldHash of history) {
      if (await bcrypt.compare(password, oldHash)) {
        return true;
      }
    }

    return false;
  }

  static async updatePasswordHistory(userId: string, newPasswordHash: string): Promise<void> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    let history = user?.passwordHistory ? JSON.parse(user.passwordHistory) : [];
    
    // Add new password to history
    history.unshift(newPasswordHash);
    
    // Keep only the last N passwords
    history = history.slice(0, this.PASSWORD_HISTORY_COUNT);

    await db
      .update(users)
      .set({ passwordHistory: JSON.stringify(history) })
      .where(eq(users.id, userId));
  }

  static async enforcePasswordExpiration(userId: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user || !user.passwordChangedAt) return false;

    const daysSinceChange = (Date.now() - user.passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24);
    const maxPasswordAge = 90; // 90 days

    return daysSinceChange > maxPasswordAge;
  }
}

// Enhanced Authentication Middleware
export const enhancedAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionId) {
      return res.status(401).json({ message: 'No session token provided' });
    }

    const session = await SessionManager.validateSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ message: 'Invalid or expired session' });
    }

    // Check if account is locked
    const isLocked = await AccountLockoutService.isAccountLocked(session.userId);
    if (isLocked) {
      return res.status(423).json({ message: 'Account is temporarily locked' });
    }

    // Check password expiration
    const passwordExpired = await PasswordPolicy.enforcePasswordExpiration(session.userId);
    if (passwordExpired) {
      return res.status(400).json({ message: 'Password has expired, please change it' });
    }

    // Attach user info to request
    (req as any).user = session;
    (req as any).sessionId = sessionId;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Authentication service error' });
  }
};