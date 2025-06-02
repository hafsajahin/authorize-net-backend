const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { APIContracts, APIControllers } = require('authorizenet');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// ✅ Main route to verify server is working
app.get('/', (req, res) => {
  res.send('Authorize.Net backend is running');
});

// ✅ Real /create-payment-token implementation
app.post('/create-payment-token', async (req, res) => {
  const { apiLoginId, transactionKey, amount, transactionId } = req.body;

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
      res.json({ token }); // ✅ Returning real token
    } else {
      const error = response.getMessages().getMessage()[0];
      res.status(500).json({ message: error.getText() });
    }
  });
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
