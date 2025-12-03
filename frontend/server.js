import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Log what PORT we're actually using
console.log(`PORT environment variable: ${process.env.PORT || 'NOT SET (using default 8080)'}`);
console.log(`Using port: ${PORT}`);

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT
  });
});

// Check if dist folder exists
const distPath = join(__dirname, 'dist');
if (!existsSync(distPath)) {
  console.error(`ERROR: dist folder not found at ${distPath}`);
  console.error('Make sure npm run build completed successfully');
  process.exit(1);
}

console.log(`Serving from: ${distPath}`);

// Serve static files from the dist directory
app.use(express.static(distPath));

// Handle React Router - serve index.html for all routes
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  if (!existsSync(indexPath)) {
    console.error(`ERROR: index.html not found at ${indexPath}`);
    return res.status(500).send('index.html not found');
  }
  res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`Serving from: ${distPath}`);
});
