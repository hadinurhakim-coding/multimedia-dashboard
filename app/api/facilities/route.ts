import { requireAppUser } from "@/lib/auth/access";
import { appFailure, privateHeaders } from "@/lib/security/http";
import { connection, NextResponse } from "next/server";
import { queryNeon } from "@/lib/neon";
import { FacilityLocation } from "@/types/cctv";

interface FacilityRow {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  facility_type: string;
  dot_color: string;
  badge: string;
}

export async function GET(request: Request) {
  await connection();
  try {
    await requireAppUser(request, "facilities:read");
    const rows = await queryNeon<FacilityRow>(`
      SELECT id, name, subtitle, description, facility_type, dot_color, badge
      FROM facility_locations
      ORDER BY id ASC;
    `);

    const facilities: FacilityLocation[] = rows.map((r) => ({
      id: r.id as "gi-gandul" | "auditorium-pln",
      name: r.name,
      subtitle: r.subtitle,
      description: r.description,
      facilityType: r.facility_type,
      dotColor: r.dot_color,
      badge: r.badge,
    }));

    return NextResponse.json({
      success: true,
      source: "neon-postgresql",
      count: facilities.length,
      data: facilities,
    }, { headers: privateHeaders });
  } catch (error) { return appFailure(error); }
}
