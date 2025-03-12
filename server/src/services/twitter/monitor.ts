import { scraper } from "./scraper.js";
import { SearchMode } from "agent-twitter-client";
import { queueMention } from "../queue/index.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env file
dotenv.config({
  path: resolve(__dirname, "../../../.env"),
});

let lastProcessedTweetTime = new Date();

async function checkMentions(): Promise<void> {
  try {
    console.log("\n🔍 Checking for new mentions...");
    const query = `@${process.env.TWITTER_USERNAME}`;
    const maxMentions = 20;

    for await (const tweet of scraper.searchTweets(
      query,
      maxMentions,
      SearchMode.Latest
    )) {
      // Skip our own tweets
      if (tweet.username === process.env.TWITTER_USERNAME) {
        console.log(`⏩ Skipping own tweet from @${tweet.username}`);
        continue;
      }

      // Skip tweets without required data
      if (!tweet.id || !tweet.text || !tweet.username || !tweet.userId) {
        console.log("⚠️ Skipping tweet with missing data");
        continue;
      }

      const timestamp = Number(tweet.timestamp) * 1000; // Convert seconds to milliseconds
      const tweetTime = new Date(timestamp);

      if (tweetTime <= lastProcessedTweetTime) {
        console.log(
          `⏩ Skipping already processed tweet from @${tweet.username}`
        );
        continue;
      }

      console.log(`
📥 New mention found:
👤 From: @${tweet.username}
💬 Text: ${tweet.text}
🆔 Tweet ID: ${tweet.id}
⏰ Time: ${tweetTime.toISOString()}
      `);

      // Queue the mention for processing
      await queueMention({
        username: tweet.username,
        text: tweet.text,
        id: tweet.id,
        userId: tweet.userId,
      });
      console.log(`✅ Queued mention from @${tweet.username} for processing`);
    }

    // Update the last processed time
    lastProcessedTweetTime = new Date();
    console.log(
      `⏱️ Updated last processed time to: ${lastProcessedTweetTime.toISOString()}`
    );
  } catch (error) {
    console.error("❌ Error checking mentions:", error);
  }
}

// Export the monitor function
export const startMentionMonitor = () => {
  console.log("🤖 Starting mention monitor...");
  // Check every 10 seconds
  setInterval(checkMentions, 10000);
};
