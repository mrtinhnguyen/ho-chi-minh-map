# Hướng dẫn Deploy lên Vercel

## Cách 1: Deploy qua Vercel CLI (Khuyến nghị)

### Bước 1: Cài đặt Vercel CLI

```bash
npm i -g vercel
```

### Bước 2: Đăng nhập vào Vercel

```bash
vercel login
```

### Bước 3: Deploy

```bash
# Deploy lần đầu (sẽ hỏi một số câu hỏi)
vercel

# Deploy production
vercel --prod
```

## Cách 2: Deploy qua GitHub (Tự động)

### Bước 1: Đẩy code lên GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/ho-chi-minh-map.git
git push -u origin main
```

### Bước 2: Kết nối với Vercel

1. Truy cập [vercel.com](https://vercel.com)
2. Đăng nhập bằng GitHub
3. Click **"New Project"**
4. Import repository `ho-chi-minh-map`
5. Vercel sẽ tự động detect cấu hình:
   - **Framework Preset**: Other
   - **Build Command**: (để trống)
   - **Output Directory**: (để trống)
   - **Install Command**: (để trống)
6. Click **"Deploy"**

### Bước 3: Cấu hình tự động deploy

Sau khi deploy lần đầu, mỗi khi bạn push code lên GitHub, Vercel sẽ tự động deploy lại.

## Cách 3: Deploy qua Vercel Dashboard

1. Truy cập [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Upload thư mục dự án hoặc kéo thả
4. Vercel sẽ tự động detect và deploy

## Kiểm tra sau khi deploy

Sau khi deploy thành công, bạn sẽ nhận được một URL như:
- `https://ho-chi-minh-map.vercel.app`
- Hoặc custom domain nếu bạn đã cấu hình

### Kiểm tra các tính năng:

- ✅ Bản đồ hiển thị đúng
- ✅ Dữ liệu JSON load được
- ✅ Timeline hoạt động
- ✅ Popup event hiển thị đúng
- ✅ Responsive trên mobile

## Cấu hình Custom Domain

1. Vào project settings trên Vercel
2. Chọn **"Domains"**
3. Thêm domain của bạn
4. Cấu hình DNS theo hướng dẫn của Vercel

## Troubleshooting

### Lỗi CORS
- File `vercel.json` đã được cấu hình với headers CORS phù hợp
- Nếu vẫn gặp lỗi, kiểm tra lại cấu hình headers trong `vercel.json`

### Dữ liệu không load
- Kiểm tra đường dẫn file JSON trong code
- Đảm bảo file `data/hochiminh_events.json` và `data/global_regions_coordinates.json` có trong repository

### Bản đồ không hiển thị
- Kiểm tra cấu hình `MAP_TYPE` trong `assets/js/app.js`
- Nếu dùng Google Maps, đảm bảo `GOOGLE_MAPS_METHOD` được set đúng

## Lưu ý

- Vercel sẽ tự động detect static site và không cần build command
- File `vercel.json` đã được cấu hình sẵn với headers và routing phù hợp
- Tất cả file trong thư mục sẽ được serve như static files

