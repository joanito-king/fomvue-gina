"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { mockAllowed, signMock } from "@/lib/payments/mock";
import { handleWebhook } from "@/lib/services/payments";
import { str } from "@/lib/actions-util";

/**
 * Simule l'écran de validation du prestataire puis émet un webhook signé.
 * On passe par handleWebhook (même code que la route HTTP /api/webhooks/mock).
 */
export async function mockPayAction(fd: FormData) {
  if ((process.env.PAYMENT_PROVIDER && process.env.PAYMENT_PROVIDER !== "mock") || !mockAllowed()) throw new Error("Mode test désactivé");
  const payment = await prisma.payment.findUnique({ where: { id: str(fd, "paymentId") } });
  if (!payment) redirect("/");
  const outcome = str(fd, "outcome") === "success" ? "SUCCEEDED" : "FAILED";
  const body = JSON.stringify({ reference: payment.reference, status: outcome, providerRef: payment.providerRef });
  await handleWebhook("mock", body, new Headers({ "x-mock-signature": signMock(body) }));
  redirect(`/paiement/retour/${payment.id}`);
}
