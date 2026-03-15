const pool = require('../config/db');

const getNames = async (req, res, next) => {
    try {
        // Simple SQL query to test the connection
        const result = await pool.query('SELECT NOW()'); 
        res.status(200).json({
            message: "Success! The API and Database are talking.",
            timestamp: result.rows[0].now,
            data: [] // We will populate this later
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getNames };