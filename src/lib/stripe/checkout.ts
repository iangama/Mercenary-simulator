export interface CheckoutInput {
  successUrl: string;
  cancelUrl: string;
  lineItems: Array<{ price: string; quantity: number }>;
  mode?: 'payment' | 'subscription';
  metadata?: Record<string, string>;
}

export async function createCheckoutSession(input: CheckoutInput) {
  const backend = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';
  const res = await fetch(`${backend}/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(`Stripe checkout failed: ${res.status}`);
  return res.json() as Promise<{ id: string; url: string }>;
}
