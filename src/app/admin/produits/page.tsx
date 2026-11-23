import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { KINDS } from "@/lib/constants";
import { dateFr, fcfa } from "@/lib/format";
import { setProductStatusAction, toggleFeaturedAction } from "@/app/actions/admin";
import { AdminShell } from "@/components/AdminShell";

export const metadata = { title: "Modération" };

export default async function Page() {
  await requireAdmin();
  const products = await prisma.product.findMany({ include: { shop: true, _count: { select: { orders: true } } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  return (
    <AdminShell active="produits">
      <div className="panel">
        <table>
          <thead><tr><th>Produit</th><th>Boutique</th><th>Prix</th><th>Ventes</th><th>Créé</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>{products.map((p) => (
            <tr key={p.id}>
              <td><Link className="link-arrow" href={`/produit/${p.id}`}>{p.title}</Link><div className="tiny">{KINDS[p.kind]}{p.featured ? " · ★ à la une" : ""}</div></td>
              <td>{p.shop.name}</td><td>{fcfa(p.price)}</td><td>{p._count.orders}</td><td>{dateFr(p.createdAt)}</td>
              <td><span className={`status status-${p.status}`}>{({ PUBLISHED: "Publié", PENDING: "En attente", REJECTED: "Masqué", DRAFT: "Brouillon" } as Record<string, string>)[p.status]}</span></td>
              <td>
                <div className="row-actions">
                  {p.status !== "PUBLISHED" && <form action={setProductStatusAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="PUBLISHED" /><button className="btn btn-teal btn-sm">Approuver</button></form>}
                  {p.status !== "REJECTED" && <form action={setProductStatusAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="REJECTED" /><button className="btn btn-danger btn-sm">Masquer</button></form>}
                  <form action={toggleFeaturedAction}><input type="hidden" name="id" value={p.id} /><button className="btn btn-outline btn-sm">{p.featured ? "Retirer de la une" : "Mettre à la une"}</button></form>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </AdminShell>
  );
}
