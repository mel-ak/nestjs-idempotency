import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    BadRequestException,
    Inject,
    ConflictException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Observable, of, from } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { createHash } from 'crypto';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    async intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        const idempotencyKey = request.headers['idempotency-key'] as string;

        // 1. Require the header
        if (!idempotencyKey) {
            throw new BadRequestException('Idempotency-Key header is required');
        }

        // Optional: basic validation (UUID recommended in production)
        if (idempotencyKey.length < 10) {
            throw new BadRequestException('Idempotency-Key is too short');
        }

        // Scope the key (method + path) so the same key on different endpoints doesn't collide
        const scopedKey = `idem:${request.method}:${request.route?.path || request.url}:${idempotencyKey}`;

        // Hash the body so we can detect conflicts (same key, different payload)
        const bodyHash = this.hashBody(request.body);

        // 2. Check if we already have a response for this key
        const cached = await this.cacheManager.get<{
            statusCode: number;
            body: any;
            bodyHash: string;
        }>(scopedKey);

        if (cached) {
            // Same key but different body → conflict
            if (cached.bodyHash !== bodyHash) {
                throw new ConflictException(
                    'Idempotency-Key was already used with a different request body',
                );
            }

            // Replay the exact previous response
            response.status(cached.statusCode);
            return of(cached.body);
        }

        // 3. First time we see this key → process the request and cache the result
        return next.handle().pipe(
            switchMap((data) => {
                const statusCode = response.statusCode || 201;

                // Store both the response and the body hash
                return from(
                    this.cacheManager.set(
                        scopedKey,
                        {
                            statusCode,
                            body: data,
                            bodyHash,
                        },
                        60 * 5 * 1000, // 5 minutes TTL
                    ),
                ).pipe(
                    // Return the original data after caching
                    switchMap(() => of(data)),
                );
            }),
        );
    }

    private hashBody(body: any): string {
        if (!body || Object.keys(body).length === 0) {
            return 'empty';
        }
        // Stable stringify (sort keys)
        const stable = JSON.stringify(body, Object.keys(body).sort());
        return createHash('sha256').update(stable).digest('hex');
    }
}