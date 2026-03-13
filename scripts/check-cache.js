require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DATABASE_URL || "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const ids = ["2414961", "2265318", "2265324"];

  const rows = await prisma.match.findMany({
    where: { externalId: { in: ids } },
    select: {
      externalId: true,
      homeTeam: true,
      awayTeam: true,
      matchDate: true,
      status: true,
    },
  });

  console.log("cached rows:", rows.length);
  console.log(
    rows.map((r) => ({
      externalId: r.externalId,
      homeTeam: r.homeTeam,
      awayTeam: r.awayTeam,
      matchDate: r.matchDate.toISOString(),
      status: r.status,
    }))
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
