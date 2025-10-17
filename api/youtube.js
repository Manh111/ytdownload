const fetch = require('node-fetch');

module.exports = async (req, res) => {
  try {
    const { videoId } = req.method === 'POST' ? req.body : req.query;

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      console.error('[API] RAPIDAPI_KEY not configured');
      return res.status(500).json({ error: 'API key not configured. Please set RAPIDAPI_KEY in environment variables.' });
    }

    const endpoints = [
      `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${videoId}`,
      `https://youtube-media-downloader.p.rapidapi.com/v2/video/download?videoId=${videoId}`,
      `https://youtube-media-downloader.p.rapidapi.com/v2/video/info?videoId=${videoId}`,
    ];

    let response = null;
    let apiEndpoint = '';

    for (const endpoint of endpoints) {
      try {
        response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com',
          },
        });

        if (response.ok) {
          apiEndpoint = endpoint;
          break;
        }
      } catch (err) {
        console.error('[API] Error calling endpoint', endpoint, err.message || err);
      }
    }

    if (!response || !response.ok) {
      const errorText = await response?.text().catch(() => 'No response');
      if (response?.status === 429) {
        return res.status(429).json({ error: 'API rate limit exceeded.', details: errorText, status: 429 });
      }
      if (response?.status === 403) {
        return res.status(403).json({ error: 'API access denied.', details: errorText, status: 403 });
      }
      return res.status(response?.status || 500).json({ error: 'Failed to fetch video information from all endpoints', details: errorText, triedEndpoints: endpoints });
    }

    const data = await response.json();
    const responseData = {
      ...data,
      _metadata: { endpoint: apiEndpoint, timestamp: new Date().toISOString() },
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('[API] /api/youtube error', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
