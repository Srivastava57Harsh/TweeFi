import express from "express";
import dotenv from "dotenv";
import tweetRoutes from './routes/tweet.routes';
import { initializeScraper } from './services/twitter/scraper';
import { startMentionMonitor } from './services/twitter/monitor';
import { initializeWorkers } from './services/queue';

dotenv.config();

const app = express();
app.use(express.json());

// Routes
app.use('/api', tweetRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Initialize services
  await initializeScraper();
  initializeWorkers();
  startMentionMonitor();
});
