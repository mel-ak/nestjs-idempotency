import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentsService {
    async create(body: { amount: number; currency: string }) {
        // Fake processing delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        return {
            id: randomUUID(),
            status: 'succeeded',
            amount: body.amount,
            currency: body.currency,
            createdAt: new Date().toISOString(),
        };
    }
}