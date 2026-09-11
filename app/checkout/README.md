# Havenly checkout

The checkout UI is prepared for Stripe. To accept real payments, add Stripe server-side code using `STRIPE_SECRET_KEY` and a webhook using `STRIPE_WEBHOOK_SECRET`.

Never put either secret in client-side code or commit them to Git.

For eligible marketplace items, the payment flow should create an order only after Stripe confirms payment. Property purchases/rentals should use a separate transaction workflow rather than treating a home like an ordinary shipped product.
