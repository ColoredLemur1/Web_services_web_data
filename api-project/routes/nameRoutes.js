const express = require('express');
const router = express.Router();
const nameController = require('../controllers/nameController');

// Define the "Read" part of CRUD
router.get('/', nameController.getNames);

// This is the line that was missing! 
// It exports the "switchboard" so app.js can use it.
module.exports = router;