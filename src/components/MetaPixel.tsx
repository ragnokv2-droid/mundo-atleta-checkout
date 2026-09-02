"use client";

import Script from "next/script";

const PIXEL_IDS = [
  "1387316733571547",  // Pixel atual
  "28162540780065698", // Novo Pixel
];

export default function MetaPixel() {
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');

          ${PIXEL_IDS.map((id) => `fbq('init', '${id}');`).join("\n")}

          fbq('track', 'PageView');
        `}
      </Script>

      <noscript>
        {PIXEL_IDS.map((id) => (
          <img
            key={id}
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
            alt=""
          />
        ))}
      </noscript>
    </>
  );
}

export function trackMetaEvent(
  event: string,
  params?: Record<string, string | number | boolean>,
  eventId?: string
) {
  if (typeof window === "undefined" || !(window as any).fbq) return;

  if (eventId) {
    (window as any).fbq("track", event, params || {}, { eventID: eventId });
  } else {
    (window as any).fbq("track", event, params || {});
  }
}
