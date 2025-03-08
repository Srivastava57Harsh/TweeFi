import { Router, Request, Response } from 'express';
import { TransferController } from '../controllers/transfer.controller';

const router = Router();
const transferController = new TransferController();

router.post('/invoke', async (req: Request, res: Response) => {
    await transferController.handleTransfer(req, res);
});

export default router;
