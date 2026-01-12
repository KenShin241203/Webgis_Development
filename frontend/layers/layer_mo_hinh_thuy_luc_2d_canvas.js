// ===== LAYER: MÔ HÌNH THỦY LỰC 2D - CANVAS VERSION ===== //
// Layer hiển thị mô hình thủy lực 2D bằng Canvas với IDW interpolation và vector arrows

// ===== CUSTOM CANVAS LAYER CLASS ===== //
/**
 * Custom Canvas Layer cho Leaflet
 * Kế thừa từ L.Layer để tạo layer vẽ trực tiếp lên Canvas
 */
L.CanvasHydroLayer = L.Layer.extend({
    /**
     * Khởi tạo layer
     * @param {Object} options - Các tùy chọn
     * @param {number} options.opacity - Độ trong suốt (0-1)
     * @param {number} options.gridResolution - Độ phân giải grid cho IDW (pixels)
     * @param {number} options.idwPower - Hệ số power cho IDW (mặc định 2)
     * @param {number} options.idwRadius - Bán kính tìm kiếm điểm gần nhất (pixels, mặc định 100)
     * @param {number} options.arrowScale - Tỷ lệ độ dài mũi tên (mặc định 50)
     * @param {number} options.arrowSpacing - Khoảng cách giữa các mũi tên (pixels, mặc định 30)
     * @param {number} options.maxNearestPoints - Số lượng điểm tối đa sử dụng cho IDW (mặc định 20)
     */
    initialize: function (options) {
        L.setOptions(this, options);
        this._canvas = null;
        this._data = []; // Dữ liệu hydro hiện tại đang hiển thị {lat, lng, total_depth, u, v, direction, speed}
        this._dataByTime = {}; // Dữ liệu hydro được group theo thời gian {timeString: [data...]}
        this._timeKeys = []; // Danh sách các thời gian đã sắp xếp
        this._currentTimeIndex = 0; // Index thời gian hiện tại đang hiển thị
        this._isAnimating = false; // Trạng thái animation
        this._animationInterval = null; // Interval cho animation
        this._animationSpeed = options.animationSpeed || 500; // Tốc độ animation (ms per frame)
        this._gridData = null; // Dữ liệu grid sau IDW interpolation
        this._bounds = null; // Bounds của dữ liệu
        this._resetTimeout = null; // Timeout cho debounce
        this._drawFrame = null; // Animation frame cho drawing
    },

    /**
     * Được gọi khi layer được thêm vào map
     */
    onAdd: function (map) {
        this._map = map;

        // Tạo canvas element
        if (!this._canvas) {
            this._canvas = L.DomUtil.create('canvas', 'leaflet-canvas-layer');
            this._canvas.style.position = 'absolute';
        }

        // Thiết lập kích thước canvas
        this._updateCanvasSize();

        // Thêm canvas vào pane
        this.getPane().appendChild(this._canvas);

        // Lắng nghe events
        map.on('viewreset', this._reset, this);
        map.on('move', this._reset, this);
        map.on('moveend', this._reset, this);
        map.on('zoomend', this._reset, this);

        // Vẽ lại khi map thay đổi
        map.whenReady(() => {
            this._reset();
        });
    },

    /**
     * Được gọi khi layer được xóa khỏi map
     */
    onRemove: function (map) {
        // Dừng animation
        this.stopAnimation();

        // Clear timers và animation frames
        if (this._resetTimeout) {
            clearTimeout(this._resetTimeout);
            this._resetTimeout = null;
        }
        if (this._drawFrame) {
            cancelAnimationFrame(this._drawFrame);
            this._drawFrame = null;
        }

        // Xóa canvas khỏi DOM
        if (this._canvas && this._canvas.parentNode) {
            this._canvas.parentNode.removeChild(this._canvas);
        }

        // Bỏ lắng nghe events
        map.off('viewreset', this._reset, this);
        map.off('move', this._reset, this);
        map.off('moveend', this._reset, this);
        map.off('zoomend', this._reset, this);
    },

    /**
     * Lấy pane để vẽ canvas
     */
    getPane: function () {
        return this._map.getPane(this.options.pane || 'overlayPane');
    },

    /**
     * Cập nhật kích thước canvas theo kích thước map
     */
    _updateCanvasSize: function () {
        const size = this._map.getSize();
        const pixelRatio = window.devicePixelRatio || 1;

        // Thiết lập kích thước canvas với pixel ratio để hiển thị sắc nét
        this._canvas.width = size.x * pixelRatio;
        this._canvas.height = size.y * pixelRatio;
        this._canvas.style.width = size.x + 'px';
        this._canvas.style.height = size.y + 'px';

        const ctx = this._canvas.getContext('2d');
        ctx.scale(pixelRatio, pixelRatio);
    },

    /**
     * Reset và vẽ lại canvas (với debounce)
     */
    _reset: function () {
        if (!this._map) return;

        // Debounce để tránh vẽ lại quá nhiều khi map đang move/zoom
        if (this._resetTimeout) {
            clearTimeout(this._resetTimeout);
        }

        this._resetTimeout = setTimeout(() => {
            this._updateCanvasSize();

            // Sử dụng requestAnimationFrame để vẽ mượt hơn
            if (this._drawFrame) {
                cancelAnimationFrame(this._drawFrame);
            }

            this._drawFrame = requestAnimationFrame(() => {
                this._draw();
            });
        }, 100); // Debounce 100ms
    },

    /**
     * Vẽ canvas
     */
    _draw: function () {
        if (!this._canvas || !this._map || this._data.length === 0) {
            return;
        }

        const ctx = this._canvas.getContext('2d');
        const size = this._map.getSize();

        // Xóa canvas
        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

        // Tính toán bounds hiện tại của viewport
        const bounds = this._map.getBounds();
        const nw = bounds.getNorthWest();
        const se = bounds.getSouthEast();

        // Lọc dữ liệu trong bounds
        let visibleData = this._data.filter(point => {
            return point.lat >= se.lat && point.lat <= nw.lat &&
                point.lng >= nw.lng && point.lng <= se.lng;
        });

        if (visibleData.length === 0) return;

        // Sampling: Nếu có quá nhiều điểm trong viewport, giảm số điểm bằng cách lấy mẫu
        // Giới hạn tối đa 10000 điểm trong viewport để tránh lag
        const maxVisiblePoints = 10000;
        if (visibleData.length > maxVisiblePoints) {
            const step = Math.ceil(visibleData.length / maxVisiblePoints);
            visibleData = visibleData.filter((point, index) => index % step === 0);
            console.log(`🔽 Sampling: Giảm từ ${this._data.length} xuống ${visibleData.length} điểm trong viewport`);
        }

        // Vẽ IDW interpolation cho độ sâu
        this._drawIDWInterpolation(ctx, visibleData, size, bounds);

        // Vẽ vector arrows
        this._drawVectorArrows(ctx, visibleData, size, bounds);
    },

    /**
     * Vẽ IDW interpolation cho độ sâu (tạo gradient màu) - TỐI ƯU HÓA
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} data - Dữ liệu điểm
     * @param {L.Point} size - Kích thước map
     * @param {L.LatLngBounds} bounds - Bounds của viewport
     */
    _drawIDWInterpolation: function (ctx, data, size, bounds) {
        const idwPower = this.options.idwPower || 2;
        const idwRadius = this.options.idwRadius || 100; // pixels
        const maxNearestPoints = this.options.maxNearestPoints || 20; // Giới hạn số điểm gần nhất

        // Grid resolution động theo zoom level - zoom càng cao, resolution càng nhỏ
        const zoom = this._map.getZoom();
        let gridResolution = this.options.gridResolution || 5;
        if (zoom < 10) {
            gridResolution = 15; // Zoom xa: resolution lớn hơn
        } else if (zoom < 13) {
            gridResolution = 8; // Zoom trung bình
        } else {
            gridResolution = 5; // Zoom gần: resolution nhỏ
        }

        // Tính toán grid
        const gridCols = Math.ceil(size.x / gridResolution);
        const gridRows = Math.ceil(size.y / gridResolution);

        // Chuyển đổi dữ liệu sang pixel coordinates một lần
        const pixelData = data.map(point => {
            const pixel = this._map.latLngToContainerPoint([point.lat, point.lng]);
            return {
                x: pixel.x,
                y: pixel.y,
                value: point.total_depth || 0
            };
        });

        if (pixelData.length === 0) return;

        // Tạo spatial index đơn giản bằng grid hash để tìm điểm gần nhất nhanh hơn
        const cellSize = idwRadius;
        const spatialGrid = {};

        pixelData.forEach((point, idx) => {
            const cellX = Math.floor(point.x / cellSize);
            const cellY = Math.floor(point.y / cellSize);
            const key = `${cellX},${cellY}`;

            if (!spatialGrid[key]) {
                spatialGrid[key] = [];
            }
            spatialGrid[key].push({ point, idx });
        });

        // Batch vẽ để tối ưu - sử dụng fillStyle và fillRect nhưng batch theo màu
        ctx.save();

        let currentColor = null;
        let batches = [];

        // Vẽ từng pixel của grid
        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
                const gridX = col * gridResolution;
                const gridY = row * gridResolution;

                // Tìm các điểm gần nhất sử dụng spatial grid
                const cellX = Math.floor(gridX / cellSize);
                const cellY = Math.floor(gridY / cellSize);
                const nearbyPoints = [];

                // Kiểm tra các cell lân cận (3x3 cells)
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const key = `${cellX + dx},${cellY + dy}`;
                        if (spatialGrid[key]) {
                            spatialGrid[key].forEach(({ point }) => {
                                const distance = Math.sqrt(
                                    Math.pow(gridX - point.x, 2) + Math.pow(gridY - point.y, 2)
                                );
                                if (distance < idwRadius && distance > 0) {
                                    nearbyPoints.push({ point, distance });
                                }
                            });
                        }
                    }
                }

                // Fallback: nếu không tìm thấy điểm trong spatial grid, tìm trong tất cả điểm
                // (trường hợp edge case khi spatial grid không cover được)
                if (nearbyPoints.length === 0) {
                    pixelData.forEach(point => {
                        const distance = Math.sqrt(
                            Math.pow(gridX - point.x, 2) + Math.pow(gridY - point.y, 2)
                        );
                        if (distance < idwRadius && distance > 0) {
                            nearbyPoints.push({ point, distance });
                        }
                    });
                }

                // Sắp xếp theo khoảng cách và chỉ lấy maxNearestPoints điểm gần nhất
                if (nearbyPoints.length > 0) {
                    nearbyPoints.sort((a, b) => a.distance - b.distance);
                    const nearestPoints = nearbyPoints.slice(0, maxNearestPoints);

                    // Tính IDW value tại điểm này
                    let numerator = 0;
                    let denominator = 0;

                    for (const { point, distance } of nearestPoints) {
                        const weight = 1 / Math.pow(distance, idwPower);
                        numerator += weight * point.value;
                        denominator += weight;
                    }

                    if (denominator > 0) {
                        const interpolatedValue = numerator / denominator;
                        const color = this._getColorByDepth(interpolatedValue);

                        // Batch vẽ theo màu để tối ưu
                        batches.push({
                            color: color,
                            rects: [{
                                x: gridX,
                                y: gridY,
                                width: gridResolution,
                                height: gridResolution
                            }]
                        });
                    }
                }
            }
        }

        // Vẽ batch theo màu để giảm số lần thay đổi fillStyle
        const colorGroups = {};
        batches.forEach(batch => {
            if (!colorGroups[batch.color]) {
                colorGroups[batch.color] = [];
            }
            colorGroups[batch.color].push(...batch.rects);
        });

        // Vẽ từng nhóm màu
        Object.keys(colorGroups).forEach(color => {
            ctx.fillStyle = color;
            colorGroups[color].forEach(rect => {
                ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
            });
        });

        ctx.restore();
    },

    /**
     * Vẽ vector arrows (mũi tên dòng chảy) - TỐI ƯU HÓA
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} data - Dữ liệu điểm
     * @param {L.Point} size - Kích thước map
     * @param {L.LatLngBounds} bounds - Bounds của viewport
     */
    _drawVectorArrows: function (ctx, data, size, bounds) {
        const arrowScale = this.options.arrowScale || 50;

        // Arrow spacing động theo zoom level
        const zoom = this._map.getZoom();
        let arrowSpacing = this.options.arrowSpacing || 30;
        if (zoom < 10) {
            arrowSpacing = 60; // Zoom xa: spacing lớn hơn
        } else if (zoom < 13) {
            arrowSpacing = 40; // Zoom trung bình
        } else {
            arrowSpacing = 30; // Zoom gần: spacing nhỏ
        }

        // Chuyển đổi dữ liệu sang pixel coordinates một lần và tạo spatial index
        const pixelData = data.map(point => {
            const pixel = this._map.latLngToContainerPoint([point.lat, point.lng]);
            return {
                ...point,
                pixelX: pixel.x,
                pixelY: pixel.y
            };
        });

        if (pixelData.length === 0) return;

        // Tạo spatial index cho arrows
        const cellSize = arrowSpacing * 1.5;
        const spatialGrid = {};

        pixelData.forEach((point, idx) => {
            const cellX = Math.floor(point.pixelX / cellSize);
            const cellY = Math.floor(point.pixelY / cellSize);
            const key = `${cellX},${cellY}`;

            if (!spatialGrid[key]) {
                spatialGrid[key] = [];
            }
            spatialGrid[key].push({ point, idx });
        });

        // Tạo grid để vẽ arrows với khoảng cách đều
        const gridCols = Math.ceil(size.x / arrowSpacing);
        const gridRows = Math.ceil(size.y / arrowSpacing);

        // Batch vẽ arrows để tối ưu
        ctx.save();

        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
                const gridX = col * arrowSpacing;
                const gridY = row * arrowSpacing;

                // Tìm điểm gần nhất sử dụng spatial grid
                const cellX = Math.floor(gridX / cellSize);
                const cellY = Math.floor(gridY / cellSize);
                let nearestPoint = null;
                let minDistance = Infinity;

                // Kiểm tra cell hiện tại và các cell lân cận
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const key = `${cellX + dx},${cellY + dy}`;
                        if (spatialGrid[key]) {
                            spatialGrid[key].forEach(({ point }) => {
                                const distance = Math.sqrt(
                                    Math.pow(gridX - point.pixelX, 2) + Math.pow(gridY - point.pixelY, 2)
                                );
                                if (distance < minDistance && distance < arrowSpacing * 1.5) {
                                    minDistance = distance;
                                    nearestPoint = point;
                                }
                            });
                        }
                    }
                }

                // Fallback nếu không tìm thấy trong spatial grid
                if (!nearestPoint) {
                    for (const point of pixelData) {
                        const distance = Math.sqrt(
                            Math.pow(gridX - point.pixelX, 2) + Math.pow(gridY - point.pixelY, 2)
                        );
                        if (distance < minDistance && distance < arrowSpacing * 1.5) {
                            minDistance = distance;
                            nearestPoint = point;
                        }
                    }
                }

                // Vẽ arrow nếu có điểm gần nhất
                if (nearestPoint && nearestPoint.direction != null && nearestPoint.speed > 0) {
                    this._drawArrow(ctx, gridX, gridY, nearestPoint.direction, nearestPoint.speed, arrowScale);
                }
            }
        }

        ctx.restore();
    },

    /**
     * Vẽ một mũi tên đơn lẻ
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - Tọa độ x (pixel)
     * @param {number} y - Tọa độ y (pixel)
     * @param {number} direction - Hướng (độ, 0-360)
     * @param {number} speed - Tốc độ (m/s)
     * @param {number} scale - Tỷ lệ độ dài
     */
    _drawArrow: function (ctx, x, y, direction, speed, scale) {
        // Chuyển đổi hướng từ độ sang radian
        const angleRad = (direction - 90) * Math.PI / 180; // Trừ 90 vì 0 độ là hướng Bắc

        // Tính độ dài mũi tên dựa trên tốc độ
        const arrowLength = Math.max(5, Math.min(50, speed * scale));

        // Tính tọa độ điểm cuối
        const endX = x + arrowLength * Math.cos(angleRad);
        const endY = y + arrowLength * Math.sin(angleRad);

        // Vẽ đường thẳng chính
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = this._getColorBySpeed(speed);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Vẽ đầu mũi tên (tam giác)
        const arrowHeadLength = arrowLength * 0.2;
        const arrowHeadAngle = Math.PI / 6; // 30 độ

        const angle1 = angleRad + Math.PI - arrowHeadAngle;
        const angle2 = angleRad + Math.PI + arrowHeadAngle;

        const head1X = endX + arrowHeadLength * Math.cos(angle1);
        const head1Y = endY + arrowHeadLength * Math.sin(angle1);
        const head2X = endX + arrowHeadLength * Math.cos(angle2);
        const head2Y = endY + arrowHeadLength * Math.sin(angle2);

        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(head1X, head1Y);
        ctx.lineTo(head2X, head2Y);
        ctx.closePath();
        ctx.fillStyle = this._getColorBySpeed(speed);
        ctx.fill();
    },

    /**
     * Lấy màu sắc dựa trên độ sâu nước (total_depth)
     * @param {number} totalDepth - Độ sâu tổng (m)
     * @returns {string} Màu hex
     */
    _getColorByDepth: function (totalDepth) {
        if (totalDepth == null || totalDepth <= 0) {
            return 'rgba(224, 224, 224, 0.3)'; // Màu xám trong suốt cho vùng không có nước
        }

        // Phân loại màu theo độ sâu
        if (totalDepth >= 5.0) {
            return 'rgba(0, 0, 128, 0.6)'; // Xanh đậm - rất sâu
        } else if (totalDepth >= 3.0) {
            return 'rgba(0, 0, 255, 0.6)'; // Xanh dương - sâu
        } else if (totalDepth >= 2.0) {
            return 'rgba(0, 102, 255, 0.6)'; // Xanh nhạt - trung bình
        } else if (totalDepth >= 1.0) {
            return 'rgba(0, 204, 255, 0.6)'; // Xanh cyan - nông
        } else if (totalDepth >= 0.5) {
            return 'rgba(102, 255, 255, 0.6)'; // Xanh nhạt - rất nông
        } else {
            return 'rgba(204, 255, 255, 0.5)'; // Xanh rất nhạt - cực nông
        }
    },

    /**
     * Lấy màu sắc cho mũi tên dựa trên tốc độ dòng chảy
     * @param {number} speed - Tốc độ (m/s)
     * @returns {string} Màu hex
     */
    _getColorBySpeed: function (speed) {
        if (speed >= 2.0) {
            return '#ff0000'; // Đỏ - rất nhanh
        } else if (speed >= 1.0) {
            return '#ff6600'; // Cam đậm - nhanh
        } else if (speed >= 0.5) {
            return '#ffaa00'; // Cam nhạt - trung bình
        } else if (speed >= 0.2) {
            return '#ffcc00'; // Vàng - chậm
        } else {
            return '#0066cc'; // Xanh - rất chậm
        }
    },

    /**
     * Chuyển đổi màu hex/rgba sang object RGBA
     * @param {string} color - Màu hex hoặc rgba string
     * @returns {Object} {r, g, b, a}
     */
    _hexToRgba: function (color) {
        // Nếu là rgba string
        if (color.startsWith('rgba')) {
            const matches = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (matches) {
                return {
                    r: parseInt(matches[1]),
                    g: parseInt(matches[2]),
                    b: parseInt(matches[3]),
                    a: matches[4] ? parseFloat(matches[4]) : 1
                };
            }
        }
        // Nếu là hex
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return { r, g, b, a: 1 };
        }
        // Default
        return { r: 255, g: 255, b: 255, a: 1 };
    },

    /**
     * Set dữ liệu và vẽ lại
     * @param {Array} data - Dữ liệu hydro [{lat, lng, total_depth, u, v, direction, speed, time}, ...]
     * @param {boolean} autoAnimate - Tự động bắt đầu animation (mặc định true)
     */
    setData: function (data, autoAnimate = true) {
        // Group data theo thời gian nếu có field time
        if (data && data.length > 0 && data[0].time) {
            this._dataByTime = {};
            this._timeKeys = [];

            // Group data theo time
            data.forEach(item => {
                if (item.time) {
                    const timeKey = new Date(item.time).toISOString();
                    if (!this._dataByTime[timeKey]) {
                        this._dataByTime[timeKey] = [];
                        this._timeKeys.push(timeKey);
                    }
                    this._dataByTime[timeKey].push(item);
                }
            });

            // Sắp xếp timeKeys theo thời gian
            this._timeKeys.sort();

            console.log(`📊 Đã group ${data.length} điểm thành ${this._timeKeys.length} frame theo thời gian`);

            // Reset về frame đầu tiên
            this._currentTimeIndex = 0;

            // Set data cho frame đầu tiên
            if (this._timeKeys.length > 0) {
                this._data = this._dataByTime[this._timeKeys[0]] || [];
            } else {
                this._data = data || [];
            }

            // Tự động bắt đầu animation nếu có nhiều hơn 1 frame
            if (autoAnimate && this._timeKeys.length > 1) {
                this.startAnimation();
            }
        } else {
            // Nếu không có time, dùng như cũ
            this._data = data || [];
            this._dataByTime = {};
            this._timeKeys = [];
            this._currentTimeIndex = 0;
            this.stopAnimation();
        }

        if (this._map && this._canvas) {
            // Cập nhật kích thước canvas trước khi vẽ
            this._updateCanvasSize();

            // Sử dụng requestAnimationFrame để vẽ mượt hơn
            if (this._drawFrame) {
                cancelAnimationFrame(this._drawFrame);
            }

            this._drawFrame = requestAnimationFrame(() => {
                this._draw();
            });
        }
    },

    /**
     * Bắt đầu animation tự động
     */
    startAnimation: function () {
        if (this._timeKeys.length <= 1) {
            console.warn('⚠️ Không đủ frame để animation');
            return;
        }

        if (this._isAnimating) {
            console.log('⏸️ Animation đã đang chạy');
            return;
        }

        this._isAnimating = true;
        console.log(`▶️ Bắt đầu animation: ${this._timeKeys.length} frames, tốc độ ${this._animationSpeed}ms/frame`);

        const self = this;
        this._animationInterval = setInterval(() => {
            // Chuyển sang frame tiếp theo
            self._currentTimeIndex = (self._currentTimeIndex + 1) % self._timeKeys.length;

            // Cập nhật data cho frame hiện tại
            const currentTimeKey = self._timeKeys[self._currentTimeIndex];
            self._data = self._dataByTime[currentTimeKey] || [];

            // Vẽ lại
            if (self._map && self._canvas) {
                if (self._drawFrame) {
                    cancelAnimationFrame(self._drawFrame);
                }
                self._drawFrame = requestAnimationFrame(() => {
                    self._draw();
                });
            }

            // Log mỗi 10 frame để không spam console
            if (self._currentTimeIndex % 10 === 0) {
                const currentTime = new Date(currentTimeKey);
                console.log(`🎬 Frame ${self._currentTimeIndex + 1}/${self._timeKeys.length}: ${currentTime.toLocaleString('vi-VN')}`);
            }
        }, this._animationSpeed);
    },

    /**
     * Dừng animation
     */
    stopAnimation: function () {
        if (this._animationInterval) {
            clearInterval(this._animationInterval);
            this._animationInterval = null;
        }
        this._isAnimating = false;
        console.log('⏹️ Đã dừng animation');
    },

    /**
     * Tạm dừng/tiếp tục animation
     */
    toggleAnimation: function () {
        if (this._isAnimating) {
            this.stopAnimation();
        } else {
            this.startAnimation();
        }
    },

    /**
     * Chuyển đến frame cụ thể
     * @param {number} index - Index của frame (0-based)
     */
    goToFrame: function (index) {
        if (index < 0 || index >= this._timeKeys.length) {
            console.warn(`⚠️ Frame index ${index} không hợp lệ (0-${this._timeKeys.length - 1})`);
            return;
        }

        this._currentTimeIndex = index;
        const currentTimeKey = this._timeKeys[this._currentTimeIndex];
        this._data = this._dataByTime[currentTimeKey] || [];

        // Vẽ lại
        if (this._map && this._canvas) {
            if (this._drawFrame) {
                cancelAnimationFrame(this._drawFrame);
            }
            this._drawFrame = requestAnimationFrame(() => {
                this._draw();
            });
        }
    },

    /**
     * Lấy thông tin animation hiện tại
     */
    getAnimationInfo: function () {
        return {
            isAnimating: this._isAnimating,
            currentFrame: this._currentTimeIndex + 1,
            totalFrames: this._timeKeys.length,
            currentTime: this._timeKeys[this._currentTimeIndex] ? new Date(this._timeKeys[this._currentTimeIndex]) : null,
            animationSpeed: this._animationSpeed
        };
    },

    /**
     * Clear dữ liệu
     */
    clearData: function () {
        this._data = [];
        this._dataByTime = {};
        this._timeKeys = [];
        this._currentTimeIndex = 0;
        this.stopAnimation();
        if (this._canvas) {
            const ctx = this._canvas.getContext('2d');
            ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        }
    }
});

