export default async function handler(req, res) {
  res.status(200).json({
    paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
  });
}
