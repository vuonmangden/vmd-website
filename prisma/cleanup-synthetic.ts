import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { authorizeSyntheticData, cleanupSyntheticFixtures } from '../scripts/synthetic-fixtures-lib.mjs';

const authorization = authorizeSyntheticData(process.env);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: authorization.connectionString }),
});

cleanupSyntheticFixtures(prisma, authorization)
  .then((result) => {
    console.log(
      `Synthetic fixtures removed: settings=${result.settings}, customers=${result.customers}, notificationJobs=${result.notificationJobs}.`,
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
