const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { APIContracts, APIControllers } = require('authorizenet');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// ✅ Health check route
app.get('/', (req, res) => {
  res.send('Authorize.Net backend is running');
});

// ✅ Secure payment token generation
app.post('/create-payment-token', async (req, res) => {
  const { amount, transactionId } = req.body;

  // Use secure credentials from environment variables
  const apiLoginId = process.env.API_LOGIN_ID;
  const transactionKey = process.env.TRANSACTION_KEY;

  if (!apiLoginId || !transactionKey) {
    return res.status(500).json({ message: 'API credentials are missing in environment variables' });
  }

  const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
  merchantAuthentication.setName(apiLoginId);
  merchantAuthentication.setTransactionKey(transactionKey);

  const transactionRequestType = new APIContracts.TransactionRequestType();
  transactionRequestType.setTransactionType('authCaptureTransaction');
  transactionRequestType.setAmount(amount);

  const createRequest = new APIContracts.CreateTransactionRequest();
  createRequest.setMerchantAuthentication(merchantAuthentication);
  createRequest.setTransactionRequest(transactionRequestType);

  const ctrl = new APIControllers.CreateTransactionController(createRequest.getJSON());

  ctrl.execute(() => {
    const apiResponse = ctrl.getResponse();
    const response = new APIContracts.CreateTransactionResponse(apiResponse);

    if (
      response &&
      response.getMessages().getResultCode() === 'Ok' &&
      response.getTransactionResponse().getTransId()
    ) {
      const token = response.getTransactionResponse().getTransId();
      res.json({ token });
    } else {
      const error = response.getMessages()?.getMessage?.()[0];
      res.status(500).json({ message: error?.getText() || 'Transaction failed' });
    }
  });
});

// ✅ Start server
app.listen(PORT, ()
