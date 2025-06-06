const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { APIContracts, APIControllers } = require("authorizenet");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const API_LOGIN_ID = process.env.API_LOGIN_ID;
const TRANSACTION_KEY = process.env.TRANSACTION_KEY;

app.post("/create-payment-token", async (req, res) => {
  const {
    amount,
    orderNumber,
    customerEmail,
    billing
  } = req.body;

  const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
  merchantAuthentication.setName(API_LOGIN_ID);
  merchantAuthentication.setTransactionKey(TRANSACTION_KEY);

  const transactionRequestType = new APIContracts.TransactionRequestType();
  transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);
  transactionRequestType.setAmount(amount);

  const customerAddress = new APIContracts.CustomerAddressType();
  customerAddress.setFirstName(billing.firstName);
  customerAddress.setLastName(billing.lastName);
  customerAddress.setAddress(billing.address);
  customerAddress.setCity(billing.city);
  customerAddress.setState(billing.state);
  customerAddress.setZip(billing.zip);
  customerAddress.setCountry(billing.country);

  const order = new APIContracts.OrderType();
  order.setInvoiceNumber(orderNumber);
  order.setDescription("Order from Wix");

  const request = new APIContracts.GetHostedPaymentPageRequest();
  request.setMerchantAuthentication(merchantAuthentication);
  request.setTransactionRequest(transactionRequestType);
  request.setHostedPaymentSettings({
    setting: [
      {
        settingName: "hostedPaymentReturnOptions",
        settingValue: JSON.stringify({
          showReceipt: false,
          url: "https://www.your-wix-site.com/payment-success",
          urlText: "Continue",
          cancelUrl: "https://www.your-wix-site.com/payment-failed",
          cancelUrlText: "Cancel"
        })
      }
    ]
  });

  const ctrl = new APIControllers.GetHostedPaymentPageController(request.getJSON());

  ctrl.execute(() => {
    const apiResponse = ctrl.getResponse();
    const response = new APIContracts.GetHostedPaymentPageResponse(apiResponse);

    if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
      const token = response.getToken();
      const url = `https://accept.authorize.net/payment/payment/${token}`;
      return res.json({ url });
    } else {
      return res.status(500).json({
        error: response.getMessages().getMessage()[0].getText()
      });
    }
  });
});

app.get("/", (req, res) => {
  res.send("Authorize.Net backend is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
