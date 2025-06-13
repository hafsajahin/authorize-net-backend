const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { APIContracts, APIControllers } = require("authorizenet");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/create-payment-token', (req, res) => {
  try {
    const { apiLoginId, transactionKey, amount } = req.body;

    const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(apiLoginId);
    merchantAuthenticationType.setTransactionKey(transactionKey);

    const transactionRequestType = new APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequestType.setAmount(amount);

    // Hosted Payment Return Options Setting
    const setting1 = new APIContracts.SettingType();
    setting1.setSettingName('hostedPaymentReturnOptions');
    setting1.setSettingValue(JSON.stringify({
      showReceipt: false,
      url: 'https://www.luxury-lounger.com/success',
      urlText: 'Continue',
      cancelUrl: 'https://www.luxury-lounger.com/cancel',
      cancelUrlText: 'Cancel'
    }));

    const request = new APIContracts.GetHostedPaymentPageRequest();
    request.setMerchantAuthentication(merchantAuthenticationType);
    request.setTransactionRequest(transactionRequestType);

    // This is the fix: setHostedPaymentSettings accepts an array
    request.setHostedPaymentSettings([setting1]);

    const ctrl = new APIControllers.GetHostedPaymentPageController(request.getJSON());

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new APIContracts.GetHostedPaymentPageResponse(apiResponse);

      if (response != null && response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
        const token = response.getToken();
        const url = `https://accept.authorize.net/payment/payment?token=${token}`;
        res.json({ token, url });
      } else {
        const errorMessages = response.getMessages().getMessage();
        res.status(500).json({ error: errorMessages[0].getText() });
      }
    });
  } catch (err) {
    console.error("Token generation failed:", err);
    res.status(500).json({ error: "Internal server error during token generation" });
  }
});

app.get("/", (req, res) => {
  res.send("Authorize.Net backend is running.");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
