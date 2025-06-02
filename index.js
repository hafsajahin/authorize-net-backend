// index.js

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: 'https://www.luxury-lounger.com', // Replace with your actual Wix site URL
  credentials: true
}));
app.use(bodyParser.json());

// Example route
app.post('/create-payment-token', async (req, res) => {
  const { apiLoginId, transactionKey, amount, transactionId } = req.body;

  // Implement your logic to create a payment token with Authorize.Net here
  // For example, using the 'authorizenet' package

  res.json({ token: 'generated_payment_token' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
