import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outputPath = path.resolve("current_view.png");

console.log("Capturing headless Chrome screenshot from http://localhost:3000...");
try {
  execSync(
    `"${chromePath}" --headless=new --screenshot="${outputPath}" --window-size=1440,900 --virtual-time-budget=4000 "http://localhost:3000"`,
    { stdio: "ignore", timeout: 15000 }
  );
  if (fs.existsSync(outputPath)) {
    console.log(`Screenshot saved successfully: ${outputPath} (${fs.statSync(outputPath).size} bytes)`);
  } else {
    console.error("Screenshot file was not created.");
    process.exit(1);
  }
} catch (err) {
  console.error("Failed to capture screenshot:", err.message);
  process.exit(1);
}
