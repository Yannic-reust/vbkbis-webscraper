import puppeteer from "puppeteer";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// Initialize Firebase only once
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

export default async function handler(req, res) {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    const url = "https://www.schkg-be.ch/verwertungen/liegenschaften/";

    await page.goto(url, { waitUntil: "domcontentloaded" });

    const listings = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll(".row.property-item.records")
      ).map((property) => ({
        title:
          property.querySelector(".listName h3")?.innerText.trim() ||
          "No title",
        price:
          property.querySelector(".listEstimation")?.innerText.trim() ||
          "No price",
        date:
          property.querySelector(".listDate")?.innerText.trim() || "No date",
        link: property.querySelector(".more-button a")?.href || "No link",
      }));
    });

    const timestamp = new Date().toISOString().split("T")[0];

    await db.collection("property_scrapes").doc(timestamp).set({
      timestamp: admin.firestore.Timestamp.now(),
      listings,
    });

    await browser.close();

    res.status(200).json({ message: "Scraping complete", listings });
  } catch (error) {
    console.error("Error scraping:", error);
    res.status(500).json({ error: error.message });
  }
}
