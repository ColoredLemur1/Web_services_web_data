const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();
const requireApiKey = require('./middleware/requireApiKey');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const nameRoutes = require('./routes/nameRoutes');
const housingRoutes = require('./routes/housingRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const authRoutes = require('./routes/authRoutes');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI: comprehensive API docs at /api-docs (no auth required)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'UK Housing Market API' }));

// Static UI: login, register, index (path relative to app root so it works locally and in Docker)
const publicDir = path.resolve(__dirname, 'public');
app.use(express.static(publicDir));
app.get('/login', (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(publicDir, 'register.html')));
app.use('/auth', authRoutes);

// Require API key for POST, PUT, PATCH, DELETE; GET remains public
app.use(requireApiKey);

app.use('/api/names', nameRoutes);
app.use('/api', housingRoutes);
app.use('/api/analysis', analysisRoutes);

// 404 for unmatched routes (JSON response)
app.use(notFoundHandler);
// Global error handler: consistent JSON, status from err.statusCode or 500
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Housing API: /api/housing-sales, /api/housing-sales-by-buyer, /api/affordability, /api/rental-metrics');
    console.log('Lookups: /api/regions, /api/property-types, /api/buyer-dwelling-categories');
  });
}

module.exports = app;