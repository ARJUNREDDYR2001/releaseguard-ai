import "dotenv/config"
import { createApp } from "./app.js"
import { logger } from "./utils/logger.js"

const port = Number(process.env.PORT ?? 4000)
const app = createApp()

app.listen(port, "0.0.0.0", () => {
  logger.info("ReleaseGuard backend listening", { port })
})