// Factory function để tạo layer
L.canvasHydroLayer = function (options) {
    return new L.CanvasHydroLayer(options);
};

// ===== BIẾN TOÀN CỤC ===== //
let moHinhThuyLuc2DCanvasLayer = null;
let elementsCoordinatesCache2DCanvas = {};
let currentSelectedDateRangeCanvas = { startDate: null, endDate: null };
let availableTimesCanvas = [];
let isLoadingData = false;

// Export ra window object để main.js có thể truy cập
window.moHinhThuyLuc2DCanvasLayer = moHinhThuyLuc2DCanvasLayer;

// ===== HÀM TIỆN ÍCH ===== //

/**
 * Tính tốc độ dòng chảy từ vận tốc u và v
 * @param {number} u - Vận tốc theo trục x
 * @param {number} v - Vận tốc theo trục y
 * @returns {number} Tốc độ (m/s)
 */
function calculateSpeed2DCanvas(u, v) {
    if (u == null || v == null) return 0;
    return Math.sqrt(u * u + v * v);
}

/**
 * Tính hướng dòng chảy từ vận tốc u và v
 * @param {number} u - Vận tốc theo trục x
 * @param {number} v - Vận tốc theo trục y
 * @returns {number} Hướng (độ, 0-360)
 */
function calculateDirection2DCanvas(u, v) {
    if (u == null || v == null) return null;
    let angle = Math.atan2(v, u) * 180 / Math.PI;
    angle = (90 - angle + 360) % 360;
    return angle;
}

