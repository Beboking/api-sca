<<<<<<<
# Chess Game Search API

A high-performance REST API for searching and retrieving chess games from PGN (Portable Game Notation) files. This API provides advanced search capabilities with multiple filters, pagination, and caching for optimal performance.

## Features

### 🔍 Advanced Search Capabilities
- **Player Search**: Find games by player name (supports fuzzy matching)
- **Specific Player Roles**: Search by white or black player specifically
- **Date Range Filtering**: Filter games by date range
- **ECO Code Filtering**: Search by chess opening codes (ECO)
- **Result Filtering**: Filter by game results (1-0, 0-1, 1/2-1/2, *)
- **Event Filtering**: Search by tournament or event name
- **Game ID Lookup**: Retrieve specific games by ID

### ⚡ Performance Optimizations
- **Streaming PGN Processing**: Efficient memory usage for large PGN files
- **Smart Caching**: LRU cache for frequently accessed search results
- **Pagination**: Configurable page sizes to handle large result sets
- **Asynchronous Processing**: Non-blocking operations for better concurrency

### 🛡️ Security & Reliability
- **Time-Limited Access Codes**: 12-hour JWT-based authentication system
- **Rate Limiting**: Configurable request limits per IP
- **Input Validation**: Comprehensive parameter validation
- **Error Handling**: Detailed error responses with proper HTTP status codes
- **Security Headers**: Helmet.js integration for security best practices
- **Graceful Shutdown**: Proper cleanup on server termination

### 📊 Monitoring & Observability
- **Health Checks**: Built-in health monitoring endpoint
- **Statistics**: API usage and performance metrics
- **Structured Logging**: Configurable logging with different levels
- **Request Tracking**: Detailed request/response logging

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/Beboking/api-sca.git
cd api-sca

# Install dependencies
npm install

# Start the server
npm start
```

### Development Mode

```bash
# Start with auto-reload
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Authentication

**⚠️ Important: All API endpoints (except authentication and health checks) now require a valid access code.**

### 🔑 Generate Access Code
```http
POST /auth/generate-code
```

Generate a unique access code that expires in 12 hours.

**Request Body (optional):**
```json
{
  "userInfo": {
    "name": "Your Name",
    "email": "your@email.com",
    "purpose": "Chess game analysis"
  }
}
```

**Response:**
```json
{
  "success": true,
  "accessCode": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "codeId": "abc123def456",
  "expiresAt": "2025-07-13T02:30:00.000Z",
  "expiresIn": "12 hours",
  "message": "Access code generated successfully. This code will expire in 12 hours.",
  "usage": {
    "headerFormat": "Authorization: Bearer YOUR_ACCESS_CODE",
    "queryFormat": "?access_code=YOUR_ACCESS_CODE",
    "bodyFormat": "{ \"access_code\": \"YOUR_ACCESS_CODE\" }"
  }
}
```

### 🔐 Using Access Codes

You can provide your access code in three ways:

1. **Authorization Header (Recommended):**
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_CODE" "http://localhost:3000/games/search?player=Magnus"
```

2. **Query Parameter:**
```bash
curl "http://localhost:3000/games/search?player=Magnus&access_code=YOUR_ACCESS_CODE"
```

3. **Request Body (for POST requests):**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"access_code": "YOUR_ACCESS_CODE"}' \
  "http://localhost:3000/auth/validate"
```

## API Endpoints

### 🔍 Search Games
```http
GET /games/search
```

**Query Parameters:**
- `player` (string): Search by player name (either white or black)
- `white` (string): Search by white player name specifically
- `black` (string): Search by black player name specifically
- `dateFrom` (string): Filter games from date (YYYY-MM-DD format)
- `dateTo` (string): Filter games to date (YYYY-MM-DD format)
- `eco` (string): Filter by ECO code (e.g., E90, C42)
- `result` (string): Filter by result (1-0, 0-1, 1/2-1/2, *)
- `event` (string): Filter by event/tournament name
- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (default: 20, max: 100)

