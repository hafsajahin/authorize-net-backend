const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { APIContracts, APIControllers } = require('authorizenet');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Health check route
app.get('/', (req, res) => {
  res.send('Authorize.Net Accept Hosted backend is running');
});

// Create Accept Hosted token route
app.post('/create-payment-token', async (req, res) => {
  const { apiLoginId, transactionKey, amount, transactionId } = req.body;

  // ✅ Log incoming data (with obfuscation)
  console.log('Received credentials:', {
    apiLoginId: apiLoginId?.slice(0, 5) || 'N/A',
    transactionKeyLength: transactionKey?.length || 'N/A',
    amount,
    transactionId,
  });

  // Validate input
  if (!apiLoginId || !transactionKey || !amount || !transactionId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (transactionKey.length > 128) {
    return res.status(400).json({ message: 'transactionKey too long' });
  }

  try {
    const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
    merchantAuthentication.setName(apiLoginId);
    merchantAuthentication.setTransactionKey(transactionKey);

    const transactionRequestType = new APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType('authCaptureTransaction');
    transactionRequestType.setAmount(parseFloat(amount));

    // Payment page settings
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
        console.log('Generated token:', token);
        res.json({ token });
      } else {
        const errMsg = response.getMessages().getMessage()[0].getText();
        console.error('Authorize.Net error:', errMsg);
        res.status(500).json({ message: errMsg });
      }
    });
  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
