import { Router } from 'express';
import { tweetController } from '../controllers/tweetController';

const router = Router();

router.post('/tweet', tweetController.postTweet);

export default router;