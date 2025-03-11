import { Job } from "bullmq";
import { scraper } from "../twitter/scraper.js";
import { getAIRecommendation } from "../twitter/ai.js";
import { NgrokService } from "../ngrok.service.js";
import { TwitterService } from "../twitter.service.js";

export async function processMention(job: Job) {
  const { username, text, id } = job.data;

  try {
    console.log(`
🎯 Processing mention:
👤 From: @${username}
💬 Text: ${text}
🆔 Tweet ID: ${id}
    `);

    // Check if logged in before proceeding
    const isLoggedIn = await scraper.isLoggedIn();
    if (!isLoggedIn) {
      throw new Error("Twitter client not logged in");
    }

    // Get AI recommendation
    const recommendation = await getAIRecommendation(text);
    console.log(`💡 Generated response: ${recommendation}`);

    // Get token ID from environment or use a default
    const tokenId = process.env.DEFAULT_TOKEN_ID || "0x1234567890";

    // Create a player card for the response
    const ngrokURL = await NgrokService.getInstance().getUrl();
    const me = await TwitterService.getInstance().me;

    // Generate claim URL
    const claimURL = `${process.env.NEXT_PUBLIC_HOSTNAME}/claim/${tokenId}`;

    // Create slug for the card
    const slug =
      Buffer.from(claimURL).toString("base64url") +
      ":" +
      Buffer.from(me?.username ?? "").toString("base64url");

    // Generate card URL
    const cardURL = `${ngrokURL}/auth/twitter/card/${slug}/index.html`;

    // Combine text response with card URL
    const fullResponse = `${recommendation}\n\nClaim your tokens here: ${cardURL}`;

    // Send reply tweet
    await scraper.sendTweet(fullResponse, id);
    console.log(`✅ Successfully replied to @${username} with player card`);
  } catch (error) {
    console.error(`❌ Failed to process mention from @${username}:`, error);
    throw error; // Let BullMQ handle the retry
  }
}
