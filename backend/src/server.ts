import "dotenv/config";
import express from "express";
import { supabase } from "./config/database";
import reportRoutes from "./routes/report.routes";

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());


// Routes
app.use("/api/reports", reportRoutes);


// Start server
app.listen(PORT, () => {
  console.log("Server running on http://localhost:" +PORT);
});