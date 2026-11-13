import { connection, NextResponse } from "next/server";
import { queryNeon } from "@/lib/neon";
import { OvertimeEvent, Member } from "@/types/event";

interface EventRow {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  time: string;
  task_category: string;
  task_type: string;
  room: string;
  agenda: string;
  duration_hours: string | number;
  assigned_member_ids: string[] | string;
  assigned_member_names: string[] | string;
  technician_roles: Record<string, string> | string;
  status: string;
  notes: string;
  created_at: string;
}

interface MemberRow {
  id: string;
  name: string;
  email: string;
  role: string;
  total_hours: string | number;
  total_sessions: number;
  last_overtime_date: string | null;
  created_at: string;
}

export async function GET() {
  await connection();
  try {
    const eventRows = await queryNeon<EventRow>(`
      SELECT 
        id, title, to_char(date, 'YYYY-MM-DD') as date,
        start_time, end_time, time, task_category, task_type,
        room, agenda, duration_hours, assigned_member_ids,
        assigned_member_names, technician_roles, status, notes,
        created_at
      FROM overtime_events
      ORDER BY date ASC;
    `);

    const memberRows = await queryNeon<MemberRow>(`
      SELECT 
        id, name, email, role, total_hours, total_sessions,
        to_char(last_overtime_date, 'YYYY-MM-DD') as last_overtime_date,
        created_at
      FROM members
      ORDER BY id ASC;
    `);

    const events: OvertimeEvent[] = eventRows.map((r) => {
      const assignedIds = typeof r.assigned_member_ids === "string" 
        ? JSON.parse(r.assigned_member_ids) 
        : (r.assigned_member_ids || []);
      const assignedNames = typeof r.assigned_member_names === "string" 
        ? JSON.parse(r.assigned_member_names) 
        : (r.assigned_member_names || []);
      const roles = typeof r.technician_roles === "string" 
        ? JSON.parse(r.technician_roles) 
        : (r.technician_roles || {});

      return {
        id: r.id,
        title: r.title,
        date: r.date,
        startTime: r.start_time,
        endTime: r.end_time,
        time: r.time,
        taskCategory: r.task_category as OvertimeEvent["taskCategory"],
        taskType: r.task_type,
        room: r.room,
        agenda: r.agenda,
        durationHours: Number(r.duration_hours),
        assignedMemberIds: assignedIds,
        assignedMemberNames: assignedNames,
        technicianRoles: roles,
        status: r.status as OvertimeEvent["status"],
        notes: r.notes,
        createdAt: r.created_at,
      };
    });

    const members: Member[] = memberRows.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      totalHours: Number(m.total_hours),
      totalSessions: Number(m.total_sessions),
      lastOvertimeDate: m.last_overtime_date,
      createdAt: m.created_at,
    }));

    return NextResponse.json({
      success: true,
      source: "neon-postgresql",
      events,
      members,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error fetching events from Neon:", error);
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
