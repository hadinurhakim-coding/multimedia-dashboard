-- ============================================================================
-- PLN Icon Plus - CCTV Activation & Asset Management Database Schema
-- Compatible with PostgreSQL 15/16+
-- ============================================================================

CREATE TABLE IF NOT EXISTS cctv_activations (
    id VARCHAR(64) PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_cctv_sn ON cctv_activations(sn);
CREATE INDEX IF NOT EXISTS idx_cctv_status ON cctv_activations(status);
CREATE INDEX IF NOT EXISTS idx_cctv_building_zone ON cctv_activations(building_zone);

-- Pre-seed initial CCTV activation records
INSERT INTO cctv_activations (
    id, sn, name, model, device_type, purchase_date, activation_date,
    warranty_until, warranty_status, location, building_zone, floor_level,
    pos_x, pos_y, pos_z, target_x, target_y, target_z, fov_angle,
    partner_company, partner_pic, partner_phone, partner_email,
    status, status_label, ip_address, mac_address, resolution, rtsp_url, notes
) VALUES
(
    'cctv-01', 'SN-PLN-CCTV-081', 'CCTV 01 — Trafo Utama 150kV',
    'Hikvision DS-2CD2T87G2-L (8MP Bullet ColorVu)', 'Bullet Outdoor IP67',
    '2024-01-12', '2024-02-01', '2027-01-31', 'Valid',
    'GI Gandul — Switchyard Bay Trafo 1', 'Switchyard Bay A', 'Outdoor Ground',
    -6.000, 2.800, -4.000, -3.000, 0.500, -1.000, 45.0,
    'PT Telkom Infra Solusindo', 'Budi Prasetyo (Lead System Engineer)', '+62 812-9876-5432', 'budi.prasetyo@telkominfra.co.id',
    'active', 'Normal / Online', '10.24.12.101', '4C:11:AE:3D:88:01', '3840 x 2160 (4K UHD)',
    'rtsp://10.24.12.101:554/live/ch0', 'Monitoring visual level isolator oli & suhu visual transformer 150kV.'
),
(
    'cctv-02', 'SN-PLN-CCTV-082', 'CCTV 02 — Ruang Kontrol SCADA',
    'Dahua IPC-HDBW5442R-ASE (4MP AI WizMind Dome)', 'Dome Indoor AI Vandal-proof',
    '2024-03-15', '2024-03-28', '2027-03-27', 'Valid',
    'Gedung Utama — Ruang SCADA & Dispatcher', 'Control Room', 'Lantai 2',
    3.500, 3.200, -3.500, 0.500, 0.800, -1.000, 60.0,
    'PT Mega Komunikasi Mandiri', 'Ahmad Fauzi (Project Manager)', '+62 813-8877-2211', 'ahmad.fauzi@megakom.co.id',
    'active', 'Normal / Online', '10.24.12.102', '4C:11:AE:3D:88:02', '2560 x 1440 (2K QHD)',
    'rtsp://10.24.12.102:554/live/ch0', 'AI facial recognition aktif untuk otorisasi operator ruang kontrol PLN.'
),
(
    'cctv-03', 'SN-PLN-CCTV-083', 'CCTV 03 — Server Rack & UPS Room',
    'Axis P3245-V (Network Dome Lightfinder)', 'Dome Indoor Low-light',
    '2024-05-02', '2024-05-14', '2027-05-13', 'Valid',
    'Gedung Utama — Ruang Server IT & Battery UPS', 'Server & Battery Room', 'Lantai 1',
    5.500, 2.800, 2.500, 2.500, 0.500, 1.500, 55.0,
    'PT Schneider Electric Systems', 'Dewi Lestari (Field Support Specialist)', '+62 811-3344-5566', 'dewi.lestari@se-partner.co.id',
    'active', 'Normal / Online', '10.24.12.103', '4C:11:AE:3D:88:03', '1920 x 1080 (Full HD)',
    'rtsp://10.24.12.103:554/live/ch0', 'Terintegrasi dengan sensor asap dan suhu ruangan server PLN Icon Plus.'
),
(
    'cctv-04', 'SN-PLN-CCTV-084', 'CCTV 04 — Gerbang Utama & Pos Keamanan',
    'Hikvision iDS-2CD7A46G0/P-IZHS (ANPR / LPR)', 'License Plate Recognition Bullet',
    '2024-06-20', '2024-07-05', '2027-07-04', 'Valid',
    'Perimeter Luar — Akses Portal Masuk Gerbang', 'Main Entrance Portal', 'Outdoor Ground',
    -7.000, 2.500, 6.000, -4.000, 0.200, 8.500, 40.0,
    'PT Telkom Infra Solusindo', 'Rudi Hartono (Security Systems Lead)', '+62 818-4455-6677', 'rudi.hartono@telkominfra.co.id',
    'warning', 'Perlu Kalibrasi Lensa', '10.24.12.104', '4C:11:AE:3D:88:04', '2560 x 1440 (2K QHD)',
    'rtsp://10.24.12.104:554/live/ch0', 'Terdapat degradasi fokus lensa kamera ANPR saat malam hari; tiket kalibrasi terbuka.'
),
(
    'cctv-05', 'SN-PLN-CCTV-085', 'CCTV 05 — Koridor Switchgear 20kV',
    'Uniview IPC3234SR3-DVZ28 (4MP Starlight)', 'Dome Low-Light Indoor',
    '2024-08-10', '2024-08-22', '2027-08-21', 'Valid',
    'Gedung Switchgear — Koridor Cubicle 20kV', 'Switchgear Hall', 'Lantai 1',
    -1.500, 3.000, 0.500, 1.500, 0.500, 0.500, 50.0,
    'PT Mega Komunikasi Mandiri', 'Ahmad Fauzi (Project Manager)', '+62 813-8877-2211', 'ahmad.fauzi@megakom.co.id',
    'active', 'Normal / Online', '10.24.12.105', '4C:11:AE:3D:88:05', '2560 x 1440 (2K QHD)',
    'rtsp://10.24.12.105:554/live/ch0', 'Pengawasan rutin panel kubikel 20kV Gardu Hubung.'
),
(
    'cctv-06', 'SN-PLN-CCTV-086', 'CCTV 06 — Perimeter SUTT Pagar Utara',
    'Hikvision DS-2TD2137-4/V1 (Thermal + Optical)', 'Dual-Spectrum Thermal Bullet',
    '2024-10-01', '2024-10-18', '2027-10-17', 'Valid',
    'Perimeter Luar — Pagar Utara Menara SUTT', 'North Boundary Fence', 'Outdoor Ground',
    4.500, 3.500, -7.500, 1.000, 0.200, -9.000, 45.0,
    'PT Optima Solusi Integrasi', 'Hendrik Gunawan (Senior Network Engineer)', '+62 819-0123-4567', 'hendrik@optimasolusi.co.id',
    'offline', 'Offline (Link FO Terputus)', '10.24.12.106', '4C:11:AE:3D:88:06', '1920 x 1080 (Optical) + 384 x 288 (Thermal)',
    'rtsp://10.24.12.106:554/live/ch0', 'Koneksi fiber optic drop core putus akibat pekerjaan galian eksternal. Perbaikan dijadwalkan.'
)
ON CONFLICT (id) DO NOTHING;
