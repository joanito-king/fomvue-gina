"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { processPayout } from "@/lib/services/ledger";
import { errMsg, str } from "@/lib/actions-util";

export async function setProductStatusAction(fd: FormData) {
  await requireAdmin();
  const status = str(fd, "status");
  if (["PUBLISHED", "REJECTED", "PENDING"].includes(status))
    await prisma.product.update({ where: { id: str(fd, "id") }, data: { status } });
  redirect("/admin/produits");
}

export async function toggleFeaturedAction(fd: FormData) {
  await requireAdmin();
  const p = await prisma.product.findUnique({ where: { id: str(fd, "id") } });
  if (p) await prisma.product.update({ where: { id: p.id }, data: { featured: !p.featured } });
  redirect("/admin/produits");
}

export async function setUserAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  if (id === admin.id) redirect("/admin/utilisateurs");
  const op = str(fd, "op");
  if (op === "suspend" || op === "unsuspend") {
    await prisma.user.update({ where: { id }, data: { suspended: op === "suspend" } });
    if (op === "suspend") await prisma.session.deleteMany({ where: { userId: id } });
  }
  if (op === "admin") await prisma.user.update({ where: { id }, data: { role: "ADMIN" } });
  redirect("/admin/utilisateurs");
}

export async function processPayoutAction(fd: FormData) {
  await requireAdmin();
  let q = "";
  try {
    await processPayout(str(fd, "id"), str(fd, "decision") === "PAID" ? "PAID" : "REJECTED", str(fd, "note") || undefined);
  } catch (e) {
    q = `?error=${encodeURIComponent(errMsg(e))}`;
  }
  redirect(`/admin${q}`);
}
