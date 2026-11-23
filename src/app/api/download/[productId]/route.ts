import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { ownsProduct } from "@/lib/services/catalog";
import { storage } from "@/lib/storage";

// Téléchargement réservé aux acheteurs (et au créateur).
export async function GET(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const user = await currentUser();
  if (!user || !(await ownsProduct(user.id, productId))) return new Response("Accès refusé", { status: 403 });
  const p = await prisma.product.findUnique({ where: { id: productId } });
  if (!p?.fileKey) {
    // Produit sans fichier joint : on livre un récapitulatif texte
    const txt = `${p?.title}\n\n${p?.description}\n\nInclus :\n${p?.includes}\n\nMerci pour votre achat sur Fomvue.`;
    return new Response(txt, { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${encodeURIComponent((p?.slug || "produit") + ".txt")}"` } });
  }
  const data = await storage().get(p.fileKey);
  if (!data) return new Response("Fichier introuvable", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(p.fileName || p.slug)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
