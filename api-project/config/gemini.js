const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = 'gemini-3.1-flash-lite-preview';

let _model = null;

/**
 * Returns a Gemini GenerativeModel instance, or null if GEMINI_API_KEY is not set.
 * Use for AI insights (e.g. market summary). Callers should check for null and return 503.
 */
function getGeminiModel() {
  if (!API_KEY || API_KEY.trim() === '') return null;
  if (_model) return _model;
  const genAI = new GoogleGenerativeAI(API_KEY.trim());
  _model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
  return _model;
}

/**
 * Whether the Gemini API is configured (key present). Used to return 503 when insights are requested but not configured.
 */
function isGeminiConfigured() {
  return !!(API_KEY && API_KEY.trim() !== '');
}

module.exports = {
  getGeminiModel,
  isGeminiConfigured,
  DEFAULT_MODEL,
};
