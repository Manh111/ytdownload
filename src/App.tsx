import { useState } from 'react';
import { Download, Youtube, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { downloadFile, generateFilename, formatFileSize, type DownloadProgress } from './lib/download-utils';

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: string;
  author?: string;
}

function App() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4');
  const [quality, setQuality] = useState('720p');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [downloadReady, setDownloadReady] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

  const validateYouTubeUrl = (url: string): boolean => {
    const patterns = [
      // Standard YouTube URLs
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/,
      /^(https?:\/\/)?(www\.)?youtu\.be\/[a-zA-Z0-9_-]{11}/,
      // YouTube Shorts
      /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]{11}/,
      // YouTube Live
      /^(https?:\/\/)?(www\.)?youtube\.com\/live\/[a-zA-Z0-9_-]{11}/,
      // YouTube Embed
      /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/,
      // YouTube v/ format
      /^(https?:\/\/)?(www\.)?youtube\.com\/v\/[a-zA-Z0-9_-]{11}/,
      // Generic YouTube URLs with video ID
      /^(https?:\/\/)?(www\.)?youtube\.com\/.*[?&]v=[a-zA-Z0-9_-]{11}/,
      // Mobile YouTube URLs
      /^(https?:\/\/)?m\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const extractVideoId = (url: string) => {
    // More comprehensive regex patterns for YouTube URLs
    const patterns = [
      // youtu.be/VIDEO_ID
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      // youtube.com/watch?v=VIDEO_ID
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      // youtube.com/embed/VIDEO_ID
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      // youtube.com/v/VIDEO_ID
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      // youtube.com/shorts/VIDEO_ID
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      // youtube.com/live/VIDEO_ID
      /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
      // Generic pattern for any YouTube URL with video ID
      /(?:youtube\.com\/.*[?&]v=)([a-zA-Z0-9_-]{11})/,
      // Fallback pattern
      /(?:youtube\.com\/.*\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1] && match[1].length === 11) {
        console.log(`[App] Extracted video ID: ${match[1]} using pattern: ${pattern}`);
        return match[1];
      }
    }
    
    console.error(`[App] Could not extract video ID from URL: ${url}`);
    return null;
  };

  const handleFormatChange = (newFormat: 'mp4' | 'mp3') => {
    setFormat(newFormat);
    setQuality(newFormat === 'mp4' ? '720p' : '128kbps');
  };

  const handleConvert = async () => {
    setError('');
    setVideoInfo(null);
    setDownloadReady(false);
    setDownloadUrl('');

    if (!url) {
      setError('Vui lòng nhập link YouTube');
      return;
    }

    if (!validateYouTubeUrl(url)) {
      setError('Link YouTube không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Không thể trích xuất ID video. Vui lòng kiểm tra lại URL YouTube.');
      console.error(`[App] Failed to extract video ID from URL: ${url}`);
      console.log(`[App] URL validation result: ${validateYouTubeUrl(url)}`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/youtube", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoId }),
      });

      if (!response.ok) {
        throw new Error("Không thể lấy thông tin video");
      }

      const data = await response.json();
      console.log("[App] Received data:", data);

      if (data.error) {
        if (data.status === 429) {
          throw new Error("🚫 Đã vượt quá giới hạn request miễn phí. Vui lòng chờ vài phút hoặc nâng cấp plan RapidAPI.");
        }
        if (data.status === 403) {
          throw new Error("🔒 API access denied. Vui lòng kiểm tra subscription của bạn trên RapidAPI.");
        }
        throw new Error(data.error + (data.details ? ` - ${data.details}` : ""));
      }

      // Set video info
      setVideoInfo({
        title: data.title || "Video Title",
        thumbnail: data.thumbnails?.[0]?.url || 'https://images.pexels.com/photos/1591447/pexels-photo-1591447.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
        duration: data.lengthSeconds ? `${Math.floor(data.lengthSeconds / 60)}:${(data.lengthSeconds % 60).toString().padStart(2, '0')}` : "N/A",
        author: data.channel?.name || "Unknown",
      });

      // Find download link based on format and quality
      let downloadLink = "";
      if (format === "mp4") {
        const videoItems = data.videos?.items || [];
        const selectedFormat = videoItems.find((item: any) => item.qualityLabel === quality) || 
                             videoItems.find((item: any) => item.qualityLabel === "720p") ||
                             videoItems.find((item: any) => item.qualityLabel === "480p") ||
                             videoItems[0];
        downloadLink = selectedFormat?.url || "";
      } else {
        const audioItems = data.audios?.items || [];
        downloadLink = audioItems[0]?.url || "";
      }

      setDownloadUrl(downloadLink);
      setDownloadReady(!!downloadLink);
      
    } catch (err) {
      console.error("[App] API Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Đã xảy ra lỗi khi xử lý video";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!downloadUrl || !videoInfo) return;
    
    setIsDownloading(true);
    setDownloadProgress(null);
    setError("");
    
    try {
      const filename = generateFilename(videoInfo.title, format);
      
      await downloadFile(downloadUrl, filename, (progress) => {
        setDownloadProgress(progress);
      });
      
      console.log(`[App] Download completed: ${filename}`);
    } catch (err) {
      console.error("[App] Download error:", err);
      if (!(err instanceof TypeError && err.message.includes('Failed to fetch'))) {
        setError(`Lỗi khi tải xuống: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-cyan-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-slate-900 rounded-full p-3 shadow-lg shadow-cyan-500/50 border-2 border-cyan-400">
              <Youtube className="w-12 h-12 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-cyan-400 mb-2 drop-shadow-[0_0_15px_rgba(34,211,238,0.7)]">YouTube Downloader</h1>
          <p className="text-cyan-100/90">Tải video và audio chất lượng cao</p>
        </div>

        <div className="bg-slate-800/95 backdrop-blur-lg rounded-2xl shadow-2xl shadow-cyan-500/20 border border-cyan-500/30 p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-cyan-300 mb-2">
                Link YouTube
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-600 bg-slate-700/50 text-cyan-100 placeholder-slate-400 focus:border-cyan-400 focus:ring focus:ring-cyan-400/30 transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-2">
                  Định dạng
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleFormatChange('mp4')}
                    className={`py-3 px-4 rounded-lg font-medium transition-all ${
                      format === 'mp4'
                        ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/50 scale-105'
                        : 'bg-slate-700 text-cyan-100 hover:bg-slate-600 border border-slate-600'
                    }`}
                  >
                    MP4
                  </button>
                  <button
                    onClick={() => handleFormatChange('mp3')}
                    className={`py-3 px-4 rounded-lg font-medium transition-all ${
                      format === 'mp3'
                        ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/50 scale-105'
                        : 'bg-slate-700 text-cyan-100 hover:bg-slate-600 border border-slate-600'
                    }`}
                  >
                    MP3
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-2">
                  Chất lượng
                </label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-600 bg-slate-700/50 text-cyan-100 focus:border-cyan-400 focus:ring focus:ring-cyan-400/30 transition-all outline-none"
                >
                  {format === 'mp4' ? (
                    <>
                      <option value="720p">720p (HD)</option>
                      <option value="480p">480p</option>
                      <option value="360p">360p</option>
                    </>
                  ) : (
                    <>
                      <option value="128kbps">128 kbps</option>
                      <option value="192kbps">192 kbps</option>
                      <option value="320kbps">320 kbps (Cao nhất)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              onClick={handleConvert}
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-900 py-4 rounded-lg font-semibold text-lg shadow-lg shadow-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/70 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Chuyển đổi'
              )}
            </button>

            {loading && (
              <div className="relative pt-1">
                <div className="overflow-hidden h-2 text-xs flex rounded-full bg-slate-700">
                  <div className="animate-pulse bg-gradient-to-r from-cyan-500 to-blue-500 w-full shadow-lg shadow-cyan-500/50"></div>
                </div>
              </div>
            )}

            {videoInfo && (
              <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-cyan-500/50 animate-fade-in">
                <div className="flex items-start gap-4">
                  <img
                    src={videoInfo.thumbnail}
                    alt={videoInfo.title}
                    className="w-32 h-20 object-cover rounded-lg shadow-md"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-cyan-400" />
                      <span className="text-sm font-medium text-cyan-300">Sẵn sàng tải xuống</span>
                    </div>
                    <h3 className="font-semibold text-cyan-100 mb-1">{videoInfo.title}</h3>
                    <p className="text-sm text-cyan-200/70">Thời lượng: {videoInfo.duration}</p>
                    {videoInfo.author && <p className="text-sm text-cyan-200/70">Kênh: {videoInfo.author}</p>}
                  </div>
                </div>
              </div>
            )}

            {downloadReady && (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 py-4 rounded-lg font-semibold text-lg shadow-lg shadow-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/70 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2 animate-fade-in disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {downloadProgress ? `Đang tải... ${downloadProgress.percentage}%` : "Đang tải..."}
                  </>
                ) : (
                  <>
                    <Download className="w-6 h-6" />
                    Tải xuống {format.toUpperCase()} - {quality}
                  </>
                )}
              </button>
            )}

            {downloadProgress && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs text-cyan-200">
                  <span>{formatFileSize(downloadProgress.loaded)} / {formatFileSize(downloadProgress.total)}</span>
                  <span>{downloadProgress.percentage}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700">
            <div className="bg-slate-700/50 border border-cyan-500/30 rounded-lg p-4">
              <p className="text-xs text-cyan-200 leading-relaxed">
                <strong>⚠️ Lưu ý:</strong><br />
                Để sử dụng các chức năng, vui lòng nghĩ đến tôi và niệm chú alibaba trước khi nhấn CHUYỂN ĐỔI<br />
                Đây chỉ là bản demo extension, có vấn đề gì về bản quyền hoặc chính sách của YOUTUBE vui lòng liên hệ admin TunaMahn. Thanks
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-cyan-300/80 text-sm">
          <p>Hỗ trợ tất cả video công khai từ YouTube</p>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default App;
