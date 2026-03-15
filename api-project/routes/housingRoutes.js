const express = require('express');
const router = express.Router();
const housingController = require('../controllers/housingController');
const validateJoi = require('../middleware/validateJoi');
const {
  regionCreateBody,
  regionUpdateBody,
  regionIdParam,
  affordabilityIndexQuery,
  housingSalesQuery,
  housingSalesByBuyerQuery,
  affordabilityMetricsQuery,
  rentalMetricsQuery,
} = require('../middleware/schemas');

// Lookup tables (for filters / dropdowns)
router.get('/regions', housingController.getRegions);
router.post('/regions', validateJoi(regionCreateBody, 'body'), housingController.createRegion);
router.put('/regions/:id', validateJoi(regionIdParam, 'params'), validateJoi(regionUpdateBody, 'body'), housingController.updateRegion);
router.delete('/regions/:id', validateJoi(regionIdParam, 'params'), housingController.deleteRegion);
router.get('/property-types', housingController.getPropertyTypes);
router.get('/buyer-dwelling-categories', housingController.getBuyerDwellingCategories);

// Housing and rental data (with JOINs to regions and related tables)
router.get('/housing-sales', validateJoi(housingSalesQuery, 'query'), housingController.getHousingSales);
router.get('/housing-sales-by-buyer', validateJoi(housingSalesByBuyerQuery, 'query'), housingController.getHousingSalesByBuyerDwelling);
router.get('/affordability', validateJoi(affordabilityMetricsQuery, 'query'), housingController.getAffordabilityMetrics);
router.get('/rental-metrics', validateJoi(rentalMetricsQuery, 'query'), housingController.getRentalMetrics);
router.get('/affordability-index', validateJoi(affordabilityIndexQuery, 'query'), housingController.getAffordabilityIndex);

module.exports = router;
