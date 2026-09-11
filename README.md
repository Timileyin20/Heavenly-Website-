# Havenly Marketplace

USA-focused real-estate + household marketplace starter.

## Supabase
The app uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
Create a `.env.local` with those values for your own environment.

The seller flow at `/sell` supports property sale/rent and marketplace items, uploads up to 8 images to the `listing-images` bucket, and inserts a listing into the `listings` table.

Never put a Supabase secret/service-role key in frontend code.

## Payment roadmap
The checkout UI includes debit/credit cards, supported Apple Pay/Google Pay wallets, Stripe Link, Cash App Pay where enabled, and a Havenly Gift Card concept. Before production, configure Stripe Payment Element/Checkout with only the payment methods enabled on the Havenly Stripe account. Gift cards are not assumed to be a native Stripe payment method; Havenly gift cards should be implemented as an internal stored-value system with server-side validation and ledgering.

## V7 commerce
- Orders and refund-request tables are included in `supabase/schema.sql`.
- `app/orders` provides a buyer order-history view.
- Stripe server credentials belong only in server environment variables.
