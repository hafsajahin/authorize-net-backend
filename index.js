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
  res.send('Authorize.Net backend is running');
});

// ✅ Create payment token
app.post('/create-payment-token', async (req, res) => {
  const { apiLoginId, transactionKey, amount, transactionId } = req.body;

  // Validate required fields
  if (!apiLoginId || !transactionKey || !amount || !transactionId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
  merchantAuthentication.setName(apiLoginId);
  merchantAuthentication.setTransactionKey(transactionKey);

  const creditCard = new APIContracts.CreditCardType();
  creditCard.setCardNumber('4111111111111111'); // Test card
  creditCard.setExpirationDate('2038-12');
  creditCard.setCardCode('123');

  const paymentType = new APIContracts.PaymentType();
  paymentType.setCreditCard(creditCard);

  const transactionRequestType = new APIContracts.TransactionRequestType();
  transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
  transactionRequestType.setAmount(parseFloat(amount));
  transactionRequestType.setPayment(paymentType);

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
      res.json({ token }); // ✅ Success
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

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
