# Hướng dẫn sử dụng Google Maps

Dự án này hỗ trợ cả OpenStreetMap và Google Maps. Bạn có thể dễ dàng chuyển đổi giữa hai loại bản đồ.

## Cách chuyển đổi loại bản đồ

Mở file `assets/js/app.js` và tìm các dòng cấu hình:

```javascript
const MAP_TYPE = 'google'; // 'openstreetmap' hoặc 'google'
const GOOGLE_MAPS_METHOD = 'googlemutant'; // 'googlemutant' hoặc 'custom'
const GOOGLE_MAPS_API_KEY = ''; // API key nếu dùng phương thức custom
```

### Cấu hình cơ bản:

**MAP_TYPE:**
- `'google'` - Sử dụng Google Maps
- `'openstreetmap'` - Sử dụng OpenStreetMap (mặc định)

**GOOGLE_MAPS_METHOD:**
- `'tiles'` - Sử dụng Google Maps tiles trực tiếp (không cần API key, đơn giản nhất) - **KHUYẾN NGHỊ**
- `'googlemutant'` - Sử dụng plugin GoogleMutant (không cần API key)
- `'custom'` - Sử dụng custom GridLayer (cần API key, nhiều tùy chọn hơn)

## Phương án 1: Sử dụng Google Maps Tiles trực tiếp (Không cần API key) - KHUYẾN NGHỊ

Đây là phương án đơn giản nhất và được khuyến nghị. Sử dụng Google Maps tile URL trực tiếp mà không cần plugin hay API key.

**Cấu hình:**
```javascript
const MAP_TYPE = 'google';
const GOOGLE_MAPS_METHOD = 'tiles';
const GOOGLE_MAPS_TYPE = 'm'; // 'm' = roadmap, 's' = satellite, 't' = terrain, 'y' = hybrid
```

**Ưu điểm:**
- Không cần API key
- Không cần plugin bổ sung
- Đơn giản và nhanh
- Hoạt động ổn định

**Các loại bản đồ có sẵn:**
- `'m'` - Roadmap (bản đồ đường phố) - Mặc định
- `'s'` - Satellite (ảnh vệ tinh)
- `'t'` - Terrain (bản đồ địa hình)
- `'y'` - Hybrid (kết hợp vệ tinh và đường phố)
- `'p'` - Terrain only (chỉ địa hình)

## Phương án 2: Sử dụng Google Maps với plugin GoogleMutant (Không cần API key)

Plugin `leaflet.gridlayer.googlemutant` sẽ tự động tải Google Maps tiles mà không cần API key.

**Ưu điểm:**
- Không cần đăng ký API key
- Miễn phí
- Dễ sử dụng

**Nhược điểm:**
- Có thể có giới hạn về số lượng request
- Không hỗ trợ đầy đủ các tính năng của Google Maps API

**Các loại bản đồ Google Maps có sẵn:**
- `'roadmap'` - Bản đồ đường phố (mặc định)
- `'satellite'` - Ảnh vệ tinh
- `'terrain'` - Bản đồ địa hình
- `'hybrid'` - Kết hợp vệ tinh và đường phố

Để thay đổi loại bản đồ, sửa trong `initMap()`:
```javascript
L.gridLayer.googleMutant({
  type: 'satellite', // Thay đổi ở đây
  maxZoom: 20,
}).addTo(map);
```

## Phương án 3: Sử dụng Custom GridLayer với Google Maps API (Cần API key)

Nếu bạn muốn sử dụng phương thức custom (dựa trên cách tiếp cận GridLayer), bạn cần:

1. **Tạo API Key:**
   - Truy cập [Google Cloud Console](https://console.cloud.google.com/)
   - Tạo dự án mới hoặc chọn dự án hiện có
   - Kích hoạt "Google Maps JavaScript API" và "Maps Static API"
   - Tạo API Key trong phần "Credentials"

2. **Cấu hình trong `app.js`:**
   ```javascript
   const GOOGLE_MAPS_METHOD = 'custom';
   const GOOGLE_MAPS_API_KEY = 'YOUR_API_KEY_HERE';
   ```

3. **Thêm Google Maps API vào HTML:**
   Thêm vào file `index.html` trong phần `<head>` hoặc trước thẻ đóng `</body>`:
   ```html
   <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY"></script>
   ```

4. **Lưu ý về chi phí:**
   - Google Maps API có thể phát sinh chi phí tùy theo số lượng request
   - Tham khảo [bảng giá Google Maps Platform](https://cloud.google.com/maps-platform/pricing)
   - Có gói miễn phí $200/tháng cho các request cơ bản
   - Phương thức custom sử dụng Static Maps API, có thể tốn nhiều request hơn

**Ưu điểm của phương thức custom:**
- Kiểm soát tốt hơn về cách lấy tiles
- Có thể tùy chỉnh nhiều hơn
- Phù hợp với các yêu cầu đặc biệt

**Nhược điểm:**
- Cần API key
- Có thể phát sinh chi phí
- Phức tạp hơn phương thức GoogleMutant

## Khắc phục sự cố

Nếu Google Maps không hiển thị:
1. Kiểm tra console trình duyệt để xem lỗi
2. Đảm bảo plugin GoogleMutant đã được tải (kiểm tra trong Network tab)
3. Nếu plugin không tải được, hệ thống sẽ tự động chuyển sang OpenStreetMap

## Tùy chỉnh thêm

Bạn có thể tùy chỉnh các tham số của Google Maps trong hàm `initMap()`:
- `maxZoom`: Mức zoom tối đa (mặc định: 20)
- `type`: Loại bản đồ ('roadmap', 'satellite', 'terrain', 'hybrid')

