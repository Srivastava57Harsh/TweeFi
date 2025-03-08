import { Request, Response } from 'express';
import { AptosService } from '../services/aptos.service';

export class TransferController {
    private aptosService: AptosService;

    constructor() {
        this.aptosService = new AptosService();
    }

    async handleTransfer(req: Request, res: Response) {
        try {
            const { prompt } = req.body;

            if (!prompt) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameter: prompt'
                });
            }

            const result = await this.aptosService.processRequest(prompt);

            return res.status(200).json({
                success: true,
                message: result
            });
        } catch (error: any) {
            console.error('Request handler error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    };
}