/**
 * Lấy tọa độ elements theo danh sách element_ids từ API
 * @param {Array<number>} elementIds - Danh sách element_ids cần lấy
 * @returns {Promise<Object>} Object chứa tọa độ (element_id -> {lat, lng})
 */
async function getElementsCoordinatesByIds2DCanvas(elementIds = []) {
    if (!Array.isArray(elementIds) || elementIds.length === 0) {
        return {};
    }

    // Validate và filter element_ids hợp lệ (chỉ số nguyên dương)
    const validElementIds = elementIds
        .map(id => {
            const numId = parseInt(id);
            return !isNaN(numId) && numId > 0 ? numId : null;
        })
        .filter(id => id !== null);

    if (validElementIds.length === 0) {
        console.warn('⚠️ Không có element_ids hợp lệ');
        return elementsCoordinatesCache2DCanvas;
    }

    // Lọc ra những element_ids chưa có trong cache
    const missingElementIds = validElementIds.filter(id => !elementsCoordinatesCache2DCanvas[id]);

    if (missingElementIds.length === 0) {
        console.log('📦 Tất cả elements đã có trong cache (2D Canvas)');
        return elementsCoordinatesCache2DCanvas;
    }

    // Fetch từ API theo batch (mỗi batch tối đa 1000 element_ids để tránh URL quá dài)
    const BATCH_SIZE = 1000;
    const batches = [];
    for (let i = 0; i < missingElementIds.length; i += BATCH_SIZE) {
        batches.push(missingElementIds.slice(i, i + BATCH_SIZE));
    }

    try {
        console.log(`🔄 Fetch ${missingElementIds.length} elements từ API (2D Canvas) - ${batches.length} batch(es)...`);
        const token = localStorage.getItem('access_token') || '';

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            const elementIdsStr = batch.join(',');

            const res = await fetch(`/api/elements/by-ids?element_ids=${elementIdsStr}`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            if (res.ok) {
                const json = await res.json();
                if (json.data && Array.isArray(json.data)) {
                    json.data.forEach(item => {
                        if (item.geometry && item.geometry.type === 'Point') {
                            const lng = item.geometry.coordinates[0];
                            const lat = item.geometry.coordinates[1];
                            elementsCoordinatesCache2DCanvas[item.element_id] = { lat, lng };
                        }
                    });
                    console.log(`✅ Batch ${batchIndex + 1}/${batches.length}: Đã cache ${json.data.length} elements`);
                }
            } else {
                console.warn(`⚠️ Batch ${batchIndex + 1} failed với status ${res.status}`);
            }
        }

        console.log(`✅ Đã cache tổng cộng ${Object.keys(elementsCoordinatesCache2DCanvas).length} tọa độ elements (2D Canvas)`);
    } catch (err) {
        console.error('Lỗi khi lấy tọa độ elements (2D Canvas):', err);
    }

    return elementsCoordinatesCache2DCanvas;
}

