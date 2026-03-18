export async function handleStripeCheckout({ req, res, json, parseBody, parseForm, stripeSecretKey }) {
  if (!stripeSecretKey) return json(res, 503, { error: 'stripe not configured' });
  const body = await parseBody(req);
  const payload = {
    mode: body.mode || 'payment',
    success_url: body.successUrl,
    cancel_url: body.cancelUrl,
    line_items: body.lineItems,
    metadata: body.metadata || {}
  };

  const form = parseForm(payload);
  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${stripeSecretKey}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: form
  });
  const data = await stripeResponse.json().catch(() => ({}));

  if (!stripeResponse.ok) return json(res, 502, { error: 'stripe upstream error', details: data });
  return json(res, 200, { id: data.id, url: data.url });
}
