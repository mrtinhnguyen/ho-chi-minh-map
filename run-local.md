# Hướng dẫn chạy dự án local

## Cách 1: Sử dụng Python (Khuyến nghị)

### Python 3.x
```bash
# Di chuyển vào thư mục dự án
cd ho-chi-minh-map

# Chạy server đơn giản
python -m http.server 8000
```

Hoặc với Python 2.x:
```bash
python -m SimpleHTTPServer 8000
```

Sau đó mở trình duyệt và truy cập: **http://localhost:8000**

---

## Cách 2: Sử dụng Node.js (nếu đã cài Node.js)

### Cài đặt http-server (chỉ cần cài một lần)
```bash
npm install -g http-server
```

### Chạy server
```bash
# Di chuyển vào thư mục dự án
cd ho-chi-minh-map

# Chạy server
http-server -p 8000
```

Sau đó mở trình duyệt và truy cập: **http://localhost:8000**

---

## Cách 3: Sử dụng VS Code Live Server

1. Cài đặt extension **Live Server** trong VS Code
2. Click chuột phải vào file `index.html`
3. Chọn **"Open with Live Server"**

---

## Cách 4: Sử dụng PHP (nếu đã cài PHP)

```bash
# Di chuyển vào thư mục dự án
cd ho-chi-minh-map

# Chạy server
php -S localhost:8000
```

---

## Lưu ý quan trọng

⚠️ **KHÔNG mở trực tiếp file `index.html`** bằng cách double-click vì:
- Trình duyệt sẽ chặn việc load file JSON do chính sách CORS
- Các tính năng fetch API sẽ không hoạt động

✅ **Luôn sử dụng một local server** để tránh lỗi CORS

---

## Kiểm tra

Sau khi chạy server, bạn sẽ thấy:
- Bản đồ Leaflet hiển thị
- Dữ liệu sự kiện được load từ `data/hochiminh_events.json`
- Có thể tương tác với timeline và bản đồ

---

## Troubleshooting

### Lỗi CORS
- Đảm bảo bạn đang sử dụng local server, không mở trực tiếp file HTML

### Port đã được sử dụng
- Thay đổi port khác: `python -m http.server 8080` hoặc `http-server -p 8080`

### Không thấy dữ liệu
- Kiểm tra console trình duyệt (F12) để xem lỗi
- Đảm bảo file `data/hochiminh_events.json` tồn tại

