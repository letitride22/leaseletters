export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { docType, fields, state } = req.body;

  if (!docType || !fields) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const fieldLines = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v || '(not provided)'}`)
    .join('\n');

  const prompt = `Write a professional landlord document: "${docType}" for the state of ${state || 'the US'}.

Details:
${fieldLines}

Instructions:
- Write the complete, ready-to-send document only. No preamble, no commentary after.
- Use today's date if no date is specified.
- Make it professional, clear, and appropriately firm for the document type.
- Include proper salutation, body paragraphs, and closing signature as "Your Property Manager / Landlord".
- Reference relevant state law obligations where applicable (notice periods, deposit rules, etc).
- Format with proper spacing and line breaks for a real letter.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API error' });
    }

    const text = data.content?.[0]?.text || '';
    return res.status(200).json({ result: text });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate document' });
  }
}
