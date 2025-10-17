const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// YouTube API routes
app.post('/api/youtube', async (req, res) => {
  try {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: "Video ID is required" });
    }

    // Check if API key is configured
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      console.error("[Backend] RAPIDAPI_KEY not configured");
      return res.status(500).json({ 
        error: "API key not configured. Please set RAPIDAPI_KEY in environment variables." 
      });
    }

    console.log("[Backend] Fetching video info for ID:", videoId);

    // Call YouTube Media Downloader API - try multiple endpoints
    let response;
    let apiEndpoint = "";
    
    // Try different endpoints for video download
    const endpoints = [
      `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${videoId}`,
      `https://youtube-media-downloader.p.rapidapi.com/v2/video/download?videoId=${videoId}`,
      `https://youtube-media-downloader.p.rapidapi.com/v2/video/info?videoId=${videoId}`,
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log("[Backend] Trying endpoint:", endpoint);
        response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "x-rapidapi-key": apiKey,
            "x-rapidapi-host": "youtube-media-downloader.p.rapidapi.com",
          },
        });
        
        if (response.ok) {
          apiEndpoint = endpoint;
          console.log("[Backend] Success with endpoint:", endpoint);
          break;
        } else {
          console.log("[Backend] Failed with endpoint:", endpoint, "Status:", response.status);
        }
      } catch (err) {
        console.log("[Backend] Error with endpoint:", endpoint, err);
        continue;
      }
    }
    
    if (!response || !response.ok) {
      const errorText = await response?.text() || "No response";
      console.error("[Backend] All endpoints failed. Last error:", errorText);
      
      // Handle specific error cases
      if (response?.status === 429) {
        return res.status(429).json({ 
          error: "API rate limit exceeded. Please wait a moment and try again, or upgrade your RapidAPI plan.",
          details: "You have exceeded the free tier request limit. Please check your RapidAPI subscription.",
          status: 429
        });
      }
      
      if (response?.status === 403) {
        return res.status(403).json({ 
          error: "API access denied. Please check your RapidAPI subscription.",
          details: "Make sure you have subscribed to the YouTube Media Downloader API on RapidAPI.",
          status: 403
        });
      }
      
      return res.status(response?.status || 500).json({ 
        error: `Failed to fetch video information from all endpoints`,
        details: errorText,
        triedEndpoints: endpoints
      });
    }

    console.log("[Backend] API Response status:", response.status);
    console.log("[Backend] Successful endpoint:", apiEndpoint);

    const data = await response.json();
    console.log("[Backend] API Response data:", data);
    
    // Add metadata about which endpoint worked
    const responseData = {
      ...data,
      _metadata: {
        endpoint: apiEndpoint,
        timestamp: new Date().toISOString()
      }
    };
    
    res.json(responseData);
  } catch (error) {
    console.error("[Backend] API Route Error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

// Playlist API route
app.post('/api/youtube/playlist', async (req, res) => {
  try {
    const { playlistId } = req.body;

    if (!playlistId) {
      return res.status(400).json({ error: "Playlist ID is required" });
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: "API key not configured. Please set RAPIDAPI_KEY in environment variables." 
      });
    }

    console.log("[Backend] Fetching playlist info for ID:", playlistId);

    const response = await fetch(
      `https://youtube-media-downloader.p.rapidapi.com/v2/playlist/details?playlistId=${playlistId}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "youtube-media-downloader.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Backend] Playlist API error:", response.status, errorText);
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: "API rate limit exceeded. Please wait a moment and try again.",
          status: 429
        });
      }
      
      return res.status(response.status).json({ 
        error: `Failed to fetch playlist information`,
        details: errorText
      });
    }

    const data = await response.json();
    console.log("[Backend] Playlist API Response:", data);
    
    res.json(data);
  } catch (error) {
    console.error("[Backend] Playlist API Error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

// Related videos API route
app.post('/api/youtube/related', async (req, res) => {
  try {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: "Video ID is required" });
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: "API key not configured. Please set RAPIDAPI_KEY in environment variables." 
      });
    }

    console.log("[Backend] Fetching related videos for ID:", videoId);

    const response = await fetch(
      `https://youtube-media-downloader.p.rapidapi.com/v2/video/related?videoId=${videoId}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "youtube-media-downloader.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Backend] Related videos API error:", response.status, errorText);
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: "API rate limit exceeded. Please wait a moment and try again.",
          status: 429
        });
      }
      
      return res.status(response.status).json({ 
        error: `Failed to fetch related videos`,
        details: errorText
      });
    }

    const data = await response.json();
    console.log("[Backend] Related videos API Response:", data);
    
    res.json(data);
  } catch (error) {
    console.error("[Backend] Related videos API Error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

// Proxy download route to avoid CORS
app.get('/api/proxy-download', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    console.log(`[Backend] Proxy fetching: ${url}`);
    
    // Fetch the file from the external URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com',
      },
      redirect: 'follow',
    });
    
    if (!response.ok) {
      console.error(`[Backend] Proxy HTTP error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json(
        { error: `HTTP error: ${response.status} ${response.statusText}` }
      );
    }
    
    // Get the content type and content length
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    
    console.log(`[Backend] Proxy success: ${contentType}, ${contentLength ? `${contentLength} bytes` : 'unknown size'}`);
    
    // Create response with proper headers
    const headers = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }
    
    // Stream the response
    res.set(headers);
    response.body.pipe(res);
    
  } catch (error) {
    console.error('[Backend] Proxy error:', error);
    res.status(500).json(
      { error: `Proxy error: ${error.message}` }
    );
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Backend] Server running on port ${PORT}`);
  console.log(`[Backend] Health check: http://localhost:${PORT}/api/health`);
});


