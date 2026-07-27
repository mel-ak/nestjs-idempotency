import { Controller, Post, Body, UseInterceptors, HttpCode } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post()
    @HttpCode(201)
    @UseInterceptors(IdempotencyInterceptor)
    async createPayment(@Body() body: { amount: number; currency: string }) {
        // Simulate some work (e.g. call Stripe, save to DB, etc.)
        console.log('>>> Processing payment for the first time...');

        // In real life you would do the actual business logic here
        const result = await this.paymentsService.create(body);

        return result;
    }
}