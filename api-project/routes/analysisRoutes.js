/**
 * Analysis routes. Market summary with optional region and query params.
 */

const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const validateJoi = require('../middleware/validateJoi');
const { marketSummaryQuery, analysisRegionIdParam } = require('../middleware/schemas');

router.get('/market-summary', validateJoi(marketSummaryQuery, 'query'), analysisController.getMarketSummary);
router.get('/:region_id', validateJoi(analysisRegionIdParam, 'params'), validateJoi(marketSummaryQuery, 'query'), analysisController.getMarketSummary);

module.exports = router;
