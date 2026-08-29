function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : "";
}

export function createEventId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function trackMetaCAPI(params: {
  eventName: string;
  eventId: string;
  value?: number;
  currency?: string;
  contentName?: string;
  contentIds?: string[];
  email?: string;
  phone?: string;
  name?: string;
}) {
  try {
    await fetch("/api/meta/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        fbp: getCookie("_fbp"),
        fbc: getCookie("_fbc"),
        sourceUrl: typeof window !== "undefined" ? window.location.href : "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      }),
    });
  } catch {
    // não quebra o checkout
  }
}
