"use server";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { startCheckout } from "@/lib/services/payments";
import { errMsg, safeNext, str, withParam } from "@/lib/actions-util";

export async function buyProductAction(fd: FormData) {
  const productId = str(fd, "productId");
  const user = await currentUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(`/checkout/${productId}`)}`);
  let url = "";
  try {
    url = (await startCheckout({ purpose: "ORDER", productId, userId: user.id, method: str(fd, "method") || "wave", phone: str(fd, "phone") })).redirectUrl;
  } catch (e) {
    url = withParam(`/checkout/${productId}`, "error", errMsg(e));
  }
  redirect(url);
}

export async function buyFilmAction(fd: FormData) {
  const filmId = str(fd, "filmId");
  const mode = str(fd, "mode") === "RENT" ? "RENT" : "BUY";
  const back = `/regarder/${filmId}/payer?mode=${mode}`;
  const user = await currentUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(back)}`);
  let url = "";
  try {
    url = (await startCheckout({ purpose: "FILM", filmId, mode, userId: user.id, method: str(fd, "method") || "wave", phone: str(fd, "phone") })).redirectUrl;
  } catch (e) {
    url = withParam(back, "error", errMsg(e));
  }
  redirect(url);
}

export async function tipAction(fd: FormData) {
  const shopId = str(fd, "shopId");
  const back = safeNext(str(fd, "back") || "/");
  const user = await currentUser();
  const custom = parseInt(str(fd, "customAmount").replace(/\D/g, ""), 10);
  const amount = custom > 0 ? custom : parseInt(str(fd, "amount"), 10);
  let url = "";
  try {
    url = (
      await startCheckout({
        purpose: "TIP",
        shopId,
        amount,
        message: str(fd, "message"),
        senderName: str(fd, "senderName") || user?.name || "Anonyme",
        filmId: str(fd, "filmId") || undefined,
        userId: user?.id ?? null,
        method: str(fd, "method") || "wave",
        phone: str(fd, "phone"),
      })
    ).redirectUrl;
  } catch (e) {
    url = withParam(back, "error", errMsg(e));
  }
  redirect(url);
}
