const express = require("express");
const bodyParser = require("body-parser");
const { APIContracts, APIControllers } = require("authorizenet");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/create-payment-token", async (req, res) => {
  try {
    const {
      apiLoginId,
      transactionKey,
      amount,
      orderNumber,
      customerEmail,
      billing,
    } = req.body;

    // Create merchant authentication
    const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
    merchantAuthentication.setName(apiLoginId);
    merchantAuthentication.setTransactionKey(transactionKey);

    // Create transaction request
    const transactionRequestType = new APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);
    transactionRequestType.setAmount(amount);

    // Billing info
    const billTo = new APIContracts.CustomerAddressType();
    billTo.setFirstName(billing.firstName);
    billTo.setLastName(billing.lastName);
    billTo.setAddress(billing.address);
    billTo.setCity(billing.city);
    billTo.setState(billing.state);
    billTo.setZip(billing.zip);
    billTo.setCountry(billing.country);
    billTo.setPhoneNumber(billing.phone);
    billTo.setEmail(customerEmail);
    transactionRequestType.setBillTo(billTo);

    // Hosted payment settings
    const setting1 = new APIContracts.SettingType();
    setting1.setSettingName("hostedPaymentReturnOptions");
    setting1.setSettingValue(JSON.stringify({
      showReceipt: false,
      url: "https://www.example.com/payment-success",
      urlText: "Continue",
      cancelUrl: "https://www.example.com/payment-cancel",
      cancelUrlText: "Cancel"
    }));

    const setting2 = new APIContracts.SettingType();
    setting2.setSettingName("hostedPaymentButtonOptions");
    setting2.setSettingValue(JSON.stringify({ text: "Pay Now" }));

    const settingList = [];
    settingList.push(setting1);
    settingList.push(setting2);

    const settings = new APIContracts.ArrayOfSetting();
    settings.setSetting(settingList);

    // Request for token
    const request = new APIContracts.GetHostedPaymentPageRequest();
    request.setMerchantAuthentication(merchantAuthentication);
    request.setTransactionRequest(transactionRequestType);
    request.setHostedPaymentSettings(settings);

    const ctrl = new APIControllers.GetHostedPaymentPageController(request.getJSON());
    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new APIContracts.GetHostedPaymentPageResponse(apiResponse);

      if (response !== null && response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
        const token = response.getToken();
        const url = `https://accept.authorize.net/payment/payment/${token}`;
        res.json({ url });
      } else {
        const errorMessages = response.getMessages().getMessage();
        res.status(500).json({
          error: errorMessages[0].getText(),
        });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Authorize.net backend is running on port ${PORT}`);
});
