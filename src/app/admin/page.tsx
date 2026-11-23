import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { dateTimeFr, fcfa } from "@/lib/format";
import { platformRevenue } from "@/lib/services/ledger";
import { processPayoutAction } from "@/app/actions/admin";
import { AdminShell } from "@/components/AdminShell";

export const metadata = { title: "Admin" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  await requireAdmin();
  const [rev, gmv, users, shops, products, payouts, payments, balances] = await Promise.all([
    platformRevenue(),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amount: true }, _count: true }),
    prisma.user.count(),
    prisma.shop.count(),
    prisma.product.count(),
    prisma.payout.findMany({ where: { status: "REQUESTED" }, include: { shop: true }, orderBy: { createdAt: "asc" } }),
    prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 15, include: { user: true } }),
    prisma.ledgerEntry.aggregate({ where: { account: "CREATOR" }, _sum: { amount: true } }),
  ]);
  const PURPOSE: Record<string, string> = { ORDER: "Achat produit", FILM: "Film", TIP: "Soutien" };
  const PSTATUS: Record<string, string> = { SUCCEEDED: "Réussi", PENDING: "En attente", FAILED: "Échec", CANCELLED: "Annulé" };
  return (
    <AdminShell active="apercu" sp={sp}>
      <div className="kpi-grid">
        <div className="stat"><div className="k">Volume encaissé</div><div className="v" style={{ fontSize: "1.3rem" }}>{fcfa(gmv._sum.amount ?? 0)}</div><div className="tiny">{gmv._count} paiements réussis</div></div>
        <div className="stat"><div className="k">Commissions Fomvue</div><div className="v" style={{ fontSize: "1.3rem", color: "var(--accent)" }} data-testid="platform-revenue">{fcfa(rev.total)}</div></div>
        <div className="stat"><div className="k">Dû aux créateurs (soldes)</div><div className="v" style={{ fontSize: "1.3rem" }}>{fcfa(balances._sum.amount ?? 0)}</div></div>
        <div className="stat"><div className="k">Comptes · boutiques · produits</div><div className="v" style={{ fontSize: "1.3rem" }}>{users} · {shops} · {products}</div></div>
      </div>
      <div className="dash-grid admin-grid">
        <div className="panel">
          <h2 style={{ fontSize: "1.2rem", marginBottom: 8 }}>Commissions par source</h2>
          <table className="price-table">
            <tbody>
              <tr><td>Ventes de produits (10 %)</td><td><strong>{fcfa(rev.sales)}</strong></td></tr>
              <tr><td>Films achetés / loués (10 %)</td><td><strong>{fcfa(rev.films)}</strong></td></tr>
              <tr><td>Soutiens (5 %)</td><td><strong>{fcfa(rev.tips)}</strong></td></tr>
              <tr><td><strong>Total</strong></td><td><strong>{fcfa(rev.total)}</strong></td></tr>
            </tbody>
          </table>
          <h2 style={{ fontSize: "1.2rem", margin: "22px 0 8px" }}>Derniers paiements</h2>
          <table>
            <thead><tr><th>Date (Dakar)</th><th>Objet</th><th>Client</th><th>Montant</th><th>Statut</th></tr></thead>
            <tbody>{payments.map((p) => (
              <tr key={p.id}><td title={p.reference}>{dateTimeFr(p.createdAt)}</td><td>{PURPOSE[p.purpose]}</td><td>{p.user?.name ?? p.payerName ?? "Anonyme"}</td><td>{fcfa(p.amount)}</td><td><span className={`status status-${p.status}`}>{PSTATUS[p.status] ?? p.status}</span></td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="panel">
          <h2 style={{ fontSize: "1.2rem", marginBottom: 8 }}>Retraits à traiter ({payouts.length})</h2>
          {payouts.length === 0 && <p className="muted">Aucune demande en attente.</p>}
          {payouts.map((p) => (
            <div key={p.id} style={{ borderTop: "1px solid var(--line)", padding: "12px 0" }}>
              <strong>{p.shop.name}</strong> — {fcfa(p.amount)}
              <div className="tiny">{p.method.toUpperCase()} · {p.phone} · demandé le {dateTimeFr(p.createdAt)}</div>
              <div className="row-actions" style={{ marginTop: 8 }}>
                <form action={processPayoutAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="decision" value="PAID" /><button className="btn btn-teal btn-sm">Marquer payé</button></form>
                <form action={processPayoutAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="decision" value="REJECTED" /><button className="btn btn-danger btn-sm">Refuser (recréditer)</button></form>
              </div>
            </div>
          ))}
          <p className="tiny" style={{ marginTop: 12 }}>v1 : le virement Wave / Orange Money se fait à la main, puis on clique « Marquer payé ». Automatisable plus tard via l’API de décaissement de l’agrégateur.</p>
        </div>
      </div>
    </AdminShell>
  );
}
