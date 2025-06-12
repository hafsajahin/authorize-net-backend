const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { APIContracts, APIControllers } = require("authorizenet");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Helper function to wrap Authorize.Net controller execute in a Promise
function getHostedPaymentToken(request) {
  return new Promise((resolve, reject) => {
    const ctrl = new APIControllers.GetHostedPaymentPageController(request.getJSON());
    ctrl.setEnvironment("https://api2.authorize.net/xml/v1/request.api");

    let callbackCalled = false;

    // Set a timeout to reject if callback doesn't fire in 30 seconds
    const timeout = setTimeout(() => {
      if (!callbackCalled) {
        console.error("Authorize.Net execute callback did not fire within 30 seconds");
        reject(new Error("Authorize.Net request timeout"));
      }
    }, 30000);

    ctrl.execute(() => {
      callbackCalled = true;
      clearTimeout(timeout);

      console.log("Authorize.Net execute callback triggered");

      const apiResponse = ctrl.getResponse();
      const response = new APIContracts.GetHostedPaymentPageResponse(apiResponse);

      if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
        const token = response.getToken();
        resolve(token);
      } else {
        const error = response.getMessages().getMessage()[0];
        console.error("Authorize.Net Error:", error.getCode(), error.getText());
        reject(new Error(`${error.getCode()}: ${error.getText()}`));
      }
    });
  });
}

app.post("/create-payment-token", async (req, res) => {
  const { amount, apiLoginId, transactionKey } = req.body;

  if (!amount || !apiLoginId || !transactionKey) {
    return res.status(400).json({ error: "Missing required fields: amount, apiLoginId, or transactionKey" });
  }

  try {
    const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
    merchantAuthentication.setName(apiLoginId);
    merchantAuthentication.setTransactionKey(transactionKey);

    const transactionRequest = new APIContracts.TransactionRequestType();
    transactionRequest.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequest.setAmount(amount);

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

    const request = new APIContracts.GetHostedPaymentPageRequest();
    request.setMerchantAuthentication(merchantAuthentication);
    request.setTransactionRequest(transactionRequest);
    request.setHostedPaymentSettings({ setting: settings });

    const token = await getHostedPaymentToken(request);
    const redirectUrl = `https://accept.authorize.net/payment/payment/${encodeURIComponent(token)}`;

    res.status(200).json({ token, url: redirectUrl });
  } catch (err) {
    console.error("Error generating token:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Authorize.Net live backend is running.");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
