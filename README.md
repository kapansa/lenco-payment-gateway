# Lenco Payment Gateway

Lightweight JavaScript utility to collect **mobile money via Lenco** from **React Native** apps.

> ⚠️ **Security**: For production, **do not** embed your Lenco **secret** key in the app. Put it on your backend and proxy requests. This library supports direct calls for prototyping/dev.

## Install

```bash
npm i lenco-mobile-money
```

## Quick Start

```js
import { processMobileMoneyPayment } from "lenco-mobile-money";

const result = await processMobileMoneyPayment({
  apiKey: "<LENCO_SECRET>", // Prefer: call your own backend instead
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
- `apiKey`: Lenco secret (recommended: use your backend instead)
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

## Production Architecture

- **Recommended**: Your app calls **your backend**.
- Backend stores **Lenco secret** and hits:

  - `POST /collections/mobile-money`
  - `POST /collections/mobile-money/submit-otp`
  - `GET /collections/status/:reference`

- Your app never handles secrets directly.

## License

MIT
