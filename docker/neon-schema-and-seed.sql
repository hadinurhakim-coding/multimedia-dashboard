-- ============================================================================
-- PLN Icon Plus - Cloud Neon PostgreSQL DDL & Seed Migration Script
-- Project: multimedia-dashboard (AWS ap-southeast-1 Singapore)
-- ============================================================================

-- 1. Facility Locations Table
CREATE TABLE IF NOT EXISTS facility_locations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    facility_type VARCHAR(100) NOT NULL,
    dot_color VARCHAR(50) NOT NULL,
    badge VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. CCTV Activations & 3D Sensor Units Table
CREATE TABLE IF NOT EXISTS cctv_activations (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(64) NOT NULL REFERENCES facility_locations(id) ON DELETE CASCADE,
    sn VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    device_type VARCHAR(100) NOT NULL,
    purchase_date DATE NOT NULL,
    activation_date DATE NOT NULL,
    warranty_until DATE NOT NULL,
    warranty_status VARCHAR(50) DEFAULT 'Valid',
    location VARCHAR(255) NOT NULL,
    building_zone VARCHAR(100) NOT NULL,
    floor_level VARCHAR(50) NOT NULL,
    pos_x NUMERIC(8, 3) NOT NULL DEFAULT 0.000,
    pos_y NUMERIC(8, 3) NOT NULL DEFAULT 0.000,
    pos_z NUMERIC(8, 3) NOT NULL DEFAULT 0.000,
    target_x NUMERIC(8, 3) NOT NULL DEFAULT 0.000,
    target_y NUMERIC(8, 3) NOT NULL DEFAULT 0.000,
    target_z NUMERIC(8, 3) NOT NULL DEFAULT 0.000,
    fov_angle NUMERIC(5, 2) DEFAULT 45.0,
    partner_company VARCHAR(255) NOT NULL,
    partner_pic VARCHAR(255) NOT NULL,
    partner_phone VARCHAR(50) NOT NULL,
    partner_email VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    status_label VARCHAR(100) NOT NULL DEFAULT 'Normal / Online',
    ip_address VARCHAR(50) NOT NULL,
    mac_address VARCHAR(50) NOT NULL,
    resolution VARCHAR(100) NOT NULL,
    rtsp_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cctv_facility ON cctv_activations(facility_id);
CREATE INDEX IF NOT EXISTS idx_cctv_sn ON cctv_activations(sn);
CREATE INDEX IF NOT EXISTS idx_cctv_status ON cctv_activations(status);

-- 3. Multimedia Engineering Team Members Table
CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(100) NOT NULL,
    total_hours NUMERIC(6, 2) DEFAULT 0,
    total_sessions INT DEFAULT 0,
    last_overtime_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Facility Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Multimedia Task Types Table
CREATE TABLE IF NOT EXISTS task_types (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Overtime Events & Broadcast Operations Table
CREATE TABLE IF NOT EXISTS overtime_events (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    start_time VARCHAR(20),
    end_time VARCHAR(20),
    time VARCHAR(50),
    task_category VARCHAR(50),
    task_type VARCHAR(100),
    room VARCHAR(255),
    agenda TEXT,
    duration_hours NUMERIC(5, 2) DEFAULT 4.0,
    assigned_member_ids JSONB DEFAULT '[]'::jsonb,
    assigned_member_names JSONB DEFAULT '[]'::jsonb,
    technician_roles JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_date ON overtime_events(date);
CREATE INDEX IF NOT EXISTS idx_events_status ON overtime_events(status);
