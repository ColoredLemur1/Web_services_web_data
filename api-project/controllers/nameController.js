/**
 * Simple health check endpoint. Returns database timestamp.
 */

const pool = require('../config/db');

const getNames = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.status(200).json({
      message: 'Success! The API and Database are talking.',
      timestamp: result.rows[0].now,
      data: [],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNames };