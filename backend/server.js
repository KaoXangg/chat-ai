import "dotenv/config";
import { connectDB } from "./config/db.js";
import "./models/index.js";
import { createApp } from "./app.js";

const app = createApp();
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] Chat AI backend đang chạy tại http://localhost:${PORT}`);
  });
});