**Example Requests:**
```bash
# First, generate an access code
ACCESS_CODE=$(curl -s -X POST "http://localhost:3000/auth/generate-code" | jq -r '.accessCode')

# Search by player name
curl -H "Authorization: Bearer $ACCESS_CODE" \
  "http://localhost:3000/games/search?player=Magnus%20Carlsen"

# Advanced search with multiple filters
curl -H "Authorization: Bearer $ACCESS_CODE" \
  "http://localhost:3000/games/search?white=Magnus%20Carlsen&dateFrom=2023-01-01&dateTo=2023-12-31&eco=E90&result=1-0&page=1&limit=50"

# Search by event
curl -H "Authorization: Bearer $ACCESS_CODE" \
  "http://localhost:3000/games/search?event=World%20Championship&page=2"
```

**Response Format:**
```json
{
  "games": [
    {
      "gameId": "2185080228098110",
      "event": "Torne Suizo Academia Strong Chess 2025",
      "site": "?",
      "date": "2025.06.03",
      "round": "?",
      "white": "Muñoz, Lisanny",
      "black": "De Los Santos, Eddy",
      "result": "0-1",
      "eco": "B88",
      "plyCount": 70,
      "moves": ["e4", "c5", "Nf3", "..."],
      "pgn": "[Event \"...\"]\n\n1. e4 c5 2. Nf3 ..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "searchTime": 45,
  "processedGames": 1500,
  "request": {
    "timestamp": "2025-07-12T10:30:00.000Z",
    "parameters": { ... }
  }
}
```

### 🎯 Get Game by ID
```http
GET /games/:gameId
```

**Example:**
```bash
curl -H "Authorization: Bearer $ACCESS_CODE" \
  "http://localhost:3000/games/2185080228098110"
```

### 👥 Player Suggestions
```http
GET /players/suggestions?query=Magnus
```

Get autocomplete suggestions for player names.

**Example:**
```bash
curl -H "Authorization: Bearer $ACCESS_CODE" \
  "http://localhost:3000/players/suggestions?query=Magnus"
```

### 📊 API Statistics
```http
GET /stats
```

Get API usage statistics and performance metrics.

**Example:**
```bash
curl -H "Authorization: Bearer $ACCESS_CODE" \
  "http://localhost:3000/stats"
```

## Authentication Management

### 🔍 Validate Access Code
```http
POST /auth/validate
```

Check if an access code is valid.

**Request Body:**
```json
{
  "access_code": "YOUR_ACCESS_CODE"
}
```

### ℹ️ Get Access Code Info
```http
GET /auth/info
```

Get information about your current access code.

**Example:**
```bash
curl -H "Authorization: Bearer $ACCESS_CODE" \
  "http://localhost:3000/auth/info"
```

### 🗑️ Revoke Access Code
```http
POST /auth/revoke
```

Revoke your current access code (makes it invalid).

**Example:**
```bash
curl -X POST -H "Authorization: Bearer $ACCESS_CODE" \
  "http://localhost:3000/auth/revoke"
```

### 📈 Authentication Statistics (Admin)
```http
GET /auth/stats
```

Get authentication system statistics.

### 📋 List Active Codes (Admin)
```http
GET /auth/codes
```

List all currently active access codes.

### ❌ Revoke Code by ID (Admin)
```http
DELETE /auth/codes/:codeId
```

Revoke a specific access code by its ID.

### ❤️ Health Checks
```http
GET /health          # General API health
GET /auth/health     # Authentication service health
```

Check API and authentication service health status.

## Configuration

The API can be configured using environment variables:

### Server Configuration
- `PORT` (default: 3000): Server port
- `HOST` (default: localhost): Server host
- `NODE_ENV` (default: development): Environment mode

### PGN File Configuration
- `PGN_FILE_PATH`: Path to the PGN file
- `PGN_INDEX_PATH`: Path to the PGN index file
- `PGN_CHUNK_SIZE` (default: 1000): Games to process per chunk
- `CACHE_SIZE` (default: 100): Number of cached search results

### Search Configuration
- `DEFAULT_PAGE_SIZE` (default: 20): Default pagination size
- `MAX_PAGE_SIZE` (default: 100): Maximum pagination size
- `MAX_SEARCH_RESULTS` (default: 1000): Maximum results per search

### Rate Limiting
- `RATE_LIMIT_WINDOW` (default: 900000): Rate limit window in ms (15 minutes)
- `RATE_LIMIT_MAX` (default: 100): Max requests per window

### Authentication
- `JWT_SECRET`: Secret key for JWT token signing (required in production)
- `ACCESS_CODE_EXPIRY` (default: 12h): Access code expiration time
- `JWT_ISSUER` (default: chess-api): JWT token issuer
- `JWT_AUDIENCE` (default: chess-api-users): JWT token audience

