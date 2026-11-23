/* Données de démonstration FICTIVES pour Fomvue (reprises du prototype). */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { CATEGORIES } from "../src/lib/constants";
import { startCheckout, applyPaymentEvent } from "../src/lib/services/payments";
import { requestPayout } from "../src/lib/services/ledger";
import data from "./seed-data.json";

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const D = data as unknown as { CREATORS: Any[]; PRODUCTS: Any[]; TITLES: Any[]; REVIEWS: Record<string, Any[]>; DEFAULT_REVIEWS: Any[]; COURSES: Any[]; TIPS: Record<string, Any[]> };

// Vidéos libres de droits pour la démo (à remplacer par les vraies vidéos des créateurs)
const DEMO_VIDEOS = [
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
];

function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))).toString(16).padStart(2, "0");
  return `#${f(0)}${f(8)}${f(4)}`;
}

const kindOf = (p: Any) => {
  if (p.kind) return String(p.kind).toUpperCase();
  if (p.courseId || p.cat === "formations") return "FORMATION";
  if (p.cat === "services") return /coach/i.test(p.title) ? "COACHING" : "SERVICE";
  if (p.cat === "prompts") return "PROMPTS";
  if (p.cat === "scenarios") return "SCENARIO";
  if (p.cat === "idees") return "IDEE";
  return "EBOOK";
};
const level = (n: string) => (n === "débutant" ? "DEBUTANT" : "CONFIRME");

async function pay(evt: Parameters<typeof startCheckout>[0]) {
  const { paymentId } = await startCheckout(evt);
  const p = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  await applyPaymentEvent({ reference: p.reference, status: "SUCCEEDED", raw: "seed" });
  return p;
}

