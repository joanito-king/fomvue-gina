import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { dateFr } from "@/lib/format";
import { setUserAction } from "@/app/actions/admin";
import { AdminShell } from "@/components/AdminShell";

export const metadata = { title: "Utilisateurs" };
const ROLE: Record<string, string> = { BUYER: "Acheteur", CREATOR: "Créateur", ADMIN: "Admin" };

export default async function Page() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({ include: { shop: true, _count: { select: { orders: true } } }, orderBy: { createdAt: "desc" } });
  return (
    <AdminShell active="users">
      <div className="panel">
        <table>
          <thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>Boutique</th><th>Achats</th><th>Inscrit</th><th>Actions</th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}{u.suspended && <> <span className="status status-REJECTED">suspendu</span></>}</td>
              <td>{u.email}</td><td>{ROLE[u.role]}</td><td>{u.shop?.name ?? "—"}</td><td>{u._count.orders}</td><td>{dateFr(u.createdAt)}</td>
              <td>
                {u.id !== admin.id && (
                  <div className="row-actions">
                    <form action={setUserAction}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="op" value={u.suspended ? "unsuspend" : "suspend"} /><button className={`btn btn-sm ${u.suspended ? "btn-outline" : "btn-danger"}`}>{u.suspended ? "Réactiver" : "Suspendre"}</button></form>
                    {u.role !== "ADMIN" && <form action={setUserAction}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="op" value="admin" /><button className="btn btn-outline btn-sm">Rendre admin</button></form>}
                  </div>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </AdminShell>
  );
}
