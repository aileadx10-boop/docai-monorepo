// API Endpoint: POST /api/social/linkedin
// Posts to LinkedIn Company Page using LinkedIn API

export async function POST(request) {
  try {
    const { text, link } = await request.json();

    // LinkedIn API configuration
    const ORGANIZATION_ID = 'dorinnovations'; // Your LinkedIn Organization ID
    const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN; // Get from LinkedIn Developer

    // Post to LinkedIn
    const response = await fetch(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: `urn:li:organization:${ORGANIZATION_ID}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: `${text}\n\nRead more: ${link}`,
              },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to post to LinkedIn');
    }

    const postId = result.id?.split(':').pop();

    return new Response(
      JSON.stringify({
        success: true,
        postUrl: `https://www.linkedin.com/feed/update/${postId}`,
        postId: postId,
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
