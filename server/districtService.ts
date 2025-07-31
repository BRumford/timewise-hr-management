import { db } from "./db";
import { districts, districtBilling, users, employees, type District, type InsertDistrict, type DistrictBilling, type InsertDistrictBilling } from "@shared/schema";
import { eq, and, desc, count, sum } from "drizzle-orm";

export class DistrictService {
  // District Management
  async createDistrict(districtData: InsertDistrict): Promise<District> {
    const [district] = await db
      .insert(districts)
      .values({
        ...districtData,
        slug: this.generateSlug(districtData.name),
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      })
      .returning();
    return district;
  }

  async getDistrict(id: number): Promise<District | undefined> {
    const [district] = await db.select().from(districts).where(eq(districts.id, id));
    return district;
  }

  async getDistrictBySlug(slug: string): Promise<District | undefined> {
    const [district] = await db.select().from(districts).where(eq(districts.slug, slug));
    return district;
  }

  async getAllDistricts(): Promise<District[]> {
    return await db.select().from(districts).orderBy(desc(districts.createdAt));
  }

  async updateDistrict(id: number, updates: Partial<District>): Promise<District> {
    const [district] = await db
      .update(districts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(districts.id, id))
      .returning();
    return district;
  }

  async deleteDistrict(id: number): Promise<void> {
    await db.delete(districts).where(eq(districts.id, id));
  }

  // Billing Management
  async createBillingRecord(billingData: InsertDistrictBilling): Promise<DistrictBilling> {
    const [billing] = await db
      .insert(districtBilling)
      .values(billingData)
      .returning();
    return billing;
  }

  async getBillingHistory(districtId: number): Promise<DistrictBilling[]> {
    return await db
      .select()
      .from(districtBilling)
      .where(eq(districtBilling.districtId, districtId))
      .orderBy(desc(districtBilling.billingMonth));
  }

  async getCurrentBilling(districtId: number): Promise<DistrictBilling | undefined> {
    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of current month
    
    const [billing] = await db
      .select()
      .from(districtBilling)
      .where(
        and(
          eq(districtBilling.districtId, districtId),
          eq(districtBilling.billingMonth, currentMonth)
        )
      );
    return billing;
  }

  // Usage Tracking
  async getDistrictUsage(districtId: number): Promise<{
    employeeCount: number;
    adminCount: number;
    storageUsedGB: number;
  }> {
    // Count employees
    const [employeeCount] = await db
      .select({ count: count() })
      .from(employees)
      .where(eq(employees.districtId, districtId));

    // Count admin users
    const [adminCount] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          eq(users.districtId, districtId),
          eq(users.role, "admin")
        )
      );

    // For now, return 0 for storage - would need to implement file tracking
    return {
      employeeCount: employeeCount.count,
      adminCount: adminCount.count,
      storageUsedGB: 0,
    };
  }

  // Subscription Management
  async updateSubscription(
    districtId: number,
    tier: string,
    status: string,
    endDate?: Date
  ): Promise<District> {
    return await this.updateDistrict(districtId, {
      subscriptionTier: tier,
      subscriptionStatus: status,
      subscriptionEndsAt: endDate,
      updatedAt: new Date(),
    });
  }

  async checkSubscriptionStatus(districtId: number): Promise<{
    isActive: boolean;
    isTrialExpired: boolean;
    daysRemaining: number;
  }> {
    const district = await this.getDistrict(districtId);
    if (!district) {
      return { isActive: false, isTrialExpired: true, daysRemaining: 0 };
    }

    const now = new Date();
    const isActive = district.subscriptionStatus === "active";
    
    let daysRemaining = 0;
    let isTrialExpired = false;

    if (district.subscriptionStatus === "trial" && district.trialEndsAt) {
      const trialEnd = new Date(district.trialEndsAt);
      daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      isTrialExpired = daysRemaining <= 0;
    } else if (district.subscriptionEndsAt) {
      const subEnd = new Date(district.subscriptionEndsAt);
      daysRemaining = Math.ceil((subEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      isActive: isActive || (district.subscriptionStatus === "trial" && !isTrialExpired),
      isTrialExpired,
      daysRemaining: Math.max(0, daysRemaining),
    };
  }

  // Utility Methods
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 100);
  }

  // Multi-tenant helper to get district context from request
  async getDistrictFromRequest(req: any): Promise<District | null> {
    // Check for subdomain (e.g., district.timewise.com)
    const host = req.get('host') || '';
    const subdomain = host.split('.')[0];
    
    if (subdomain && subdomain !== 'www' && subdomain !== 'timewise') {
      const district = await this.getDistrictBySlug(subdomain);
      if (district) return district;
    }

    // Check for custom domain
    const district = await db
      .select()
      .from(districts)
      .where(eq(districts.domain, host))
      .then(results => results[0]);
    
    if (district) return district;

    // Fallback to user's district from session
    if (req.user?.districtId) {
      return await this.getDistrict(req.user.districtId);
    }

    return null;
  }
}

export const districtService = new DistrictService();