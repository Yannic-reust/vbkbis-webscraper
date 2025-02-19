import puppeteer from "puppeteer";
import admin from "firebase-admin";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Firebase using environment variables
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

const scrapeListings = async () => {
  console.log("🚀 Starting scraper...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"], // Required for running in Docker
  });
  const page = await browser.newPage();

  const url = "https://www.schkg-be.ch/verwertungen/liegenschaften/";
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const listings = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll(".row.property-item.records")
    ).map((property) => ({
      title:
        property.querySelector(".listName h3")?.innerText.trim() || "No title",
      price:
        property.querySelector(".listEstimation")?.innerText.trim() ||
        "No price",
      date: property.querySelector(".listDate")?.innerText.trim() || "No date",
      link: property.querySelector(".more-button a")?.href || "No link",
    }));
  });

  console.log("✅ Scraped listings:", listings);

  const timestamp = new Date().toISOString().split("T")[0];

  await db.collection("property_scrapes").doc(timestamp).set({
    timestamp: admin.firestore.Timestamp.now(),
    listings: listings,
  });

  console.log(
    `📂 Data stored in Firestore under: property_scrapes/${timestamp}`
  );
  await browser.close();
};

scrapeListings().catch(console.error);
