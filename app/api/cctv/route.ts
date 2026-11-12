import { NextRequest, NextResponse } from "next/server";
import { queryNeon } from "@/lib/neon";
import { CCTVUnit } from "@/types/cctv";

interface CCTVRow {
  id: string;
  facility_id: string;
  sn: string;
  name: string;
  model: string;
  device_type: string;
  purchase_date: string;
  activation_date: string;
  warranty_until: string;
  warranty_status: "Valid" | "Expiring Soon" | "Expired";
  location: string;
  building_zone: string;
  floor_level: string;
  pos_x: string | number;
  pos_y: string | number;
  pos_z: string | number;
  target_x: string | number;
  target_y: string | number;
  target_z: string | number;
  fov_angle: string | number;
  partner_company: string;
  partner_pic: string;
  partner_phone: string;
  partner_email: string;
  status: "active" | "warning" | "offline";
  status_label: string;
  ip_address: string;
  mac_address: string;
  resolution: string;
  rtsp_url: string;
  notes: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get("facilityId");

    let sql = `
      SELECT 
        id, facility_id, sn, name, model, device_type,
        to_char(purchase_date, 'YYYY-MM-DD') as purchase_date,
        to_char(activation_date, 'YYYY-MM-DD') as activation_date,
        to_char(warranty_until, 'YYYY-MM-DD') as warranty_until,
        warranty_status, location, building_zone, floor_level,
        pos_x, pos_y, pos_z, target_x, target_y, target_z, fov_angle,
        partner_company, partner_pic, partner_phone, partner_email,
        status, status_label, ip_address, mac_address, resolution, rtsp_url, notes
      FROM cctv_activations
    `;

    const params: string[] = [];
    if (facilityId) {
      sql += ` WHERE facility_id = $1`;
      params.push(facilityId);
    }

    sql += ` ORDER BY id ASC;`;

    const rows = await queryNeon<CCTVRow>(sql, params);

    const cctvUnits: CCTVUnit[] = rows.map((r) => ({
      id: r.id,
      sn: r.sn,
      name: r.name,
      model: r.model,
      type: r.device_type,
      purchaseDate: r.purchase_date,
      activationDate: r.activation_date,
      warrantyUntil: r.warranty_until,
      warrantyStatus: r.warranty_status,
      location: r.location,
      buildingZone: r.building_zone,
      floor: r.floor_level,
      position3D: [Number(r.pos_x), Number(r.pos_y), Number(r.pos_z)],
      target3D: [Number(r.target_x), Number(r.target_y), Number(r.target_z)],
      fovAngle: Number(r.fov_angle),
      partnerCompany: r.partner_company,
      partnerPic: r.partner_pic,
      partnerPhone: r.partner_phone,
      partnerEmail: r.partner_email,
      status: r.status,
      statusLabel: r.status_label,
      ipAddress: r.ip_address,
      macAddress: r.mac_address,
      resolution: r.resolution,
      rtspUrl: r.rtsp_url,
      notes: r.notes,
    }));

    return NextResponse.json({
      success: true,
      source: "neon-postgresql",
      count: cctvUnits.length,
      data: cctvUnits,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error fetching CCTV data from Neon:", error);
    return NextResponse.json(
      {
        success: false,
        source: "neon-postgresql",
        error: error.message || "Failed to query Neon PostgreSQL",
      },
      { status: 500 }
    );
  }
}
