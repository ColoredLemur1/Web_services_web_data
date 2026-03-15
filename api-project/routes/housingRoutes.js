const express = require('express');
const router = express.Router();
const housingController = require('../controllers/housingController');

// Lookup tables (for filters / dropdowns)
router.get('/regions', housingController.getRegions);
router.post('/regions', housingController.createRegion);
router.put('/regions/:id', housingController.updateRegion);
router.delete('/regions/:id', housingController.deleteRegion);
router.get('/property-types', housingController.getPropertyTypes);
router.get('/buyer-dwelling-categories', housingController.getBuyerDwellingCategories);

// Housing and rental data (with JOINs to regions and related tables)
router.get('/housing-sales', housingController.getHousingSales);
router.get('/housing-sales-by-buyer', housingController.getHousingSalesByBuyerDwelling);
router.get('/affordability', housingController.getAffordabilityMetrics);
router.get('/rental-metrics', housingController.getRentalMetrics);
router.get('/affordability-index', housingController.getAffordabilityIndex);

module.exports = router;
