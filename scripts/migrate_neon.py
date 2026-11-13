import os
import json
import psycopg2

def load_env():
    env = {}
    with open('.env.local', 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env

def main():
    env = load_env()
    # Prefer DIRECT_URL for migrations
    conn_str = env.get('DIRECT_URL') or env.get('DATABASE_URL')
    if 'sslmode=' not in conn_str:
        conn_str += '?sslmode=require' if '?' not in conn_str else '&sslmode=require'

    print("Connecting to Neon PostgreSQL...")
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()

    print("Creating tables in Neon...")

    # 1. Facility Locations table
    cur.execute("""
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
    """)

    # 2. CCTV Activations table
    cur.execute("""
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
    """)

    # 3. Multimedia Team Members table
    cur.execute("""
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
    """)

    # 4. Rooms table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 5. Task Types table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS task_types (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 6. Overtime Events table
    cur.execute("""
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
    """)

    print("Inserting facility locations...")
    facilities = [
        (
            "gi-gandul",
            "Digital Twin GI Gandul",
            "Gardu Induk 500/150kV Gandul, Depok",
            "Pencatatan inventaris serial number, masa garansi, kontak mitra, dan pemetaan lokasi presisi 3D di Gardu Induk Gandul.",
            "Substation 500kV",
            "bg-emerald-500",
            "Kelistrikan & Transmisi"
        ),
        (
            "auditorium-pln",
            "Auditorium PLN Pusat",
            "Kantor Pusat PT PLN (Persero), Jakarta",
            "Pencatatan inventaris kamera broadcast 4K PTZ, video switcher NDI, kontak vendor mitra, dan pemetaan lokasi 3D di Auditorium PLN Pusat.",
            "Broadcasting & Hall",
            "bg-[#00A2E9]",
            "Broadcasting & Stage"
        )
    ]
    cur.executemany("""
    INSERT INTO facility_locations (id, name, subtitle, description, facility_type, dot_color, badge)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        subtitle = EXCLUDED.subtitle,
        description = EXCLUDED.description,
        facility_type = EXCLUDED.facility_type,
        dot_color = EXCLUDED.dot_color,
        badge = EXCLUDED.badge,
        updated_at = CURRENT_TIMESTAMP;
    """, facilities)

    print("Inserting CCTV activations (GI Gandul & Auditorium PLN)...")
    cctv_records = [
        # GI Gandul Units
        (
            "cctv-01", "gi-gandul", "SN-PLN-CCTV-081", "CCTV 01 — Trafo Utama 150kV",
            "Hikvision DS-2CD2T87G2-L (8MP Bullet ColorVu)", "Bullet Outdoor IP67",
            "2024-01-12", "2024-02-01", "2027-01-31", "Valid",
            "GI Gandul — Switchyard Bay Trafo 1", "Switchyard Bay A", "Outdoor Ground",
            -6.000, 2.800, -4.000, -3.000, 0.500, -1.000, 45.0,
            "PT Telkom Infra Solusindo", "Budi Prasetyo (Lead System Engineer)", "+62 812-9876-5432", "budi.prasetyo@telkominfra.co.id",
            "active", "Normal / Online", "10.24.12.101", "4C:11:AE:3D:88:01", "3840 x 2160 (4K UHD)",
            "rtsp://10.24.12.101:554/live/ch0", "Monitoring visual level isolator oli & suhu visual transformer 150kV."
        ),
        (
            "cctv-02", "gi-gandul", "SN-PLN-CCTV-082", "CCTV 02 — Ruang Kontrol SCADA",
            "Dahua IPC-HDBW5442R-ASE (4MP AI WizMind Dome)", "Dome Indoor AI Vandal-proof",
            "2024-03-15", "2024-03-28", "2027-03-27", "Valid",
            "Gedung Utama — Ruang SCADA & Dispatcher", "Control Room", "Lantai 2",
            3.500, 3.200, -3.500, 0.500, 0.800, -1.000, 60.0,
            "PT Mega Komunikasi Mandiri", "Ahmad Fauzi (Project Manager)", "+62 813-8877-2211", "ahmad.fauzi@megakom.co.id",
            "active", "Normal / Online", "10.24.12.102", "4C:11:AE:3D:88:02", "2560 x 1440 (2K QHD)",
            "rtsp://10.24.12.102:554/live/ch0", "AI facial recognition aktif untuk otorisasi operator ruang kontrol PLN."
        ),
        (
            "cctv-03", "gi-gandul", "SN-PLN-CCTV-083", "CCTV 03 — Server Rack & UPS Room",
            "Axis P3245-V (Network Dome Lightfinder)", "Dome Indoor Low-light",
            "2024-05-02", "2024-05-14", "2027-05-13", "Valid",
            "Gedung Utama — Ruang Server IT & Battery UPS", "Server & Battery Room", "Lantai 1",
            5.500, 2.800, 2.500, 2.500, 0.500, 1.500, 55.0,
            "PT Schneider Electric Systems", "Dewi Lestari (Field Support Specialist)", "+62 811-3344-5566", "dewi.lestari@se-partner.co.id",
            "active", "Normal / Online", "10.24.12.103", "4C:11:AE:3D:88:03", "1920 x 1080 (Full HD)",
            "rtsp://10.24.12.103:554/live/ch0", "Terintegrasi dengan sensor asap dan suhu ruangan server PLN Icon Plus."
        ),
        (
            "cctv-04", "gi-gandul", "SN-PLN-CCTV-084", "CCTV 04 — Gerbang Utama & Pos Keamanan",
            "Hikvision iDS-2CD7A46G0/P-IZHS (ANPR / LPR)", "License Plate Recognition Bullet",
            "2024-06-20", "2024-07-05", "2027-07-04", "Valid",
            "Perimeter Luar — Akses Portal Masuk Gerbang", "Main Entrance Portal", "Outdoor Ground",
            -7.000, 2.500, 6.000, -4.000, 0.200, 8.500, 40.0,
            "PT Telkom Infra Solusindo", "Rudi Hartono (Security Systems Lead)", "+62 818-4455-6677", "rudi.hartono@telkominfra.co.id",
            "warning", "Perlu Kalibrasi Lensa", "10.24.12.104", "4C:11:AE:3D:88:04", "2560 x 1440 (2K QHD)",
            "rtsp://10.24.12.104:554/live/ch0", "Terdapat degradasi fokus lensa kamera ANPR saat malam hari; tiket kalibrasi terbuka."
        ),
        (
            "cctv-05", "gi-gandul", "SN-PLN-CCTV-085", "CCTV 05 — Koridor Switchgear 20kV",
            "Uniview IPC3234SR3-DVZ28 (4MP Starlight)", "Dome Low-Light Indoor",
            "2024-08-10", "2024-08-22", "2027-08-21", "Valid",
            "Gedung Switchgear — Koridor Cubicle 20kV", "Switchgear Hall", "Lantai 1",
            -1.500, 3.000, 0.500, 1.500, 0.500, 0.500, 50.0,
            "PT Mega Komunikasi Mandiri", "Ahmad Fauzi (Project Manager)", "+62 813-8877-2211", "ahmad.fauzi@megakom.co.id",
            "active", "Normal / Online", "10.24.12.105", "4C:11:AE:3D:88:05", "2560 x 1440 (2K QHD)",
            "rtsp://10.24.12.105:554/live/ch0", "Pengawasan rutin panel kubikel 20kV Gardu Hubung."
        ),
        (
            "cctv-06", "gi-gandul", "SN-PLN-CCTV-086", "CCTV 06 — Perimeter SUTT Pagar Utara",
            "Hikvision DS-2TD2137-4/V1 (Thermal + Optical)", "Dual-Spectrum Thermal Bullet",
            "2024-10-01", "2024-10-18", "2027-10-17", "Valid",
            "Perimeter Luar — Pagar Utara Menara SUTT", "North Boundary Fence", "Outdoor Ground",
            4.500, 3.500, -7.500, 1.000, 0.200, -9.000, 45.0,
            "PT Optima Solusi Integrasi", "Hendrik Gunawan (Senior Network Engineer)", "+62 819-0123-4567", "hendrik@optimasolusi.co.id",
            "offline", "Offline (Link FO Terputus)", "10.24.12.106", "4C:11:AE:3D:88:06", "1920 x 1080 (Optical) + 384 x 288 (Thermal)",
            "rtsp://10.24.12.106:554/live/ch0", "Koneksi fiber optic drop core putus akibat pekerjaan galian eksternal. Perbaikan dijadwalkan."
        ),
        # Auditorium PLN Pusat Units
        (
            "cctv-aud-01", "auditorium-pln", "SN-PLN-AUD-011", "Kamera PTZ 01 — Sudut Kanan Atas Videotron Panggung",
            "Sony BRC-X400 (4K PTZ Broadcast Camera)", "Robotic PTZ 4K HDR",
            "2024-02-15", "2024-03-01", "2027-02-28", "Valid",
            "Auditorium PLN — Sudut Kanan Atas Videotron Panggung", "Panggung Utama (Stage Right High)", "Lantai 1 Hall (Soffit Atas)",
            6.800, 5.000, -10.200, -0.500, 1.200, -4.000, 50.0,
            "PT Sony Indonesia Broadcasting", "Bambang Wijaya (Lead Broadcast Engineer)", "+62 811-9988-7711", "bambang.wijaya@sony-partner.co.id",
            "active", "Normal / Online (4K NDI)", "10.30.15.101", "5A:22:BE:1C:77:01", "3840 x 2160 (4K UHD)",
            "rtsp://10.30.15.101:554/live/ch0", "Kamera PTZ sudut tinggi kanan atas panggung (sesuai referensi foto lingkaran merah) untuk cakupan mimbar BOD dan panggung."
        ),
        (
            "cctv-aud-02", "auditorium-pln", "SN-PLN-AUD-012", "Kamera PTZ 02 — Soffit Balkon Samping Kiri",
            "Panasonic AW-UE150 (4K 60p PTZ Camera)", "Robotic PTZ Wide-Angle",
            "2024-04-10", "2024-04-25", "2027-04-24", "Valid",
            "Auditorium PLN — Soffit Balkon Samping Kiri (Dinding Akustik Teal)", "Dinding Akustik Kiri Lantai 1", "Lantai 1 Hall",
            -10.600, 3.600, -1.800, 0.000, 1.400, -7.000, 55.0,
            "PT Panasonic Gobel Media", "Siti Rahayu (System Integration Manager)", "+62 812-4433-2211", "siti.rahayu@panasonic-partner.co.id",
            "active", "Normal / Online (12G-SDI)", "10.30.15.102", "5A:22:BE:1C:77:02", "3840 x 2160 (4K UHD)",
            "rtsp://10.30.15.102:554/live/ch0", "Kamera terpasang di bawah soffit balkon lengkung putih sisi kiri (sesuai foto lingkaran merah) mengarah ke panggung utama."
        ),
        (
            "cctv-aud-03", "auditorium-pln", "SN-PLN-AUD-013", "Kamera PTZ 03 — Soffit Balkon Samping Kanan",
            "Panasonic AW-UE150 (4K 60p PTZ Camera)", "Robotic PTZ Wide-Angle",
            "2024-05-18", "2024-06-02", "2027-06-01", "Valid",
            "Auditorium PLN — Soffit Balkon Samping Kanan (Dinding Akustik Teal)", "Dinding Akustik Kanan Lantai 1", "Lantai 1 Hall",
            10.600, 3.600, -1.800, 0.000, 1.400, -7.000, 55.0,
            "PT Mega Komunikasi Mandiri", "Ahmad Fauzi (Project Manager)", "+62 813-8877-2211", "ahmad.fauzi@megakom.co.id",
            "active", "Normal / Online (12G-SDI)", "10.30.15.103", "5A:22:BE:1C:77:03", "3840 x 2160 (4K UHD)",
            "rtsp://10.30.15.103:554/live/ch0", "Kamera terpasang di bawah soffit balkon lengkung putih sisi kanan (sesuai foto lingkaran merah) mengarah ke panggung utama."
        ),
        (
            "cctv-aud-05", "auditorium-pln", "SN-PLN-AUD-015", "Kamera 05 — Master Control & Mezzanine Belakang (FOH)",
            "Dahua IPC-HDBW5442R-ASE (4MP AI Low-Light)", "Dome Indoor Low-Light",
            "2024-07-22", "2024-08-05", "2027-08-04", "Valid",
            "Auditorium PLN — Mezzanine FOH Belakang Hall", "Audio & Video Control Booth", "Lantai Mezzanine (L2)",
            0.000, 4.400, 10.200, 0.000, 2.000, -7.000, 65.0,
            "PT Schneider Electric Systems", "Dewi Lestari (Field Support Specialist)", "+62 811-3344-5566", "dewi.lestari@se-partner.co.id",
            "active", "Normal / Online", "10.30.15.105", "5A:22:BE:1C:77:05", "2560 x 1440 (2K QHD)",
            "rtsp://10.30.15.105:554/live/ch0", "Kamera pengawasan FOH dan master control room melihat ke seluruh aula auditorium."
        ),
        (
            "cctv-aud-06", "auditorium-pln", "SN-PLN-AUD-016", "Kamera 06 — Rig Lighting Truss Atas Panggung",
            "Uniview IPC3234SR3-DVZ28 (4MP Starlight PTZ)", "Dome High-Angle Ceiling Mount",
            "2024-09-05", "2024-09-20", "2027-09-19", "Valid",
            "Auditorium PLN — Rig Lighting Truss Atas Panggung", "Stage Lighting Grid", "Ceiling Rig Panggung",
            0.000, 5.800, -5.500, 0.000, 0.900, -6.500, 60.0,
            "PT Optima Solusi Integrasi", "Hendrik Gunawan (Senior Network Engineer)", "+62 819-0123-4567", "hendrik@optimasolusi.co.id",
            "offline", "Offline (Kabel PoE Putus)", "10.30.15.106", "5A:22:BE:1C:77:06", "2560 x 1440 (2K QHD)",
            "rtsp://10.30.15.106:554/live/ch0", "Port switch PoE di ceiling truss panggung offline pasca instalasi lampu panggung tambahan."
        ),
    ]

    cur.executemany("""
    INSERT INTO cctv_activations (
        id, facility_id, sn, name, model, device_type, purchase_date, activation_date,
        warranty_until, warranty_status, location, building_zone, floor_level,
        pos_x, pos_y, pos_z, target_x, target_y, target_z, fov_angle,
        partner_company, partner_pic, partner_phone, partner_email,
        status, status_label, ip_address, mac_address, resolution, rtsp_url, notes
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s, %s,
        %s, %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s,
        %s, %s, %s, %s, %s, %s, %s
    )
    ON CONFLICT (id) DO UPDATE SET
        facility_id = EXCLUDED.facility_id,
        sn = EXCLUDED.sn,
        name = EXCLUDED.name,
        model = EXCLUDED.model,
        device_type = EXCLUDED.device_type,
        purchase_date = EXCLUDED.purchase_date,
        activation_date = EXCLUDED.activation_date,
        warranty_until = EXCLUDED.warranty_until,
        warranty_status = EXCLUDED.warranty_status,
        location = EXCLUDED.location,
        building_zone = EXCLUDED.building_zone,
        floor_level = EXCLUDED.floor_level,
        pos_x = EXCLUDED.pos_x,
        pos_y = EXCLUDED.pos_y,
        pos_z = EXCLUDED.pos_z,
        target_x = EXCLUDED.target_x,
        target_y = EXCLUDED.target_y,
        target_z = EXCLUDED.target_z,
        fov_angle = EXCLUDED.fov_angle,
        partner_company = EXCLUDED.partner_company,
        partner_pic = EXCLUDED.partner_pic,
        partner_phone = EXCLUDED.partner_phone,
        partner_email = EXCLUDED.partner_email,
        status = EXCLUDED.status,
        status_label = EXCLUDED.status_label,
        ip_address = EXCLUDED.ip_address,
        mac_address = EXCLUDED.mac_address,
        resolution = EXCLUDED.resolution,
        rtsp_url = EXCLUDED.rtsp_url,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP;
    """, cctv_records)

    print("Inserting multimedia team members...")
    members = [
        ("1", "Hadi", "hadi@iconpln.co.id", "Engineer Multimedia", 4.0, 1, "2026-11-09", "2026-11-10T02:51:15.539Z"),
        ("2", "Ari", "ari@iconpln.co.id", "Engineer Multimedia", 4.0, 1, "2026-11-09", "2026-11-10T02:51:15.539Z"),
        ("3", "Alfen", "alfen@iconpln.co.id", "Engineer Multimedia", 4.0, 1, "2026-11-10", "2026-11-10T02:51:15.539Z"),
        ("4", "Fiqri", "fiqri@iconpln.co.id", "Engineer Multimedia", 4.0, 1, "2026-11-10", "2026-11-10T02:51:15.539Z"),
        ("5", "Rizky", "rizky@iconpln.co.id", "Engineer Multimedia", 0.0, 0, None, "2026-11-10T02:51:15.539Z"),
    ]
    cur.executemany("""
    INSERT INTO members (id, name, email, role, total_hours, total_sessions, last_overtime_date, created_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        total_hours = EXCLUDED.total_hours,
        total_sessions = EXCLUDED.total_sessions,
        last_overtime_date = EXCLUDED.last_overtime_date;
    """, members)

    print("Inserting rooms...")
    rooms = [
        ("rm-1", "Studio Multimedia Utama"),
        ("rm-2", "Auditorium PLN Icon Plus"),
        ("rm-3", "Ruang Rapat Direksi (BOD)"),
        ("rm-4", "Command Center & NOC"),
        ("rm-5", "Ruang Vicon Gandul"),
        ("rm-6", "Meeting Room VIP"),
    ]
    cur.executemany("""
    INSERT INTO rooms (id, name)
    VALUES (%s, %s)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    """, rooms)

    print("Inserting task types...")
    task_types = [
        ("tt-1", "Pemeliharaan Studio Multimedia", "Tugas Pokok"),
        ("tt-2", "Lembur GR (Gladi Resik)", "Tugas Pokok"),
        ("tt-3", "Live Streaming BOD / RUPS", "Tugas Pokok"),
        ("tt-4", "Lembur Support Agenda", "Tugas Support"),
        ("tt-5", "Bantuan Teknis Vicon Gandul", "Tugas Support"),
        ("tt-6", "Standby Insidental Lintas Divisi", "Tugas Support"),
    ]
    cur.executemany("""
    INSERT INTO task_types (id, name, category)
    VALUES (%s, %s, %s)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category;
    """, task_types)

    print("Inserting overtime events...")
    events = [
        (
            "EVT-1794287745561", "Lembur GR (Gladi Resik)", "2026-11-09", "17:00", "21:00", "17:00 - 21:00",
            "Tugas Pokok", "Lembur GR (Gladi Resik)", "Auditorium PLN Icon Plus", "Operator FOH & Live Audio Visual",
            4.0, json.dumps(["1", "2"]), json.dumps(["Hadi", "Ari"]),
            json.dumps({"vjUtama": "Hadi", "kameramen": "Ari"}),
            "Selesai", "Operator FOH Utama", "2026-11-10T05:15:45.561Z"
        ),
        (
            "EVT-1794288608636", "Lembur Support Agenda", "2026-11-10", "17:00", "21:00", "17:00 - 21:00",
            "Tugas Pokok", "Lembur Support Agenda", "Auditorium PLN Icon Plus", "Team Operator Multimedia",
            4.0, json.dumps(["3", "4"]), json.dumps(["Alfen", "Fiqri"]),
            json.dumps({"coVjZoom": "Alfen", "switcherPtz": "Fiqri"}),
            "Selesai", "Team Operator Multimedia", "2026-11-10T05:30:08.636Z"
        ),
        (
            "EVT-1794289900123", "Live Streaming BOD / RUPS", "2026-11-12", "17:00", "21:00", "17:00 - 21:00",
            "Tugas Pokok", "Live Streaming BOD / RUPS", "Ruang Rapat Direksi (BOD)", "Broadcast Multi-kamera PTZ & Switcher",
            4.0, json.dumps(["5", "1"]), json.dumps(["Rizky", "Hadi"]),
            json.dumps({"vjUtama": "Rizky", "coVjZoom": "Hadi"}),
            "Terjadwal", "Standby 30 menit sebelum acara", "2026-11-11T08:00:00.000Z"
        ),
        (
            "EVT-1794290123456", "Standby Insidental Lintas Divisi", "2026-11-14", "18:00", "22:00", "18:00 - 22:00",
            "Tugas Support", "Standby Insidental Lintas Divisi", "Command Center & NOC", "Support Emergency Display Wall",
            4.0, json.dumps(["5", "2"]), json.dumps(["Rizky", "Ari"]),
            json.dumps({"switcherPtz": "Rizky", "operatorPresentasi": "Ari"}),
            "Terjadwal", "Koordinasi dengan PIC NOC", "2026-11-11T09:00:00.000Z"
        )
    ]
    cur.executemany("""
    INSERT INTO overtime_events (
        id, title, date, start_time, end_time, time,
        task_category, task_type, room, agenda,
        duration_hours, assigned_member_ids, assigned_member_names,
        technician_roles, status, notes, created_at
    ) VALUES (
        %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s,
        %s, %s, %s,
        %s, %s, %s, %s
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        date = EXCLUDED.date,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        time = EXCLUDED.time,
        task_category = EXCLUDED.task_category,
        task_type = EXCLUDED.task_type,
        room = EXCLUDED.room,
        agenda = EXCLUDED.agenda,
        duration_hours = EXCLUDED.duration_hours,
        assigned_member_ids = EXCLUDED.assigned_member_ids,
        assigned_member_names = EXCLUDED.assigned_member_names,
        technician_roles = EXCLUDED.technician_roles,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes;
    """, events)

    conn.commit()
    print("\n--- MIGRATION VERIFICATION ---")
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;")
    tables = cur.fetchall()
    print("Tables created in Neon:", [t[0] for t in tables])

    for table in [t[0] for t in tables]:
        cur.execute(f"SELECT COUNT(*) FROM {table};")
        cnt = cur.fetchone()[0]
        print(f" - {table}: {cnt} rows")

    cur.close()
    conn.close()
    print("\nMIGRATION TO NEON COMPLETED SUCCESSFULLY!")

if __name__ == '__main__':
    main()
