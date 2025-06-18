# ServiceBot Database Schema

## Overview
Comprehensive PostgreSQL schema for ServiceBot - AI-powered local services marketplace.

## Core Tables

### 1. Users Table
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  user_type TEXT CHECK (user_type IN ('provider', 'seeker', 'both')) DEFAULT 'seeker',
  profile_photo TEXT,
  phone TEXT,
  bio TEXT,
  location POINT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  verification_status TEXT CHECK (verification_status IN ('unverified', 'email_verified', 'phone_verified', 'fully_verified')) DEFAULT 'unverified',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data and public profiles
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view public profiles" ON public.users FOR SELECT USING (is_active = true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
```

### 2. Service Categories Table
```sql
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon identifier for UI
  parent_id UUID REFERENCES public.categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories are publicly readable
CREATE POLICY "Categories are publicly readable" ON public.categories FOR SELECT USING (is_active = true);
```

### 3. Service Advertisements Table  
```sql
CREATE TABLE public.service_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  price_type TEXT CHECK (price_type IN ('fixed', 'hourly', 'quote')) NOT NULL,
  price_min DECIMAL(10,2),
  price_max DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  service_area GEOMETRY, -- Geographic service area
  service_location POINT, -- Primary service location
  photos TEXT[], -- Array of photo URLs
  skills TEXT[], -- Array of relevant skills/tags
  availability_schedule JSONB, -- Flexible schedule format
  status TEXT CHECK (status IN ('draft', 'active', 'paused', 'expired', 'deleted')) DEFAULT 'draft',
  featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.service_ads ENABLE ROW LEVEL SECURITY;

-- Service ads policies
CREATE POLICY "Service ads are publicly readable when active" ON public.service_ads FOR SELECT USING (status = 'active');
CREATE POLICY "Providers can manage own ads" ON public.service_ads FOR ALL USING (auth.uid() = provider_id);
```

### 4. Reviews Table
```sql
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_ad_id UUID NOT NULL REFERENCES public.service_ads(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  title TEXT,
  comment TEXT,
  photos TEXT[], -- Before/after photos
  service_date DATE,
  verified BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  provider_response TEXT,
  provider_response_date TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one review per user per service ad
  UNIQUE(reviewer_id, service_ad_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Reviews policies
CREATE POLICY "Public reviews are readable" ON public.reviews FOR SELECT USING (is_public = true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Reviewers can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Providers can respond to reviews" ON public.reviews FOR UPDATE USING (auth.uid() = provider_id);
```

### 5. Messages Table
```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL, -- Groups messages in conversation
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_ad_id UUID REFERENCES public.service_ads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'quote_request', 'quote_response', 'system')) DEFAULT 'text',
  quote_amount DECIMAL(10,2), -- For quote messages
  quote_details JSONB, -- Structured quote information
  attachments TEXT[], -- File URLs
  read_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "Users can read own messages" ON public.messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can mark own messages as read" ON public.messages FOR UPDATE USING (
  auth.uid() = recipient_id AND read_at IS NULL
);
```

### 6. User Preferences Table
```sql
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'in_app')) DEFAULT 'in_app',
  search_radius INTEGER DEFAULT 25, -- Miles
  preferred_categories UUID[], -- Array of category IDs
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "Users can manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);
```

## Indexes for Performance

```sql
-- User table indexes
CREATE INDEX idx_users_location ON public.users USING GIST (location);
CREATE INDEX idx_users_user_type ON public.users (user_type);
CREATE INDEX idx_users_is_active ON public.users (is_active);

-- Service ads indexes
CREATE INDEX idx_service_ads_provider_id ON public.service_ads (provider_id);
CREATE INDEX idx_service_ads_category_id ON public.service_ads (category_id);
CREATE INDEX idx_service_ads_status ON public.service_ads (status);
CREATE INDEX idx_service_ads_location ON public.service_ads USING GIST (service_location);
CREATE INDEX idx_service_ads_area ON public.service_ads USING GIST (service_area);
CREATE INDEX idx_service_ads_price ON public.service_ads (price_min, price_max);
CREATE INDEX idx_service_ads_created_at ON public.service_ads (created_at DESC);

-- Reviews indexes
CREATE INDEX idx_reviews_service_ad_id ON public.reviews (service_ad_id);
CREATE INDEX idx_reviews_provider_id ON public.reviews (provider_id);
CREATE INDEX idx_reviews_rating ON public.reviews (rating);
CREATE INDEX idx_reviews_created_at ON public.reviews (created_at DESC);

