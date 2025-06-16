-- ServiceBot Database Schema
-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- Create custom types
create type user_type as enum ('provider', 'seeker', 'both');
create type price_type as enum ('fixed', 'hourly', 'quote');
create type ad_status as enum ('draft', 'active', 'paused', 'expired');
create type message_type as enum ('text', 'quote_request', 'quote_response');

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text,
  user_type user_type not null default 'seeker',
  profile_photo text,
  phone text,
  location geography(point),
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Service categories
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  icon text,
  parent_id uuid references categories(id),
  slug text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Service advertisements
create table public.service_ads (
  id uuid default uuid_generate_v4() primary key,
  provider_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  category_id uuid references categories(id) not null,
  price_type price_type not null default 'quote',
  price_min decimal(10,2),
  price_max decimal(10,2),
  service_area geography(polygon),
  photos text[] default '{}',
  tags text[] default '{}',
  status ad_status not null default 'draft',
  views_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reviews and ratings
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  reviewer_id uuid references profiles(id) on delete cascade not null,
  service_ad_id uuid references service_ads(id) on delete cascade not null,
  provider_id uuid references profiles(id) on delete cascade not null,
  rating integer check (rating >= 1 and rating <= 5) not null,
  comment text,
  photos text[] default '{}',
  verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(reviewer_id, service_ad_id)
);

-- Messages
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references profiles(id) on delete cascade not null,
  recipient_id uuid references profiles(id) on delete cascade not null,
  service_ad_id uuid references service_ads(id) on delete cascade,
  content text not null,
  message_type message_type not null default 'text',
  quote_amount decimal(10,2),
  read_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Conversations view for easier querying
create view public.conversations as
select distinct
  case 
    when sender_id < recipient_id then sender_id
    else recipient_id
  end as user1_id,
  case 
    when sender_id < recipient_id then recipient_id
    else sender_id
  end as user2_id,
  service_ad_id,
  max(created_at) as last_message_at
from messages
group by user1_id, user2_id, service_ad_id;

-- Insert default categories
insert into public.categories (name, description, icon, slug) values
('Home & Garden', 'Home maintenance and garden services', '🏠', 'home-garden'),
('Cleaning', 'House and office cleaning services', '🧽', 'cleaning'),
('Repairs & Maintenance', 'General repair and maintenance work', '🔧', 'repairs'),
('Tutoring & Education', 'Educational and tutoring services', '📚', 'tutoring'),
('Health & Wellness', 'Health, fitness, and wellness services', '💪', 'health'),
('Technology', 'Tech support and digital services', '💻', 'technology'),
('Events & Entertainment', 'Event planning and entertainment', '🎉', 'events'),
('Transportation', 'Moving and transportation services', '🚚', 'transportation');

-- Row Level Security (RLS) Policies

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.service_ads enable row level security;
alter table public.reviews enable row level security;
alter table public.messages enable row level security;

-- Profiles policies
create policy "Users can view all profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Service ads policies
create policy "Anyone can view active service ads" on public.service_ads for select using (status = 'active' or provider_id = auth.uid());
create policy "Providers can manage own ads" on public.service_ads for all using (provider_id = auth.uid());

-- Reviews policies
create policy "Anyone can view reviews" on public.reviews for select using (true);
create policy "Users can create reviews" on public.reviews for insert with check (reviewer_id = auth.uid());
create policy "Users can update own reviews" on public.reviews for update using (reviewer_id = auth.uid());

-- Messages policies
create policy "Users can view own messages" on public.messages for select using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "Users can send messages" on public.messages for insert with check (sender_id = auth.uid());
create policy "Users can update own messages" on public.messages for update using (sender_id = auth.uid());

-- Create functions
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create triggers
create trigger update_profiles_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

create trigger update_service_ads_updated_at before update on public.service_ads
  for each row execute procedure public.update_updated_at_column();

-- Function to increment ad views
create or replace function public.increment_ad_views(ad_id uuid)
returns void as $$
begin
  update public.service_ads set views_count = views_count + 1 where id = ad_id;
end;
$$ language plpgsql security definer;

-- Function to get user's average rating
create or replace function public.get_provider_rating(provider_uuid uuid)
returns decimal as $$
begin
  return (
    select avg(rating)::decimal(3,2)
    from public.reviews
    where provider_id = provider_uuid
  );
end;
$$ language plpgsql;