import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import  { supabase } from './config/database';
import transactionRoutes from './routes/transactionRoutes';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes';

const app = express();
const PORT = process.env.PORT;

app.use(express.json());

app.use(cors({
  origin: 'http://localhost:3000',
}));

app.use("/api/transactions", transactionRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);


app.get('/api/test-db', async (req, res) => {
    const { data, error } = await supabase
    .from('Transaction')
    .select('*')
    .limit(1);
  if (error) {
    console.error('DB connection failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
  return res.json({ success: true, data });
});

app.listen(PORT, () => {
    console.log("Server is running on port:" + PORT);
});