# ServiceBot API Specification

## Overview
RESTful API specification for ServiceBot - AI-powered local services marketplace using Supabase backend.

## Base Configuration
- **Base URL**: Supabase API URL + `/rest/v1`
- **Authentication**: Bearer token (Supabase JWT)
- **Content-Type**: `application/json`
- **Rate Limiting**: 100 requests/minute per user

## Authentication Endpoints

### Register User
```http
POST /auth/v1/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "data": {
    "name": "John Doe",
    "user_type": "provider" // or "seeker" or "both"
  }
}

Response: 200 OK
{
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "name": "John Doe",
      "user_type": "provider"
    }
  }
}
```

### Login User
```http
POST /auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}

Response: 200 OK
{
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "user": { ... }
}
```

### Refresh Token
```http
POST /auth/v1/token?grant_type=refresh_token
Content-Type: application/json

{
  "refresh_token": "refresh_token"
}
```

## User Management Endpoints

### Get Current User Profile
```http
GET /users?id=eq.{user_id}
Authorization: Bearer {jwt_token}

Response: 200 OK
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "user_type": "provider",
  "profile_photo": "https://storage.url/photo.jpg",
  "phone": "+1234567890",
  "bio": "Professional plumber with 10 years experience",
  "location": {"x": -122.4194, "y": 37.7749},
  "address_line1": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "postal_code": "94102",
  "verification_status": "email_verified",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Update User Profile
```http
PATCH /users?id=eq.{user_id}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "John Smith",
  "bio": "Updated bio",
  "phone": "+1234567890",
  "address_line1": "456 Oak Ave"
}

Response: 200 OK
// Updated user object
```

### Get Public User Profile
```http
GET /users?id=eq.{user_id}&select=id,name,profile_photo,bio,verification_status,created_at
```

## Service Categories Endpoints

### Get All Categories
```http
GET /categories?is_active=eq.true&order=sort_order.asc

Response: 200 OK
[
  {
    "id": "uuid",
    "name": "Home Services",
    "description": "General home maintenance",
    "icon": "home",
    "parent_id": null,
    "sort_order": 1
  }
]
```

### Get Category Tree
```http
GET /rpc/get_category_tree

Response: 200 OK
[
  {
    "id": "uuid",
    "name": "Home Services",
    "children": [
      {
        "id": "uuid2",
        "name": "Plumbing",
        "parent_id": "uuid"
      }
    ]
  }
]
```

## Service Ads Endpoints

### Create Service Ad
```http
POST /service_ads
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "title": "Professional Plumbing Services",
  "description": "Expert plumbing repairs and installations...",
  "category_id": "uuid",
  "price_type": "hourly",
  "price_min": 75.00,
  "price_max": 150.00,
  "service_location": {"x": -122.4194, "y": 37.7749},
  "photos": ["https://storage.url/photo1.jpg"],
  "skills": ["plumbing", "repairs", "installations"],
  "availability_schedule": {
    "monday": {"start": "08:00", "end": "18:00"},
    "tuesday": {"start": "08:00", "end": "18:00"}
  }
}

Response: 201 Created
{
  "id": "uuid",
  "provider_id": "uuid",
  "status": "draft",
  "created_at": "2024-01-01T00:00:00Z",
  ...
}
```

### Get Service Ads (with search/filter)
```http
GET /service_ads?status=eq.active&category_id=eq.{uuid}&select=*,users(name,profile_photo)

Query Parameters:
- category_id: Filter by category
- price_min: Minimum price filter
- price_max: Maximum price filter  
- location: Geographic filter (lat,lng,radius)
- search: Full-text search in title/description
- sort: created_at.desc, price_min.asc, rating.desc

