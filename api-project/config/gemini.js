/**
 * Gemini model wrapper for AI insights. Returns null when GEMINI_API_KEY is not set.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = 'gemini-3.1-flash-lite-preview';

let _model = null;

function getGeminiModel() {
  if (!API_KEY || API_KEY.trim() === '') return null;
  if (_model) return _model;
  const genAI = new GoogleGenerativeAI(API_KEY.trim());
  _model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
  return _model;
}

function isGeminiConfigured() {
  return !!(API_KEY && API_KEY.trim() !== '');
}

module.exports = {
  getGeminiModel,
  isGeminiConfigured,
  DEFAULT_MODEL,
};