### Logging
- `LOG_LEVEL` (default: info): Logging level (error, warn, info, debug)

## Architecture

### Project Structure
```
src/
├── config.js              # Configuration management
├── server.js              # Main server file
├── controllers/
│   └── gameController.js   # API route handlers
├── services/
│   └── searchService.js    # Core search logic
├── middleware/
│   └── errorHandler.js     # Error handling middleware
└── utils/
    ├── logger.js           # Logging utility
    └── validation.js       # Input validation

tests/
├── fixtures/               # Test data
├── server.test.js         # API endpoint tests
└── validation.test.js     # Validation tests
```

### Key Components

1. **Search Service**: Core search engine with fuzzy matching and filtering
2. **Game Controller**: API request/response handling
3. **Validation Utils**: Input sanitization and validation
4. **Error Handler**: Centralized error processing
5. **Logger**: Structured logging system

## Performance Considerations

### Memory Usage
- Games are loaded on-demand rather than keeping all in memory
- Configurable cache size to balance memory vs. performance
- Streaming PGN processing for large files

### Search Performance
- Indexed game lookup by offset for fast access
- Fuzzy string matching with similarity scoring
- Early termination when result limits are reached
- Asynchronous processing to avoid blocking

### Scalability
- Stateless design for horizontal scaling
- Configurable rate limiting
- Efficient pagination for large datasets

## Error Handling

The API provides detailed error responses with appropriate HTTP status codes:

- `400 Bad Request`: Invalid parameters or validation errors
- `404 Not Found`: Game or resource not found
- `408 Request Timeout`: Request processing timeout
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side errors
- `503 Service Unavailable`: Service health issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

ISC License - see LICENSE file for details.
=======
# Chess Game Search API

A high-performance REST API for searching and retrieving chess games from PGN (Portable Game Notation) files. This API provides advanced search capabilities with multiple filters, pagination, and caching for optimal performance.

## Features

### 🔍 Advanced Search Capabilities
- **Player Search**: Find games by player name (supports fuzzy matching)
- **Specific Player Roles**: Search by white or black player specifically
- **Date Range Filtering**: Filter games by date range
- **ECO Code Filtering**: Search by chess opening codes (ECO)
- **Result Filtering**: Filter by game results (1-0, 0-1, 1/2-1/2, *)
- **Event Filtering**: Search by tournament or event name
- **Game ID Lookup**: Retrieve specific games by ID

### ⚡ Performance Optimizations
- **Streaming PGN Processing**: Efficient memory usage for large PGN files
- **Smart Caching**: LRU cache for frequently accessed search results
- **Pagination**: Configurable page sizes to handle large result sets
- **Asynchronous Processing**: Non-blocking operations for better concurrency

### 🛡️ Security & Reliability
- **Time-Limited Access Codes**: 12-hour JWT-based authentication system
- **Rate Limiting**: Configurable request limits per IP
- **Input Validation**: Comprehensive parameter validation
- **Error Handling**: Detailed error responses with proper HTTP status codes
- **Security Headers**: Helmet.js integration for security best practices
- **Graceful Shutdown**: Proper cleanup on server termination

### 📊 Monitoring & Observability
- **Health Checks**: Built-in health monitoring endpoint
- **Statistics**: API usage and performance metrics
- **Structured Logging**: Configurable logging with different levels
- **Request Tracking**: Detailed request/response logging

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/Beboking/api-sca.git
cd api-sca

# Install dependencies
npm install

# Start the server
npm start
```

### Development Mode

```bash
# Start with auto-reload
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Sistema de Autenticación

**⚠️ Importante: Todos los endpoints de la API (excepto autenticación y health checks) requieren un código de acceso válido.**

### 🔑 Generar Código de Acceso (Solo Admin)
```http
POST /auth/generate-code
```

El administrador genera códigos simples de 8 caracteres que expiran en 12 horas.

**Cuerpo de la Solicitud (opcional):**
```json
{
  "adminId": "admin001",
  "purpose": "Acceso para torneo de ajedrez"
}
```

