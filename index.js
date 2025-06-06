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
 * Required JSON body:
 * {
 *   apiLoginId: "yourApiLoginId",
 *   transactionKey: "yourTransactionKey",
 *   amount: "10.00",
 *   orderNumber: "WIX-12345",
 *   customerEmail: "customer@example.com",
 *   billing: {
 *     firstName: "", lastName: "", address: "",
 *     city: "", state: "", zip: "", country: "", phone: ""
 *   }
 * }
 */
app.post("/create-payment-token", async (req, res) => {
  const { apiLoginId, transactionKey, amount, orderNumber, customerEmail, billing } = req.body;

  if (!apiLoginId || !transactionKey || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
    merchantAuthentication.setName(apiLoginId);
    merchantAuthentication.setTransactionKey(transactionKey);

    const transactionRequest = new APIContracts.TransactionRequestType();
    transactionRequest.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequest.setAmount(amount);

    if (orderNumber) transactionRequest.setOrder({ invoiceNumber: orderNumber });

    if (customerEmail) transactionRequest.setCustomer({ email: customerEmail });

    if (billing) {
      const billTo = new APIContracts.CustomerAddressType();
      billTo.setFirstName(billing.firstName);
      billTo.setLastName(billing.lastName);
      billTo.setAddress(billing.address);
      billTo.setCity(billing.city);
      billTo.setState(billing.state);
      billTo.setZip(billing.zip);
      billTo.setCountry(billing.country);
      billTo.setPhoneNumber(billing.phone);
      transactionRequest.setBillTo(billTo);
    }

    // Hosted Payment Page Settings
    const returnOptions = new APIContracts.SettingType();
    returnOptions.setSettingName("hostedPaymentReturnOptions");
    returnOptions.setSettingValue(JSON.stringify({
      showReceipt: false,
      url: "https://www.luxury-lounger.com/success",  // ✅ Your success page
      urlText: "Continue",
      cancelUrl: "https://www.luxury-lounger.com/cancel",  // ✅ Your cancel page
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
        const redirectUrl = `https://accept.authorize.net/payment/payment/${encodeURIComponent(token)}`;
        res.status(200).json({ token, url: redirectUrl }); // ✅ This 'url' is used in frontend
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
  res.send("Authorize.Net Accept Hosted backend is running.");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
