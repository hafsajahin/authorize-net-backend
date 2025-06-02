const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { APIContracts, APIControllers } = require('authorizenet');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// ✅ Test route
app.get('/', (req, res) => {
  res.send('Authorize.Net LIVE backend is running');
});

// ✅ Create payment token (Live Mode)
app.post('/create-payment-token', async (req, res) => {
  const { amount, transactionId } = req.body;

  const apiLoginId = process.env.API_LOGIN_ID;
  const transactionKey = process.env.TRANSACTION_KEY;

  // Validation
  if (!apiLoginId || !transactionKey || !amount || !transactionId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
  merchantAuthentication.setName(apiLoginId);
  merchantAuthentication.setTransactionKey(transactionKey);

  const transactionRequestType = new APIContracts.TransactionRequestType();
  transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
  transactionRequestType.setAmount(parseFloat(amount));

  // 🔐 LIVE MODE expects real card data (this sample uses hardcoded card for test)
  const creditCard = new APIContracts.CreditCardType();
  creditCard.setCardNumber('4111111111111111'); // ⚠️ Replace with real card data in production
  creditCard.setExpirationDate('2038-12');
  creditCard.setCardCode('123');

  const paymentType = new APIContracts.PaymentType();
  paymentType.setCreditCard(creditCard);
  transactionRequestType.setPayment(paymentType);

  const createRequest = new APIContracts.CreateTransactionRequest();
  createRequest.setMerchantAuthentication(merchantAuthentication);
  createRequest.setTransactionRequest(transactionRequestType);

  const ctrl = new APIControllers.CreateTransactionController(createRequest.getJSON());

  // ✅ DO NOT set sandbox endpoint (it defaults to LIVE)
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
      let errorMessage = 'Transaction failed';
      try {
        errorMessage = response.getMessages().getMessage()[0].getText();
      } catch (e) {
        errorMessage = 'Unknown error during transaction';
      }
      res.status(500).json({ message: errorMessage });
    }
  });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`LIVE backend running on port ${PORT}`);
});
