import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { users, employees, districts } from "@shared/schema";
import { SecurityAudit, SecurityEventType, SecuritySeverity } from "./security/monitoring";

/**
 * District-specific authentication system
 * Ensures users can only authenticate within their assigned district
 */
export class DistrictAuth {
  private districtId: number;

  constructor(districtId: number) {
    this.districtId = districtId;
  }

  async authenticateUser(username: string, password: string): Promise<{
    success: boolean;
    user?: any;
    message?: string;
  }> {
    try {
      // Find user within the current district
      const [user] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.username, username),
          eq(users.districtId, this.districtId)
        ));

      if (!user) {
        await SecurityAudit.log({
          eventType: SecurityEventType.LOGIN_FAILED,
          severity: SecuritySeverity.MEDIUM,
          userId: 'unknown',
          details: { username, districtId: this.districtId, reason: 'User not found in district' }
        });
        
        return {
          success: false,
          message: "Invalid credentials or user not found in this district"
        };
      }

      // Check if account is locked
      if (user.isLocked) {
        await SecurityAudit.log({
          eventType: SecurityEventType.LOGIN_FAILED,
          severity: SecuritySeverity.HIGH,
          userId: user.id,
          details: { reason: 'Account locked', districtId: this.districtId }
        });
        
        return {
          success: false,
          message: "Account is locked. Please contact your administrator."
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        // Increment failed login attempts
        await db
          .update(users)
          .set({
            failedLoginAttempts: user.failedLoginAttempts + 1,
            isLocked: user.failedLoginAttempts + 1 >= 5,
            updatedAt: new Date()
          })
          .where(and(
            eq(users.id, user.id),
            eq(users.districtId, this.districtId)
          ));

        await SecurityAudit.log({
          eventType: SecurityEventType.LOGIN_FAILED,
          severity: SecuritySeverity.MEDIUM,
          userId: user.id,
          details: { 
            reason: 'Invalid password', 
            failedAttempts: user.failedLoginAttempts + 1,
            districtId: this.districtId 
          }
        });

        return {
          success: false,
          message: "Invalid credentials"
        };
      }

      // Get user's employee record (district-scoped)
      const [employee] = await db
        .select()
        .from(employees)
        .where(and(
          eq(employees.userId, user.id),
          eq(employees.districtId, this.districtId)
        ));

      // Reset failed login attempts and update last login
      await db
        .update(users)
        .set({
          failedLoginAttempts: 0,
          lastLoginAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(users.id, user.id),
          eq(users.districtId, this.districtId)
        ));

      await SecurityAudit.log({
        eventType: SecurityEventType.LOGIN_SUCCESS,
        severity: SecuritySeverity.LOW,
        userId: user.id,
        details: { districtId: this.districtId }
      });

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          districtId: user.districtId,
          employee: employee || null
        }
      };

    } catch (error) {
      console.error("District authentication error:", error);
      
      await SecurityAudit.log({
        eventType: SecurityEventType.LOGIN_FAILED,
        severity: SecuritySeverity.HIGH,
        userId: 'unknown',
        details: { 
          username, 
          districtId: this.districtId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      });

      return {
        success: false,
        message: "Authentication system error"
      };
    }
  }

  async createDistrictUser(userData: {
    username: string;
    email: string;
    password: string;
    role: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ success: boolean; user?: any; message?: string }> {
    try {
      // Check if user already exists in this district
      const [existingUser] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.email, userData.email),
          eq(users.districtId, this.districtId)
        ));

      if (existingUser) {
        return {
          success: false,
          message: "User already exists in this district"
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user with district association
      const [newUser] = await db
        .insert(users)
        .values({
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          districtId: this.districtId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Create associated employee record if needed
      if (userData.firstName && userData.lastName) {
        await db
          .insert(employees)
          .values({
            userId: newUser.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            districtId: this.districtId,
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }

      await SecurityAudit.log({
        eventType: SecurityEventType.USER_CREATED,
        severity: SecuritySeverity.LOW,
        userId: newUser.id,
        details: { 
          role: userData.role, 
          districtId: this.districtId,
          createdBy: 'system'
        }
      });

      return {
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          districtId: newUser.districtId
        }
      };

    } catch (error) {
      console.error("Error creating district user:", error);
      return {
        success: false,
        message: "Failed to create user"
      };
    }
  }

  async getUsersByDistrict(): Promise<any[]> {
    return await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        isLocked: users.isLocked,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.districtId, this.districtId));
  }

  async lockUser(userId: string): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({
          isLocked: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(users.id, userId),
          eq(users.districtId, this.districtId)
        ));

      await SecurityAudit.log({
        eventType: SecurityEventType.USER_LOCKED,
        severity: SecuritySeverity.MEDIUM,
        userId,
        details: { districtId: this.districtId }
      });

      return true;
    } catch (error) {
      console.error("Error locking user:", error);
      return false;
    }
  }

  async unlockUser(userId: string): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({
          isLocked: false,
          failedLoginAttempts: 0,
          updatedAt: new Date()
        })
        .where(and(
          eq(users.id, userId),
          eq(users.districtId, this.districtId)
        ));

      await SecurityAudit.log({
        eventType: SecurityEventType.USER_UNLOCKED,
        severity: SecuritySeverity.LOW,
        userId,
        details: { districtId: this.districtId }
      });

      return true;
    } catch (error) {
      console.error("Error unlocking user:", error);
      return false;
    }
  }
}

// Factory function to create district-scoped authentication
export function createDistrictAuth(districtId: number): DistrictAuth {
  return new DistrictAuth(districtId);
}

// Helper function to get district auth from request context
export function getDistrictAuth(req: any): DistrictAuth {
  if (!req.district?.id) {
    throw new Error("District context not found. Use tenant middleware first.");
  }
  return new DistrictAuth(req.district.id);
}