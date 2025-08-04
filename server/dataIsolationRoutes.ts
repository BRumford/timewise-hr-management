import { Router } from 'express';
import { dataIsolationService } from './dataIsolationService';

const router = Router();

// Basic auth check - ensuring user is authenticated
router.use((req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if user has system owner privileges
  const user = req.user as any;
  if (!user.isSystemOwner) {
    return res.status(403).json({ 
      error: 'System owner access required' 
    });
  }
  
  next();
});

/**
 * GET /api/data-isolation/validate/:districtId
 * Validates data isolation for a specific district
 */
router.get('/validate/:districtId', async (req, res) => {
  try {
    const districtId = parseInt(req.params.districtId);
    
    if (isNaN(districtId)) {
      return res.status(400).json({ error: 'Invalid district ID' });
    }

    const validation = await dataIsolationService.validateDistrictIsolation(districtId);
    
    res.json({
      success: true,
      districtId,
      validation
    });

  } catch (error) {
    console.error('Error validating district isolation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to validate district isolation' 
    });
  }
});

/**
 * GET /api/data-isolation/status/:districtId
 * Gets comprehensive isolation status and statistics
 */
router.get('/status/:districtId', async (req, res) => {
  try {
    const districtId = parseInt(req.params.districtId);
    
    if (isNaN(districtId)) {
      return res.status(400).json({ error: 'Invalid district ID' });
    }

    const status = await dataIsolationService.getDistrictIsolationStatus(districtId);
    
    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Error getting district isolation status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get district isolation status' 
    });
  }
});

/**
 * POST /api/data-isolation/cleanup/:districtId
 * Cleans up data isolation issues for a district
 */
router.post('/cleanup/:districtId', async (req, res) => {
  try {
    const districtId = parseInt(req.params.districtId);
    const { removeOrphanedRecords, fixUserAssignments, dryRun } = req.body;
    
    if (isNaN(districtId)) {
      return res.status(400).json({ error: 'Invalid district ID' });
    }

    const cleanup = await dataIsolationService.cleanupDistrictData(districtId, {
      removeOrphanedRecords: removeOrphanedRecords ?? false,
      fixUserAssignments: fixUserAssignments ?? false,
      dryRun: dryRun ?? true // Default to dry run for safety
    });
    
    res.json({
      success: true,
      districtId,
      cleanup
    });

  } catch (error) {
    console.error('Error cleaning up district data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clean up district data' 
    });
  }
});

/**
 * POST /api/data-isolation/setup-district
 * Creates a new district with proper data isolation
 */
router.post('/setup-district', async (req, res) => {
  try {
    const { name, slug, contactEmail, contactPhone, address, subscriptionTier } = req.body;
    
    if (!name || !slug || !contactEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, slug, contactEmail' 
      });
    }

    const setup = await dataIsolationService.setupIsolatedDistrict({
      name,
      slug,
      contactEmail,
      contactPhone,
      address,
      subscriptionTier
    });
    
    res.json({
      success: true,
      setup
    });

  } catch (error) {
    console.error('Error setting up isolated district:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to setup isolated district' 
    });
  }
});

/**
 * GET /api/data-isolation/validate-all
 * Validates data isolation for all districts
 */
router.get('/validate-all', async (req, res) => {
  try {
    // Get all districts
    const { db } = await import('./db');
    const { districts } = await import('@shared/schema');
    
    const allDistricts = await db.select().from(districts);
    
    const validationResults = [];
    
    for (const district of allDistricts) {
      const validation = await dataIsolationService.validateDistrictIsolation(district.id);
      validationResults.push({
        districtId: district.id,
        districtName: district.name,
        validation
      });
    }
    
    const overallStatus = {
      totalDistricts: allDistricts.length,
      fullyIsolated: validationResults.filter(r => r.validation.isIsolated).length,
      withViolations: validationResults.filter(r => !r.validation.isIsolated).length,
      totalViolations: validationResults.reduce((sum, r) => sum + r.validation.violations.length, 0)
    };
    
    res.json({
      success: true,
      overallStatus,
      results: validationResults
    });

  } catch (error) {
    console.error('Error validating all districts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to validate all districts' 
    });
  }
});

export { router as dataIsolationRoutes };