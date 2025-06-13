 write my code for live cerdential const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { APIContracts, APIControllers } = require("authorizenet");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/create-payment-token', async (req, res) => {
  const { apiLoginId, transactionKey, amount } = req.body;

  const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(apiLoginId);
  merchantAuthenticationType.setTransactionKey(transactionKey);

  const transactionRequestType = new ApiContracts.TransactionRequestType();
  transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
  transactionRequestType.setAmount(amount);

  const setting1 = new ApiContracts.SettingType();
  setting1.setSettingName('hostedPaymentReturnOptions');
  setting1.setSettingValue(JSON.stringify({
    showReceipt: false,
    url: 'https://your-website.com/success', // optional
    urlText: 'Continue',
    cancelUrl: 'https://your-website.com/cancel',
    cancelUrlText: 'Cancel'
  }));

  const request = new ApiContracts.GetHostedPaymentPageRequest();
  request.setMerchantAuthentication(merchantAuthenticationType);
  request.setTransactionRequest(transactionRequestType);
  request.addToHostedPaymentSettings(setting1);

  const ctrl = new ApiControllers.GetHostedPaymentPageController(request.getJSON());

  ctrl.execute(() => {
    const apiResponse = ctrl.getResponse();
    const response = new ApiContracts.GetHostedPaymentPageResponse(apiResponse);

    if (response != null && response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
      const token = response.getToken();
      const url = `https://accept.authorize.net/payment/payment?token=${token}`;
      res.json({ token, url });
    } else {
      const errorMessages = response.getMessages().getMessage();
      res.status(500).json({ error: errorMessages[0].getText() });
    }
  });
});


  } catch (err) {
    console.error("Token generation failed:", err);
    res.status(500).json({ error: "Internal server error during token generation" });
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("Authorize.Net sandbox backend is running.");
});

app.listen(port, () => {
  console.log(Server is running on port ${port});
});
