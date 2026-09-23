import { execSync } from "child_process";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
try {
  const dom = execSync(`"${chromePath}" --headless=new --dump-dom --virtual-time-budget=4000 "http://localhost:3000"`, {
    maxBuffer: 50 * 1024 * 1024,
    timeout: 15000,
  }).toString();

  console.log("DOM length:", dom.length);
  console.log("Has svg.map-stage:", dom.includes("map-stage"));
  console.log("Has city-blueprint:", dom.includes("city-blueprint"));
  console.log("Has active-route-line:", dom.includes("active-route-line"));
  console.log("Has animated canvas:", dom.includes("<canvas"));

  const matchSvg = dom.match(/<svg class="map-stage[^>]*>([\s\S]*?)<\/svg>/);
  if (matchSvg) {
    console.log("SVG inner content length:", matchSvg[1].length);
    const gMatches = [...matchSvg[1].matchAll(/<g\s+([^>]*transform="[^"]*"[^>]*)>/g)];
    for (const gm of gMatches.slice(0, 5)) {
      console.log("Found g:", gm[1].slice(0, 150));
    }
  } else {
    console.log("SVG tag not found or matched!");
  }
} catch (e) {
  console.error("Error dumping DOM:", e.message);
}
