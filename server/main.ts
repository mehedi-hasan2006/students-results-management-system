import "dotenv/config";
import { connectDatabase, database, mongoClient } from "./database.js";
import { createApp } from "./app.js";

const port = Number(process.env.API_PORT ?? 4000);

async function start(): Promise<void> {
  await connectDatabase();
  const server = createApp(database).listen(port, () => {
    console.info(`Meridian Academy API listening on http://localhost:${port}`);
  });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      server.close(async (error) => {
        if (error) {
          console.error("API shutdown failed:", error);
          process.exitCode = 1;
        }
        await mongoClient.close();
        process.exit();
      });
    });
  }
}

start().catch(async (error: unknown) => {
  console.error("API startup failed:", error);
  await mongoClient.close();
  process.exitCode = 1;
});
