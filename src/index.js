import axios from "axios";
import uuid from "react-native-uuid";

/**
 * Small helper to sleep for a given time.
 */
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * One-call payment flow for Lenco mobile money in React Native.
 *
 * @param {Object} opts
 * @param {"mtn"|"airtel"|"zamtel"} opts.provider - Lenco operator (lowercase).
 * @param {string} opts.phone - MSISDN (e.g. "2609XXXXXXXX").
 * @param {number} opts.amount - Amount to collect.
 * @param {"merchant"|"customer"} [opts.bearer="merchant"] - Who pays charges.
 * @param {string} [opts.country="zm"] - Country code expected by Lenco.
 * @param {string} opts.apiKey - Lenco API secret (NOT recommended to be in a client for prod).
 * @param {string} [opts.reference] - Custom reference; defaults to uuid.v4().
 * @param {number} [opts.pollInterval=3000] - ms between status checks.
 * @param {number} [opts.maxAttempts=40] - Max polling attempts.
 * @param {function} [opts.onOTP] - async ({ reference, provider, phone, amount }) => string
 * @param {function} [opts.onStatus] - (status, payload) => void (called on every status update)
 * @param {AbortSignal} [opts.signal] - Optional AbortController signal to cancel.
 *
 * @returns {Promise<{success:boolean,status:string,reference:string,data?:any,error?:string}>}
 */
export async function processMobileMoneyPayment({
  provider,
  phone,
  amount,
  bearer = "merchant",
  country = "zm",
  apiKey,
  reference = uuid.v4(),
  pollInterval = 3000,
  maxAttempts = 40,
  onOTP,
  onStatus,
  signal,
}) {
  if (!apiKey) {
    throw new Error(
      "apiKey is required. (For production: proxy through your backend; do NOT bundle secrets in the app.)"
    );
  }
  if (!provider || !phone || !amount) {
    throw new Error("provider, phone and amount are required.");
  }

  // Lenco expects lowercase operator strings
  const operator = String(provider).toLowerCase();

  const http = axios.create({
    baseURL: "https://api.lenco.co/access/v2",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  // 1) Initiate collection
  const initRes = await http.post(
    "/collections/mobile-money",
    { operator, bearer, phone, amount, reference, country },
    { signal }
  );

  let data = initRes.data?.data || {};
  let status = data.status;
  let ref = data.reference;

  onStatus?.(status, data);

  // 2) OTP flow (if required)
  if (status === "otp-required") {
    if (!onOTP) {
      return {
        success: false,
        status,
        reference: ref,
        error:
          "OTP required. Provide an onOTP callback to collect OTP from the user.",
      };
    }
    const otp = await onOTP({
      reference: ref,
      provider: operator,
      phone,
      amount,
    });
    const otpRes = await http.post(
      "/collections/mobile-money/submit-otp",
      { reference: ref, otp },
      { signal }
    );
    data = otpRes.data?.data || {};
    status = data.status;
    ref = data.reference;
    onStatus?.("otp-submitted", data);
  }

  // Early exit if API already decided
  if (status === "successful")
    return { success: true, status, reference: ref, data };
  if (status === "failed")
    return { success: false, status, reference: ref, data };

  // 3) Poll while "pending" or "pay-offline"
  let attempts = 0;
  while (
    ["pending", "pay-offline"].includes(status) &&
    attempts < maxAttempts
  ) {
    attempts += 1;
    await delay(pollInterval);
    const statusRes = await http.get(`/collections/status/${ref}`, { signal });
    const latest = statusRes.data?.data || {};
    status = latest.status;
    onStatus?.(status, latest);

    if (status === "successful")
      return { success: true, status, reference: ref, data: latest };
    if (status === "failed")
      return { success: false, status, reference: ref, data: latest };
  }

  // Timed out without terminal state
  return { success: false, status, reference: ref, error: "timeout" };
}

/**
 * Optional helpers if you want to split the flow yourself.
 * Not required if you only use `processMobileMoneyPayment`.
 */

export async function submitLencoOtp({ apiKey, reference, otp, signal }) {
  if (!apiKey) throw new Error("apiKey required");
  const res = await axios.post(
    "https://api.lenco.co/access/v2/collections/mobile-money/submit-otp",
    { reference, otp },
    {
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal,
    }
  );
  return res.data;
}

export async function getLencoStatus({ apiKey, reference, signal }) {
  if (!apiKey) throw new Error("apiKey required");
  const res = await axios.get(
    `https://api.lenco.co/access/v2/collections/status/${reference}`,
    {
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal,
    }
  );
  return res.data;
}
