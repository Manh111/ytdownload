const fetch = require('node-fetch');

module.exports = async (req, res) => {
  try {
    const { videoId } = req.method === 'POST' ? req.body : req.query;
    if (!videoId) return res.status(400).json({ error: 'Video ID is required' });

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      console.error('[API] RAPIDAPI_KEY not configured');
      return res.status(500).json({ error: 'API key not configured. Please set RAPIDAPI_KEY in environment variables.' });
    }

    const endpoint = `https://youtube-media-downloader.p.rapidapi.com/v2/video/related?videoId=${videoId}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response');
      if (response.status === 429) return res.status(429).json({ error: 'API rate limit exceeded.', status: 429 });
      return res.status(response.status).json({ error: 'Failed to fetch related videos', details: errorText });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[API] /api/youtube/related error', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