async function main() {
  console.log("Nettoyage…");
  await prisma.$transaction([
    prisma.ledgerEntry.deleteMany(), prisma.payout.deleteMany(), prisma.tip.deleteMany(), prisma.filmAccess.deleteMany(),
    prisma.order.deleteMany(), prisma.payment.deleteMany(), prisma.lessonProgress.deleteMany(), prisma.lesson.deleteMany(),
    prisma.review.deleteMany(), prisma.episode.deleteMany(), prisma.film.deleteMany(), prisma.product.deleteMany(),
    prisma.shop.deleteMany(), prisma.session.deleteMany(), prisma.user.deleteMany(),
  ]);
  const passwordHash = await bcrypt.hash("demo1234", 10);

  await prisma.user.create({ data: { email: "gina@fomvue.com", name: "Gina Zao", role: "ADMIN", passwordHash } });
  const buyer = await prisma.user.create({ data: { email: "moussa@exemple.sn", name: "Moussa Ndiaye", role: "BUYER", passwordHash, phone: "77 123 45 67" } });
  const buyer2 = await prisma.user.create({ data: { email: "aminata@exemple.sn", name: "Aminata Sarr", role: "BUYER", passwordHash } });

  const shopIds: Record<string, string> = {};
  for (const c of D.CREATORS) {
    const first = String(c.name).split(" ")[0]!.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
    const u = await prisma.user.create({ data: { email: `${first}@fomvue.com`, name: c.name, role: "CREATOR", passwordHash } });
    const shop = await prisma.shop.create({
      data: {
        ownerId: u.id, slug: c.id, name: c.id === "awa-diop" ? "Studio Awa" : c.name, tagline: c.specialty, bio: c.bio,
        color: hslToHex(c.hue, 55, 38), level: level(c.level), city: c.city, country: c.country, flag: c.flag,
      },
    });
    shopIds[c.id] = shop.id;
  }

  console.log("Produits…");
  const productIds: Record<string, string> = {};
  for (const p of D.PRODUCTS) {
    const cat = CATEGORIES.find((c) => c.slug === p.cat)!;
    const course = p.courseId ? D.COURSES.find((c) => c.id === p.courseId) : null;
    const prod = await prisma.product.create({
      data: {
        shopId: shopIds[p.creatorId]!, slug: p.id, title: p.title, category: cat.id, kind: kindOf(p), level: level(p.niveau),
        description: p.desc, includes: (p.includes || course?.learn || []).join("\n"), price: p.price, coverColor: cat.bg,
        featured: !!p.featured, status: "PUBLISHED",
      },
    });
    productIds[p.id] = prod.id;
    const reviews = (course?.reviews || D.REVIEWS[p.id] || D.DEFAULT_REVIEWS) as Any[];
    await prisma.review.createMany({ data: reviews.map((r) => ({ productId: prod.id, name: r.name, city: r.city || "", stars: r.stars, text: r.text })) });
    if (course) {
      let pos = 0;
      for (const [si, s] of (course.sections as Any[]).entries())
        for (const l of s.lessons as Any[])
          await prisma.lesson.create({
            data: {
              productId: prod.id, section: `Module ${si + 1} · ${s.title}`, title: l.title, durationMin: l.min, position: pos++,
              videoUrl: pos <= 2 ? DEMO_VIDEOS[0] : null,
              content: `Dans cette leçon : ${l.title.toLowerCase()}. Notes, exemples et exercices pratiques (contenu de démonstration).`,
            },
          });
    }
  }

  console.log("Films…");
  const filmIds: Record<string, string> = {};
  for (const [i, t] of D.TITLES.entries()) {
    const f = await prisma.film.create({
      data: {
        shopId: shopIds[t.creatorId]!, title: t.title, kind: String(t.kind).toUpperCase(), synopsis: t.synopsis, year: t.year,
        ageRating: t.age || "Tous publics", durationLabel: t.durationLabel || "", poster: t.poster, videoUrl: DEMO_VIDEOS[i % 2]!,
        access: t.access === "gratuit" ? "FREE" : "PAID", buyPrice: t.access === "gratuit" ? null : t.buyPrice || null,
        rentPrice: t.access === "gratuit" ? null : t.rentPrice || null, views: t.views || 0, featured: !!t.featured,
        episodes: { create: ((t.episodes || []) as Any[]).map((e, j) => ({ title: e.title, recap: e.recap || "", durationMin: e.min || 10, position: j })) },
      },
    });
    filmIds[t.id] = f.id;
  }

  console.log("Transactions de démonstration (via le prestataire de test)…");
  for (const pid of ["nuit-corniche", "emission-7j", "prompts-cinema", "pack-talkshow"])
    await pay({ purpose: "ORDER", productId: productIds[pid]!, userId: buyer.id, method: "wave", phone: "77 123 45 67" });
  for (const pid of ["nuit-corniche", "guide-talkshow", "vendre-creations"])
    await pay({ purpose: "ORDER", productId: productIds[pid]!, userId: buyer2.id, method: "orange", phone: "78 000 11 22" });
  const filmPaid = D.TITLES.filter((t) => t.access === "payant");
  await pay({ purpose: "FILM", filmId: filmIds[filmPaid[0]!.id]!, mode: "BUY", userId: buyer.id, method: "wave" });
  await pay({ purpose: "FILM", filmId: filmIds[filmPaid[1]!.id]!, mode: "RENT", userId: buyer.id, method: "mtn" });
  await pay({ purpose: "FILM", filmId: filmIds[filmPaid[0]!.id]!, mode: "RENT", userId: buyer2.id, method: "orange" });
  const cafe = D.TITLES.find((t) => t.title === "Café Téranga");
  for (const [cid, tips] of Object.entries(D.TIPS))
    for (const t of tips)
      await pay({ purpose: "TIP", shopId: shopIds[cid]!, amount: t.amount, message: t.message || undefined, senderName: t.anonymous ? "Anonyme" : t.name, filmId: cid === "awa-diop" && cafe ? filmIds[cafe.id] : undefined, userId: null, method: "wave" });

  // Progression de Moussa dans la formation
  const lessons = await prisma.lesson.findMany({ where: { productId: productIds["emission-7j"] }, orderBy: { position: "asc" }, take: 3 });
  await prisma.lessonProgress.createMany({ data: lessons.map((l) => ({ userId: buyer.id, lessonId: l.id })) });

  // Une demande de retrait en attente pour Awa
  await requestPayout(shopIds["awa-diop"]!, 20000, "wave", "77 555 44 33");
  // Un produit en attente de modération
  await prisma.product.update({ where: { id: productIds["emission-culinaire"] }, data: { status: "PENDING" } });

  console.log("✓ Seed terminé. Comptes : gina@fomvue.com (admin), awa@fomvue.com (créatrice), moussa@exemple.sn (acheteur) — mot de passe demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
