import { Request, Response } from 'express';
import { AptosService } from '../services/aptos.service';

export class TransferController {
    private aptosService: AptosService;

    constructor() {
        this.aptosService = new AptosService();
    }

    async handleTransfer(req: Request, res: Response) {
        try {
            const { prompt, receiverAddress, amount } = req.body;

            if (!prompt || !receiverAddress || !amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameters: prompt, receiverAddress, or amount'
                });
            }

            // Validate receiver address format
            if (!receiverAddress.match(/^0x[a-fA-F0-9]{64}$/)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid receiver address format'
                });
            }

            // Validate amount
            if (isNaN(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount'
                });
            }

            const result = await this.aptosService.processTransferRequest(
                prompt,
                receiverAddress,
                amount
            );

            return res.status(200).json({
                success: true,
                message: 'Transfer request processed successfully',
                result
            });
        } catch (error: any) {
            console.error('Transfer handler error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    };
}
