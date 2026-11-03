import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function make() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3009);
}
make();
