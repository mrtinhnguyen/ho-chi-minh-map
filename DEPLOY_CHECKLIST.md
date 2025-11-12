# Checklist Deploy lên Vercel

## ✅ Kiểm tra trước khi deploy

### 1. File cấu hình
- [x] `vercel.json` đã được tạo với cấu hình phù hợp
- [x] `.gitignore` đã có (không commit file tạm)
- [x] `README.md` đã cập nhật

### 2. File cần thiết
- [x] `index.html` - File chính
- [x] `assets/css/style.css` - Stylesheet
- [x] `assets/js/app.js` - JavaScript chính
- [x] `data/hochiminh_events.json` - Dữ liệu sự kiện
- [x] `data/global_regions_coordinates.json` - Dữ liệu tọa độ

### 3. Kiểm tra code
- [x] Không có lỗi syntax trong JavaScript
- [x] Không có ký tự lạ (emoji encoding issues đã được fix)
- [x] Tất cả đường dẫn file đều relative (không dùng absolute path)

### 4. External resources
- [x] Leaflet.js từ CDN: `https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js`
- [x] Google Fonts: Noto Sans
- [x] Leaflet GoogleMutant plugin từ CDN
- [x] Leaflet Motion plugin từ CDN

### 5. Cấu hình bản đồ
- [x] `MAP_TYPE` được set trong `app.js` (mặc định: 'google')
- [x] `GOOGLE_MAPS_METHOD` được set (mặc định: 'tiles')
- [x] Fallback về OpenStreetMap nếu Google Maps fail

## 🚀 Các bước deploy

### Bước 1: Commit và push code lên GitHub
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Bước 2: Deploy lên Vercel

**Option A: Qua Vercel CLI**
```bash
npm i -g vercel
vercel login
vercel --prod
```

**Option B: Qua Vercel Dashboard**
1. Truy cập https://vercel.com
2. Import GitHub repository
3. Click Deploy

### Bước 3: Kiểm tra sau deploy

Sau khi deploy, kiểm tra:
- [ ] Website load được
- [ ] Bản đồ hiển thị đúng
- [ ] Dữ liệu JSON load được (không có lỗi CORS)
- [ ] Timeline hoạt động
- [ ] Popup event hiển thị đúng
- [ ] Responsive trên mobile
- [ ] Console không có lỗi

## 📝 Lưu ý quan trọng

1. **CORS**: File `vercel.json` đã được cấu hình với headers CORS phù hợp
2. **Caching**: Static assets được cache 1 năm, JSON data cache 1 giờ
3. **Routing**: Tất cả routes đều serve static files
4. **Build**: Không cần build command vì đây là static site

## 🔧 Troubleshooting

### Nếu gặp lỗi CORS
- Kiểm tra lại headers trong `vercel.json`
- Đảm bảo file JSON được serve với Content-Type đúng

### Nếu bản đồ không load
- Kiểm tra console browser để xem lỗi
- Kiểm tra cấu hình `MAP_TYPE` trong `app.js`
- Thử chuyển sang OpenStreetMap nếu Google Maps có vấn đề

### Nếu dữ liệu không load
- Kiểm tra đường dẫn file trong code
- Đảm bảo file JSON có trong repository
- Kiểm tra Network tab trong DevTools

## ✨ Sau khi deploy thành công

1. Cập nhật README.md với link Vercel
2. Cấu hình custom domain (nếu có)
3. Thiết lập auto-deploy từ GitHub (nếu deploy qua GitHub)