Response: 200 OK
[
  {
    "id": "uuid",
    "title": "Professional Plumbing",
    "description": "...",
    "provider_id": "uuid",
    "users": {
      "name": "John Doe",
      "profile_photo": "photo.jpg"
    },
    "price_min": 75.00,
    "photos": ["photo1.jpg"],
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### Get Single Service Ad with Provider Info
```http
GET /service_ads?id=eq.{ad_id}&select=*,users(*),reviews(rating,comment,created_at,users(name))

Response: 200 OK
{
  "id": "uuid",
  "title": "Professional Plumbing",
  "users": {
    "name": "John Doe",
    "profile_photo": "photo.jpg",
    "verification_status": "verified"
  },
  "reviews": [
    {
      "rating": 5,
      "comment": "Excellent work!",
      "users": {"name": "Jane Smith"}
    }
  ]
}
```

### Update Service Ad
```http
PATCH /service_ads?id=eq.{ad_id}
Authorization: Bearer {jwt_token}

{
  "title": "Updated title",
  "status": "active"
}
```

### Delete Service Ad
```http
DELETE /service_ads?id=eq.{ad_id}
Authorization: Bearer {jwt_token}
```

## Search & Discovery Endpoints

### Advanced Search
```http
GET /rpc/search_service_ads
Content-Type: application/json

{
  "search_query": "plumbing repair",
  "category_ids": ["uuid1", "uuid2"],
  "location": {"lat": 37.7749, "lng": -122.4194, "radius": 25},
  "price_range": {"min": 50, "max": 200},
  "rating_min": 4.0,
  "availability": "weekend",
  "limit": 20,
  "offset": 0
}

Response: 200 OK
{
  "results": [...],
  "total_count": 156,
  "filters_applied": {...}
}
```

### Get Nearby Providers
```http
GET /rpc/get_providers_near_location

{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "radius_miles": 25,
  "category_id": "uuid",
  "limit": 10
}
```

## AI Chatbot Endpoints

### Start Ad Creation Chat
```http
POST /rpc/start_ad_creation_chat
Authorization: Bearer {jwt_token}

{
  "initial_message": "I want to create an ad for plumbing services"
}

Response: 200 OK
{
  "chat_session_id": "uuid",
  "response": "Great! I'd love to help you create a compelling plumbing services ad. Let's start with some questions...",
  "suggested_responses": [
    "I offer residential plumbing",
    "I specialize in emergency repairs",
    "I do new installations"
  ]
}
```

### Continue Chat Conversation
```http
POST /rpc/continue_ad_chat
Authorization: Bearer {jwt_token}

{
  "chat_session_id": "uuid",
  "message": "I offer residential plumbing services",
  "context": {
    "current_ad_draft": {...}
  }
}

Response: 200 OK
{
  "response": "Excellent! What types of residential plumbing do you specialize in?",
  "suggested_responses": [...],
  "updated_ad_draft": {
    "title": "Residential Plumbing Services",
    "category_id": "plumbing_uuid",
    "partial_description": "..."
  },
  "completion_status": 45 // % complete
}
```

### Generate Ad Suggestions
```http
POST /rpc/generate_ad_suggestions
Authorization: Bearer {jwt_token}

{
  "current_ad": {
    "title": "Plumbing Services",
    "description": "I fix pipes",
    "category_id": "uuid"
  }
}

Response: 200 OK
{
  "suggested_title": "Professional Residential Plumbing Services - Licensed & Insured",
  "suggested_description": "Expert plumbing solutions for your home...",
  "pricing_suggestions": {
    "market_rate_min": 75,
    "market_rate_max": 150,
    "recommended_rate": 90
  },
  "improvement_tips": [
    "Add specific services you offer",
    "Include your years of experience"
  ]
}
```

## Messaging Endpoints

### Get Conversations
```http
GET /rpc/get_user_conversations
Authorization: Bearer {jwt_token}

Response: 200 OK
[
  {
    "conversation_id": "uuid",
    "other_user": {
      "id": "uuid",
      "name": "Jane Smith",
      "profile_photo": "photo.jpg"
    },
    "service_ad": {
      "id": "uuid",
      "title": "House Cleaning"
    },
    "last_message": {
      "content": "When can you start?",
      "created_at": "2024-01-01T12:00:00Z"
    },
    "unread_count": 2
  }
]
```

### Get Messages in Conversation
```http
GET /messages?conversation_id=eq.{uuid}&order=created_at.desc&limit=50
Authorization: Bearer {jwt_token}

Response: 200 OK
[
  {
    "id": "uuid",
    "sender_id": "uuid",
    "content": "Hi, I'm interested in your cleaning service",
    "message_type": "text",
    "created_at": "2024-01-01T10:00:00Z",
    "read_at": "2024-01-01T10:05:00Z"
  }
]
```

### Send Message
```http
POST /messages
Authorization: Bearer {jwt_token}

{
  "conversation_id": "uuid",
  "recipient_id": "uuid",
  "service_ad_id": "uuid",
  "content": "I'm interested in your service",
  "message_type": "text"
}
```

### Send Quote Request
```http
POST /messages
Authorization: Bearer {jwt_token}

{
  "conversation_id": "uuid",
  "recipient_id": "uuid",
  "service_ad_id": "uuid",
  "content": "Quote request for kitchen renovation",
  "message_type": "quote_request",
  "quote_details": {
    "project_description": "Kitchen renovation",
    "timeline": "2 weeks",
    "budget_range": "5000-10000"
  }
}
```

### Send Quote Response
```http
POST /messages
Authorization: Bearer {jwt_token}

{
  "conversation_id": "uuid",
  "recipient_id": "uuid",
  "content": "Here's my quote for your project",
  "message_type": "quote_response",
  "quote_amount": 7500.00,
  "quote_details": {
    "breakdown": {...},
    "timeline": "10 business days",
    "includes": [...]
  }
}
```

## Reviews Endpoints

### Create Review
```http
POST /reviews
Authorization: Bearer {jwt_token}

{
  "service_ad_id": "uuid",
  "provider_id": "uuid",
  "rating": 5,
  "title": "Excellent service!",
  "comment": "John did amazing work on my bathroom...",
  "photos": ["photo1.jpg", "photo2.jpg"],
  "service_date": "2024-01-15"
}

Response: 201 Created
```

### Get Reviews for Service Ad
```http
GET /reviews?service_ad_id=eq.{uuid}&select=*,users(name,profile_photo)&order=created_at.desc

Response: 200 OK
[
  {
    "id": "uuid",
    "rating": 5,
    "comment": "Great work!",
    "photos": ["photo.jpg"],
    "created_at": "2024-01-01T00:00:00Z",
    "users": {
      "name": "Jane Smith",
      "profile_photo": "avatar.jpg"
    },
    "provider_response": "Thank you for the review!",
    "provider_response_date": "2024-01-02T00:00:00Z"
  }
]
```

### Get Provider Reviews & Stats
```http
GET /rpc/get_provider_reviews_stats

{
  "provider_id": "uuid"
}

Response: 200 OK
{
  "average_rating": 4.8,
  "total_reviews": 127,
  "rating_distribution": {
    "5": 98,
    "4": 22,
    "3": 5,
    "2": 1,
    "1": 1
  },
  "recent_reviews": [...]
}
```

### Provider Respond to Review
```http
PATCH /reviews?id=eq.{review_id}
Authorization: Bearer {jwt_token}

{
  "provider_response": "Thank you for the wonderful review!"
}
```

## File Upload Endpoints

### Upload Service Photo
```http
POST /storage/v1/object/service-photos/{filename}
Authorization: Bearer {jwt_token}
Content-Type: image/jpeg

[binary image data]

Response: 200 OK
{
  "path": "service-photos/uuid-filename.jpg",
  "url": "https://storage.url/service-photos/uuid-filename.jpg"
}
```

### Upload User Avatar
```http
POST /storage/v1/object/user-avatars/{user_id}/{filename}
Authorization: Bearer {jwt_token}
Content-Type: image/jpeg

Response: 200 OK
{
  "path": "user-avatars/uuid/avatar.jpg",
  "url": "https://storage.url/user-avatars/uuid/avatar.jpg"
}
```

## Real-time Subscriptions (WebSocket)

### Subscribe to Messages
```javascript
const subscription = supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `recipient_id=eq.${userId}`
  }, payload => {
    // Handle new message
  })
  .subscribe()
```

### Subscribe to Service Ad Updates
```javascript
const subscription = supabase
  .channel('service_ads')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'service_ads',
    filter: `provider_id=eq.${userId}`
  }, payload => {
    // Handle ad update
  })
```

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Email format is invalid"
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Common Error Codes
- `VALIDATION_ERROR` (400): Invalid input data
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Access denied
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

## Custom RPC Functions

### Search with Filters
```sql
CREATE OR REPLACE FUNCTION search_service_ads(
  search_query TEXT DEFAULT NULL,
  category_ids UUID[] DEFAULT NULL,
  location JSONB DEFAULT NULL,
  price_range JSONB DEFAULT NULL,
  rating_min DECIMAL DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  provider_name TEXT,
  provider_photo TEXT,
  average_rating DECIMAL,
  review_count BIGINT,
  price_min DECIMAL,
  price_max DECIMAL,
  photos TEXT[],
  distance_miles DECIMAL
);
```

### Get Category Tree
```sql
CREATE OR REPLACE FUNCTION get_category_tree()
RETURNS JSONB
LANGUAGE SQL
AS $$
WITH RECURSIVE category_tree AS (
  SELECT id, name, description, icon, parent_id, 0 as level,
         jsonb_build_object(
           'id', id,
           'name', name,
           'description', description,
           'icon', icon,
           'children', '[]'::jsonb
         ) as node
  FROM categories 
  WHERE parent_id IS NULL AND is_active = true
  
  UNION ALL
  
  SELECT c.id, c.name, c.description, c.icon, c.parent_id, ct.level + 1,
         jsonb_build_object(
           'id', c.id,
           'name', c.name,
           'description', c.description,
           'icon', c.icon,
           'children', '[]'::jsonb
         )
  FROM categories c
  JOIN category_tree ct ON c.parent_id = ct.id
  WHERE c.is_active = true
)
SELECT jsonb_agg(node) FROM category_tree WHERE level = 0;
$$;
```

## Performance Guidelines

1. **Pagination**: Always use `limit` and `offset` for large result sets
2. **Selective Queries**: Use `select` parameter to fetch only needed fields
3. **Indexing**: Leverage database indexes for filtered queries
4. **Caching**: Cache frequently accessed data (categories, user profiles)
5. **Real-time**: Use Supabase Realtime for live updates only when necessary

## Security Considerations

1. **Row Level Security**: All tables have RLS policies
2. **Input Validation**: Validate all inputs on client and server
3. **File Uploads**: Scan uploaded files for malware
4. **Rate Limiting**: Implement rate limiting on expensive operations
5. **API Keys**: Never expose Supabase anon key in client code production builds