import { Router } from "express";
import { districtService } from "./districtService";
import { z } from "zod";
import { insertDistrictSchema } from "@shared/schema";

const router = Router();

// Middleware to check if user is super admin (can manage districts)
const requireSuperAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
};

// Create new district (Super Admin only)
router.post("/", requireSuperAdmin, async (req, res) => {
  try {
    const validatedData = insertDistrictSchema.parse(req.body);
    const district = await districtService.createDistrict(validatedData);
    res.json(district);
  } catch (error) {
    console.error("Error creating district:", error);
    res.status(400).json({ 
      message: error instanceof z.ZodError ? "Invalid district data" : "Failed to create district" 
    });
  }
});

// Get all districts (Super Admin only)
router.get("/", requireSuperAdmin, async (req, res) => {
  try {
    const districts = await districtService.getAllDistricts();
    res.json(districts);
  } catch (error) {
    console.error("Error fetching districts:", error);
    res.status(500).json({ message: "Failed to fetch districts" });
  }
});

// Get current district info
router.get("/current", async (req, res) => {
  try {
    const district = await districtService.getDistrictFromRequest(req);
    if (!district) {
      return res.status(404).json({ message: "District not found" });
    }
    
    // Don't expose sensitive information to non-admin users
    if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
      const { billingEmail, subscriptionStatus, ...publicInfo } = district;
      return res.json(publicInfo);
    }
    
    res.json(district);
  } catch (error) {
    console.error("Error fetching current district:", error);
    res.status(500).json({ message: "Failed to fetch district information" });
  }
});

// Get district usage statistics (Admin only)
router.get("/current/usage", async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const district = await districtService.getDistrictFromRequest(req);
    if (!district) {
      return res.status(404).json({ message: "District not found" });
    }

    const [usage, subscriptionStatus] = await Promise.all([
      districtService.getDistrictUsage(district.id),
      districtService.checkSubscriptionStatus(district.id)
    ]);

    res.json({
      ...usage,
      subscriptionStatus,
      limits: {
        maxEmployees: district.maxEmployees,
        maxAdmins: district.maxAdmins,
      }
    });
  } catch (error) {
    console.error("Error fetching district usage:", error);
    res.status(500).json({ message: "Failed to fetch usage statistics" });
  }
});

// Update district settings (Admin only)
router.patch("/current", async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const district = await districtService.getDistrictFromRequest(req);
    if (!district) {
      return res.status(404).json({ message: "District not found" });
    }

    // Only allow certain fields to be updated by district admins
    const allowedUpdates = {
      name: req.body.name,
      contactEmail: req.body.contactEmail,
      contactPhone: req.body.contactPhone,
      address: req.body.address,
      settings: req.body.settings,
    };

    // Remove undefined values
    const updates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid updates provided" });
    }

    const updatedDistrict = await districtService.updateDistrict(district.id, updates);
    res.json(updatedDistrict);
  } catch (error) {
    console.error("Error updating district:", error);
    res.status(500).json({ message: "Failed to update district" });
  }
});

// Get billing history (Admin only)
router.get("/current/billing", async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const district = await districtService.getDistrictFromRequest(req);
    if (!district) {
      return res.status(404).json({ message: "District not found" });
    }

    const billingHistory = await districtService.getBillingHistory(district.id);
    res.json(billingHistory);
  } catch (error) {
    console.error("Error fetching billing history:", error);
    res.status(500).json({ message: "Failed to fetch billing history" });
  }
});

// Super Admin Routes for managing specific districts
router.get("/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const district = await districtService.getDistrict(id);
    if (!district) {
      return res.status(404).json({ message: "District not found" });
    }
    res.json(district);
  } catch (error) {
    console.error("Error fetching district:", error);
    res.status(500).json({ message: "Failed to fetch district" });
  }
});

router.patch("/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const district = await districtService.updateDistrict(id, updates);
    res.json(district);
  } catch (error) {
    console.error("Error updating district:", error);
    res.status(500).json({ message: "Failed to update district" });
  }
});

router.delete("/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await districtService.deleteDistrict(id);
    res.json({ message: "District deleted successfully" });
  } catch (error) {
    console.error("Error deleting district:", error);
    res.status(500).json({ message: "Failed to delete district" });
  }
});

export default router;