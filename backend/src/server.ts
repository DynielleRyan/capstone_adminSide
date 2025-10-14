import "dotenv/config";
import express from "express";
import { supabase } from "./config/database";
import reportRoutes from "./routes/report.routes";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5001;

// Allow your React dev server
app.use(
  cors({
    origin: ["http://localhost:3000"], // your frontend
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Middleware
app.use(express.json());


// Routes
app.use("/api/reports", reportRoutes);


// Start server
app.listen(PORT, () => {
  console.log("Backend server running on http://localhost:" + PORT);
});