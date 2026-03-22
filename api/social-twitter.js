// API Endpoint: POST /api/social/twitter
// Posts to Twitter/X using Twitter API v2

export async function POST(request) {
  try {
    const { text, link } = await request.json();

    // Twitter API v2 configuration
    const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN; // Get from Twitter Developer Portal

    // Truncate text if needed (Twitter has 280 char limit)
    const truncatedText = text.length > 250 ? text.substring(0, 247) + '...' : text;
    const tweetText = `${truncatedText}\n\n${link}`;

    // Post to Twitter
    const response = await fetch(
      'https://api.twitter.com/2/tweets',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: tweetText,
        }),
      }
    );

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        postUrl: `https://x.com/DorInnovations/status/${result.data.id}`,
        tweetId: result.data.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
