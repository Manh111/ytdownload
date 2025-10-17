# YouTube Downloader - Hướng dẫn Setup

## Tổng quan
Ứng dụng YouTube Downloader được tích hợp với Express backend và Vite React frontend, hỗ trợ tải video/audio từ YouTube với chất lượng cao.

## Kiến trúc
- **Frontend:** Vite React (port 5173)
- **Backend:** Express.js (port 3001) 
- **API:** RapidAPI YouTube Media Downloader

## Cài đặt

### 1. Cài đặt dependencies

```bash
# Cài đặt dependencies cho frontend
npm install

# Cài đặt dependencies cho backend
cd server
npm install
cd ..
```

### 2. Setup RapidAPI Key

1. Truy cập [RapidAPI Hub](https://rapidapi.com/hub)
2. Đăng ký/đăng nhập tài khoản
3. Tìm kiếm "YouTube Media Downloader" API
4. Subscribe vào API (có plan miễn phí)
5. Copy API key từ dashboard

### 3. Cấu hình Environment

Tạo file `.env` trong thư mục gốc:

```env
# RapidAPI Configuration
RAPIDAPI_KEY=your_rapidapi_key_here

# Server Configuration  
PORT=3001
```

**⚠️ Lưu ý:** Thay `your_rapidapi_key_here` bằng API key thực tế của bạn.

### 4. Chạy ứng dụng

```bash
# Chạy cả frontend và backend cùng lúc
npm run dev:all

# Hoặc chạy riêng lẻ:
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend  
npm run server
```

### 5. Truy cập ứng dụng

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/api/health

## Tính năng

### ✅ Đã tích hợp
- Tải video YouTube đơn lẻ (MP4/MP3)
- Nhiều chất lượng: 720p, 480p, 360p (video) / 128kbps, 192kbps, 320kbps (audio)
- Auto-download với progress bar
- UI đẹp với animations
- Error handling chi tiết
- CORS-free downloads qua proxy

### 🚧 Sắp có
- Tải toàn bộ playlist
- Tìm và tải video liên quan
- Batch download

## API Endpoints

### Backend Routes

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/youtube` | Lấy thông tin video |
| POST | `/api/youtube/playlist` | Lấy thông tin playlist |
| POST | `/api/youtube/related` | Lấy video liên quan |
| GET | `/api/proxy-download` | Proxy download (tránh CORS) |
| GET | `/api/health` | Health check |

### Ví dụ sử dụng API

```javascript
// Lấy thông tin video
const response = await fetch('/api/youtube', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ videoId: 'dQw4w9WgXcQ' })
});

const data = await response.json();
console.log(data);
```

## Troubleshooting

### Lỗi thường gặp

#### 1. "API key not configured"
- **Nguyên nhân:** Chưa set RAPIDAPI_KEY trong .env
- **Giải pháp:** Kiểm tra file .env và đảm bảo có RAPIDAPI_KEY

#### 2. "API rate limit exceeded"
- **Nguyên nhân:** Vượt quá giới hạn request miễn phí
- **Giải pháp:** Chờ vài phút hoặc nâng cấp plan RapidAPI

#### 3. "API access denied"
- **Nguyên nhân:** Chưa subscribe YouTube Media Downloader API
- **Giải pháp:** Subscribe API trên RapidAPI dashboard

#### 4. "Failed to fetch" khi download
- **Nguyên nhân:** CORS hoặc network issues
- **Giải pháp:** App sẽ tự động fallback sang window.open

#### 5. Backend không start
- **Nguyên nhân:** Port 3001 đã được sử dụng
- **Giải pháp:** 
  ```bash
  # Kiểm tra process đang dùng port 3001
  lsof -i :3001
  
  # Kill process (macOS/Linux)
  kill -9 <PID>
  
  # Hoặc đổi port trong .env
  PORT=3002
  ```

### Debug

#### Kiểm tra backend hoạt động
```bash
curl http://localhost:3001/api/health
```

#### Kiểm tra API key
```bash
curl -X POST http://localhost:3001/api/youtube \
  -H "Content-Type: application/json" \
  -d '{"videoId":"dQw4w9WgXcQ"}'
```

#### Logs
- **Frontend logs:** Browser DevTools Console
- **Backend logs:** Terminal chạy `npm run server`

## Cấu trúc thư mục

```
ytdownload/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   └── YouTubeDownloader.tsx
│   ├── lib/
│   │   ├── utils.ts      # Utility functions
│   │   └── download-utils.ts
│   └── App.tsx
├── server/
│   ├── index.js          # Express backend
│   └── package.json
├── .env                  # Environment variables
├── vite.config.ts       # Vite config với proxy
└── package.json
```

## Bảo mật

- API key được lưu trong .env (không commit vào git)
- Proxy download tránh expose API key ra client
- CORS được cấu hình đúng cách

## Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra logs trong console/terminal
2. Đảm bảo RapidAPI key đúng và có quyền
3. Kiểm tra network connection
4. Thử với video YouTube khác

---

**Lưu ý:** Chỉ tải xuống nội dung bạn có quyền sử dụng và tuân thủ Terms of Service của YouTube.


