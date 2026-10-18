import 'dotenv/config';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 4000;

await connectDB();

const app = createApp();

app.listen(PORT, () => {
  console.log(`Support Desk API running at http://localhost:${PORT}`);
});

export default app;
