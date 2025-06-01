// index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { APIContracts, APIControllers } = require('authorizenet');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Route to create a payment token
app.post('/create-payment-token', async (req, res) => {
  const { amount, transactionId } = req.body;

  const apiLoginId = process.env.API_LOGIN_ID;
  const transactionKey = process.env.TRANSACTION_KEY;

  if (!apiLoginId || !transactionKey) {
    return res.status(500).json({ message: 'Missing API credentials' });
  }

  const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
  merchantAuthentication.setName(apiLoginId);
  merchantAuthentication.setTransactionKey(transactionKey);

  const transactionRequestType = new APIContracts.TransactionRequestType();
  transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);
  transactionRequestType.setAmount(amount);

  const setting1 = new APIContracts.SettingType();
  setting1.setSettingName('hostedPaymentReturnOptions');
  setting1.setSettingValue(JSON.stringify({
    showReceipt: false,
    url: 'https://www.luxury-lounger.com/payment-success',
    urlText: 'Continue',
    cancelUrl: 'https://www.luxury-lounger.com/payment-failed',
    cancelUrlText: 'Cancel'
  }));

  const settingList = [];
  settingList.push(setting1);

  const settings = new APIContracts.ArrayOfSetting();
  settings.setSetting(settingList);

  const request = new APIContracts.GetHostedPaymentPageRequest();
  request.setMerchantAuthentication(merchantAuthentication);
  request.setTransactionRequest(transactionRequestType);
  request.setHostedPaymentSettings(settings);

  const ctrl = new APIControllers.GetHostedPaymentPageController(request.getJSON());

  ctrl.execute(() => {
    const apiResponse = ctrl.getResponse();
    const response = new APIContracts.GetHostedPaymentPageResponse(apiResponse);

    if (response != null && response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
      const token = response.getToken();
      res.json({ token });
    } else {
      const errorMessage = response.getMessages().getMessage()[0].getText();
      res.status(400).json({ message: `Authorize.Net error: ${errorMessage}` });
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