/**
 * Lấy danh sách các thời gian có sẵn từ API
 * @returns {Promise<Array>} Mảng các timestamp
 */
async function getAvailableTimesCanvas() {
    try {
        const token = localStorage.getItem('access_token') || '';
        const res = await fetch(`/api/hydro/times`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });

        if (res.status === 401) {
            throw new Error('401 Unauthorized: thiếu hoặc hết hạn token');
        }

        if (!res.ok) {
            const errorText = await res.text();
            let errorMessage = `Lỗi ${res.status} ${res.statusText} khi lấy danh sách thời gian`;
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error || errorJson.message) {
                    errorMessage += `: ${errorJson.error || errorJson.message}`;
                }
            } catch {
                errorMessage += `: ${errorText.substring(0, 200)}`;
            }
            throw new Error(errorMessage);
        }

        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const errorText = await res.text();
            throw new Error(`Server trả về không phải JSON. Content-Type: ${contentType}. Response: ${errorText.substring(0, 200)}`);
        }

        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
            console.log(`✅ Đã lấy ${json.data.length} thời gian có sẵn từ API (Canvas)`);
            return json.data;
        }

        console.warn('⚠️ Response không có data hoặc data không phải array:', json);
        return [];
    } catch (err) {
        console.error('Lỗi khi lấy danh sách thời gian (Canvas):', err);
        throw err;
    }
}

