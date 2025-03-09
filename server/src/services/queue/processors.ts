import { Job } from "bullmq";
import { scraper } from "../twitter/scraper.js";
import { getAIRecommendation } from "../twitter/ai.js";

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

    // Send reply tweet
    await scraper.sendTweet(recommendation, id);
    console.log(`✅ Successfully replied to @${username}`);
  } catch (error) {
    console.error(`❌ Failed to process mention from @${username}:`, error);
    throw error; // Let BullMQ handle the retry
  }
}
