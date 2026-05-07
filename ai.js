// Netlify serverless function — AI proxy
// API key lives here in Netlify env vars, never exposed to browser

exports.handler = async (event) => {

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // CORS headers — allow your Netlify domain to call this
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const { systemPrompt, userPrompt, maxTokens = 3000, useWebSearch = false } = JSON.parse(event.body);

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    };

    if (useWebSearch) {
      body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,   // ← from Netlify env vars
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: data.error.message }),
      };
    }

    // Extract text from response (handles both regular + tool-use responses)
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
