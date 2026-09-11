# Havenly payment setup

## Supported payment experience

The checkout is designed to support card payments (debit/credit) and Stripe-supported accelerated wallets/payment methods such as Apple Pay, Google Pay, Link, and other methods enabled for the connected Stripe account and customer location.

Havenly Gift Cards are intended to be a separate stored-value system and should not be represented as a Stripe payment method unless implemented through a compliant gift-card balance flow.

## Stripe setup

1. Create a Stripe account and activate the payment methods you want.
2. Add `STRIPE_SECRET_KEY` to your server environment only.
3. Add `STRIPE_WEBHOOK_SECRET` to your server environment only.
4. Create Stripe Checkout Sessions server-side.
5. On successful webhook confirmation, mark the corresponding Havenly order as `paid`.
6. Handle eligible refund requests server-side through Stripe.

Do not collect raw card numbers, CVV, or other card credentials in Havenly's own forms. Use Stripe Checkout/Elements so Stripe handles sensitive payment data.

## Returns

The site's 7-day language should be described as an eligible-item policy. Real-estate transactions and certain marketplace categories can have different cancellation, return, contract, and legal requirements.
