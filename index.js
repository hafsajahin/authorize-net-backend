const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { APIContracts, APIControllers } = require("authorizenet");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.post("/create-payment-token", async (req, res) => {
  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({ error: "Missing required field: amount" });
  }

  try {
    // Use live credentials from environment variables
    const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
    merchantAuthentication.setName(process.env.apiLoginId);
    merchantAuthentication.setTransactionKey(process.env.transactionKey);

    // Transaction details
    const transactionRequest = new APIContracts.TransactionRequestType();
    transactionRequest.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequest.setAmount(amount);

    // Hosted payment page settings
    const returnOptions = new APIContracts.SettingType();
    returnOptions.setSettingName("hostedPaymentReturnOptions");
    returnOptions.setSettingValue(JSON.stringify({
      showReceipt: false,
      url: "https://www.luxury-lounger.com/success",
      urlText: "Continue",
      cancelUrl: "https://www.luxury-lounger.com/cancel",
      cancelUrlText: "Cancel"
    }));

    const buttonOptions = new APIContracts.SettingType();
    buttonOptions.setSettingName("hostedPaymentButtonOptions");
    buttonOptions.setSettingValue(JSON.stringify({ text: "Pay Now" }));

    const settings = [returnOptions, buttonOptions];

    // Build the request
    const request = new APIContracts.GetHostedPaymentPageRequest();
    request.setMerchantAuthentication(merchantAuthentication);
    request.setTransactionRequest(transactionRequest);
    request.setHostedPaymentSettings({ setting: settings });

    // Create controller and set environment to PRODUCTION properly
    const ctrl = new APIControllers.GetHostedPaymentPageController(request.getJSON());
    ctrl.setEnvironment(APIControllers.Constants.endpoint.production);

    // Execute request
    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new APIContracts.GetHostedPaymentPageResponse(apiResponse);

      if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
        const token = response.getToken();
        // Live payment page URL (not test)
        const redirectUrl = `https://accept.authorize.net/payment/payment/${encodeURIComponent(token)}`;
        res.status(200).json({ token, url: redirectUrl });
      } else {
        const error = response.getMessages().getMessage()[0];
        console.error("Authorize.Net Error:", error.getCode(), error.getText());
        res.status(500).json({ error: `${error.getCode()}: ${error.getText()}` });
      }
    });

  } catch (err) {
    console.error("Token generation failed:", err);
    res.status(500).json({ error: "Internal server error during token generation" });
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("Authorize.Net live backend is running.");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
