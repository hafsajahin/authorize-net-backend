const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { APIContracts, APIControllers } = require("authorizenet");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

/**
 * POST /create-payment-token
 * Required body:
 * {
 *   apiLoginId: "yourApiLoginId",
 *   transactionKey: "yourTransactionKey",
 *   amount: "10.00"
 * }
 */
app.post("/create-payment-token", async (req, res) => {
  const { apiLoginId, transactionKey, amount } = req.body;

  if (!apiLoginId || !transactionKey || !amount) {
    return res.status(400).json({ error: "Missing required fields: apiLoginId, transactionKey, or amount" });
  }

  try {
    // Merchant Auth
    const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
    merchantAuthentication.setName(apiLoginId);
    merchantAuthentication.setTransactionKey(transactionKey);

    // Transaction setup
    const transactionRequest = new APIContracts.TransactionRequestType();
    transactionRequest.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequest.setAmount(amount);

    // Hosted Payment Settings
    const returnOptions = new APIContracts.SettingType();
    returnOptions.setSettingName("hostedPaymentReturnOptions");
    returnOptions.setSettingValue(JSON.stringify({
      showReceipt: false,
      url: "https://your-wix-site.com/success",     // 🔁 Replace with your live success URL
      urlText: "Continue",
      cancelUrl: "https://your-wix-site.com/cancel", // 🔁 Replace with your cancel URL
      cancelUrlText: "Cancel"
    }));

    const buttonOptions = new APIContracts.SettingType();
    buttonOptions.setSettingName("hostedPaymentButtonOptions");
    buttonOptions.setSettingValue(JSON.stringify({ text: "Pay Now" }));

    const settings = [returnOptions, buttonOptions];

    const request = new APIContracts.GetHostedPaymentPageRequest();
    request.setMerchantAuthentication(merchantAuthentication);
    request.setTransactionRequest(transactionRequest);
    request.setHostedPaymentSettings({ setting: settings });

    const ctrl = new APIControllers.GetHostedPaymentPageController(request.getJSON());

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new APIContracts.GetHostedPaymentPageResponse(apiResponse);

      if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
        const token = response.getToken();
        const encodedToken = encodeURIComponent(token);
        const redirectUrl = `https://accept.authorize.net/payment/payment/${encodedToken}`;
        res.status(200).json({ url: redirectUrl });
      } else {
        const error = response.getMessages().getMessage()[0];
        res.status(500).json({ error: `${error.getCode()}: ${error.getText()}` });
      }
    });
  } catch (err) {
    console.error("Token generation failed:", err);
    res.status(500).json({ error: "Internal server error during token generation" });
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Authorize.Net Accept Hosted backend is running.");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
