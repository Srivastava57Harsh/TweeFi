import { Job } from "bullmq";
import { scraper } from "../twitter/scraper.js";
import { getAIRecommendation } from "../twitter/ai.js";
import { NgrokService } from "../ngrok.service.js";
import { TwitterService } from "../twitter.service.js";
import { CacheService } from "../cache.service.js";
import { TwitterUserService } from "../twitter-user.service.js";

// Cache key prefix for storing Twitter tokens
const TWITTER_TOKEN_CACHE_PREFIX = "twitter_token_";

export async function processMention(job: Job) {
  const { username, text, id, userId } = job.data;

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

    // Check if we have a token for this user
    const cacheKey = `${TWITTER_TOKEN_CACHE_PREFIX}${username}`;
    const hasToken = CacheService.getInstance().get(cacheKey);

    const supabaseUser =
      await TwitterUserService.getInstance().getUserById(userId);

    if (hasToken || supabaseUser) {
      console.log(`🔑 Found existing user for @${username}, using AI response`);

      // Get AI recommendation
      const recommendation = await getAIRecommendation(text, userId);
      console.log(`💡 Generated response: ${recommendation}`);

      // Send reply tweet with just the AI response
      await scraper.sendTweet(recommendation, id);
      console.log(`✅ Successfully replied to @${username} with AI response`);
    } else {
      console.log(`🔑 No token found for @${username}, sending player card`);

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

      // Create a friendly message for first-time users
      const welcomeMessage =
        "Thanks for reaching out! To get started, please authenticate with Twitter using the link below:";

      // Combine welcome message with card URL
      const fullResponse = `${welcomeMessage}\n\n${cardURL}`;

      // Send reply tweet
      await scraper.sendTweet(fullResponse, id);
      console.log(`✅ Successfully replied to @${username} with player card`);
    }
  } catch (error) {
    console.error(`❌ Failed to process mention from @${username}:`, error);
    throw error; // Let BullMQ handle the retry
  }
}