**Respuesta:**
```json
{
  "success": true,
  "accessCode": "A1B2C3D4",
  "expiresAt": "2025-07-13T02:30:00.000Z",
  "expiresIn": "12 horas",
  "message": "Código de acceso generado: A1B2C3D4. Válido por 12 horas.",
  "instrucciones": {
    "uso": "Proporciona este código a los usuarios para acceder al sistema",
    "formatos": {
      "header": "Authorization: Bearer A1B2C3D4",
      "query": "?access_code=A1B2C3D4",
      "body": "{ \"access_code\": \"A1B2C3D4\" }"
    }
  }
}
```

### 🔐 Usar Códigos de Acceso

Los usuarios pueden proporcionar el código de acceso de tres formas:

1. **Header de Autorización (Recomendado):**
```bash
curl -H "Authorization: Bearer A1B2C3D4" "http://localhost:3000/games/search?player=Magnus"
```

2. **Parámetro de Consulta:**
```bash
curl "http://localhost:3000/games/search?player=Magnus&access_code=A1B2C3D4"
```

3. **Cuerpo de la Solicitud (para solicitudes POST):**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"access_code": "A1B2C3D4"}' \
  "http://localhost:3000/auth/validate"
```

### ✨ Características del Sistema
- **Códigos Simples**: Solo 8 caracteres alfanuméricos (ej: A1B2C3D4)
- **Duración**: Exactamente 12 horas desde la generación
- **Flexibilidad**: Acepta mayúsculas, minúsculas y espacios
- **Seguimiento**: Cuenta los usos de cada código
- **Admin Control**: Solo administradores pueden generar códigos

## API Endpoints

### 🔍 Search Games
```http
GET /games/search
```

**Query Parameters:**
- `player` (string): Search by player name (either white or black)
- `white` (string): Search by white player name specifically
- `black` (string): Search by black player name specifically
- `dateFrom` (string): Filter games from date (YYYY-MM-DD format)
- `dateTo` (string): Filter games to date (YYYY-MM-DD format)
- `eco` (string): Filter by ECO code (e.g., E90, C42)
- `result` (string): Filter by result (1-0, 0-1, 1/2-1/2, *)
- `event` (string): Filter by event/tournament name
- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (default: 20, max: 100)

**Ejemplos de Solicitudes:**
```bash
# Primero, el admin genera un código de acceso
curl -X POST "http://localhost:3000/auth/generate-code" \
  -H "Content-Type: application/json" \
  -d '{"adminId": "admin001", "purpose": "Torneo de ajedrez"}'

# Respuesta: {"accessCode": "A1B2C3D4", ...}

# Buscar por nombre de jugador
curl -H "Authorization: Bearer A1B2C3D4" \
  "http://localhost:3000/games/search?player=Magnus%20Carlsen"

# Búsqueda avanzada con múltiples filtros
curl -H "Authorization: Bearer A1B2C3D4" \
  "http://localhost:3000/games/search?white=Magnus%20Carlsen&dateFrom=2023-01-01&dateTo=2023-12-31&eco=E90&result=1-0&page=1&limit=50"

