# Lenco Mobile Money For React Native Apps

Lightweight JavaScript utility to collect **mobile money via Lenco** from **React Native** apps.

> ⚠️ **Security**: Always store your Lenco **secret key** in environment variables (e.g., `.env` files) and never hardcode it directly in your code.

## Install

```bash
npm i lenco-mobile-money
```

## Quick Start

```js
import { processMobileMoneyPayment } from "lenco-mobile-money";

const result = await processMobileMoneyPayment({
  apiKey: process.env.EXPO_PUBLIC_LENCO_SEC_KEY, // stored in .env
  provider: "mtn", // "mtn" | "airtel" | "zamtel"
  phone: "2609XXXXXXXX",
  amount: 50,
  bearer: "merchant", // or "customer"
  onOTP: async () => {
    // Show your own modal/input to collect OTP from user
    return await getOtpFromUserSomehow();
  },
  onStatus: (status, payload) => {
    console.log("Status update:", status);
  },
});

if (result.success) {
  console.log("Paid!", result);
} else {
  console.log("Not paid:", result);
}
```

## Options

- `provider`: `"mtn" | "airtel" | "zamtel"` (lowercase)
- `phone`: MSISDN (e.g. `2609...`)
- `amount`: number
- `bearer`: `"merchant"` (default) or `"customer"`
- `country`: default `"zm"`
- `apiKey`: Lenco secret key (use environment variable)
- `reference`: optional custom reference (defaults to `uuid.v4()`)
- `pollInterval`: ms between status checks (default `3000`)
- `maxAttempts`: default `40`
- `onOTP`: `async ({ reference, provider, phone, amount }) => string`
- `onStatus`: `(status, payload) => void`
- `signal`: optional `AbortSignal` to cancel

## Returns

```ts
{
  success: boolean,
  status: "pending" | "successful" | "failed" | "otp-required" | "pay-offline",
  reference: string,
  data?: any,
  error?: string // e.g. 'timeout'
}
```

## OTP UI Hint (React Native)

Implement `onOTP` to show a modal and resolve the code:

```js
const result = await processMobileMoneyPayment({
  // ...
  onOTP: () =>
    new Promise((resolve) => {
      openOtpModal({
        onSubmit: (code) => resolve(code),
        onCancel: () => resolve(""), // or throw
      });
    }),
});
```

## Abort (optional)

```js
const controller = new AbortController();
processMobileMoneyPayment({ /* ... */, signal: controller.signal });
/* later */ controller.abort();
```

## Security Best Practice

- Store your Lenco secret key in environment variables (e.g., `.env`, `app.config.js`, or `process.env` in Expo).
- Never commit or expose your secret key in public repos.

## License

MIT
