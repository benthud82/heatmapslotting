-- Warehouse Element Placement MVP Database Schema
-- Run this in Supabase SQL Editor

-- 1. Users and Authentication (Integrated with Supabase Auth)
-- We use a public profiles table that links to auth.users
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Policies
create policy "Users can view their own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.users
  for update using (auth.uid() = id);

-- Trigger to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid error on re-run
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Layouts
-- Single auto-saving layout per user
CREATE TABLE IF NOT EXISTS layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'My Warehouse Layout',
    canvas_width INTEGER NOT NULL DEFAULT 1200,
    canvas_height INTEGER NOT NULL DEFAULT 800,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)  -- One layout per user
);

-- Enable RLS for layouts
ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own layout" ON layouts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own layout" ON layouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own layout" ON layouts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own layout" ON layouts
    FOR DELETE USING (auth.uid() = user_id);


-- 3. Warehouse Elements
CREATE TABLE IF NOT EXISTS warehouse_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
    element_type VARCHAR(20) NOT NULL CHECK (element_type IN ('bay', 'flow_rack', 'full_pallet', 'text', 'line', 'arrow')),
    label VARCHAR(100) NOT NULL,
    x_coordinate DECIMAL(10,2) NOT NULL,
    y_coordinate DECIMAL(10,2) NOT NULL,
    width DECIMAL(10,2) NOT NULL,
    height DECIMAL(10,2) NOT NULL,
    rotation DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS for elements
ALTER TABLE warehouse_elements ENABLE ROW LEVEL SECURITY;

-- We can check layout ownership via join, or just rely on layout_id being secure if we only fetch elements for user's layout
-- For strict RLS:
CREATE POLICY "Users can view elements of their layouts" ON warehouse_elements
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM layouts WHERE layouts.id = warehouse_elements.layout_id AND layouts.user_id = auth.uid())
    );

CREATE POLICY "Users can insert elements to their layouts" ON warehouse_elements
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM layouts WHERE layouts.id = warehouse_elements.layout_id AND layouts.user_id = auth.uid())
    );

CREATE POLICY "Users can update elements of their layouts" ON warehouse_elements
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM layouts WHERE layouts.id = warehouse_elements.layout_id AND layouts.user_id = auth.uid())
    );

CREATE POLICY "Users can delete elements of their layouts" ON warehouse_elements
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM layouts WHERE layouts.id = warehouse_elements.layout_id AND layouts.user_id = auth.uid())
    );


-- 4. Pick Transactions
CREATE TABLE IF NOT EXISTS pick_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
    element_id UUID REFERENCES warehouse_elements(id) ON DELETE CASCADE,
    pick_date DATE NOT NULL,
    pick_count INTEGER NOT NULL CHECK (pick_count >= 0),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(element_id, pick_date)
);

-- Enable RLS for picks
ALTER TABLE pick_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view picks of their layouts" ON pick_transactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM layouts WHERE layouts.id = pick_transactions.layout_id AND layouts.user_id = auth.uid())
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_layouts_user ON layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_elements_layout ON warehouse_elements(layout_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_elements_type ON warehouse_elements(element_type);
CREATE INDEX IF NOT EXISTS idx_pick_transactions_layout ON pick_transactions(layout_id);
CREATE INDEX IF NOT EXISTS idx_pick_transactions_element ON pick_transactions(element_id);
CREATE INDEX IF NOT EXISTS idx_pick_transactions_date ON pick_transactions(pick_date);


-- 5. User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
    skip_upload_tutorial BOOLEAN DEFAULT FALSE,
    successful_uploads_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS for user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