/**
 * Fetch dữ liệu hydro theo khoảng ngày
 * @param {string} startDateStr - Ngày bắt đầu dạng YYYY-MM-DD (null = không giới hạn)
 * @param {string} endDateStr - Ngày kết thúc dạng YYYY-MM-DD (null = không giới hạn)
 * @param {number} pageSize - (Không dùng nữa, giữ tham số cho backward compatibility)
 * @returns {Promise<Array>} Mảng dữ liệu hydro
 */
async function fetchHydroData(startDateStr = null, endDateStr = null, pageSize = 10000) {
    try {
        const token = localStorage.getItem('access_token') || '';

        // Chuyển dateStr thành start-end time
        let startTime = null;
        let endTime = null;

        if (startDateStr) {
            startTime = new Date(startDateStr);
            startTime.setHours(0, 0, 0, 0);
        }

        if (endDateStr) {
            endTime = new Date(endDateStr);
            endTime.setHours(23, 59, 59, 999);
        }

        // Nếu chỉ có startDate, set endDate = startDate (query 1 ngày)
        if (startDateStr && !endDateStr) {
            endTime = new Date(startDateStr);
            endTime.setHours(23, 59, 59, 999);
        }

        let url = `/api/hydro`;
        const params = [];
        if (startTime) {
            params.push(`startTime=${startTime.toISOString()}`);
        }
        if (endTime) {
            params.push(`endTime=${endTime.toISOString()}`);
        }
        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }

        const dateRangeStr = startDateStr && endDateStr
            ? `${startDateStr} đến ${endDateStr}`
            : startDateStr
                ? startDateStr
                : 'tất cả';
        console.log(`📡 Fetch hydro data theo khoảng ngày: ${dateRangeStr}`);

        // Thêm timeout để tránh đợi quá lâu
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 phút timeout

        try {
            const res = await fetch(url, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.status === 401) {
                throw new Error('401 Unauthorized: thiếu hoặc hết hạn token');
            }

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Lỗi ${res.status}: ${errorText.substring(0, 200)}`);
            }

            const json = await res.json();
            const data = json.data || [];

            const dateRangeStr = startDateStr && endDateStr
                ? `${startDateStr} đến ${endDateStr}`
                : startDateStr
                    ? startDateStr
                    : 'tất cả';
            console.log(`✅ Đã fetch ${data.length} điểm hydro cho khoảng ngày ${dateRangeStr}`);

            return data;
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('Request timeout: Query quá lâu, vui lòng thử lại');
            }
            throw fetchError;
        }
    } catch (err) {
        console.error('Lỗi khi fetch hydro data:', err);
        throw err;
    }
}

// ===== HÀM CHÍNH: FETCH VÀ HIỂN THỊ DỮ LIỆU ===== //

/**
 * Fetch và hiển thị dữ liệu mô hình thủy lực 2D bằng Canvas layer
 * @param {string} startDate - Ngày bắt đầu (YYYY-MM-DD) hoặc timestamp (backward compatibility)
 * @param {string|Object} endDateOrOptions - Ngày kết thúc (YYYY-MM-DD) hoặc options object
 * @param {Object} options - Các tùy chọn (nếu endDateOrOptions là string thì options sẽ là tham số thứ 3)
 * @param {number} options.pageSize - Số lượng phần tử mỗi lần fetch (mặc định 50000)
 * @param {number} options.gridResolution - Độ phân giải grid cho IDW (pixels, mặc định 5)
 * @param {number} options.idwPower - Hệ số power cho IDW (mặc định 2)
 * @param {number} options.idwRadius - Bán kính tìm kiếm điểm gần nhất (pixels, mặc định 100)
 * @param {number} options.arrowScale - Tỷ lệ độ dài mũi tên (mặc định 50)
 * @param {number} options.arrowSpacing - Khoảng cách giữa các mũi tên (pixels, mặc định 30)
 * @returns {Promise} Promise resolve khi hoàn thành
 */
async function fetchAndShowMoHinhThuyLuc2DCanvas(startDate = null, endDateOrOptions = null, options = {}) {
    // Xử lý backward compatibility: nếu endDateOrOptions là object thì đó là options
    let endDate = null;
    if (typeof endDateOrOptions === 'string') {
        endDate = endDateOrOptions;
    } else if (endDateOrOptions && typeof endDateOrOptions === 'object') {
        options = endDateOrOptions;
    }

    console.log('🌊 Bắt đầu fetch dữ liệu mô hình thủy lực 2D Canvas với khoảng ngày:', startDate, 'đến', endDate);

    // Tránh fetch đồng thời
    if (isLoadingData) {
        console.log('⏳ Đang load dữ liệu, bỏ qua request mới');
        return Promise.resolve();
    }

    isLoadingData = true;

    return new Promise(async (resolve, reject) => {
        try {
            // Kiểm tra map có tồn tại không
            if (typeof mymap === 'undefined' || !mymap) {
                throw new Error('Map chưa được khởi tạo');
            }

            // Hiển thị loading indicator
            if (typeof window.showLoadingIndicator === 'function') {
                window.showLoadingIndicator('Đang tải dữ liệu mô hình thủy lực 2D (Canvas)...');
            }

            // 1. Xác định khoảng ngày được chọn
            let selectedStartDate = startDate;
            let selectedEndDate = endDate;

            if (!selectedStartDate && !selectedEndDate) {
                // Nếu chưa chọn, mặc định hôm nay
                const today = new Date();
                const todayStr = today.toISOString().slice(0, 10);
                selectedStartDate = todayStr;
                selectedEndDate = todayStr;
            } else if (selectedStartDate && !selectedEndDate) {
                // Nếu chỉ có startDate, set endDate = startDate
                selectedEndDate = selectedStartDate;
            } else if (!selectedStartDate && selectedEndDate) {
                // Nếu chỉ có endDate, set startDate = endDate
                selectedStartDate = selectedEndDate;
            }

            // Lưu vào biến global
            currentSelectedDateRangeCanvas = { startDate: selectedStartDate, endDate: selectedEndDate };

            // 2. Tạo hoặc clear canvas layer
            if (!moHinhThuyLuc2DCanvasLayer) {
                console.log('🎨 Bước 2: Tạo Canvas layer...');
                moHinhThuyLuc2DCanvasLayer = L.canvasHydroLayer({
                    opacity: options.opacity || 0.7,
                    gridResolution: options.gridResolution || 5,
                    idwPower: options.idwPower || 2,
                    idwRadius: options.idwRadius || 100,
                    arrowScale: options.arrowScale || 50,
                    arrowSpacing: options.arrowSpacing || 30
                });
                moHinhThuyLuc2DCanvasLayer.addTo(mymap);
                window.moHinhThuyLuc2DCanvasLayer = moHinhThuyLuc2DCanvasLayer;
            } else {
                moHinhThuyLuc2DCanvasLayer.clearData();
            }

            // 3. Fetch dữ liệu hydro theo khoảng ngày TRƯỚC
            console.log('🌊 Bước 3: Fetch dữ liệu hydro theo khoảng ngày...');
            const allHydroData = await fetchHydroData(selectedStartDate, selectedEndDate);

            console.log(`✅ Đã fetch ${allHydroData.length} điểm hydro`);

            if (allHydroData.length === 0) {
                console.warn('⚠️ Không có dữ liệu hydro');
                if (typeof window.hideLoadingIndicator === 'function') {
                    window.hideLoadingIndicator();
                }
                isLoadingData = false;
                resolve();
                return;
            }

            // 4. Lấy danh sách unique element_ids từ hydro_data (chỉ lấy những element_id hợp lệ)
            console.log('📍 Bước 4: Lấy danh sách element_ids từ hydro_data...');
            const uniqueElementIds = [...new Set(
                allHydroData
                    .map(item => item.element_id)
                    .filter(id => id != null && !isNaN(id) && id > 0)
            )];
            console.log(`✅ Tìm thấy ${uniqueElementIds.length} element_ids duy nhất và hợp lệ trong hydro_data`);

            // 5. Chỉ fetch những elements cần thiết (theo danh sách element_ids)
            console.log('📍 Bước 5: Fetch tọa độ elements theo danh sách element_ids...');
            await getElementsCoordinatesByIds2DCanvas(uniqueElementIds);

            // 6. Chuyển đổi dữ liệu sang format cho Canvas layer
            console.log('🔄 Bước 6: Chuyển đổi dữ liệu...');
            const canvasData = [];

            for (const item of allHydroData) {
                const coords = elementsCoordinatesCache2DCanvas[item.element_id];

                if (!coords) {
                    continue; // Bỏ qua nếu không có tọa độ
                }

                const speed = item.speed != null
                    ? item.speed
                    : calculateSpeed2DCanvas(item.u, item.v);

                const direction = item.direction != null
                    ? item.direction
                    : calculateDirection2DCanvas(item.u, item.v);

                canvasData.push({
                    lat: coords.lat,
                    lng: coords.lng,
                    total_depth: item.total_depth || 0,
                    u: item.u || 0,
                    v: item.v || 0,
                    direction: direction,
                    speed: speed,
                    time: item.time // Giữ lại time để group theo thời gian cho animation
                });
            }

            console.log(`✅ Đã chuyển đổi ${canvasData.length} điểm dữ liệu`);

            // 7. Set dữ liệu vào Canvas layer (sẽ tự động vẽ và bắt đầu animation)
            console.log('🎨 Bước 7: Vẽ Canvas layer và bắt đầu animation...');
            moHinhThuyLuc2DCanvasLayer.setData(canvasData, true); // true = autoAnimate

            // Đảm bảo map được invalidate để trigger redraw
            if (mymap) {
                // Trigger một event nhỏ để đảm bảo layer được vẽ lại
                setTimeout(() => {
                    if (mymap && moHinhThuyLuc2DCanvasLayer) {
                        mymap.invalidateSize();
                        // Force redraw bằng cách trigger moveend event
                        mymap.fire('moveend');
                    }
                }, 100);
            }

            // Log thông tin animation
            const animInfo = moHinhThuyLuc2DCanvasLayer.getAnimationInfo();
            if (animInfo.totalFrames > 1) {
                console.log(`🎬 Animation: ${animInfo.totalFrames} frames, tốc độ ${animInfo.animationSpeed}ms/frame`);
            }

            // 8. Cập nhật slider nếu chưa được cập nhật
            if (availableTimesCanvas.length > 0) {
                updateTimeSlider2DCanvas();
            }

            // 9. Ẩn loading indicator
            if (typeof window.hideLoadingIndicator === 'function') {
                window.hideLoadingIndicator();
            }

            console.log('✅ Hoàn thành load dữ liệu mô hình thủy lực 2D Canvas');
            isLoadingData = false;
            resolve();
        } catch (err) {
            console.error('Lỗi khi fetch mô hình thủy lực 2D Canvas:', err);
            isLoadingData = false;
            if (typeof window.hideLoadingIndicator === 'function') {
                window.hideLoadingIndicator();
            }
            try {
                alert('Không tải được dữ liệu: ' + (err.message || err));
            } catch (_) { }
            reject(err);
        }
    });
}

/**
 * Khởi tạo/ cập nhật date picker
 */
function updateDatePicker2DCanvas(startDateStr = null, endDateStr = null) {
    const startDatePicker = document.getElementById('thuyLuc2DStartDatePickerCanvas');
    const endDatePicker = document.getElementById('thuyLuc2DEndDatePickerCanvas');
    const timeDisplay = document.getElementById('thuyLuc2DTimeDisplayCanvas');

    if (!startDatePicker || !endDatePicker || !timeDisplay) return;

    const todayStr = new Date().toISOString().slice(0, 10);

    // Lấy giá trị từ biến global hoặc tham số
    const startDate = startDateStr || currentSelectedDateRangeCanvas.startDate || todayStr;
    const endDate = endDateStr || currentSelectedDateRangeCanvas.endDate || todayStr;

    startDatePicker.value = startDate;
    endDatePicker.value = endDate;

    // Cập nhật min/max để đảm bảo endDate >= startDate
    startDatePicker.max = endDate;
    endDatePicker.min = startDate;

    // Hiển thị khoảng ngày
    if (startDate === endDate) {
        timeDisplay.textContent = new Date(startDate).toLocaleDateString('vi-VN');
    } else {
        timeDisplay.textContent = `${new Date(startDate).toLocaleDateString('vi-VN')} - ${new Date(endDate).toLocaleDateString('vi-VN')}`;
    }

    // Lưu vào biến global
    currentSelectedDateRangeCanvas = { startDate, endDate };
}

/**
 * Xử lý khi đổi khoảng ngày (chỉ cập nhật display, không fetch)
 */
function onDateChangeCanvas() {
    try {
        const startDatePicker = document.getElementById('thuyLuc2DStartDatePickerCanvas');
        const endDatePicker = document.getElementById('thuyLuc2DEndDatePickerCanvas');

        if (!startDatePicker || !endDatePicker) {
            console.warn('⚠️ Date picker không tìm thấy');
            return;
        }

        const startDate = startDatePicker.value;
        const endDate = endDatePicker.value;

        // Validate: endDate phải >= startDate
        if (startDate && endDate && endDate < startDate) {
            alert('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu!');
            // Reset endDate về startDate
            endDatePicker.value = startDate;
            return;
        }

        // Cập nhật min/max
        if (startDate) {
            endDatePicker.min = startDate;
        }
        if (endDate) {
            startDatePicker.max = endDate;
        }

        // Lưu vào biến global
        currentSelectedDateRangeCanvas = {
            startDate: startDate || null,
            endDate: endDate || null
        };

        // Cập nhật hiển thị
        const timeDisplay = document.getElementById('thuyLuc2DTimeDisplayCanvas');
        if (timeDisplay) {
            if (startDate && endDate) {
                if (startDate === endDate) {
                    timeDisplay.textContent = new Date(startDate).toLocaleDateString('vi-VN');
                } else {
                    timeDisplay.textContent = `${new Date(startDate).toLocaleDateString('vi-VN')} - ${new Date(endDate).toLocaleDateString('vi-VN')}`;
                }
            } else if (startDate) {
                timeDisplay.textContent = `Từ ${new Date(startDate).toLocaleDateString('vi-VN')}`;
            } else if (endDate) {
                timeDisplay.textContent = `Đến ${new Date(endDate).toLocaleDateString('vi-VN')}`;
            } else {
                timeDisplay.textContent = '--';
            }
        }
    } catch (err) {
        console.error('Lỗi khi xử lý date change:', err);
    }
}

/**
 * Xử lý khi click nút "Tìm kiếm" - fetch dữ liệu theo khoảng ngày đã chọn
 */
function onSearchHydroDataCanvas() {
    try {
        const startDatePicker = document.getElementById('thuyLuc2DStartDatePickerCanvas');
        const endDatePicker = document.getElementById('thuyLuc2DEndDatePickerCanvas');

        if (!startDatePicker || !endDatePicker) {
            console.warn('⚠️ Date picker không tìm thấy');
            return;
        }

        const startDate = startDatePicker.value;
        const endDate = endDatePicker.value;

        // Validate: phải có ít nhất 1 ngày được chọn
        if (!startDate && !endDate) {
            alert('Vui lòng chọn ít nhất một ngày!');
            return;
        }

        // Validate: endDate phải >= startDate
        if (startDate && endDate && endDate < startDate) {
            alert('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu!');
            return;
        }

        // Lưu vào biến global
        currentSelectedDateRangeCanvas = {
            startDate: startDate || null,
            endDate: endDate || null
        };

        // Fetch dữ liệu
        console.log(`🔍 Tìm kiếm dữ liệu cho khoảng ngày: ${startDate || '...'} đến ${endDate || '...'}`);
        fetchAndShowMoHinhThuyLuc2DCanvas(startDate, endDate).catch(err => {
            console.error('Lỗi khi fetch dữ liệu:', err);
            alert('Không thể tải dữ liệu: ' + (err.message || err));
        });
    } catch (err) {
        console.error('Lỗi khi xử lý search:', err);
        alert('Lỗi: ' + (err.message || err));
    }
}

/**
 * Hiển thị date picker
 */
function showTimeSlider2DCanvas() {
    const container = document.getElementById('thuyLuc2DTimeSliderContainerCanvas');
    if (container) {
        container.style.display = 'block';
    }
    updateDatePicker2DCanvas();
}

/**
 * Ẩn date picker
 */
function closeTimeSlider2DCanvas() {
    const container = document.getElementById('thuyLuc2DTimeSliderContainerCanvas');
    if (container) {
        container.style.display = 'none';
    }
}

/**
 * Xóa Canvas layer
 */
function removeMoHinhThuyLuc2DCanvasLayer() {
    if (moHinhThuyLuc2DCanvasLayer && mymap) {
        mymap.removeLayer(moHinhThuyLuc2DCanvasLayer);
        moHinhThuyLuc2DCanvasLayer = null;
        window.moHinhThuyLuc2DCanvasLayer = null;
    }
}

// Export functions ra window object
window.fetchAndShowMoHinhThuyLuc2DCanvas = fetchAndShowMoHinhThuyLuc2DCanvas;
window.onDateChangeCanvas = onDateChangeCanvas;
window.updateTimeSlider2DCanvas = updateDatePicker2DCanvas; // giữ tên cũ cho tương thích
window.showTimeSlider2DCanvas = showTimeSlider2DCanvas;
window.closeTimeSlider2DCanvas = closeTimeSlider2DCanvas;
window.stepTimeBackwardCanvas = stepTimeBackwardCanvas;
window.stepTimeForwardCanvas = stepTimeForwardCanvas;
window.removeMoHinhThuyLuc2DCanvasLayer = removeMoHinhThuyLuc2DCanvasLayer;
window.L = window.L || {}; // Đảm bảo L tồn tại
window.L.CanvasHydroLayer = L.CanvasHydroLayer;
window.L.canvasHydroLayer = L.canvasHydroLayer;

