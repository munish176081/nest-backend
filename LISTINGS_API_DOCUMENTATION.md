# Listings API Documentation

## Overview

The Listings API provides comprehensive functionality for managing different types of listings (Semen, Puppy, Stud, Future, Wanted, Other Services) with advanced features like search, filtering, analytics, and user management.

## Base URL
```
/api/v1/listings
```

## Authentication

Most endpoints require authentication. Include the session cookie in your requests.

## API Endpoints

### 🔐 **Authenticated Endpoints**

#### 1. Create Listing
```http
POST /api/v1/listings
```

**Request Body:**
```json
{
  "title": "Beautiful Labrador Puppy",
  "description": "Healthy 8-week-old Labrador puppy",
  "type": "PUPPY_LISTING",
  "category": "puppy",
  "fields": {
    "breed": "Labrador",
    "age": "8 weeks",
    "price": 1500,
    "microchipNumber": "123456789",
    "vaccinationStatus": "Fully Vaccinated",
    "contactName": "John Doe",
    "contactEmail": "john@example.com",
    "contactPhone": "+1234567890",
    "contactLocation": "Sydney, NSW"
  },
  "price": 1500,
  "breed": "Labrador",
  "location": "Sydney, NSW",
  "images": ["image1.jpg", "image2.jpg"],
  "videos": ["video1.mp4"],
  "tags": ["puppy", "labrador", "family-friendly"],
  "isFeatured": false,
  "isPremium": false
}
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "type": "PUPPY_LISTING",
  "status": "draft",
  "category": "puppy",
  "title": "Beautiful Labrador Puppy",
  "description": "Healthy 8-week-old Labrador puppy",
  "fields": { ... },
  "metadata": { ... },
  "price": 1500,
  "breed": "Labrador",
  "location": "Sydney, NSW",
  "expiresAt": "2024-04-15T00:00:00.000Z",
  "startedOrRenewedAt": "2024-01-15T00:00:00.000Z",
  "publishedAt": null,
  "viewCount": 0,
  "favoriteCount": 0,
  "contactCount": 0,
  "isFeatured": false,
  "isPremium": false,
  "isActive": true,
  "createdAt": "2024-01-15T00:00:00.000Z",
  "updatedAt": "2024-01-15T00:00:00.000Z"
}
```

#### 2. Update Listing
```http
PUT /api/v1/listings/{id}
```

**Request Body:** (Same as Create, but all fields optional)

#### 3. Publish Listing
```http
POST /api/v1/listings/{id}/publish
```

Changes listing status from `draft` to `active`.

#### 4. Delete Listing
```http
DELETE /api/v1/listings/{id}
```

Soft deletes the listing (sets status to `deleted`).

#### 5. Get User's Listings
```http
GET /api/v1/listings/my/listings?status=active&includeExpired=false&includeDrafts=true
```

**Query Parameters:**
- `status`: Filter by status (draft, active, expired, suspended)
- `includeExpired`: Include expired listings (default: false)
- `includeDrafts`: Include draft listings (default: false)

#### 6. Get My Listing Statistics
```http
GET /api/v1/listings/stats/my
```

**Response:**
```json
{
  "total": 15,
  "active": 8,
  "draft": 3,
  "expired": 4,
  "featured": 2,
  "premium": 1
}
```

### 🌐 **Public Endpoints**

#### 1. Get Listing by ID
```http
GET /api/v1/listings/{id}?incrementView=true
```

**Query Parameters:**
- `incrementView`: Increment view count (default: false)

#### 2. Search Listings
```http
GET /api/v1/listings/search?query=labrador&type=PUPPY_LISTING&category=puppy&location=Sydney&page=1&limit=20
```

**Query Parameters:**
- `query`: Search term
- `type`: Filter by listing type
- `category`: Filter by category
- `location`: Filter by location
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "PUPPY_LISTING",
      "status": "active",
      "category": "puppy",
      "title": "Beautiful Labrador Puppy",
      "price": 1500,
      "breed": "Labrador",
      "location": "Sydney, NSW",
      "featuredImage": "image1.jpg",
      "viewCount": 45,
      "favoriteCount": 12,
      "isFeatured": false,
      "isPremium": false,
      "createdAt": "2024-01-15T00:00:00.000Z",
      "user": {
        "id": "user-uuid",
        "name": "John Doe"
      }
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8,
  "hasNext": true,
  "hasPrev": false
}
```

#### 3. Get Listings with Filters
```http
GET /api/v1/listings?type=PUPPY_LISTING&category=puppy&breed=Labrador&minPrice=1000&maxPrice=2000&isFeatured=true&page=1&limit=20&sortBy=price&sortOrder=ASC
```

**Query Parameters:**
- `search`: Search term
- `type`: Listing type filter
- `category`: Category filter
- `status`: Status filter
- `breed`: Breed filter
- `location`: Location filter
- `minPrice`: Minimum price
- `maxPrice`: Maximum price
- `isFeatured`: Featured filter
- `isPremium`: Premium filter
- `tags`: Array of tags
- `userId`: User filter
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sortBy`: Sort field (createdAt, updatedAt, price, viewCount, favoriteCount)
- `sortOrder`: Sort order (ASC, DESC)
- `includeExpired`: Include expired listings (default: false)
- `includeDrafts`: Include draft listings (default: false)

