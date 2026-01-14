# Các Phương Pháp Hiển Thị Dữ Liệu Thủy Động Lực Học

File này mô tả các phương pháp hiển thị dữ liệu thủy động lực học, so sánh ưu/nhược điểm và hướng dẫn sử dụng.

## 📊 So Sánh Các Phương Pháp

| Phương Pháp | Tốc Độ | Dữ Liệu Lớn | Trực Quan | Độ Phức Tạp | Khuyến Nghị |
|------------|--------|-------------|-----------|-------------|-------------|
| **1. Heatmap** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ | **Tốt nhất cho dữ liệu lớn** |
| **2. Circle Markers** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | Tốt cho dữ liệu < 10k điểm |
| **3. Marker Clustering** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | Tốt cho dữ liệu 10k-100k điểm |
| **4. WebGL** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Tốt nhất cho dữ liệu > 100k điểm |
| **5. Simple Canvas** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | Cân bằng tốc độ/chất lượng |

## 🚀 Cách Sử Dụng

### 1. Heatmap (Nhanh Nhất)

**Ưu điểm:**
- Rất nhanh, mượt với dữ liệu lớn
- Tự động interpolation, tạo gradient mượt
- Dễ sử dụng, ít code

**Nhược điểm:**
- Không hiển thị được vector arrows
- Khó customize chi tiết

**Cài đặt:**
```html
<script src="https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
```

**Sử dụng:**
```javascript
const heatLayer = showHydroDataWithHeatmap(canvasData);
heatLayer.addTo(mymap);
```

---

### 2. Circle Markers với Gradient (Đơn Giản, Trực Quan)

**Ưu điểm:**
- Đơn giản, dễ hiểu
- Có thể click để xem chi tiết
- Có thể hiển thị vector arrows
- Dễ customize

**Nhược điểm:**
- Với dữ liệu > 10k điểm có thể lag
- Cần sampling để tối ưu

**Sử dụng:**
```javascript
const markerLayer = showHydroDataWithCircleMarkers(canvasData, {
    maxPoints: 10000,      // Giới hạn số điểm
    radius: 3,            // Bán kính marker
    opacity: 0.8,         // Độ trong suốt
    showVectors: true,    // Hiển thị vector arrows
    colorBy: 'depth'      // 'depth' hoặc 'speed'
});
markerLayer.addTo(mymap);
```

---

### 3. Marker Clustering (Tối Ưu Cho Dữ Liệu Lớn)

**Ưu điểm:**
- Rất nhanh với dữ liệu lớn
- Tự động nhóm các điểm gần nhau
- Zoom in/out mượt
- Có thể click để xem chi tiết

**Nhược điểm:**
- Mất chi tiết khi zoom xa
- Không hiển thị được gradient liên tục

**Cài đặt:**
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js"></script>
```

**Sử dụng:**
```javascript
const clusterLayer = showHydroDataWithClustering(canvasData, {
    maxZoom: 15,
    radius: 80,
    colorBy: 'depth'
});
clusterLayer.addTo(mymap);
```

---

### 4. WebGL (Nhanh Nhất Cho Dữ Liệu Rất Lớn)

**Ưu điểm:**
- Cực kỳ nhanh, có thể render hàng triệu điểm
- Sử dụng GPU để tăng tốc
- Mượt mà với dữ liệu lớn

**Nhược điểm:**
- Phức tạp hơn, cần GPU support
- Cần cài đặt thêm library

**Cài đặt:**
```html
<script src="https://unpkg.com/leaflet.gl@0.0.1/dist/leaflet-gl.js"></script>
```

**Sử dụng:**
```javascript
const glLayer = showHydroDataWithWebGL(canvasData);
glLayer.addTo(mymap);
```

---

### 5. Simple Canvas Overlay (Cân Bằng)

**Ưu điểm:**
- Nhanh hơn canvas hiện tại (không có IDW phức tạp)
- Vẫn có thể vẽ gradient
- Dễ customize

**Nhược điểm:**
- Không mượt bằng heatmap
- Vẫn cần xử lý canvas

**Sử dụng:**
```javascript
const canvasLayer = showHydroDataWithSimpleCanvas(canvasData, {
    pointSize: 3,
    blur: 10,
    maxPoints: 50000
});
canvasLayer.addTo(mymap);
```

---

## 💡 Khuyến Nghị

### Cho dữ liệu < 5,000 điểm:
- **Circle Markers** - Trực quan nhất, có thể xem chi tiết từng điểm

### Cho dữ liệu 5,000 - 50,000 điểm:
- **Heatmap** - Nhanh nhất, gradient mượt
- **Marker Clustering** - Nếu cần xem chi tiết từng điểm

### Cho dữ liệu > 50,000 điểm:
- **Heatmap** - Tốt nhất cho hiển thị tổng quan
- **WebGL** - Nếu cần hiển thị tất cả điểm với tốc độ cao

### Kết hợp:
- **Heatmap** cho độ sâu (total_depth)
- **Circle Markers** với vectors cho tốc độ/hướng (với sampling)

---

## 🔧 Tích Hợp Vào Code Hiện Tại

Thêm vào `index.html`:
```html
<script src="layers/layer_mo_hinh_thuy_luc_2d_alternatives.js"></script>
```

Sử dụng trong `fetchAndShowMoHinhThuyLuc2DCanvas`:
```javascript
// Thay vì canvas layer phức tạp, dùng heatmap
const heatLayer = showHydroDataWithHeatmap(canvasData);
heatLayer.addTo(mymap);
```

---

## 📈 Performance Tips

1. **Sampling**: Luôn sampling dữ liệu nếu > 10k điểm
2. **Viewport Filtering**: Chỉ hiển thị điểm trong viewport
3. **Debounce**: Debounce khi map move/zoom
4. **Cache**: Cache dữ liệu đã xử lý
5. **Web Workers**: Xử lý dữ liệu trong Web Worker để không block UI