# Buscar por evento (usando parámetro de consulta)
curl "http://localhost:3000/games/search?event=World%20Championship&access_code=A1B2C3D4"
```

**Response Format:**
```json
{
  "games": [
    {
      "gameId": "2185080228098110",
      "event": "Torne Suizo Academia Strong Chess 2025",
      "site": "?",
      "date": "2025.06.03",
      "round": "?",
      "white": "Muñoz, Lisanny",
      "black": "De Los Santos, Eddy",
      "result": "0-1",
      "eco": "B88",
      "plyCount": 70,
      "moves": ["e4", "c5", "Nf3", "..."],
      "pgn": "[Event \"...\"]\n\n1. e4 c5 2. Nf3 ..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "searchTime": 45,
  "processedGames": 1500,
  "request": {
    "timestamp": "2025-07-12T10:30:00.000Z",
    "parameters": { ... }
  }
}
```

### 🎯 Get Game by ID
```http
GET /games/:gameId
```

**Example:**
```bash
curl -H "Authorization: Bearer $ACCESS_CODE" \
  "http://localhost:3000/games/2185080228098110"
```

### 👥 Player Suggestions
```http
GET /players/suggestions?query=Magnus
```

Get autocomplete suggestions for player names.

**Example:**
```bash
curl -H "Authorization: Bearer $ACCESS_CODE" \
  "http://localhost:3000/players/suggestions?query=Magnus"
```

### 📊 API Statistics
```http
GET /stats
```

Get API usage statistics and performance metrics.

**Example:**
```bash
curl -H "Authorization: Bearer $ACCESS_CODE" \
  "http://localhost:3000/stats"
```

## Authentication Management

### 🔍 Validate Access Code
```http
POST /auth/validate
```

Check if an access code is valid.

**Request Body:**
```json
{
  "access_code": "YOUR_ACCESS_CODE"
}
```

### ℹ️ Get Access Code Info
```http
GET /auth/info
```

Get information about your current access code.

**Example:**
```bash
curl -H "Authorization: Bearer $ACCESS_CODE" \
  "http://localhost:3000/auth/info"
```

### 🗑️ Revoke Access Code
```http
POST /auth/revoke
```

Revoke your current access code (makes it invalid).

**Example:**
```bash
curl -X POST -H "Authorization: Bearer $ACCESS_CODE" \
  "http://localhost:3000/auth/revoke"
```

### 📈 Authentication Statistics (Admin)
```http
GET /auth/stats
```

Get authentication system statistics.

### 📋 List Active Codes (Admin)
```http
GET /auth/codes
```

List all currently active access codes.

### ❌ Revoke Code by ID (Admin)
```http
DELETE /auth/codes/:codeId
```

Revoke a specific access code by its ID.

### ❤️ Health Checks
```http
GET /health          # General API health
GET /auth/health     # Authentication service health
```

Check API and authentication service health status.

## Configuration

The API can be configured using environment variables:

### Server Configuration
- `PORT` (default: 3000): Server port
- `HOST` (default: localhost): Server host
- `NODE_ENV` (default: development): Environment mode

### PGN File Configuration
- `PGN_FILE_PATH`: Path to the PGN file
- `PGN_INDEX_PATH`: Path to the PGN index file
- `PGN_CHUNK_SIZE` (default: 1000): Games to process per chunk
- `CACHE_SIZE` (default: 100): Number of cached search results

### Search Configuration
- `DEFAULT_PAGE_SIZE` (default: 20): Default pagination size
- `MAX_PAGE_SIZE` (default: 100): Maximum pagination size
- `MAX_SEARCH_RESULTS` (default: 1000): Maximum results per search

### Rate Limiting
- `RATE_LIMIT_WINDOW` (default: 900000): Rate limit window in ms (15 minutes)
- `RATE_LIMIT_MAX` (default: 100): Max requests per window

### Authentication
- `JWT_SECRET`: Secret key for JWT token signing (required in production)
- `ACCESS_CODE_EXPIRY` (default: 12h): Access code expiration time
- `JWT_ISSUER` (default: chess-api): JWT token issuer
- `JWT_AUDIENCE` (default: chess-api-users): JWT token audience

### Logging
- `LOG_LEVEL` (default: info): Logging level (error, warn, info, debug)

## Architecture

### Project Structure
```
src/
├── config.js              # Configuration management
├── server.js              # Main server file
├── controllers/
│   └── gameController.js   # API route handlers
├── services/
│   └── searchService.js    # Core search logic
├── middleware/
│   └── errorHandler.js     # Error handling middleware
└── utils/
    ├── logger.js           # Logging utility
    └── validation.js       # Input validation

tests/
├── fixtures/               # Test data
├── server.test.js         # API endpoint tests
└── validation.test.js     # Validation tests
```

### Key Components

1. **Search Service**: Core search engine with fuzzy matching and filtering
2. **Game Controller**: API request/response handling
3. **Validation Utils**: Input sanitization and validation
4. **Error Handler**: Centralized error processing
5. **Logger**: Structured logging system

## Performance Considerations

### Memory Usage
- Games are loaded on-demand rather than keeping all in memory
- Configurable cache size to balance memory vs. performance
- Streaming PGN processing for large files

### Search Performance
- Indexed game lookup by offset for fast access
- Fuzzy string matching with similarity scoring
- Early termination when result limits are reached
- Asynchronous processing to avoid blocking

### Scalability
- Stateless design for horizontal scaling
- Configurable rate limiting
- Efficient pagination for large datasets

## Error Handling

The API provides detailed error responses with appropriate HTTP status codes:

- `400 Bad Request`: Invalid parameters or validation errors
- `404 Not Found`: Game or resource not found
- `408 Request Timeout`: Request processing timeout
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side errors
- `503 Service Unavailable`: Service health issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

ISC License - see LICENSE file for details.
>>>>>>>
