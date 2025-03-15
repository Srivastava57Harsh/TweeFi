import { scraper } from "./scraper.js";
import { SearchMode } from "agent-twitter-client";
import { queueMention } from "../queue/index.js";
import dotenv from "dotenv";
import { CacheService } from "../cache.service.js";
dotenv.config();

const cacheService = CacheService.getInstance();

async function getLastProcessedTime(): Promise<Date> {
  try {
    const cachedTime = await cacheService.get<string>("lastProcessedTweetTime");
    return cachedTime ? new Date(cachedTime) : new Date();
  } catch (error) {
    console.error("⚠️ Failed to fetch last processed time from Redis:", error);
    return new Date();
  }
}

async function setLastProcessedTime(time: Date): Promise<void> {
  try {
    await cacheService.set("lastProcessedTweetTime", time.toISOString(), 86400);
  } catch (error) {
    console.error("⚠️ Failed to update last processed time in Redis:", error);
  }
}

async function checkMentions(): Promise<void> {
  try {
    console.log("\n🔍 Checking for new mentions...");

    const query = `@${process.env.TWITTER_USERNAME}`;
    const maxMentions = 20;

    let lastProcessedTweetTime = await getLastProcessedTime();

    for await (const tweet of scraper.searchTweets(
      query,
      maxMentions,
      SearchMode.Latest
    )) {
      if (tweet.username === process.env.TWITTER_USERNAME) continue;

      if (!tweet.id || !tweet.text || !tweet.username || !tweet.userId) {
        console.log("⚠️ Skipping tweet with missing data");
        continue;
      }

      const tweetTime = new Date(Number(tweet.timestamp) * 1000);

      if (tweetTime <= lastProcessedTweetTime) continue;

      console.log(`
📥 New mention found:
👤 From: @${tweet.username}
💬 Text: ${tweet.text}
🆔 Tweet ID: ${tweet.id}
⏰ Time: ${tweetTime.toISOString()}
      `);

      await queueMention({
        username: tweet.username,
        text: tweet.text,
        id: tweet.id,
        userId: tweet.userId,
      });

      console.log(`✅ Queued mention from @${tweet.username} for processing`);

      lastProcessedTweetTime = tweetTime;
      await setLastProcessedTime(lastProcessedTweetTime);
    }

    console.log(
      `⏱️ Updated last processed time to: ${lastProcessedTweetTime.toISOString()}`
    );
  } catch (error) {
    console.error("❌ Error checking mentions:", error);
  }
}

export const startMentionMonitor = () => {
  console.log("🤖 Starting mention monitor...");
  setInterval(checkMentions, 10000);
};
