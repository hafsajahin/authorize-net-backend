const express = require('express');
const bodyParser = require('body-parser');
const { APIContracts, APIControllers } = require('authorizenet');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

app.post('/create-payment-token', async (req, res) => {
  const { amount, transactionId, currency, customerName, successUrl, cancelUrl } = req.body;

  try {
    const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
    merchantAuthentication.setName(process.env.API_LOGIN_ID);
    merchantAuthentication.setTransactionKey(process.env.TRANSACTION_KEY);

    const transactionRequestType = new APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequestType.setAmount(amount);

    const setting1 = new APIContracts.SettingType();
    setting1.setSettingName('hostedPaymentReturnOptions');
    setting1.setSettingValue(JSON.stringify({
      showReceipt: false,
      url: successUrl,
      urlText: 'Return to site',
      cancelUrl: cancelUrl,
      cancelUrlText: 'Cancel'
    }));

    const request = new APIContracts.GetHostedPaymentPageRequest();
    request.setMerchantAuthentication(merchantAuthentication);
    request.setTransactionRequest(transactionRequestType);
    request.setHostedPaymentSettings(new APIContracts.ArrayOfSetting());
    request.getHostedPaymentSettings().setSetting([setting1]);

    const ctrl = new APIControllers.GetHostedPaymentPageController(request.getJSON());

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new APIContracts.GetHostedPaymentPageResponse(apiResponse);

      if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
        const token = response.getToken();
        res.json({ redirectUrl: `https://accept.authorize.net/payment/payment/${token}` });
      } else {
        res.status(500).json({ error: 'Failed to generate payment token', detail: response.getMessages().getMessage()[0].getText() });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', detail: error.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Authorize.Net backend running on port ${PORT}`);
});
