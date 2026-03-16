/**
 * Auth routes. Register, login and create API key.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validateJoi = require('../middleware/validateJoi');
const { authRegisterBody, authLoginBody } = require('../middleware/schemas');

router.post('/register', validateJoi(authRegisterBody, 'body'), authController.register);
router.post('/login', validateJoi(authLoginBody, 'body'), authController.login);
router.post('/api-key', validateJoi(authLoginBody, 'body'), authController.createApiKey);

module.exports = router;
