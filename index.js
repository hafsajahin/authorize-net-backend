const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { APIContracts, APIControllers } = require('authorizenet');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Authorize.Net Accept Hosted backend is running');
});

app.post('/create-payment-token', async (req, res) => {
  const { apiLoginId, transactionKey, amount, transactionId } = req.body;

  if (!apiLoginId || !transactionKey || !amount || !transactionId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
  merchantAuthentication.setName(apiLoginId);
  merchantAuthentication.setTransactionKey(transactionKey);

  const transactionRequestType = new APIContracts.TransactionRequestType();
  transactionRequestType.setTransactionType('authCaptureTransaction');
  transactionRequestType.setAmount(parseFloat(amount));

  const setting1 = new APIContracts.SettingType();
  setting1.setSettingName('hostedPaymentReturnOptions');
  setting1.setSettingValue(JSON.stringify({
    showReceipt: false,
    url: 'https://www.yourwixsite.com/payment-success',
    urlText: 'Continue',
    cancelUrl: 'https://www.yourwixsite.com/payment-cancel',
    cancelUrlText: 'Cancel',
  }));

  const settingList = [setting1];

  const request = new APIContracts.GetHostedPaymentPageRequest();
  request.setMerchantAuthentication(merchantAuthentication);
  request.setTransactionRequest(transactionRequestType);
  request.setHostedPaymentSettings({ setting: settingList });

  const ctrl = new APIControllers.GetHostedPaymentPageController(request.getJSON());

  ctrl.execute(() => {
    const apiResponse = ctrl.getResponse();
    const response = new APIContracts.GetHostedPaymentPageResponse(apiResponse);

    if (response.getMessages().getResultCode() === 'Ok') {
      const token = response.getToken();
      res.json({ token });
    } else {
      res.status(500).json({ message: response.getMessages().getMessage()[0].getText() });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
