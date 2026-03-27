// API Endpoint: POST /api/social/facebook
// Posts to Facebook Page using Graph API

export async function POST(request) {
  try {
    const { text, link } = await request.json();

    // Facebook Graph API configuration
    const PAGE_ID = 'DorInnovations'; // Your Facebook Page ID
    const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN; // Get from Facebook Developer

    // Post to Facebook
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PAGE_ID}/feed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `${text}\n\nRead more: ${link}`,
          link: link,
          access_token: ACCESS_TOKEN,
        }),
      }
    );

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        postUrl: `https://www.facebook.com/${PAGE_ID}/posts/${result.id}`,
        postId: result.id,
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
