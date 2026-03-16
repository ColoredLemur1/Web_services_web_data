/**
 * Names route. Simple health check that returns database timestamp.
 */

const express = require('express');
const router = express.Router();
const nameController = require('../controllers/nameController');

router.get('/', nameController.getNames);

module.exports = router;