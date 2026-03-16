/**
 * OpenAPI 3 spec for UK Housing Market API. Served at api docs.
 */

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'UK Housing Market API',
    version: '1.0.0',
    description:
      'REST API for UK housing sales, affordability, and rental metrics based on ONS and UK House Price Index (HPI) data. Provides housing-sales data, buyer-dwelling breakdowns, affordability metrics, rental metrics, and an affordability index that compares your salary to regional rents and implied borrower income.',
  },
  servers: [{ url: '/', description: 'Current host' }],
  tags: [
    { name: 'Lookups', description: 'Reference data for filters and dropdowns' },
    { name: 'Housing & rental data', description: 'Time-series and filtered datasets' },
    { name: 'Affordability', description: 'Affordability metrics and index' },
    { name: 'AI insights', description: 'LLM-generated market analysis (deployer-configured Gemini; no consumer API key)' },
    { name: 'Health', description: 'API health check' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description:
          'API key required for write operations (POST, PUT, PATCH, DELETE). GET endpoints are public. You can also use Authorization: Bearer <key>. Use the Authorize button to set your key once for testing protected routes.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        description: 'Standard error response returned for 400, 401, 404, 409, and 500 responses.',
        properties: {
          error: { type: 'string', description: 'HTTP status label (e.g. Bad Request, Unauthorized, Not Found)' },
          message: { type: 'string', description: 'Human-readable error detail for debugging or user display' },
        },
        example: { error: 'Bad Request', message: 'salary query parameter is required' },
      },
      SuccessList: {
        type: 'object',
        description: 'Paginated list response used by GET endpoints that return arrays. Contains count, optional limit/offset, and a data array.',
        properties: {
          count: { type: 'integer', description: 'Number of items in the data array' },
          limit: { type: 'integer', description: 'Max items per page (only present when pagination applies)' },
          offset: { type: 'integer', description: 'Pagination offset (only present when pagination applies)' },
          data: { type: 'array', items: {}, description: 'Array of result objects; shape depends on the endpoint' },
        },
      },
      Region: {
        type: 'object',
        description: 'A geographic region (e.g. United Kingdom, or an ONS area from rental data). Used for filtering housing and rental endpoints.',
        properties: {
          id: { type: 'integer', description: 'Unique region ID; use this as region_id in query params' },
          name: { type: 'string', description: 'Display name of the region' },
          gss_code: { type: 'string', nullable: true, description: 'ONS GSS code (e.g. K02000001 for UK); may be null' },
        },
        example: { id: 1, name: 'United Kingdom', gss_code: 'K02000001' },
      },
      RegionCreate: {
        type: 'object',
        required: ['name'],
        description: 'Request body for creating a region (POST /api/regions). Admin only; requires x-api-key.',
        properties: {
          name: { type: 'string', description: 'Region name (required). Non-empty string.', example: 'London' },
          gss_code: { type: 'string', description: 'Optional ONS GSS code (e.g. E12000007 for London). Must be unique if provided.', example: 'E12000007' },
        },
      },
      RegionUpdate: {
        type: 'object',
        description: 'Request body for updating a region (PUT /api/regions/{id}). At least one field required. Admin only; requires x-api-key.',
        minProperties: 1,
        properties: {
          name: { type: 'string', description: 'New region name (optional)' },
          gss_code: { type: 'string', description: 'New GSS code (optional). Use null or omit to clear.' },
        },
      },
      PropertyType: {
        type: 'object',
        description: 'A property type from the UKHPI taxonomy (e.g. All property types, Detached houses). Used to filter housing-sales.',
        properties: {
          id: { type: 'integer', description: 'Unique property type ID' },
          type_name: { type: 'string', description: 'Name of the property type' },
        },
      },
      BuyerDwellingCategory: {
        type: 'object',
        description: 'Category combining buyer type and dwelling type (e.g. First time buyers / New dwellings). Used to filter housing-sales-by-buyer and affordability.',
        properties: {
          id: { type: 'integer', description: 'Unique category ID' },
          name: { type: 'string', description: 'Category name' },
        },
      },
      AffordabilityIndexSuccess: {
        type: 'object',
        description: 'Response from GET /api/affordability-index. Compares your salary to regional rent and implied income; includes a health score and ratios.',
        properties: {
          region: {
            type: 'object',
            description: 'The region used for the calculation',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              gss_code: { type: 'string', nullable: true },
              implied_avg_borrower_income: { type: 'number', nullable: true, description: 'Derived from ONS tables; may be null' },
              implied_income_year: { type: 'string', nullable: true, description: 'Year of the implied income estimate' },
            },
          },
          inputs: {
            type: 'object',
            properties: { annual_salary: { type: 'number', description: 'The salary you submitted (annual)' } },
          },
          rental_snapshot: {
            type: 'object',
            description: 'Latest rental data for the region',
            properties: {
              period: { type: 'string', description: 'Date of the rental snapshot (e.g. 2025-12-01)' },
              monthly_rent_all_property_types: { type: 'number', description: 'Average monthly rent (£)' },
              annual_rent_all_property_types: { type: 'number', description: 'Annualised rent (12 × monthly)' },
            },
          },
          ratios: {
            type: 'object',
            description: 'Rent as a proportion of salary and of regional income',
            properties: {
              rent_to_salary_ratio: { type: 'number', description: 'Annual rent ÷ your salary (e.g. 0.25 = 25%)' },
              rent_to_salary_percent: { type: 'number', description: 'Same as ratio × 100' },
              rent_to_region_income_percent: { type: 'number', nullable: true, description: 'Rent as % of implied regional income; null if no implied income' },
            },
          },
          health_score: { type: 'string', enum: ['Affordable', 'Stretched', 'Unaffordable'], description: '≤25% Affordable; ≤40% Stretched; >40% Unaffordable' },
          health_explanation: { type: 'string', description: 'Human-readable explanation of the result' },
        },
      },
      HealthCheckResponse: {
        type: 'object',
        description: 'Response from GET /api/names. Confirms API and database connectivity.',
        properties: {
          message: { type: 'string', description: 'Success message' },
          timestamp: { type: 'string', description: 'Server timestamp from the database' },
          data: { type: 'array', description: 'Empty array (reserved for future use)' },
        },
      },
      MarketSummarySuccess: {
        type: 'object',
        description: 'Response from GET /api/analysis/market-summary or GET /api/analysis/{region_id}. Expert market analysis: LLM-generated 150-word executive summary grounded in HPI, rental, and affordability data.',
        properties: {
          region: {
            type: 'object',
            description: 'The region the summary is for',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              gss_code: { type: 'string', nullable: true },
            },
          },
          summary: { type: 'string', description: 'AI-generated executive summary on market health (~150 words)' },
          data_snapshot: {
            type: 'object',
            description: 'Latest data fed to the LLM (rental, HPI last 6 months, price-to-income ratio)',
            properties: {
              region_name: { type: 'string' },
              latest_rent_period: { type: 'string' },
              monthly_rent_gbp: { type: 'number' },
              annual_rent_gbp: { type: 'number' },
              rent_annual_change_pct: { type: 'number', nullable: true },
              implied_avg_borrower_income_gbp: { type: 'number', nullable: true },
              implied_income_year: { type: 'string', nullable: true },
              avg_house_price_gbp: { type: 'number', nullable: true, description: 'Latest HPI average house price (All property types)' },
              house_price_period: { type: 'string', nullable: true },
              house_price_annual_change_pct: { type: 'number', nullable: true },
              hpi_months_included: { type: 'integer', description: 'Number of HPI periods used (up to 6)' },
              price_to_income_ratio: { type: 'number', nullable: true, description: 'From affordability_metrics (All dwellings)' },
              price_to_income_period: { type: 'string', nullable: true },
              user_salary_gbp: { type: 'number', nullable: true, description: 'Present when salary query param was provided' },
              rent_to_salary_pct: { type: 'number', nullable: true, description: 'Annual rent as % of user salary when salary provided' },
              focus: { type: 'string', nullable: true, enum: ['first_time_buyer', 'investor', 'rent_vs_buy'], description: 'Present when focus query param was provided' },
              property_type_id: { type: 'integer', nullable: true, description: 'Present when property_type_id query param was provided' },
              property_type_name: { type: 'string', nullable: true, description: 'Name of property type when property_type_id provided' },
            },
          },
          generated_at: { type: 'string', format: 'date-time', description: 'ISO timestamp when the summary was generated' },
        },
      },
    },
  },
  paths: {
    '/api/regions': {
      get: {
        tags: ['Lookups'],
        summary: 'List regions',
        description:
          'Returns all regions (e.g. United Kingdom and any areas from rental data). Use for dropdowns and filtering other endpoints by region_id or region_name. No query parameters; returns the full list.',
        parameters: [],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessList' },
                    { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Region' } } } },
                  ],
                },
              },
            },
          },
          '500': { description: 'Internal Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        tags: ['Lookups'],
        summary: 'Create a region (admin)',
        description: 'Creates a new region. Requires API key (use Authorize button). Used by admins to add regions for rental or housing data.',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegionCreate' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created. Returns the created region.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Region' } } },
          },
          '400': { description: 'Bad Request (e.g. name missing)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized (missing or invalid API key)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '409': { description: 'Conflict (region with name or gss_code already exists)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '500': { description: 'Internal Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/regions/{id}': {
      put: {
        tags: ['Lookups'],
        summary: 'Update a region (admin)',
        description: 'Updates an existing region by ID. Requires API key (use Authorize button). At least one of name or gss_code must be provided.',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Region ID to update. Path parameter; use the id from GET /api/regions.', example: 1 },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegionUpdate' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Success. Returns the updated region.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Region' } } },
          },
          '400': { description: 'Bad Request (invalid id or body)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized (missing or invalid API key)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Not Found (region not found)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '409': { description: 'Conflict (name or gss_code already in use)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '500': { description: 'Internal Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Lookups'],
        summary: 'Delete a region (admin)',
        description: 'Deletes a region by ID. Requires API key (use Authorize button). Related data (housing sales, rental metrics, etc.) may be cascade-deleted.',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Region ID to delete. Path parameter; use the id from GET /api/regions.', example: 2 },
        ],
        responses: {
          '204': { description: 'No Content. Region deleted.' },
          '400': { description: 'Bad Request (invalid id)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized (missing or invalid API key)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Not Found (region not found)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '500': { description: 'Internal Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/property-types': {
      get: {
        tags: ['Lookups'],
        summary: 'List property types',
        description: 'Returns property types (All property types, Detached, Semi-detached, Terraced, Flats and maisonettes). Use the returned id as property_type_id in GET /api/housing-sales.',
        parameters: [],
        responses: {
          '200': {
            description: 'Success. Data array contains PropertyType objects.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/PropertyType' } },
                  },
                },
              },
            },
          },
          '500': { description: 'Internal Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/buyer-dwelling-categories': {
      get: {
        tags: ['Lookups'],
        summary: 'List buyer/dwelling categories',
        description:
          'Returns buyer-dwelling categories (e.g. First time buyers, Former owner-occupiers, New dwellings, Other dwellings). Use the returned id as category_id in GET /api/housing-sales-by-buyer and GET /api/affordability.',
        parameters: [],
        responses: {
          '200': {
            description: 'Success. Data array contains BuyerDwellingCategory objects.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/BuyerDwellingCategory' } },
                  },
                },
              },
            },
          },
          '500': { description: 'Internal Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/housing-sales': {
      get: {
        tags: ['Housing & rental data'],
        summary: 'Housing sales data (UKHPI)',
        description:
          'Returns housing sales data from the UK House Price Index (UKHPI) with JOINs to regions and property types. Supports filtering by region, year, period range, property type, new/existing build, and price range. Paginated with limit/offset.',
        parameters: [
          { name: 'region_id', in: 'query', required: false, schema: { type: 'integer' }, description: 'Filter by region ID. Get IDs from GET /api/regions.', example: 1 },
          { name: 'region_name', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by region name (case-insensitive). Use instead of region_id if preferred.', example: 'United Kingdom' },
          { name: 'year', in: 'query', required: false, schema: { type: 'integer' }, description: 'Filter by calendar year. Valid range 1900–2100. Sets period_from/period_to to that year.', example: 2025 },
          { name: 'period_from', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Start of period (YYYY-MM-DD). Use with period_to for a date range.', example: '2025-01-01' },
          { name: 'period_to', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'End of period (YYYY-MM-DD).', example: '2025-12-31' },
          { name: 'property_type_id', in: 'query', required: false, schema: { type: 'integer' }, description: 'Filter by property type ID. Get IDs from GET /api/property-types.', example: 1 },
          { name: 'is_new_build', in: 'query', required: false, schema: { type: 'boolean' }, description: 'Filter by new build (true) or existing (false).', example: false },
          { name: 'min_price', in: 'query', required: false, schema: { type: 'number' }, description: 'Minimum average price (£). Must be non-negative; must be ≤ max_price if both set.', example: 100000 },
          { name: 'max_price', in: 'query', required: false, schema: { type: 'number' }, description: 'Maximum average price (£). Must be non-negative.', example: 500000 },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 100 }, description: 'Max number of rows to return. Default 100, max 500.', example: 100 },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0 }, description: 'Number of rows to skip (pagination). Non-negative integer.', example: 0 },
        ],
        responses: {
          '200': { description: 'Success. Data contains housing sales rows with region_name, property_type_name, period, avg_price, etc.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessList' } } } },
          '400': { description: 'Bad Request (invalid parameters)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '500': { description: 'Internal Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/housing-sales-by-buyer': {
      get: {
        tags: ['Housing & rental data'],
        summary: 'Housing sales by buyer and dwelling type',
        description:
          'Returns average house prices by buyer type (e.g. First time buyers, Former owner-occupiers) and dwelling type (New/Other/All), with JOINs to regions and buyer-dwelling categories. Data sourced from ONS Table 28. Filter by region, period, category, and price range.',
        parameters: [
          { name: 'region_id', in: 'query', required: false, schema: { type: 'integer' }, description: 'Filter by region ID. Get IDs from GET /api/regions.', example: 1 },
          { name: 'region_name', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by region name (case-insensitive).', example: 'United Kingdom' },
          { name: 'year', in: 'query', required: false, schema: { type: 'integer' }, description: 'Filter by year (1900–2100).', example: 2025 },
          { name: 'period_from', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Start date YYYY-MM-DD.', example: '2025-01-01' },
          { name: 'period_to', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'End date YYYY-MM-DD.', example: '2025-12-31' },
          { name: 'category_id', in: 'query', required: false, schema: { type: 'integer' }, description: 'Filter by buyer-dwelling category ID. Get IDs from GET /api/buyer-dwelling-categories.', example: 1 },
          { name: 'min_price', in: 'query', required: false, schema: { type: 'number' }, description: 'Minimum average price (£). Non-negative.', example: 100000 },
          { name: 'max_price', in: 'query', required: false, schema: { type: 'number' }, description: 'Maximum average price (£). Non-negative; must be ≥ min_price if both set.', example: 400000 },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 100 }, description: 'Max rows to return. Default 100, max 500.', example: 100 },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0 }, description: 'Pagination offset. Non-negative.', example: 0 },
        ],
        responses: {
          '200': { description: 'Success. Data contains rows with region_name, category_name, period, avg_price.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessList' } } } },
          '400': { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '500': { description: 'Internal Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/affordability': {
      get: {
        tags: ['Affordability'],
        summary: 'Affordability metrics',
        description:
          'Returns ONS affordability metrics (advance price %, price/income ratio, advance/income ratio) by region and buyer-dwelling category. Data from ONS Table 30. Filter by region, period, and category.',
        parameters: [
          { name: 'region_id', in: 'query', required: false, schema: { type: 'integer' }, description: 'Filter by region ID.', example: 1 },
          { name: 'region_name', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by region name.', example: 'United Kingdom' },
          { name: 'year', in: 'query', required: false, schema: { type: 'integer' }, description: 'Filter by year (1900–2100).', example: 2025 },
          { name: 'period_from', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Start date YYYY-MM-DD.', example: '2025-01-01' },
          { name: 'period_to', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'End date YYYY-MM-DD.', example: '2025-12-31' },
          { name: 'category_id', in: 'query', required: false, schema: { type: 'integer' }, description: 'Filter by buyer-dwelling category ID.', example: 1 },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 100 }, description: 'Max rows. Default 100, max 500.', example: 100 },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0 }, description: 'Pagination offset.', example: 0 },
        ],
        responses: {
          '200': { description: 'Success. Data contains affordability metrics (advance_price_pct, price_income_ratio, etc.).', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessList' } } } },
          '400': { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '500': { description: 'Internal Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/rental-metrics': {
      get: {
        tags: ['Housing & rental data'],
        summary: 'Rental metrics',
        description:
          'Returns rental price metrics by region and period: all-property rent, annual change %, and breakdowns (one bed, four+ bed, detached, terraced, flat/maisonette). Filter by region, period, and rent range.',
        parameters: [
          { name: 'region_id', in: 'query', required: false, schema: { type: 'integer' }, description: 'Filter by region ID.', example: 1 },
          { name: 'region_name', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by region name.', example: 'United Kingdom' },
          { name: 'year', in: 'query', required: false, schema: { type: 'integer' }, description: 'Filter by year (1900–2100).', example: 2025 },
          { name: 'period_from', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Start date YYYY-MM-DD.', example: '2025-01-01' },
          { name: 'period_to', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'End date YYYY-MM-DD.', example: '2025-12-31' },
          { name: 'min_rent', in: 'query', required: false, schema: { type: 'number' }, description: 'Minimum rental price (£/month). Non-negative; must be ≤ max_rent if both set.', example: 500 },
          { name: 'max_rent', in: 'query', required: false, schema: { type: 'number' }, description: 'Maximum rental price (£/month). Non-negative.', example: 2000 },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 100 }, description: 'Max rows. Default 100, max 500.', example: 100 },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0 }, description: 'Pagination offset.', example: 0 },
        ],
        responses: {
          '200': { description: 'Success. Data contains rental metrics (rental_price_all, annual_change_pct, etc.).', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessList' } } } },
          '400': { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '500': { description: 'Internal Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/affordability-index': {
      get: {
        tags: ['Affordability'],
        summary: 'Affordability index (salary vs rent)',
        description:
          'Calculates housing affordability based on ONS and HPI benchmarks. Compares your annual salary to the latest regional average rent and to the implied borrower income for the region. Returns a health score (Affordable / Stretched / Unaffordable) and rent-to-salary ratios. Uses the latest rental_metrics.rental_price_all and regions.implied_avg_borrower_income for the chosen region.',
        parameters: [
          {
            name: 'salary',
            in: 'query',
            required: true,
            schema: { type: 'number', example: 35000 },
            description: 'Your annual salary (required). Must be a positive number.',
          },
          {
            name: 'region_id',
            in: 'query',
            required: false,
            schema: { type: 'integer' },
            description: 'Region ID (optional). If omitted, region_name or default United Kingdom is used.',
          },
          {
            name: 'region_name',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'United Kingdom' },
            description: 'Region name (optional string). Used if region_id is not provided. Defaults to United Kingdom if neither is set.',
          },
        ],
        responses: {
          '200': {
            description: 'Success. Returns region, inputs, rental snapshot, ratios, health score, and explanation.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AffordabilityIndexSuccess' },
              },
            },
          },
          '400': {
            description: 'Bad Request (e.g. missing or invalid salary)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '401': {
            description: 'Unauthorized (invalid or missing API key for write operations; GET is public)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': {
            description: 'Not Found (region or rental metrics not found)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Internal Server Error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/analysis/market-summary': {
      get: {
        tags: ['AI insights'],
        summary: 'Market summary by query (LLM)',
        description:
          'Expert market analysis: retrieves latest rental, last 6 months HPI, and price-to-income ratio for the region, feeds them to Gemini, and returns a 150-word executive summary. Optional tailoring: salary (personalise rent affordability), focus (first_time_buyer / investor / rent_vs_buy), property_type_id (HPI for that property type). Region: region_id or region_name (default United Kingdom). Deployer sets GEMINI_API_KEY.',
        parameters: [
          { name: 'region_id', in: 'query', required: false, schema: { type: 'integer' }, description: 'Region ID (optional).' },
          { name: 'region_name', in: 'query', required: false, schema: { type: 'string', example: 'United Kingdom' }, description: 'Region name (optional). Used if region_id not set; defaults to United Kingdom.' },
          { name: 'salary', in: 'query', required: false, schema: { type: 'number', example: 35000 }, description: 'User annual salary in GBP. Tailors summary with rent-as-%-of-salary and affordability angle.' },
          { name: 'focus', in: 'query', required: false, schema: { type: 'string', enum: ['first_time_buyer', 'investor', 'rent_vs_buy'] }, description: 'Scenario focus: first-time buyer affordability, investor outlook, or rent vs buy.' },
          { name: 'property_type_id', in: 'query', required: false, schema: { type: 'integer' }, description: 'Property type ID for HPI data (e.g. Detached, All property types). Use GET /api/property-types for IDs.' },
        ],
        responses: {
          '200': {
            description: 'Success. Returns region, summary, data_snapshot (includes user inputs when provided), generated_at.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MarketSummarySuccess' } } },
          },
          '400': { description: 'Bad Request (e.g. invalid property_type_id)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Region or rental metrics not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '502': { description: 'AI service error or empty response', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '503': { description: 'AI insights not configured (GEMINI_API_KEY not set)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '500': { description: 'Internal Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/analysis/{region_id}': {
      get: {
        tags: ['AI insights'],
        summary: 'Market summary by region ID (LLM)',
        description:
          'Same as GET /api/analysis/market-summary but with region_id in the path. Optional query params: salary, focus, property_type_id for user-tailored analysis.',
        parameters: [
          { name: 'region_id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Region ID.' },
          { name: 'salary', in: 'query', required: false, schema: { type: 'number', example: 35000 }, description: 'User annual salary in GBP. Tailors summary with rent-as-%-of-salary.' },
          { name: 'focus', in: 'query', required: false, schema: { type: 'string', enum: ['first_time_buyer', 'investor', 'rent_vs_buy'] }, description: 'Scenario: first_time_buyer, investor, or rent_vs_buy.' },
          { name: 'property_type_id', in: 'query', required: false, schema: { type: 'integer' }, description: 'Property type ID for HPI data. Use GET /api/property-types.' },
        ],
        responses: {
          '200': {
            description: 'Success. Returns region, summary, data_snapshot, generated_at.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MarketSummarySuccess' } } },
          },
          '400': { description: 'Bad Request (e.g. invalid property_type_id)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Region or rental metrics not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '502': { description: 'AI service error or empty response', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '503': { description: 'AI insights not configured (GEMINI_API_KEY not set)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '500': { description: 'Internal Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/names': {
      get: {
        tags: ['Health'],
        summary: 'API health check',
        description: 'Simple health check that verifies the API and database connection. Returns a success message and server timestamp. No parameters required.',
        parameters: [],
        responses: {
          '200': {
            description: 'Success. API and database are reachable.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthCheckResponse' },
              },
            },
          },
          '500': { description: 'Internal Server Error (e.g. database unreachable)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
};
