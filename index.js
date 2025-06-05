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

  // ✅ Log masked credentials
  console.log('🔐 Received credentials:', {
    apiLoginId: apiLoginId?.slice(0, 5),
    transactionKeyLength: transactionKey?.length,
    amount,
    transactionId
  });

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
    url: 'https://www.luxury-lounger.com/payment-success',
    urlText: 'Continue',
    cancelUrl: 'https://www.luxury-lounger.com/payment-cancel',
    cancelUrlText: 'Cancel',
  }));

  const request = new APIContracts.GetHostedPaymentPageRequest();
  request.setMerchantAuthentication(merchantAuthentication);
  request.setTransactionRequest(transactionRequestType);
  request.setHostedPaymentSettings({ setting: [setting1] });

  const ctrl = new APIControllers.GetHostedPaymentPageController(request.getJSON());

  ctrl.execute(() => {
    const apiResponse = ctrl.getResponse();
    const response = new APIContracts.GetHostedPaymentPageResponse(apiResponse);

    if (response.getMessages().getResultCode() === 'Ok') {
      const token = response.getToken();
      const encodedToken = encodeURIComponent(token);
      const redirectUrl = `https://test.authorize.net/payment/payment?token=${encodedToken}`;

      console.log('✅ Generated token:', token);
      console.log('🔗 Redirect URL:', redirectUrl);

      // ✅ Send both raw token and redirect link
      res.json({ token, redirectUrl });
    } else {
      const error = response.getMessages().getMessage()[0].getText();
      console.error('❌ Error:', error);
      res.status(500).json({ message: error });
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
