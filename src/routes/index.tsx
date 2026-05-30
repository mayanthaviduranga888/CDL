import { createFileRoute } from "@tanstack/react-router";
import CeylonSite from "@/components/CeylonSite";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Ceylon Digital Labs (Pvt) Ltd — Web, Software, AI Automation & Digital Marketing in Sri Lanka",
      },
      {
        name: "description",
        content:
          "Ceylon Digital Labs is a full-service digital lab in Colombo offering web & software development, AI automation, data mining, digital marketing, design, video, and industry-specific ERP/CRM solutions.",
      },
      { property: "og:title", content: "Ceylon Digital Labs (Pvt) Ltd" },
      {
        property: "og:description",
        content:
          "Full-service digital lab in Colombo: web & software, AI automation, marketing, design, video, ERP/CRM.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: CeylonSite,
});
