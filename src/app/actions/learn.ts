"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ownsProduct } from "@/lib/services/catalog";
import { str } from "@/lib/actions-util";

export async function toggleLessonAction(fd: FormData) {
  const user = await requireUser();
  const lesson = await prisma.lesson.findUnique({ where: { id: str(fd, "lessonId") } });
  if (!lesson || !(await ownsProduct(user.id, lesson.productId))) redirect("/mes-achats");
  const existing = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } } });
  if (existing) await prisma.lessonProgress.delete({ where: { id: existing.id } });
  else await prisma.lessonProgress.create({ data: { userId: user.id, lessonId: lesson.id } });
  redirect(`/apprendre/${lesson.productId}?lecon=${lesson.id}`);
}
