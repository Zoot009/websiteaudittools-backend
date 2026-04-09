import { prisma } from "./lib/prisma";

const getData = async () => {
  try {
    console.log("🔍 Fetching SEO issue...\n");

    const data = await prisma.seoIssue.findMany({
      where: {
        auditReportId: "cmnr6nis20000h7m9bu5o6urh",
      },
      select: {
        title: true,
        description: true,
      },
    });

    if (!data) {
      console.log("⚠️ No data found for given ID");
      return;
    }

    // Pretty print output
    console.log("✅ Data fetched successfully:\n");
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error("❌ Error fetching data:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
    console.log("\n🔌 Prisma disconnected");
  }
};

getData();