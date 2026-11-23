"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreator } from "@/lib/auth";
import { saveUpload } from "@/lib/storage";
import { addLesson, createFilm, createProduct, deleteFilm, deleteProduct, updateProduct } from "@/lib/services/catalog";
import { requestPayout } from "@/lib/services/ledger";
import { UserError } from "@/lib/services/auth";
import { errMsg, str, withParam } from "@/lib/actions-util";

const productInput = (fd: FormData) => ({
  title: str(fd, "title"),
  category: str(fd, "category"),
  kind: str(fd, "kind"),
  level: str(fd, "level") || "DEBUTANT",
  description: str(fd, "description"),
  includes: str(fd, "includes"),
  price: str(fd, "price") as unknown as number,
  status: str(fd, "status") === "DRAFT" ? "DRAFT" : "PUBLISHED",
});

async function uploads(fd: FormData) {
  const file = fd.get("file") as File | null;
  return {
    coverKey: await saveUpload(fd.get("cover") as File | null, "covers"),
    fileKey: await saveUpload(file, "files"),
    fileName: file && typeof file !== "string" && file.size > 0 ? file.name.slice(0, 120) : null,
  };
}

export async function saveProductAction(fd: FormData) {
  const { shop } = await requireCreator();
  const id = str(fd, "id");
  let dest = "";
  try {
    const extra = await uploads(fd);
    const p = id ? await updateProduct(shop.id, id, productInput(fd) as never, extra) : await createProduct(shop.id, productInput(fd) as never, extra);
    dest = p.kind === "FORMATION" && !id ? `/vendeur/produits/${p.id}?ok=${encodeURIComponent("Formation créée. Ajoutez vos leçons ci-dessous.")}` : `/vendeur/produits?ok=${encodeURIComponent(id ? "Produit mis à jour." : "Produit publié.")}`;
  } catch (e) {
    dest = withParam(id ? `/vendeur/produits/${id}` : "/vendeur/produits/nouveau", "error", errMsg(e));
  }
  revalidatePath("/vendeur/produits");
  redirect(dest);
}

export async function deleteProductAction(fd: FormData) {
  const { shop } = await requireCreator();
  let msg = "Produit supprimé (ou archivé s’il a déjà été vendu).";
  try {
    await deleteProduct(shop.id, str(fd, "id"));
  } catch (e) {
    msg = errMsg(e);
  }
  redirect(`/vendeur/produits?ok=${encodeURIComponent(msg)}`);
}

export async function addLessonAction(fd: FormData) {
  const { shop } = await requireCreator();
  const productId = str(fd, "productId");
  let dest = `/vendeur/produits/${productId}?ok=${encodeURIComponent("Leçon ajoutée.")}`;
  try {
    await addLesson(shop.id, productId, {
      section: str(fd, "section") || "Module 1",
      title: str(fd, "title"),
      content: str(fd, "content"),
      videoUrl: str(fd, "videoUrl"),
      durationMin: str(fd, "durationMin") as unknown as number,
    });
  } catch (e) {
    dest = withParam(`/vendeur/produits/${productId}`, "error", errMsg(e));
  }
  redirect(dest);
}

export async function deleteLessonAction(fd: FormData) {
  const { shop } = await requireCreator();
  const l = await prisma.lesson.findUnique({ where: { id: str(fd, "id") }, include: { product: true } });
  if (l && l.product.shopId === shop.id) await prisma.lesson.delete({ where: { id: l.id } });
  redirect(`/vendeur/produits/${l?.productId ?? ""}`);
}

export async function createFilmAction(fd: FormData) {
  const { shop } = await requireCreator();
  let dest = `/vendeur/films?ok=${encodeURIComponent("Titre publié dans Regarder.")}`;
  try {
    const posterKey = await saveUpload(fd.get("poster") as File | null, "posters");
    await createFilm(
      shop.id,
      {
        title: str(fd, "title"),
        kind: str(fd, "kind"),
        synopsis: str(fd, "synopsis"),
        videoUrl: str(fd, "videoUrl"),
        durationLabel: str(fd, "durationLabel"),
        ageRating: str(fd, "ageRating") || "Tous publics",
        access: str(fd, "access") === "PAID" ? "PAID" : "FREE",
        buyPrice: (str(fd, "buyPrice") || undefined) as unknown as number,
        rentPrice: (str(fd, "rentPrice") || undefined) as unknown as number,
      },
      posterKey,
    );
  } catch (e) {
    dest = withParam("/vendeur/films", "error", errMsg(e));
  }
  redirect(dest);
}

export async function deleteFilmAction(fd: FormData) {
  const { shop } = await requireCreator();
  let msg = "Titre retiré.";
  try {
    await deleteFilm(shop.id, str(fd, "id"));
  } catch (e) {
    msg = errMsg(e);
  }
  redirect(`/vendeur/films?ok=${encodeURIComponent(msg)}`);
}

export async function updateShopAction(fd: FormData) {
  const { shop } = await requireCreator();
  let dest = `/vendeur/boutique?ok=${encodeURIComponent("Boutique mise à jour.")}`;
  try {
    const color = str(fd, "color");
    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) throw new UserError("Couleur invalide.");
    const logoKey = await saveUpload(fd.get("logo") as File | null, "logos");
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        name: str(fd, "name").trim().slice(0, 80) || shop.name,
        tagline: str(fd, "tagline").slice(0, 140),
        bio: str(fd, "bio").slice(0, 2000),
        city: str(fd, "city").slice(0, 60),
        country: str(fd, "country").slice(0, 60),
        level: str(fd, "level") === "CONFIRME" ? "CONFIRME" : "DEBUTANT",
        ...(color ? { color } : {}),
        ...(logoKey ? { logoKey } : {}),
      },
    });
  } catch (e) {
    dest = withParam("/vendeur/boutique", "error", errMsg(e));
  }
  redirect(dest);
}

export async function payoutAction(fd: FormData) {
  const { shop } = await requireCreator();
  let dest = `/vendeur?ok=${encodeURIComponent("Demande de retrait envoyée. Traitement sous 48 h.")}`;
  try {
    await requestPayout(shop.id, parseInt(str(fd, "amount").replace(/\D/g, ""), 10), str(fd, "method") || "wave", str(fd, "phone"));
  } catch (e) {
    dest = withParam("/vendeur", "error", errMsg(e));
  }
  redirect(dest);
}