-- Messages indexes
CREATE INDEX idx_messages_conversation_id ON public.messages (conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages (sender_id);
CREATE INDEX idx_messages_recipient_id ON public.messages (recipient_id);
CREATE INDEX idx_messages_service_ad_id ON public.messages (service_ad_id);
CREATE INDEX idx_messages_created_at ON public.messages (created_at DESC);

-- Categories indexes
CREATE INDEX idx_categories_parent_id ON public.categories (parent_id);
CREATE INDEX idx_categories_sort_order ON public.categories (sort_order);
```

## Views for Common Queries

```sql
-- Provider statistics view
CREATE VIEW provider_stats AS
SELECT 
  u.id,
  u.name,
  COUNT(sa.id) as total_ads,
  COUNT(CASE WHEN sa.status = 'active' THEN 1 END) as active_ads,
  AVG(r.rating) as average_rating,
  COUNT(r.id) as total_reviews,
  SUM(sa.view_count) as total_views,
  SUM(sa.contact_count) as total_contacts
FROM users u
LEFT JOIN service_ads sa ON u.id = sa.provider_id
LEFT JOIN reviews r ON u.id = r.provider_id
WHERE u.user_type IN ('provider', 'both')
GROUP BY u.id, u.name;

-- Service ads with provider info view
CREATE VIEW service_ads_with_provider AS
SELECT 
  sa.*,
  u.name as provider_name,
  u.profile_photo as provider_photo,
  u.verification_status as provider_verification,
  AVG(r.rating) as provider_rating,
  COUNT(r.id) as provider_review_count
FROM service_ads sa
JOIN users u ON sa.provider_id = u.id
LEFT JOIN reviews r ON u.id = r.provider_id
WHERE sa.status = 'active'
GROUP BY sa.id, u.id, u.name, u.profile_photo, u.verification_status;
```

## Functions and Triggers

```sql
-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_ads_updated_at BEFORE UPDATE ON public.service_ads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate conversation IDs for messages
CREATE OR REPLACE FUNCTION generate_conversation_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.conversation_id IS NULL THEN
    -- Create deterministic conversation ID based on participants and service ad
    NEW.conversation_id = gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_message_conversation_id BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION generate_conversation_id();
```

## Seed Data

```sql
-- Insert default categories
INSERT INTO public.categories (name, description, icon, sort_order) VALUES
('Home Services', 'General home maintenance and repairs', 'home', 1),
('Cleaning', 'House cleaning and maintenance services', 'sparkles', 2),
('Electrical', 'Electrical repairs and installations', 'zap', 3),
('Plumbing', 'Plumbing repairs and installations', 'droplet', 4),
('Landscaping', 'Garden and lawn care services', 'tree', 5),
('Handyman', 'General repairs and maintenance', 'wrench', 6),
('Moving', 'Moving and relocation services', 'truck', 7),
('Tutoring', 'Educational and tutoring services', 'book-open', 8),
('Pet Care', 'Pet sitting and care services', 'heart', 9),
('Event Services', 'Party planning and event services', 'calendar', 10);

-- Add subcategories
INSERT INTO public.categories (name, description, icon, parent_id, sort_order) VALUES
('Interior Cleaning', 'Indoor house cleaning', 'home', (SELECT id FROM categories WHERE name = 'Cleaning'), 1),
('Exterior Cleaning', 'Outdoor cleaning services', 'sun', (SELECT id FROM categories WHERE name = 'Cleaning'), 2),
('Lawn Care', 'Grass cutting and maintenance', 'scissors', (SELECT id FROM categories WHERE name = 'Landscaping'), 1),
('Garden Design', 'Landscape design and planning', 'flower', (SELECT id FROM categories WHERE name = 'Landscaping'), 2);
```

## Storage Configuration

```sql
-- Set up storage buckets for photos
INSERT INTO storage.buckets (id, name, public) VALUES 
('service-photos', 'service-photos', true),
('user-avatars', 'user-avatars', true),
('review-photos', 'review-photos', true);

-- Storage policies
CREATE POLICY "Service photos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'service-photos');
CREATE POLICY "Users can upload service photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'service-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own service photos" ON storage.objects FOR UPDATE USING (bucket_id = 'service-photos' AND auth.uid()::text = owner);

CREATE POLICY "User avatars are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'user-avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user-avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'user-avatars' AND auth.uid()::text = owner);

CREATE POLICY "Review photos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'review-photos');
CREATE POLICY "Users can upload review photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'review-photos' AND auth.role() = 'authenticated');
```

## Performance Considerations

1. **Geographic Queries**: PostGIS extension enabled for spatial operations
2. **Search**: Full-text search on service descriptions and titles
3. **Caching**: Views for common aggregations
4. **Indexing**: Strategic indexes on frequently queried columns
5. **Partitioning**: Consider partitioning messages table by date for high volume

## Security Notes

1. **Row Level Security**: Enabled on all tables with appropriate policies
2. **Input Validation**: Check constraints on enums and ranges
3. **Data Integrity**: Foreign key constraints maintain referential integrity
4. **Privacy**: User data access controlled by RLS policies
5. **File Security**: Storage policies restrict access to appropriate users