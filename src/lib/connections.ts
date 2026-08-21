import { sql, inArray } from "drizzle-orm";
import { withAuthenticatedDb } from "@/db";
import { connectionKidShares } from "@/db/schema";

export type ConnectionStatus = "pending" | "accepted" | "declined";

export type Connection = {
  connectionId: string;
  partnerGuardianId: string;
  partnerName: string;
  requestedByGuardianId: string;
  status: ConnectionStatus;
  createdAt: string;
};

export async function getMyConnections(guardianId: string): Promise<Connection[]> {
  return withAuthenticatedDb(guardianId, async (tx) => {
    const rows = await tx.execute<{
      connection_id: string;
      partner_guardian_id: string;
      partner_name: string;
      requested_by_guardian_id: string;
      status: ConnectionStatus;
      created_at: string;
    }>(sql`select * from get_my_connections()`);

    return rows.map((r) => ({
      connectionId: r.connection_id,
      partnerGuardianId: r.partner_guardian_id,
      partnerName: r.partner_name,
      requestedByGuardianId: r.requested_by_guardian_id,
      status: r.status,
      createdAt: r.created_at,
    }));
  });
}

export async function findGuardianByEmail(guardianId: string, email: string) {
  return withAuthenticatedDb(guardianId, async (tx) => {
    const rows = await tx.execute<{ id: string; name: string }>(
      sql`select * from find_guardian_by_email(${email})`,
    );
    return rows[0] ?? null;
  });
}

export async function getKidSharesForConnections(guardianId: string, connectionIds: string[]) {
  if (connectionIds.length === 0) return [];
  return withAuthenticatedDb(guardianId, (tx) =>
    tx
      .select()
      .from(connectionKidShares)
      .where(inArray(connectionKidShares.connectionId, connectionIds)),
  );
}
