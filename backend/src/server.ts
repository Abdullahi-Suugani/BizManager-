import { app } from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`API server listening on port ${env.PORT}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Cannot start API: port ${env.PORT} is already in use. Stop only the existing BizManager backend process or choose another PORT.`);
  } else {
    console.error("API server failed to start", { code: error.code, message: error.message });
  }
  process.exitCode = 1;
});
