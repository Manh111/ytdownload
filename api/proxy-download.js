const fetch = require('node-fetch');

module.exports = async (req, res) => {
  try {
    const url = req.method === 'GET' ? req.query.url : (req.body && req.body.url);
    if (!url) return res.status(400).json({ error: 'URL parameter is required' });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com',
      },
      redirect: 'follow',
    });

    if (!response.ok) return res.status(response.status).json({ error: `HTTP error: ${response.status} ${response.statusText}` });

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');

    const headers = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (contentLength) headers['Content-Length'] = contentLength;

    res.set(headers);
    response.body.pipe(res);
  } catch (error) {
    console.error('[API] /api/proxy-download error', error);
    res.status(500).json({ error: `Proxy error: ${error.message}` });
  }
};
