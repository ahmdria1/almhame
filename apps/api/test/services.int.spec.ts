import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

describe("postgres and redis", () => {
  it("uses a pgvector column", async () => {
    const prisma = new PrismaClient();
    try {
      const extensions = await prisma.$queryRaw<{ extname: string }[]>`SELECT extname FROM pg_extension WHERE extname = 'vector'`;
      expect(extensions.map((row) => row.extname)).toEqual(["vector"]);
      const distance = await prisma.$queryRaw<{ distance: number }[]>`SELECT '[1,0,0]'::vector <=> '[1,0,0]'::vector AS distance`;
      expect(Number(distance[0].distance)).toBe(0);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("reaches redis", async () => {
    const url = process.env.REDIS_URL;
    expect(url).toMatch(/^redis:\/\//);
    const redis = new Redis(url || "", {
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    try {
      await redis.connect();
      expect(await redis.ping()).toBe("PONG");
    } finally {
      redis.disconnect();
    }
  });
});
