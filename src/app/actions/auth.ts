"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, setSessionCookie, currentUser } from "@/lib/auth";
import { createSession, createShopFor, destroySession, signup, verifyCredentials } from "@/lib/services/auth";
import { errMsg, safeNext, str, withParam } from "@/lib/actions-util";

export async function signupAction(fd: FormData) {
  const asCreator = str(fd, "asCreator") === "1";
  const next = safeNext(str(fd, "next") || (asCreator ? "/vendeur" : "/"));
  let error = "";
  try {
    const user = await signup({ name: str(fd, "name"), email: str(fd, "email"), password: str(fd, "password"), asCreator, shopName: str(fd, "shopName") || undefined });
    const s = await createSession(user.id);
    await setSessionCookie(s.token, s.expiresAt);
  } catch (e) {
    error = errMsg(e);
  }
  if (error) redirect(withParam(`/inscription?${asCreator ? "createur=1&" : ""}next=${encodeURIComponent(next)}`, "error", error));
  redirect(next);
}

export async function loginAction(fd: FormData) {
  const next = safeNext(str(fd, "next") || "/");
  let error = "";
  try {
    const user = await verifyCredentials(str(fd, "email"), str(fd, "password"));
    const s = await createSession(user.id);
    await setSessionCookie(s.token, s.expiresAt);
  } catch (e) {
    error = errMsg(e);
  }
  if (error) redirect(withParam(`/connexion?next=${encodeURIComponent(next)}`, "error", error));
  redirect(next);
}

export async function logoutAction() {
  const jar = await cookies();
  await destroySession(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  redirect("/");
}

export async function becomeCreatorAction(fd: FormData) {
  const user = await currentUser();
  if (!user) redirect("/inscription?createur=1");
  if (user.shop) redirect("/vendeur");
  const name = str(fd, "shopName").trim() || `Boutique ${user.name}`;
  await createShopFor(user.id, name.slice(0, 80));
  redirect("/vendeur?ok=" + encodeURIComponent("Votre boutique est ouverte !"));
}