#### 4. Get Featured Listings
```http
GET /api/v1/listings/featured?limit=10
```

#### 5. Get Premium Listings
```http
GET /api/v1/listings/premium?limit=10
```

#### 6. Increment Favorite Count
```http
POST /api/v1/listings/{id}/favorite
```

#### 7. Decrement Favorite Count
```http
DELETE /api/v1/listings/{id}/favorite
```

#### 8. Increment Contact Count
```http
POST /api/v1/listings/{id}/contact
```

#### 9. Get Global Statistics
```http
GET /api/v1/listings/stats/global
```

## Listing Types

### 1. SEMEN_LISTING
- **Category**: breeding
- **Default Expiration**: 30 days
- **Required Fields**: title, breed, dateOfBirth, semenType, dogName, collectionDate, registrationNumber, semenImages, healthCertificates, deliveryOptions

### 2. PUPPY_LISTING
- **Category**: puppy
- **Default Expiration**: 90 days
- **Required Fields**: title, breed, dateOfBirth, puppyGender, pricePerPuppy, microchipNumber, vaccinationStatus, registrationNumber, puppyImages, deliveryOptions

### 3. STUD_LISTING
- **Category**: breeding
- **Default Expiration**: 30 days
- **Required Fields**: title, gender, breed, dogName, dateOfBirth, location, registrationNumber, dogImages, fee

### 4. FUTURE_LISTING
- **Category**: puppy
- **Default Expiration**: 180 days
- **Required Fields**: title, breed, expectedDateOfBirth, estimatedAvailabilityDate, registrationNumber, parentImages

### 5. WANTED_LISTING
- **Category**: wanted
- **Default Expiration**: 90 days
- **Required Fields**: breedWanted, preferredGender, location, budget, contactName, contactEmail, contactPhone

### 6. OTHER_SERVICES
- **Category**: service
- **Default Expiration**: 30 days
- **Required Fields**: serviceTitle, serviceCategory, description, location, contactName, contactEmail, contactPhone, serviceImages

## Status Types

- `draft`: Initial state, not visible to public
- `pending_review`: Under admin review
- `active`: Published and visible
- `expired`: Past expiration date
- `suspended`: Temporarily suspended
- `deleted`: Soft deleted

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid category for listing type: PUPPY_LISTING",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "You can only update your own listings",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Listing not found",
  "error": "Not Found"
}
```

## Pagination

All list endpoints support pagination with the following response structure:

```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8,
  "hasNext": true,
  "hasPrev": false
}
```

## File Upload Integration

The listings API integrates with the existing upload system. Use the upload endpoints to get file URLs, then include them in the listing creation/update:

1. Upload files using `/api/v1/uploads/request-url`
2. Include file URLs in the listing's `images`, `videos`, or `documents` arrays

## Analytics Features

- **View Tracking**: Automatic view count increment
- **Favorite Tracking**: Manual favorite count management
- **Contact Tracking**: Contact count for engagement metrics
- **Analytics Data**: Stored in JSONB for flexible analytics

## SEO Features

- **SEO Data**: Meta titles, descriptions, keywords
- **Slug Generation**: URL-friendly identifiers
- **Structured Data**: Rich metadata for search engines

## Advanced Features

- **Featured Listings**: Promoted listings
- **Premium Listings**: Enhanced visibility
- **Expiration Management**: Automatic status updates
- **Soft Deletion**: Data preservation
- **Flexible Fields**: JSONB storage for dynamic data
- **Search & Filtering**: Advanced query capabilities
- **Analytics**: Comprehensive tracking
- **User Management**: Owner-based access control

## Rate Limiting

- **Create/Update**: 10 requests per minute per user
- **Search/List**: 100 requests per minute per IP
- **View/Contact**: 1000 requests per minute per IP

## Security Features

- **Authentication Required**: For sensitive operations
- **Owner Validation**: Users can only modify their own listings
- **Input Validation**: Comprehensive DTO validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization

This API is designed to be scalable, secure, and easy to integrate with your frontend application! 