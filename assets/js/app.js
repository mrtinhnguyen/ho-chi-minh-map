/*!
 * Hồ Chí Minh - Hành trình tìm đường cứu nước và giải phóng dân tộc - File script chính
 * Author: mrtinhnguyen
 * GitHub: https://github.com/mrtinhnguyen/ho-chi-minh-map
 */

// ==================== Biến toàn cục ====================
let map = null;
let regionsData = null;
let trajectoryData = null;
let currentEventIndex = 0;
let previousEventIndex = 0;
let isPlaying = false;
let playInterval = null;
let eventMarkers = [];
let pathLayers = [];
let coordinateMap = new Map();
let locationGroups = new Map();
let locationMarkers = new Map();
let statsHoverTimeout = null;
let currentPlaySpeed = 1000;
let isPanelVisible = true;
let isFeedbackModalVisible = false;
let isCameraFollowEnabled = true;
let isDragging = false;

let isPoetryAnimationPlaying = false;
let poetryAnimationTimeout = null;

let isMusicModalVisible = false;
let currentMusicIndex = 0;
let isMusicPlaying = false;
let musicAudio = null;
let musicProgressInterval = null;
let musicVolume = 0.06; // Volume mặc định 6%

// Thêm biến quản lý trạng thái âm thanh
let audioLoadingPromise = null;
let isAutoPlayPending = false;
let currentAudioEventListeners = new Set();

let highlightedPaths = [];
let highlightTimeout = null;
let currentHighlightedEventIndex = -1;

let eventPopupTimeout = null;
let eventPopupProgressInterval = null;
let eventPopupRemainingTime = 0;
let eventAudio = null; // Audio element cho event narration
let currentEventAudio = null; // Audio hiện tại đang phát
let currentPopupEventIndex = -1; // Event index hiện tại đang hiển thị trong popup
let userHasInteracted = false; // Đánh dấu user đã tương tác với trang (để phát audio)
let youtubePlayer = null; // YouTube player instance
const FINAL_EVENT_YOUTUBE_VIDEO = "https://www.youtube.com/watch?v=3WwUFLMCVtk"; // Video YouTube cho event cuối cùng

let animationConfig = {
  pathDuration: 3000, // Điều khiển tốc độ vẽ đường đi
  timelineDuration: 1500, // Thời lượng animation dòng thời gian
  cameraFollowDuration: 2000, // Thời lượng animation camera theo dõi
  cameraPanDuration: 1500, // Thời lượng animation camera di chuyển
  isAnimating: false,
  motionOptions: {
    auto: false, // Điều khiển animation thủ công
    easing: L.Motion.Ease.easeInOutQuart,
  },
};

// Cấu hình mức tốc độ camera
const CAMERA_SPEED_LEVELS = [
  {
    name: "Rất nhanh",
    cameraFollowDuration: 600,
    cameraPanDuration: 400,
  },
  {
    name: "Bình thường",
    cameraFollowDuration: 2000,
    cameraPanDuration: 1500,
  },
  {
    name: "Chậm",
    cameraFollowDuration: 3500,
    cameraPanDuration: 2800,
  },
  {
    name: "Rất chậm",
    cameraFollowDuration: 5000,
    cameraPanDuration: 4000,
  },
];

let motionPaths = new Map();
let animationQueue = [];
let isAnimationInProgress = false;

// ==================== Hằng số toàn cục ====================
const INTERNATIONAL_COORDINATES = {
  "Nga Moscow": [37.6176, 55.7558],
};

// Cấu hình loại bản đồ: 'openstreetmap' hoặc 'google'
// Để sử dụng Google Maps, đặt MAP_TYPE = 'google'
// Để sử dụng OpenStreetMap, đặt MAP_TYPE = 'openstreetmap'
const MAP_TYPE = 'google'; // 'openstreetmap' hoặc 'google'

// Cấu hình phương thức Google Maps: 'tiles', 'googlemutant', hoặc 'custom'
// 'tiles': Sử dụng Google Maps tiles trực tiếp (không cần API key, đơn giản nhất) - KHUYẾN NGHỊ
// 'googlemutant': Sử dụng plugin GoogleMutant (không cần API key)
// 'custom': Sử dụng custom GridLayer (cần Google Maps API key, nhiều tùy chọn hơn)
const GOOGLE_MAPS_METHOD = 'tiles'; // 'tiles', 'googlemutant', hoặc 'custom'

// Loại bản đồ Google Maps (chỉ áp dụng cho phương thức 'tiles'):
// 'm' = roadmap (bản đồ đường phố)
// 's' = satellite (ảnh vệ tinh)
// 't' = terrain (bản đồ địa hình)
// 'y' = hybrid (kết hợp vệ tinh và đường phố)
// 'p' = terrain only (chỉ địa hình)
const GOOGLE_MAPS_TYPE = 'm'; // 'm', 's', 't', 'y', hoặc 'p'

// API Key Google Maps (chỉ cần nếu sử dụng GOOGLE_MAPS_METHOD = 'custom')
const GOOGLE_MAPS_API_KEY = ''; // Thay bằng API key của bạn nếu dùng phương thức custom

/**
 * Kiểm tra xem có phải thiết bị di động không
 */
function isMobileDevice() {
  return window.innerWidth <= 768;
}

// ==================== Tương tác thiết bị di động ====================
/**
 * Chuyển đổi trạng thái hiển thị/ẩn bảng điều khiển
 */
function toggleControlPanel() {
  const panel = document.getElementById("timeline-control");
  const toggleBtn = document.getElementById("toggle-panel-btn");
  const mapEl = document.getElementById("map");

  if (isPanelVisible) {
    panel.classList.add("hidden");
    toggleBtn.textContent = "⬆";
    mapEl.classList.remove("panel-visible");
    mapEl.classList.add("panel-hidden");
    isPanelVisible = false;
  } else {
    panel.classList.remove("hidden");
    toggleBtn.textContent = "⚙";
    mapEl.classList.remove("panel-hidden");
    mapEl.classList.add("panel-visible");
    isPanelVisible = true;
  }

  setTimeout(() => {
    if (map && map.invalidateSize) {
      map.invalidateSize({
        animate: true,
        pan: false,
      });
    }
  }, 350);
}

/**
 * Lấy chiều cao bảng điều khiển
 */
function getControlPanelHeight() {
  const panel = document.getElementById("timeline-control");
  if (!panel || panel.classList.contains("hidden")) {
    return 0;
  }

  const rect = panel.getBoundingClientRect();
  return rect.height;
}

/**
 * Khởi tạo chức năng tương tác thiết bị di động
 */
function initMobileInteractions() {
  const toggleBtn = document.getElementById("toggle-panel-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleControlPanel);
  }

  if (map && isMobileDevice()) {
    map.on("dblclick", (e) => {
      e.originalEvent.preventDefault();
      toggleControlPanel();
    });
  }

  initPanelDragClose();
}

/**
 * Khởi tạo chức năng đóng bảng chi tiết bằng cách kéo (thiết bị di động)
 */
function initPanelDragClose() {
  if (!isMobileDevice()) return;

  const panel = document.getElementById("location-detail-panel");
  const panelHeader = panel?.querySelector(".panel-header");
  const backdrop = document.getElementById("panel-backdrop");

  if (!panel || !panelHeader) return;

  let touchState = {
    startY: 0,
    currentY: 0,
    deltaY: 0,
    startTime: 0,
    isDragging: false,
    hasMoved: false,
    isProcessing: false,
  };

  function resetAllStates(isClosing = false) {
    touchState = {
      startY: 0,
      currentY: 0,
      deltaY: 0,
      startTime: 0,
      isDragging: false,
      hasMoved: false,
      isProcessing: false,
    };

    panel.classList.remove("dragging");
    panelHeader.classList.remove("dragging");

    if (!isClosing) {
      panel.style.transform = "translateY(0)";
      panel.style.transition =
        "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";

      if (backdrop) {
        backdrop.style.opacity = "0.3";
        backdrop.style.transition = "opacity 0.3s ease";
      }

      if (!panel.classList.contains("visible")) {
        panel.classList.add("visible");
      }

      setTimeout(() => {
        if (panel.style.transition.includes("transform")) {
          panel.style.transition = "";
        }
        if (backdrop && backdrop.style.transition.includes("opacity")) {
          backdrop.style.transition = "";
        }
      }, 350);
    }
  }

  function safeClosePanel() {
    touchState.isProcessing = true;

    panel.style.transform = "translateY(100%)";
    panel.style.transition =
      "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";

    if (backdrop) {
      backdrop.style.opacity = "0";
      backdrop.style.transition = "opacity 0.3s ease";
    }

    setTimeout(() => {
      try {
        hideDetailPanel();
      } catch (error) {
        console.error("Lỗi khi đóng bảng:", error);
      }

      setTimeout(() => {
        resetAllStates(true);
      }, 100);
    }, 300);
  }

  function handleTouchStart(e) {
    if (touchState.isProcessing) {
      return;
    }

    if (
      e.target.closest(".panel-close") ||
      e.target.closest(".panel-content")
    ) {
      return;
    }

    const touch = e.touches[0];
    touchState.startY = touch.clientY;
    touchState.currentY = touch.clientY;
    touchState.startTime = Date.now();
    touchState.isDragging = true;
    touchState.hasMoved = false;
    touchState.deltaY = 0;

    panel.classList.add("dragging");
    panelHeader.classList.add("dragging");

    panel.style.transition = "none";
    if (backdrop) {
      backdrop.style.transition = "none";
    }

    e.preventDefault();
  }

  function handleTouchMove(e) {
    if (!touchState.isDragging || touchState.isProcessing) {
      return;
    }

    const touch = e.touches[0];
    touchState.currentY = touch.clientY;
    touchState.deltaY = touchState.currentY - touchState.startY;

    if (!touchState.hasMoved && Math.abs(touchState.deltaY) > 3) {
      touchState.hasMoved = true;
    }

    if (touchState.deltaY > 0) {
      const maxDrag = 250;
      const dampingFactor = Math.max(
        0.3,
        1 - (touchState.deltaY / maxDrag) * 0.7
      );
      const transformValue = Math.min(
        touchState.deltaY * dampingFactor,
        maxDrag
      );

      panel.style.transform = `translateY(${transformValue}px)`;

      if (backdrop) {
        const maxOpacity = 0.3;
        const opacityReduction = (touchState.deltaY / 200) * maxOpacity;
        const newOpacity = Math.max(0.05, maxOpacity - opacityReduction);
        backdrop.style.opacity = newOpacity.toString();
      }
    } else {
      panel.style.transform = "translateY(0)";
      if (backdrop) {
        backdrop.style.opacity = "0.3";
      }
    }

    e.preventDefault();
  }

  function handleTouchEnd(e) {
    if (!touchState.isDragging) {
      return;
    }

    const duration = Date.now() - touchState.startTime;
    const velocity = duration > 0 ? Math.abs(touchState.deltaY) / duration : 0;

    panel.classList.remove("dragging");
    panelHeader.classList.remove("dragging");

    panel.style.transition =
      "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    if (backdrop) {
      backdrop.style.transition = "opacity 0.3s ease";
    }

    const shouldClose =
      touchState.hasMoved &&
      (touchState.deltaY > 40 ||
        (touchState.deltaY > 20 && velocity > 0.2) ||
        (touchState.deltaY > 10 && velocity > 0.5));

    if (shouldClose) {
      safeClosePanel();
    } else {
      resetAllStates(false);
    }
  }

  function handleTouchCancel(e) {
    if (touchState.isDragging && !touchState.isProcessing) {
      resetAllStates();
    }
  }

  function cleanupEventListeners() {
    panelHeader.removeEventListener("touchstart", handleTouchStart);
    panelHeader.removeEventListener("touchmove", handleTouchMove);
    panelHeader.removeEventListener("touchend", handleTouchEnd);
    panelHeader.removeEventListener("touchcancel", handleTouchCancel);
  }

  function bindEventListeners() {
    panelHeader.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });

    panelHeader.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });

    panelHeader.addEventListener("touchend", handleTouchEnd, {
      passive: false,
    });

    panelHeader.addEventListener("touchcancel", handleTouchCancel, {
      passive: false,
    });
  }

  cleanupEventListeners();
  bindEventListeners();

  const panelContent = panel.querySelector(".panel-content");
  if (panelContent) {
    panelContent.addEventListener(
      "touchstart",
      (e) => {
        e.stopPropagation();
      },
      { passive: true }
    );

    panelContent.addEventListener(
      "touchmove",
      (e) => {
        e.stopPropagation();
      },
      { passive: true }
    );
  }

  const closeBtn = panel.querySelector(".panel-close");
  if (closeBtn) {
    closeBtn.addEventListener(
      "touchstart",
      (e) => {
        e.stopPropagation();
      },
      { passive: true }
    );

    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideDetailPanel();
    });
  }

  window.cleanupDragListeners = cleanupEventListeners;
}

/**
 * Khởi tạo bản đồ Leaflet
 */
function initMap() {
  // Kiểm tra xem element map có tồn tại không
  const mapElement = document.getElementById("map");
  if (!mapElement) {
    console.error("Không tìm thấy element #map");
    return;
  }

  // Kiểm tra xem Leaflet đã được tải chưa
  if (typeof L === 'undefined') {
    console.error("Leaflet chưa được tải, vui lòng kiểm tra script tag");
    return;
  }

  try {
  map = L.map("map", {
    center: [16.0544, 108.2772],
    zoom: 5,
    minZoom: 3,
    maxZoom: 10,
    zoomControl: true,
    attributionControl: false,
    tap: true,
    tapTolerance: 15,
  });

    console.log("Leaflet map instance đã được tạo");

    // Chọn loại bản đồ dựa trên cấu hình
    if (MAP_TYPE === 'google') {
      // Sử dụng Google Maps
      if (GOOGLE_MAPS_METHOD === 'tiles') {
        // Sử dụng Google Maps tiles trực tiếp (đơn giản nhất, không cần API key)
        initGoogleMapsWithTiles();
      } else if (GOOGLE_MAPS_METHOD === 'custom' && GOOGLE_MAPS_API_KEY) {
        // Sử dụng phương thức custom với API key
        initGoogleMapsCustom();
      } else {
        // Sử dụng GoogleMutant (fallback)
        initGoogleMapsWithMutant();
      }
    } else {
      // Sử dụng OpenStreetMap (mặc định)
      initOpenStreetMap();
    }
  } catch (error) {
    console.error("Lỗi khi khởi tạo map:", error);
    // Fallback sang OpenStreetMap nếu có lỗi
    if (map) {
      try {
        initOpenStreetMap();
      } catch (fallbackError) {
        console.error("Lỗi khi fallback sang OpenStreetMap:", fallbackError);
      }
    }
  }
}

/**
 * Khởi tạo Google Maps sử dụng tiles trực tiếp (không cần API key, đơn giản nhất)
 * Phương thức này sử dụng Google Maps tile URL trực tiếp
 */
function initGoogleMapsWithTiles() {
  if (!map) {
    console.error("Map instance chưa được khởi tạo");
    return;
  }

  try {
    // Các loại bản đồ Google Maps:
    // 'm' = roadmap (bản đồ đường phố)
    // 's' = satellite (ảnh vệ tinh)
    // 't' = terrain (bản đồ địa hình)
    // 'y' = hybrid (kết hợp vệ tinh và đường phố)
    // 'p' = terrain only (chỉ địa hình)
    const mapType = GOOGLE_MAPS_TYPE || 'm';
    
    // Sử dụng HTTPS để tránh lỗi mixed content
    const googleLayer = L.tileLayer('https://{s}.google.com/vt/lyrs={type}&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      type: mapType,
      attribution: '© Google Maps'
    });

    googleLayer.addTo(map);
    console.log(`Bản đồ Google Maps (Tiles - loại: ${mapType}) khởi tạo hoàn tất`);
    
    // Kiểm tra xem layer có được thêm thành công không
    setTimeout(() => {
      if (!map.hasLayer(googleLayer)) {
        console.warn("Google Maps tiles layer không được thêm vào map, chuyển sang OpenStreetMap");
        map.removeLayer(googleLayer);
        initOpenStreetMap();
      } else {
        console.log("Google Maps tiles layer đã được thêm thành công");
      }
    }, 500);
  } catch (error) {
    console.error("Lỗi khi khởi tạo Google Maps với tiles:", error);
    console.warn("Chuyển sang OpenStreetMap");
    try {
      initOpenStreetMap();
    } catch (fallbackError) {
      console.error("Lỗi khi fallback sang OpenStreetMap:", fallbackError);
    }
  }
}

/**
 * Khởi tạo Google Maps sử dụng plugin GoogleMutant (không cần API key)
 */
function initGoogleMapsWithMutant() {
  if (!map) {
    console.error("Map instance chưa được khởi tạo");
    return;
  }

  try {
    // Kiểm tra xem plugin GoogleMutant đã được tải chưa
    if (typeof L !== 'undefined' && L.gridLayer && typeof L.gridLayer.googleMutant === 'function') {
      const googleLayer = L.gridLayer.googleMutant({
        type: 'roadmap', // 'roadmap', 'satellite', 'terrain', 'hybrid'
        maxZoom: 20,
      });
      
      googleLayer.addTo(map);
      console.log("Bản đồ Google Maps (GoogleMutant) khởi tạo hoàn tất");
      
      // Kiểm tra xem layer có được thêm thành công không
      setTimeout(() => {
        if (!map.hasLayer(googleLayer)) {
          console.warn("GoogleMutant layer không được thêm vào map, chuyển sang OpenStreetMap");
          map.removeLayer(googleLayer);
          initOpenStreetMap();
        }
      }, 1000);
    } else {
      console.warn("Plugin GoogleMutant chưa được tải, chuyển sang OpenStreetMap");
      console.warn("Kiểm tra: L.gridLayer =", typeof L !== 'undefined' ? L.gridLayer : 'undefined');
      console.warn("Kiểm tra: L.gridLayer.googleMutant =", typeof L !== 'undefined' && L.gridLayer ? typeof L.gridLayer.googleMutant : 'undefined');
      initOpenStreetMap();
    }
  } catch (error) {
    console.error("Lỗi khi khởi tạo Google Maps:", error);
    console.warn("Chuyển sang OpenStreetMap");
    try {
      initOpenStreetMap();
    } catch (fallbackError) {
      console.error("Lỗi khi fallback sang OpenStreetMap:", fallbackError);
    }
  }
}

/**
 * Khởi tạo Google Maps sử dụng custom GridLayer (cần API key)
 * Dựa trên phương pháp tham khảo từ người dùng
 */
function initGoogleMapsCustom() {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("Chưa có Google Maps API Key, chuyển sang OpenStreetMap");
    initOpenStreetMap();
    return;
  }

  // Kiểm tra xem Google Maps API đã được tải chưa
  if (typeof google === 'undefined' || !google.maps) {
    console.warn("Google Maps API chưa được tải, vui lòng thêm script vào HTML");
    console.warn("Chuyển sang OpenStreetMap");
    initOpenStreetMap();
    return;
  }

  try {
    // Tạo Google Map ẩn để lấy tiles
    const googleMapDiv = document.createElement('div');
    googleMapDiv.id = 'google-map-hidden-' + Date.now();
    googleMapDiv.style.position = 'absolute';
    googleMapDiv.style.visibility = 'hidden';
    googleMapDiv.style.width = '256px';
    googleMapDiv.style.height = '256px';
    document.body.appendChild(googleMapDiv);

    const googleMap = new google.maps.Map(googleMapDiv, {
      center: { lat: 0, lng: 0 },
      zoom: 1,
      disableDefaultUI: true,
      keyboardShortcuts: false,
      draggable: false,
      disableDoubleClickZoom: true,
      scrollwheel: false,
      mapTypeId: google.maps.MapTypeId.ROADMAP, // Có thể thay đổi: ROADMAP, SATELLITE, TERRAIN, HYBRID
    });

    // Tạo custom GridLayer để lấy tiles từ Google Map
    const GoogleGridLayer = L.GridLayer.extend({
      initialize: function(googleMapInstance, mapType) {
        this.googleMap = googleMapInstance;
        this.mapType = mapType || 'roadmap';
        this.tileCache = new Map();
      },

      createTile: function(coords, done) {
        const img = L.DomUtil.create('img');
        const tileKey = `${coords.z}_${coords.x}_${coords.y}`;

        // Kiểm tra cache
        if (this.tileCache.has(tileKey)) {
          img.src = this.tileCache.get(tileKey);
          done(null, img);
          return img;
        }

        // Chuyển đổi tọa độ Leaflet sang Google Maps
        const nw = this._tileCoordsToLatLng(coords);
        const se = this._tileCoordsToLatLng({ x: coords.x + 1, y: coords.y + 1, z: coords.z });

        // Tạo overlay để lấy tile
        const overlay = new google.maps.GroundOverlay(
          '',
          new google.maps.LatLngBounds(
            new google.maps.LatLng(nw.lat, nw.lng),
            new google.maps.LatLng(se.lat, se.lng)
          )
        );

        // Sử dụng Static Maps API để lấy tile (phương án đơn giản hơn)
        const tileUrl = this._getGoogleTileUrl(coords);
        img.onload = () => {
          this.tileCache.set(tileKey, tileUrl);
          done(null, img);
        };
        img.onerror = () => {
          done(new Error('Không thể tải tile Google Maps'), img);
        };
        img.src = tileUrl;

        return img;
      },

      _tileCoordsToLatLng: function(coords) {
        const n = Math.pow(2, coords.z);
        const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * coords.y / n))) * 180 / Math.PI;
        const lng = coords.x / n * 360 - 180;
        return { lat, lng };
      },

      _getGoogleTileUrl: function(coords) {
        // Sử dụng Google Static Maps API để lấy tile
        // Lưu ý: Cách này có giới hạn về số lượng request
        const scale = window.devicePixelRatio > 1 ? 2 : 1;
        const size = 256 * scale;
        const center = this._tileCoordsToLatLng({ x: coords.x + 0.5, y: coords.y + 0.5, z: coords.z });
        
        // Sử dụng Maps Static API (cần API key)
        return `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${coords.z}&size=${size}x${size}&maptype=${this.mapType}&key=${GOOGLE_MAPS_API_KEY}&scale=${scale}`;
      }
    });

    const googleLayer = new GoogleGridLayer(googleMap, 'roadmap');
    googleLayer.addTo(map);
    
    // Dọn dẹp element ẩn sau khi khởi tạo
    setTimeout(() => {
      if (googleMapDiv.parentNode) {
        googleMapDiv.parentNode.removeChild(googleMapDiv);
      }
    }, 1000);

    console.log("Bản đồ Google Maps (Custom GridLayer) khởi tạo hoàn tất");
  } catch (error) {
    console.warn("Lỗi khi khởi tạo Google Maps Custom:", error, "Chuyển sang OpenStreetMap");
    initOpenStreetMap();
  }
}

/**
 * Khởi tạo bản đồ OpenStreetMap
 */
function initOpenStreetMap() {
  if (!map) {
    console.error("Map instance chưa được khởi tạo, không thể thêm OpenStreetMap layer");
    return;
  }

  try {
    // Xóa các layer hiện có trước khi thêm layer mới
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer || (layer.options && layer.options.url)) {
        map.removeLayer(layer);
      }
    });

    const osmLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      subdomains: "abc",
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }
    );

    osmLayer.addTo(map);
    console.log("Bản đồ OpenStreetMap khởi tạo hoàn tất");
    
    // Kiểm tra xem layer có được thêm thành công không
    setTimeout(() => {
      if (!map.hasLayer(osmLayer)) {
        console.error("OpenStreetMap layer không được thêm vào map");
      } else {
        console.log("OpenStreetMap layer đã được thêm thành công");
      }
    }, 500);
  } catch (error) {
    console.error("Lỗi khi khởi tạo OpenStreetMap:", error);
  }
}

// ==================== Điều khiển bảng thống kê ====================
/**
 * Khởi tạo tương tác hover bảng thống kê PC
 */
function initStatsHover() {
  const statsPanel = document.getElementById("stats-panel");
  const hoverArea = document.getElementById("stats-hover-area");

  if (!statsPanel || !hoverArea || isMobileDevice()) return;

  function showStatsPanel() {
    if (statsHoverTimeout) {
      clearTimeout(statsHoverTimeout);
      statsHoverTimeout = null;
    }
    statsPanel.classList.add("visible");
  }

  function hideStatsPanel() {
    statsHoverTimeout = setTimeout(() => {
      statsPanel.classList.remove("visible");
    }, 150);
  }

  hoverArea.addEventListener("mouseenter", showStatsPanel);
  hoverArea.addEventListener("mouseleave", hideStatsPanel);
  statsPanel.addEventListener("mouseenter", showStatsPanel);
  statsPanel.addEventListener("mouseleave", hideStatsPanel);
}

// ==================== Điều khiển bảng thông tin chi tiết ====================
/**
 * Khởi tạo tương tác bảng thông tin chi tiết
 */
function initDetailPanel() {
  const panel = document.getElementById("location-detail-panel");
  const backdrop = document.getElementById("panel-backdrop");
  const closeBtn = document.getElementById("panel-close-btn");

  if (closeBtn) {
    closeBtn.addEventListener("click", hideDetailPanel);
  }

  if (backdrop) {
    backdrop.addEventListener("click", hideDetailPanel);
  }

  if (panel) {
    panel.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  if (!isMobileDevice()) {
    document.addEventListener("click", (e) => {
      if (panel && panel.classList.contains("visible")) {
        const isClickInsidePanel = panel.contains(e.target);
        const isClickOnMarker = e.target.closest(".leaflet-marker-icon");

        if (!isClickInsidePanel && !isClickOnMarker) {
          hideDetailPanel();
        }
      }
    });
  }
}

/**
 * Hiển thị bảng thông tin chi tiết địa điểm
 */
function showDetailPanel(locationGroup) {
  const panel = document.getElementById("location-detail-panel");
  const backdrop = document.getElementById("panel-backdrop");
  const titleEl = document.getElementById("panel-location-title");
  const summaryEl = document.getElementById("panel-visit-summary");
  const contentEl = document.getElementById("panel-content");

  if (!panel || !titleEl || !summaryEl || !contentEl) return;

  const { location, events } = locationGroup;
  const visitCount = events.length;
  const transitCount = events.filter((e) => e.visitType === "Đi qua").length;
  const destCount = events.filter((e) => e.visitType === "Điểm đến").length;
  const startCount = events.filter((e) => e.visitType === "Khởi hành").length;
  const activityCount = events.filter((e) => e.visitType === "Hoạt động").length;
  const birthCount = events.filter((e) => e.visitType === "Sinh ra").length;

  titleEl.textContent = location;

  let summaryText = `Tính đến thời điểm hiện tại có tổng cộng <span class="visit-count-highlight">${visitCount}</span> bản ghi liên quan`;

  let descParts = [];
  if (birthCount > 0) descParts.push(`${birthCount} lần sinh ra`);
  if (destCount > 0) descParts.push(`${destCount} lần đến`);
  if (startCount > 0) descParts.push(`${startCount} lần khởi hành`);
  if (transitCount > 0) descParts.push(`${transitCount} lần đi qua`);
  if (activityCount > 0) descParts.push(`${activityCount} lần hoạt động`);

  if (descParts.length > 0) {
    summaryText += ` (${descParts.join(", ")})`;
  }

  summaryEl.innerHTML = summaryText;

  const sortedEvents = [...events].sort((a, b) => a.index - b.index);

  const eventListHtml = sortedEvents
    .map((event, index) => {
      const isCurrentEvent = event.index === currentEventIndex;
      const itemClass = isCurrentEvent
        ? "event-item current-event"
        : "event-item";

      let visitTypeClass = "";
      let visitTypeLabel = "";
      let visitOrderClass = "";

      const orderNumber = `Lần thứ ${index + 1}`;

      switch (event.visitType) {
        case "Sinh ra":
          visitTypeClass = "birth-event";
          visitTypeLabel = "Sinh ra";
          visitOrderClass = "birth-order";
          break;
        case "Khởi hành":
          visitTypeClass = "start-event";
          visitTypeLabel = "Khởi hành";
          visitOrderClass = "start-order";
          break;
        case "Điểm đến":
          visitTypeLabel = "Đến";
          visitOrderClass = "";
          break;
        case "Đi qua":
          visitTypeClass = "transit-event";
          visitTypeLabel = "Đi qua";
          visitOrderClass = "transit-order";
          break;
        case "Hoạt động":
          visitTypeClass = "activity-event";
          visitTypeLabel = "Hoạt động";
          visitOrderClass = "activity-order";
          break;
      }

      const imageHtml = event.image 
        ? `<div class="event-item-image-container">
             <img src="${event.image}" alt="Hình ảnh sự kiện" class="event-item-image" onerror="this.style.display='none';">
           </div>`
        : "";

      return `
      <div class="${itemClass} ${visitTypeClass}" data-event-index="${
        event.index
      }">
        ${imageHtml}
        <div class="event-header">
          <span class="visit-order-number">${orderNumber}</span>
          <span class="event-date-item">${event.date}</span>
          <span class="visit-order ${visitOrderClass}">${visitTypeLabel}</span>
        </div>
        <div class="event-description">${
          event.originalEvent || event.event
        }</div>
        ${event.age ? `<div class="event-age">Tuổi: ${event.age}</div>` : ""}
      </div>
    `;
    })
    .join("");

  contentEl.innerHTML = eventListHtml;

  const eventItems = contentEl.querySelectorAll(".event-item");
  eventItems.forEach((item) => {
    const eventIndex = parseInt(item.dataset.eventIndex);

    item.addEventListener("click", (e) => {
      e.stopPropagation();

      // Đánh dấu user đã tương tác
      userHasInteracted = true;

      // Phát audio khi click vào event
      const event = trajectoryData.events.find(ev => ev.index === eventIndex);
      if (event) {
        playEventAudio(event, eventIndex);
      }

      if (currentHighlightedEventIndex === eventIndex) {
        clearPathHighlight();
        return;
      }

      if (currentHighlightedEventIndex !== -1) {
        quickClearPathHighlight();
      }

      highlightEventPath(eventIndex);

      item.classList.add("event-item-clicked");
      setTimeout(() => {
        item.classList.remove("event-item-clicked");
      }, 300);
    });

    item.addEventListener("mouseenter", (e) => {
      if (currentHighlightedEventIndex !== eventIndex) {
        item.style.cursor = "pointer";
        item.style.transform = "translateX(2px)";
      }
    });

    item.addEventListener("mouseleave", (e) => {
      item.style.transform = "";
    });
  });

  if (backdrop && isMobileDevice()) {
    backdrop.classList.add("visible");
  }

  panel.classList.add("visible");

  if (isMobileDevice()) {
    setTimeout(() => {
      initPanelDragClose();
    }, 100);
  }
}

/**
 * Ẩn bảng thông tin chi tiết
 */
function hideDetailPanel() {
  const panel = document.getElementById("location-detail-panel");
  const backdrop = document.getElementById("panel-backdrop");

  if (panel) {
    panel.classList.remove("visible", "dragging");
    panel.style.transform = "";
    panel.style.transition = "";
  }

  if (backdrop) {
    backdrop.classList.remove("visible", "dragging");
    backdrop.style.opacity = "";
    backdrop.style.transition = "";
  }

  if (window.cleanupDragListeners) {
    try {
      window.cleanupDragListeners();
    } catch (error) {
      console.warn("Lỗi khi dọn dẹp trình nghe kéo:", error);
    }
  }
}

// ==================== Điều khiển chức năng phản hồi ====================
/**
 * Khởi tạo chức năng phản hồi
 */
function initFeedbackModal() {
  const feedbackBtn = document.getElementById("feedback-btn");
  const feedbackModal = document.getElementById("feedback-modal");
  const feedbackBackdrop = document.getElementById("feedback-backdrop");
  const feedbackClose = document.getElementById("feedback-modal-close");

  if (feedbackBtn) {
    feedbackBtn.addEventListener("click", showFeedbackModal);
  }

  if (feedbackClose) {
    feedbackClose.addEventListener("click", hideFeedbackModal);
  }

  if (feedbackBackdrop) {
    feedbackBackdrop.addEventListener("click", hideFeedbackModal);
  }

  if (feedbackModal) {
    feedbackModal.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  const issuesItem = document.getElementById("feedback-issues");
  const projectItem = document.getElementById("feedback-project");
  const wechatItem = document.getElementById("feedback-wechat");

  if (issuesItem) {
    issuesItem.addEventListener("click", () => {
      openGitHubIssues();
      hideFeedbackModal();
    });
  }

  if (projectItem) {
    projectItem.addEventListener("click", () => {
      openGitHubProject();
      hideFeedbackModal();
    });
  }

  if (wechatItem) {
    wechatItem.addEventListener("click", () => {
      handleWeChatAction();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isFeedbackModalVisible) {
      hideFeedbackModal();
    }
  });
}

/**
 * Hiển thị cửa sổ phản hồi
 */
function showFeedbackModal() {
  const feedbackModal = document.getElementById("feedback-modal");
  const feedbackBackdrop = document.getElementById("feedback-backdrop");

  if (feedbackModal && feedbackBackdrop) {
    feedbackBackdrop.classList.add("visible");
    feedbackModal.classList.add("visible");
    isFeedbackModalVisible = true;

    document.body.style.overflow = "hidden";
  }
}

/**
 * Ẩn cửa sổ phản hồi
 */
function hideFeedbackModal() {
  const feedbackModal = document.getElementById("feedback-modal");
  const feedbackBackdrop = document.getElementById("feedback-backdrop");

  if (feedbackModal && feedbackBackdrop) {
    feedbackBackdrop.classList.remove("visible");
    feedbackModal.classList.remove("visible");
    isFeedbackModalVisible = false;

    document.body.style.overflow = "";
  }
}

/**
 * Mở trang GitHub Issues
 */
function openGitHubIssues() {
  const issuesUrl = "https://github.com/mrtinhnguyen/ho-chi-minh-map/issues";
  window.open(issuesUrl, "_blank", "noopener,noreferrer");
}

/**
 * Mở trang chủ dự án GitHub
 */
function openGitHubProject() {
  const projectUrl = "https://github.com/mrtinhnguyen/ho-chi-minh-map";
  window.open(projectUrl, "_blank", "noopener,noreferrer");
}

/**
 * Xử lý thao tác tài khoản công khai WeChat
 */
function handleWeChatAction() {
  const wechatName = "Chủ tịch Hồ Chí Minh muôn năm";

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(wechatName)
      .then(() => {
        showTemporaryMessage(
          "Tên tài khoản công khai đã được sao chép vào clipboard: " + wechatName,
          "success"
        );
      })
      .catch(() => {
        showTemporaryMessage("Vui lòng tìm kiếm tài khoản công khai WeChat: " + wechatName, "info");
      });
  } else {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = wechatName;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      textArea.setSelectionRange(0, 99999);
      document.execCommand("copy");
      document.body.removeChild(textArea);
      showTemporaryMessage(
        "Tên tài khoản công khai đã được sao chép vào clipboard: " + wechatName,
        "success"
      );
    } catch (err) {
      showTemporaryMessage("Vui lòng tìm kiếm tài khoản công khai WeChat: " + wechatName, "info");
    }
  }

  hideFeedbackModal();
}

/**
 * Hiển thị thông báo tạm thời
 */
function showTemporaryMessage(message, type = "info") {
  const existingMessage = document.querySelector(".temp-message");
  if (existingMessage) {
    existingMessage.remove();
  }

  const messageDiv = document.createElement("div");
  messageDiv.className = "temp-message";
  messageDiv.textContent = message;

  const colors = {
    success: { bg: "rgba(39, 174, 96, 0.9)", border: "#27ae60" },
    info: { bg: "rgba(52, 152, 219, 0.9)", border: "#3498db" },
    warning: { bg: "rgba(243, 156, 18, 0.9)", border: "#f39c12" },
  };

  const color = colors[type] || colors.info;

  Object.assign(messageDiv.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: color.bg,
    color: "white",
    padding: "12px 20px",
    borderRadius: "8px",
    border: `1px solid ${color.border}`,
    zIndex: "9999",
    fontSize: "14px",
    fontWeight: "500",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    backdropFilter: "blur(10px)",
    maxWidth: "90vw",
    textAlign: "center",
    lineHeight: "1.4",
  });

  document.body.appendChild(messageDiv);

  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.style.opacity = "0";
      messageDiv.style.transform = "translate(-50%, -50%) scale(0.9)";
      messageDiv.style.transition = "all 0.3s ease";

      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.remove();
        }
      }, 300);
    }
  }, 3000);
}

/**
 * Hiển thị thông báo animation thơ (có kiểm soát trạng thái)
 */
function showPoetryMessage() {
  if (isPoetryAnimationPlaying) {
    console.log("Animation thơ đang phát, bỏ qua kích hoạt mới");
    return;
  }

  isPoetryAnimationPlaying = true;
  console.log("Bắt đầu phát animation thơ");

  if (poetryAnimationTimeout) {
    clearTimeout(poetryAnimationTimeout);
    poetryAnimationTimeout = null;
  }

  const existingPoetry = document.querySelector(".poetry-message");
  if (existingPoetry) {
    existingPoetry.remove();
  }

  const poetryDiv = document.createElement("div");
  poetryDiv.className = "poetry-message";

  const poetryTexts = [
    "Không có gì quý hơn độc lập tự do",
    "Độc lập tự do là trên hết",
    "Việt Nam muôn năm",
    "Đảng ta thật là vĩ đại",
  ];

  const randomPoetry =
    poetryTexts[Math.floor(Math.random() * poetryTexts.length)];
  poetryDiv.textContent = randomPoetry;

  Object.assign(poetryDiv.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) scale(0.3)",
    background:
      "linear-gradient(135deg, rgba(200, 16, 46, 0.95), rgba(139, 69, 19, 0.95))",
    color: "#f4f1de",
    padding: "24px 32px",
    borderRadius: "16px",
    border: "2px solid rgba(255, 215, 0, 0.6)",
    zIndex: "9999",
    fontSize: "18px",
    fontWeight: "700",
    fontFamily: "'Times New Roman', serif",
    boxShadow:
      "0 8px 32px rgba(200, 16, 46, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(12px)",
    maxWidth: "80vw",
    textAlign: "center",
    lineHeight: "1.6",
    letterSpacing: "2px",
    textShadow: "2px 2px 4px rgba(0, 0, 0, 0.6)",
    opacity: "0",
    pointerEvents: "none",
    transition: "all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  });

  document.body.appendChild(poetryDiv);

  // Force reflow để đảm bảo element được render
  poetryDiv.offsetHeight;

  // Đảm bảo element được render trước khi thay đổi opacity
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (poetryDiv.parentNode && isPoetryAnimationPlaying) {
    poetryDiv.style.opacity = "1";
    poetryDiv.style.transform = "translate(-50%, -50%) scale(1)";
        poetryDiv.style.pointerEvents = "none"; // Giữ pointer-events none để không chặn tương tác
        poetryDiv.style.visibility = "visible"; // Đảm bảo visibility là visible
        console.log("Poetry message hiển thị:", poetryDiv.textContent);
      }
    });
  });

  setTimeout(() => {
    if (poetryDiv.parentNode && isPoetryAnimationPlaying) {
      poetryDiv.style.transform = "translate(-50%, -50%) scale(1.1)";
      poetryDiv.style.fontSize = "20px";
    }
  }, 800);

  // Giai đoạn ba: Phóng to tối đa và bắt đầu mờ dần
  setTimeout(() => {
    if (poetryDiv.parentNode && isPoetryAnimationPlaying) {
      poetryDiv.style.transform = "translate(-50%, -50%) scale(1.3)";
      poetryDiv.style.opacity = "0.3";
      poetryDiv.style.fontSize = "24px";
      poetryDiv.style.filter = "blur(1px)";
    }
  }, 2200);

  // Giai đoạn bốn: Hoàn toàn biến mất
  setTimeout(() => {
    if (poetryDiv.parentNode && isPoetryAnimationPlaying) {
      poetryDiv.style.transform = "translate(-50%, -50%) scale(1.8)";
      poetryDiv.style.opacity = "0";
      poetryDiv.style.filter = "blur(3px)";

      setTimeout(() => {
        if (poetryDiv.parentNode) {
          poetryDiv.remove();
        }
        isPoetryAnimationPlaying = false;
        console.log("Animation thơ phát xong, trạng thái đã được đặt lại");
      }, 800);
    } else if (!isPoetryAnimationPlaying) {
      if (poetryDiv.parentNode) {
        poetryDiv.remove();
      }
    }
  }, 3500);

  setTimeout(() => {
    if (poetryDiv.parentNode && isPoetryAnimationPlaying) {
      poetryDiv.style.boxShadow =
        "0 8px 32px rgba(255, 215, 0, 0.8), inset 0 2px 8px rgba(255, 255, 255, 0.3), 0 0 20px rgba(255, 215, 0, 0.6)";
    }
  }, 1000);

  setTimeout(() => {
    if (poetryDiv.parentNode && isPoetryAnimationPlaying) {
      poetryDiv.style.boxShadow =
        "0 8px 32px rgba(200, 16, 46, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.2)";
    }
  }, 1800);

  poetryAnimationTimeout = setTimeout(() => {
    if (isPoetryAnimationPlaying) {
      console.warn("Bảo vệ timeout animation thơ được kích hoạt, buộc đặt lại trạng thái");
      isPoetryAnimationPlaying = false;

      const remainingPoetry = document.querySelector(".poetry-message");
      if (remainingPoetry) {
        remainingPoetry.remove();
      }
    }
    poetryAnimationTimeout = null;
  }, 2000);
}

/**
 * Buộc dừng animation thơ
 */
function forceStopPoetryAnimation() {
  if (isPoetryAnimationPlaying) {
    isPoetryAnimationPlaying = false;

    if (poetryAnimationTimeout) {
      clearTimeout(poetryAnimationTimeout);
      poetryAnimationTimeout = null;
    }

    const poetryElements = document.querySelectorAll(".poetry-message");
    poetryElements.forEach((element) => {
      if (element.parentNode) {
        element.remove();
      }
    });
  }
}

// ==================== Xử lý dữ liệu tọa độ ====================
/**
 * Xây dựng bảng ánh xạ tọa độ từ dữ liệu khu vực
 */
function buildCoordinateMapFromRegions() {
  console.log("Đang thiết lập ánh xạ tọa độ...");

  if (regionsData && regionsData.regions) {
    regionsData.regions.forEach((region) => {
      const extPath = region.ext_path;
      const coordinates = region.coordinates;

      if (
        extPath &&
        coordinates &&
        Array.isArray(coordinates) &&
        coordinates.length === 2
      ) {
        coordinateMap.set(extPath, coordinates);
      }
    });
  }

  Object.entries(INTERNATIONAL_COORDINATES).forEach(([name, coords]) => {
    coordinateMap.set(name, coords);
  });

  console.log("Ánh xạ tọa độ thiết lập hoàn tất, tổng cộng", coordinateMap.size, "địa điểm");
  console.log("Tọa độ quốc tế:", Object.keys(INTERNATIONAL_COORDINATES));
}

// ==================== Tải dữ liệu ====================
/**
 * Tải dữ liệu tọa độ địa lý
 */
async function loadGeographicData() {
  try {
    const response = await fetch("data/global_regions_coordinates.json");

    if (response.ok) {
      regionsData = await response.json();
      buildCoordinateMapFromRegions();
      console.log("global_regions_coordinates.json tải thành công");
    } else {
      throw new Error("global_regions_coordinates.json tải thất bại");
    }

    return true;
  } catch (error) {
    console.warn("Tải dữ liệu địa lý bên ngoài thất bại:", error.message);
    Object.entries(INTERNATIONAL_COORDINATES).forEach(([name, coords]) => {
      coordinateMap.set(name, coords);
    });
    console.log("Đã tải dữ liệu tọa độ quốc tế dự phòng");
    return true;
  }
}

/**
 * Tải dữ liệu sự kiện hành trình
 */
async function loadTrajectoryData() {
  try {
    const response = await fetch("data/hochiminh_events.json");
    if (!response.ok) {
      throw new Error(
        `Tải dữ liệu sự kiện thất bại: ${response.status} - ${response.statusText}`
      );
    }

    const rawData = await response.json();

    if (
      !rawData.events ||
      !Array.isArray(rawData.events) ||
      rawData.events.length === 0
    ) {
      throw new Error("hochiminh_events.json định dạng sai hoặc dữ liệu sự kiện trống");
    }

    return processTrajectoryData(rawData);
  } catch (error) {
    console.error("Tải dữ liệu hành trình thất bại:", error);
    throw error;
  }
}

// ==================== Khớp tọa độ ====================
/**
 * Xây dựng đường dẫn đầy đủ của đơn vị hành chính
 */
function buildFullLocationPath(locationInfo) {
  if (!locationInfo) return null;

  let parts = [];

  if (locationInfo.country && locationInfo.country !== "Việt Nam") {
    // Địa điểm quốc tế: Country + City
    parts.push(locationInfo.country);
    if (locationInfo.city) {
      parts.push(locationInfo.city);
    }
  } else {
    // Địa điểm Việt Nam: Việt Nam + Province + City + District
    // Thêm "Việt Nam" vào đầu để khớp với ext_path trong JSON
    parts.push("Việt Nam");
    
    if (locationInfo.province) {
      parts.push(locationInfo.province);
    }
    if (locationInfo.city) {
      parts.push(locationInfo.city);
    }
    if (locationInfo.district && locationInfo.district !== locationInfo.city) {
      parts.push(locationInfo.district);
    }
  }

  const fullPath = parts.length > 0 ? parts.join(" ") : null;

  return fullPath;
}

/**
 * Lấy tọa độ dựa trên thông tin vị trí
 */
function getCoordinates(locationInfo) {
  if (!locationInfo) return null;

  if (locationInfo.coordinates) {
    return locationInfo.coordinates;
  }

  const fullPath = buildFullLocationPath(locationInfo);
  
  // Thử khớp với path đầy đủ trước
  if (fullPath && coordinateMap.has(fullPath)) {
    return coordinateMap.get(fullPath);
  }

  // Fallback: Thử khớp với các path ngắn hơn (bỏ district, city, v.v.)
  // Chỉ áp dụng cho địa điểm Việt Nam
  if (fullPath && (!locationInfo.country || locationInfo.country === "Việt Nam")) {
    const pathParts = fullPath.split(" ");
    
    // Thử bỏ phần cuối (district)
    if (pathParts.length > 3) {
      const pathWithoutDistrict = pathParts.slice(0, -1).join(" ");
      if (coordinateMap.has(pathWithoutDistrict)) {
        console.log(`Khớp tọa độ với path ngắn hơn (bỏ district): ${pathWithoutDistrict}`);
        return coordinateMap.get(pathWithoutDistrict);
      }
    }
    
    // Thử bỏ phần cuối thứ hai (city)
    if (pathParts.length > 2) {
      const pathWithoutCity = pathParts.slice(0, -2).join(" ");
      if (coordinateMap.has(pathWithoutCity)) {
        console.log(`Khớp tọa độ với path ngắn hơn (bỏ city): ${pathWithoutCity}`);
        return coordinateMap.get(pathWithoutCity);
      }
    }
  }

  console.warn("Không thể khớp tọa độ:", locationInfo, "Đường dẫn đã xây dựng:", fullPath);
  return null;
}

/**
 * Lấy tọa độ và định dạng tên địa điểm
 */
function getCoordinatesWithLocation(locationInfo) {
  if (!locationInfo) return { coordinates: null, location: "Địa điểm không xác định" };

  if (locationInfo.coordinates) {
    return {
      coordinates: locationInfo.coordinates,
      location: formatLocationName(locationInfo),
    };
  }

  // Sử dụng getCoordinates để có fallback logic
  const coordinates = getCoordinates(locationInfo);

  return {
    coordinates: coordinates,
    location: formatLocationName(locationInfo),
  };
}

/**
 * Định dạng hiển thị tên địa điểm
 */
function formatLocationName(locationInfo) {
  if (!locationInfo) return "Địa điểm không xác định";

  let parts = [];

  if (locationInfo.country && locationInfo.country !== "Việt Nam") {
    parts.push(locationInfo.country);
    if (locationInfo.city) parts.push(locationInfo.city);
  } else {
    if (locationInfo.province) parts.push(locationInfo.province);
    if (locationInfo.city && locationInfo.city !== locationInfo.province) {
      parts.push(locationInfo.city);
    }
    if (locationInfo.district && locationInfo.district !== locationInfo.city) {
      parts.push(locationInfo.district);
    }
  }

  return parts.length > 0 ? parts.join(" ") : "Địa điểm không xác định";
}

// ==================== Xử lý dữ liệu hành trình ====================
/**
 * Xử lý dữ liệu hành trình gốc, thêm thông tin tọa độ
 */
function processTrajectoryData(data) {
  const processedEvents = data.events.map((event, index) => {
    const processed = {
      ...event,
      index: index,
      startCoords: null,
      endCoords: null,
      transitCoords: [],
      startLocation: null,
      endLocation: null,
    };

    if (event.coordinates && event.coordinates.start) {
      const startResult = getCoordinatesWithLocation(event.coordinates.start);
      processed.startCoords = startResult.coordinates;
      processed.startLocation = startResult.location;
    }

    if (event.coordinates && event.coordinates.end) {
      const endResult = getCoordinatesWithLocation(event.coordinates.end);
      processed.endCoords = endResult.coordinates;
      processed.endLocation = endResult.location;
    }

    if (event.coordinates && event.coordinates.transit) {
      processed.transitCoords = event.coordinates.transit
        .map((transit) => getCoordinates(transit))
        .filter((coords) => coords !== null);
    }

    if (!processed.endLocation && processed.startLocation) {
      processed.endLocation = processed.startLocation;
      processed.endCoords = processed.startCoords;
    }

    return processed;
  });

  return {
    ...data,
    events: processedEvents,
  };
}

// ==================== Tổng hợp vị trí ====================
/**
 * Tổng hợp sự kiện theo vị trí địa lý
 */
function groupEventsByLocation(events, maxIndex) {
  const groups = new Map();

  for (let i = 0; i <= maxIndex; i++) {
    const event = events[i];

    if (event.movementType === "Sinh ra") {
      if (event.endCoords && event.endLocation) {
        const coordKey = `${event.endCoords[0]},${event.endCoords[1]}`;

        if (!groups.has(coordKey)) {
          groups.set(coordKey, {
            coordinates: event.endCoords,
            location: event.endLocation,
            events: [],
            types: new Set(),
          });
        }

        const group = groups.get(coordKey);
        group.events.push({
          ...event,
          index: i,
          date: event.date,
          event: event.event,
          age: event.age,
          visitType: "Sinh ra",
        });

        group.types.add(event.movementType);
      }
    } else if (event.movementType === "Hoạt động tại chỗ") {
      if (event.endCoords && event.endLocation) {
        const coordKey = `${event.endCoords[0]},${event.endCoords[1]}`;

        if (!groups.has(coordKey)) {
          groups.set(coordKey, {
            coordinates: event.endCoords,
            location: event.endLocation,
            events: [],
            types: new Set(),
          });
        }

        const group = groups.get(coordKey);
        group.events.push({
          ...event,
          index: i,
          date: event.date,
          event: event.event,
          age: event.age,
          visitType: "Hoạt động",
        });

        group.types.add(event.movementType);
      }
    } else {
      if (event.startCoords && event.startLocation) {
        const coordKey = `${event.startCoords[0]},${event.startCoords[1]}`;

        if (!groups.has(coordKey)) {
          groups.set(coordKey, {
            coordinates: event.startCoords,
            location: event.startLocation,
            events: [],
            types: new Set(),
          });
        }

        const group = groups.get(coordKey);
        group.events.push({
          ...event,
          index: i,
          date: event.date,
          event: event.event,
          age: event.age,
          visitType: "Khởi hành",
        });

        group.types.add(event.movementType);
      }

      if (event.endCoords && event.endLocation) {
        const coordKey = `${event.endCoords[0]},${event.endCoords[1]}`;

        if (!groups.has(coordKey)) {
          groups.set(coordKey, {
            coordinates: event.endCoords,
            location: event.endLocation,
            events: [],
            types: new Set(),
          });
        }

        const group = groups.get(coordKey);
        group.events.push({
          ...event,
          index: i,
          date: event.date,
          event: event.event,
          age: event.age,
          visitType: "Điểm đến",
        });

        group.types.add(event.movementType);
      }

      if (
        event.transitCoords &&
        event.transitCoords.length > 0 &&
        event.coordinates &&
        event.coordinates.transit
      ) {
        event.transitCoords.forEach((coords, transitIndex) => {
          if (coords && event.coordinates.transit[transitIndex]) {
            const transitInfo = event.coordinates.transit[transitIndex];
            const transitResult = getCoordinatesWithLocation(transitInfo);

            if (transitResult.coordinates && transitResult.location) {
              const coordKey = `${coords[0]},${coords[1]}`;

              if (!groups.has(coordKey)) {
                groups.set(coordKey, {
                  coordinates: coords,
                  location: transitResult.location,
                  events: [],
                  types: new Set(),
                });
              }

              const group = groups.get(coordKey);
              group.events.push({
                ...event,
                index: i,
                date: event.date,
                event: `Đi qua: ${event.event}`,
                age: event.age,
                visitType: "Đi qua",
                originalEvent: event.event,
              });

              group.types.add(event.movementType);
            }
          }
        });
      }
    }
  }

  return groups;
}

/**
 * Lấy lớp kiểu đánh dấu dựa trên số lần truy cập
 */
function getVisitCountClass(visitCount) {
  if (visitCount === 1) return "visits-1";
  if (visitCount === 2) return "visits-2";
  if (visitCount === 3) return "visits-3";
  return "visits-4-plus";
}

/**
 * Lấy loại đánh dấu chính dựa trên loại sự kiện
 */
function getPrimaryMarkerType(types) {
  if (types.has("Sinh ra")) return "marker-birth";

  if (types.has("Di chuyển quốc tế")) return "marker-international";

  if (types.has("Di chuyển ngắn")) return "marker-long-distance";

  if (types.has("Di chuyển ngắn")) return "marker-short-distance";

  const movementTypes = ["Di chuyển quốc tế", "Di chuyển ngắn", "Di chuyển ngắn"].filter((type) =>
    types.has(type)
  );
  if (movementTypes.length > 1) return "marker-mixed";

  if (types.has("Hoạt động tại chỗ")) return "marker-activity";

  return "marker-movement";
}

/**
 * Tạo đánh dấu địa điểm
 */
function createLocationMarker(
  locationGroup,
  isCurrent = false,
  isVisited = false
) {
  const { coordinates, location, events, types } = locationGroup;
  const [lng, lat] = coordinates;
  const visitCount = events.length;

  const markerClasses = [
    "location-marker",
    getPrimaryMarkerType(types),
    getVisitCountClass(visitCount),
  ];

  if (isCurrent) markerClasses.push("current");
  if (isVisited) markerClasses.push("visited");

  const markerContent = visitCount > 1 ? visitCount.toString() : "";

  const baseSize = isMobileDevice() ? 2 : 0;
  const iconSizes = {
    1: [14 + baseSize, 14 + baseSize],
    2: [18 + baseSize, 18 + baseSize],
    3: [22 + baseSize, 22 + baseSize],
    4: [26 + baseSize, 26 + baseSize],
  };

  const sizeKey = visitCount >= 4 ? 4 : visitCount;
  const iconSize = iconSizes[sizeKey];
  const iconAnchor = [iconSize[0] / 2, iconSize[1] / 2];

  const markerElement = L.divIcon({
    className: markerClasses.join(" "),
    html: markerContent,
    iconSize: iconSize,
    iconAnchor: iconAnchor,
  });

  const marker = L.marker([lat, lng], {
    icon: markerElement,
    interactive: true,
    keyboard: true,
    zIndexOffset: 1000,
  });

  const clickHandler = function (e) {
    e.originalEvent.stopPropagation();
    showDetailPanel(locationGroup);
  };

  marker._originalClickHandler = clickHandler;

  marker.on("click", clickHandler);

  marker.on("add", function () {
    setTimeout(() => {
      if (marker._icon) {
        marker._icon.style.zIndex = "1000";
        marker._icon.style.pointerEvents = "auto";
        marker._icon.style.cursor = "pointer";
      }
    }, 50);
  });

  let tooltipText;
  if (visitCount === 1) {
    const event = events[0];
    tooltipText = `${event.date} - ${event.visitType === "Đi qua" ? "Đi qua: " : ""}${
      event.originalEvent || event.event
    }`;
  } else {
    const transitCount = events.filter((e) => e.visitType === "Đi qua").length;
    const destCount = events.filter((e) => e.visitType === "Điểm đến").length;
    const startCount = events.filter((e) => e.visitType === "Khởi hành").length;
    const activityCount = events.filter((e) => e.visitType === "Hoạt động").length;
    const birthCount = events.filter((e) => e.visitType === "Sinh ra").length;

    let descParts = [];
    if (birthCount > 0) descParts.push(`${birthCount} lần sinh ra`);
    if (destCount > 0) descParts.push(`${destCount} lần đến`);
    if (startCount > 0) descParts.push(`${startCount} lần khởi hành`);
    if (transitCount > 0) descParts.push(`${transitCount} lần đi qua`);
    if (activityCount > 0) descParts.push(`${activityCount} lần hoạt động`);

    tooltipText = `${location} (${descParts.join(", ")})`;
  }

  marker.bindTooltip(tooltipText, {
    direction: "top",
    offset: [0, -15],
    className: "simple-tooltip",
  });

  return marker;
}

// ==================== Đánh dấu và đường đi trên bản đồ  ====================
/**
 * Tạo đường đi animation motion
 */
function createMotionPath(
  fromCoords,
  toCoords,
  transitCoords = [],
  isLatest = false,
  eventIndex = null,
  isConnectionPath = false,
  isReverse = false
) {
  if (!fromCoords || !toCoords) return null;

  const pathCoords = [];

  if (isReverse) {
    // Đường đi ngược: từ điểm cuối đến điểm đầu
    pathCoords.push([toCoords[1], toCoords[0]]);

    // Thêm điểm transit theo chiều ngược
    if (!isConnectionPath && transitCoords && transitCoords.length > 0) {
      for (let i = transitCoords.length - 1; i >= 0; i--) {
        pathCoords.push([transitCoords[i][1], transitCoords[i][0]]);
      }
    }

    pathCoords.push([fromCoords[1], fromCoords[0]]);
  } else {
    // Đường đi thuận: từ điểm đầu đến điểm cuối
    pathCoords.push([fromCoords[1], fromCoords[0]]);

    if (!isConnectionPath && transitCoords && transitCoords.length > 0) {
      transitCoords.forEach((coords) => {
        pathCoords.push([coords[1], coords[0]]);
      });
    }

    pathCoords.push([toCoords[1], toCoords[0]]);
  }

  const polylineOptions = {
    color: isLatest ? "#c0392b" : "#000000", // Đường mới nhất: đỏ, đường đã qua: đen
    weight: isConnectionPath ? 2 : 3,
    opacity: isLatest ? 0.9 : isConnectionPath ? 0.4 : 0.7, // Tăng opacity cho đường đen để dễ nhìn hơn
    smoothFactor: 1,
    dashArray: isConnectionPath ? "4, 8" : "8, 8",
  };

  // Khi kéo, sử dụng thời gian animation cực ngắn để hiển thị nhanh
  let effectiveDuration = isDragging ? 1 : animationConfig.pathDuration;

  const motionOptions = {
    auto: isDragging ? true : false,
    duration: effectiveDuration,
    easing: isDragging
      ? L.Motion.Ease.easeLinear || animationConfig.motionOptions.easing
      : animationConfig.motionOptions.easing,
  };

  const motionPath = L.motion.polyline(
    pathCoords,
    polylineOptions,
    motionOptions
  );

  // Lưu metadata đường đi
  motionPath._isAnimated = true;
  motionPath._isLatest = isLatest;
  motionPath._needsAnimation = isLatest && !isDragging;
  motionPath._eventIndex = eventIndex;
  motionPath._isConnectionPath = isConnectionPath;
  motionPath._isReverse = isReverse;
  motionPath._originalPathCoords = pathCoords;
  motionPath._pathOptions = polylineOptions;

  return motionPath;
}

/**
 * Cập nhật kiểu đường đi
 */
function updatePathStyle(path, isLatest) {
  if (!path) return;

  const color = isLatest ? "#c0392b" : "#000000"; // Đường mới nhất: đỏ, đường đã qua: đen
  const opacity = isLatest ? 0.9 : 0.7; // Tăng opacity cho đường đen để dễ nhìn hơn

  path.setStyle({
    color: color,
    opacity: opacity,
    dashArray: "8, 8",
  });

  path._isLatest = isLatest;

  if (path._path) {
    path._path.style.stroke = color;
    path._path.style.strokeOpacity = opacity;
  }
}

/**
 * Cập nhật đường đi tĩnh (không có animation)
 */
function updatePathsStatic(targetIndex) {
  pathLayers.forEach((path) => {
    if (path._map) {
      map.removeLayer(path);
    }
  });
  pathLayers = [];
  motionPaths.clear();

  for (let i = 0; i <= targetIndex; i++) {
    const currentEvent = trajectoryData.events[i];

    if (
      currentEvent.startCoords &&
      currentEvent.endCoords &&
      currentEvent.movementType !== "Hoạt động tại chỗ"
    ) {
        console.log(
        `${isDragging ? "Kéo" : "Tĩnh"} thêm đường đi: Sự kiện ${i}: ${
          currentEvent.event
        }`
      );

      const isLatest = i === targetIndex;
      const motionPath = createMotionPath(
        currentEvent.startCoords,
        currentEvent.endCoords,
        currentEvent.transitCoords,
        isLatest,
        i,
        false,
        false
      );

      if (motionPath) {
        motionPath._needsAnimation = false;
        motionPath._initiallyHidden = false;
        motionPath.addTo(map);
        pathLayers.push(motionPath);
        motionPaths.set(i, motionPath);

        // Nếu đang ở trạng thái kéo, khởi động animation ngay để hiển thị nhanh
        if (isDragging && motionPath.motionStart) {
          motionPath.motionStart();
        }

        console.log(`Thêm thành công ${isDragging ? "kéo" : "tĩnh"} đường đi: Sự kiện ${i}`);
      } else {
        console.warn(`Tạo đường đi thất bại: Sự kiện ${i}`);
      }
    } else {
      console.log(`Bỏ qua sự kiện ${i}: ${currentEvent.event} (Hoạt động tại chỗ hoặc thiếu tọa độ)`);
    }
  }
}

/**
 * Tạo animation đường đi biến mất
 */
function animatePathDisappear(path) {
  if (!path || !path._map) return;

  const pathElement = path._path;
  if (!pathElement) {
    map.removeLayer(path);
    return;
  }

  const totalLength = pathElement.getTotalLength();

  pathElement.style.strokeDasharray = totalLength;
  pathElement.style.strokeDashoffset = "0";
  pathElement.style.transition = `stroke-dashoffset ${animationConfig.pathDuration}ms ease-in-out, opacity ${animationConfig.pathDuration}ms ease-in-out`;

  setTimeout(() => {
    pathElement.style.strokeDashoffset = totalLength;
    pathElement.style.opacity = "0";
  }, 50);

  setTimeout(() => {
    if (path._map) {
      map.removeLayer(path);
    }
  }, animationConfig.pathDuration + 100);
}

/**
 * Thực thi animation đường đi biến mất hàng loạt
 */
function batchAnimatePathsDisappear(paths, staggerDelay = 200) {
  if (!paths || paths.length === 0) return;

  return new Promise((resolve) => {
    let completedCount = 0;
    const totalPaths = paths.length;

    paths.forEach((path, index) => {
      setTimeout(() => {
        animatePathDisappear(path);

        completedCount++;
        if (completedCount === totalPaths) {
          setTimeout(() => {
            resolve();
          }, animationConfig.pathDuration + 100);
        }
      }, index * staggerDelay);
    });
  });
}

/**
 * Cập nhật đường đi với animation
 */
function updatePathsAnimated(targetIndex, isReverse = false) {
  if (isReverse) {
    // Animation ngược: làm các đường đi phía sau dần biến mất
    const pathsToRemove = pathLayers.filter(
      (path) => path._eventIndex > targetIndex
    );

    if (pathsToRemove.length > 0) {
      console.log(`Bắt đầu animation biến mất ngược, xóa ${pathsToRemove.length} đường đi`);

      pathsToRemove.forEach((path, index) => {
        setTimeout(() => {
          animatePathDisappear(path);
        }, index * 100);
      });

      // Trì hoãn dọn dẹp mảng và ánh xạ đường đi
      setTimeout(() => {
        pathsToRemove.forEach((pathToRemove) => {
          const pathIndex = pathLayers.indexOf(pathToRemove);
          if (pathIndex > -1) {
            pathLayers.splice(pathIndex, 1);
          }
          if (motionPaths.has(pathToRemove._eventIndex)) {
            motionPaths.delete(pathToRemove._eventIndex);
          }
        });
      }, pathsToRemove.length * 200 + animationConfig.pathDuration);
    }
  } else {
    // Animation thuận: thêm đường đi mới
    const currentEvent = trajectoryData.events[targetIndex];

    pathLayers.forEach((path) => {
      if (path._isLatest) {
        updatePathStyle(path, false);
      }
    });

    if (
      currentEvent.startCoords &&
      currentEvent.endCoords &&
      currentEvent.movementType !== "Hoạt động tại chỗ"
    ) {
      console.log(
        `Motion thêm đường đi: Sự kiện ${targetIndex} - ${currentEvent.event}`
      );

      const motionPath = createMotionPath(
        currentEvent.startCoords,
        currentEvent.endCoords,
        currentEvent.transitCoords,
        true,
        targetIndex,
        false,
        false
      );

      if (motionPath) {
        motionPath.addTo(map);
        pathLayers.push(motionPath);
        motionPaths.set(targetIndex, motionPath);

        motionPath.motionStart();
      }
    }
  }
}

/**
 * Cập nhật đánh dấu sự kiện
 */
function updateEventMarkers(targetIndex) {
  eventMarkers.forEach((marker) => map.removeLayer(marker));
  eventMarkers = [];
  locationMarkers.clear();

  locationGroups = groupEventsByLocation(trajectoryData.events, targetIndex);

  const currentEvent = trajectoryData.events[targetIndex];
  const currentCoordKey = currentEvent.endCoords
    ? `${currentEvent.endCoords[0]},${currentEvent.endCoords[1]}`
    : null;

  locationGroups.forEach((locationGroup, coordKey) => {
    const isCurrent = coordKey === currentCoordKey;
    const isVisited = !isCurrent;

    const marker = createLocationMarker(locationGroup, isCurrent, isVisited);

    if (marker) {
      marker.addTo(map);
      eventMarkers.push(marker);
      locationMarkers.set(coordKey, marker);
    }
  });

  setTimeout(() => {
    ensureMarkersInteractivity();
  }, 100);
}

/**
 * Đảm bảo tính tương tác của đánh dấu hoạt động bình thường
 */
function ensureMarkersInteractivity() {
  eventMarkers.forEach((marker) => {
    if (marker._icon) {
      const zIndex = Math.abs(parseInt(marker._icon.style.zIndex) || 0) || 1000;
      marker._icon.style.zIndex = zIndex;

      marker._icon.style.pointerEvents = "auto";
      marker._icon.style.cursor = "pointer";

      if (!marker._hasInteractivityEnsured) {
        marker._hasInteractivityEnsured = true;

        const originalOnClick = marker._originalClickHandler;
        if (originalOnClick) {
          marker.off("click");
          marker.on("click", originalOnClick);
        }
      }
    }
  });

  if (map && map.invalidateSize) {
    map.invalidateSize({
      animate: false,
      pan: false,
    });
  }
}

// ==================== Điều khiển animation ====================
/**
 * Hiển thị sự kiện tại chỉ mục được chỉ định
 */
function showEventAtIndex(index, animated = true, isUserDrag = false) {
  if (!trajectoryData || index >= trajectoryData.events.length || index < 0)
    return;
  if (animationConfig.isAnimating && !isUserDrag) return;

  const isMovingForward = index > currentEventIndex;
  const isMovingBackward = index < currentEventIndex;

  previousEventIndex = currentEventIndex;
  currentEventIndex = index;
  const event = trajectoryData.events[index];

  if (animated && (isMovingForward || isMovingBackward)) {
    animationConfig.isAnimating = true;
    setTimeout(() => {
      animationConfig.isAnimating = false;
    }, animationConfig.pathDuration + 100);
  }

  updateCurrentEventInfo(event);
  updateProgress();
  updateEventMarkers(index);

  if (animated && (isMovingForward || isMovingBackward)) {
    updatePathsAnimated(index, isMovingBackward);
  } else {
    updatePathsStatic(index);
  }

  if (isCameraFollowEnabled) {
    handleCameraFollow(event, previousEventIndex, animated);
  }

  if (animated) {
    setTimeout(() => {
      ensureMarkersInteractivity();
      // Hiển thị popup event sau khi animation đường đi hoàn thành
      if (isMovingForward && !isUserDrag) {
        showEventPopup(event, index);
      }
    }, animationConfig.pathDuration + 100);
  } else if (!isUserDrag) {
    // Hiển thị popup ngay cả khi không có animation (khi tải trang lần đầu)
    showEventPopup(event, index);
  }
}

// ==================== Điều khiển camera theo dõi ====================
/**
 * Xử lý logic camera theo dõi
 */
function handleCameraFollow(currentEvent, previousIndex, animated = true) {
  if (!currentEvent) return;

  const bounds = calculatePathBounds(currentEvent, previousIndex);
  if (bounds && bounds.isValid()) {
    const panOptions = {
      animate: animated,
      duration: animated ? animationConfig.cameraFollowDuration / 1000 : 0, // Thời lượng camera
      paddingTopLeft: [50, 50],
      paddingBottomRight: [50, 100],
      maxZoom: 8,
      easeLinearity: 0.5,
    };

    map.fitBounds(bounds, panOptions);
  } else if (currentEvent.endCoords) {
    const [lng, lat] = currentEvent.endCoords;
    const panOptions = {
      animate: animated,
      duration: animated ? animationConfig.cameraPanDuration / 1000 : 0, // Thời lượng di chuyển
      easeLinearity: 0.5,
    };
    map.setView([lat, lng], Math.max(map.getZoom(), 6), panOptions);
  }
}

/**
 * Tính toán khung giới hạn đường đi
 */
function calculatePathBounds(currentEvent, previousIndex) {
  const coordinates = [];

  if (previousIndex >= 0 && trajectoryData.events[previousIndex]) {
    const prevEvent = trajectoryData.events[previousIndex];
    if (prevEvent.endCoords) {
      coordinates.push([prevEvent.endCoords[1], prevEvent.endCoords[0]]);
    }
  }

  if (currentEvent.startCoords) {
    coordinates.push([
      currentEvent.startCoords[1],
      currentEvent.startCoords[0],
    ]);
  }

  if (currentEvent.transitCoords && currentEvent.transitCoords.length > 0) {
    currentEvent.transitCoords.forEach((coords) => {
      if (coords && coords.length === 2) {
        coordinates.push([coords[1], coords[0]]);
      }
    });
  }

  if (currentEvent.endCoords) {
    coordinates.push([currentEvent.endCoords[1], currentEvent.endCoords[0]]);
  }

  if (coordinates.length === 1) {
    const [lat, lng] = coordinates[0];
    const offset = 0.1;
    coordinates.push([lat + offset, lng + offset]);
    coordinates.push([lat - offset, lng - offset]);
  }

  if (coordinates.length >= 2) {
    try {
      return L.latLngBounds(coordinates);
    } catch (error) {
      console.warn("Tính toán khung giới hạn thất bại:", error);
      return null;
    }
  }

  return null;
}

/**
 * Chuyển đổi trạng thái camera theo dõi
 */
function toggleCameraFollow() {
  isCameraFollowEnabled = !isCameraFollowEnabled;
  updateCameraFollowUI();

  try {
    localStorage.setItem(
      "cameraFollowEnabled",
      isCameraFollowEnabled.toString()
    );
  } catch (error) {
    console.warn("Không thể lưu cài đặt camera theo dõi:", error);
  }
}

/**
 * Cập nhật trạng thái UI camera theo dõi
 */
function updateCameraFollowUI() {
  const cameraSwitch = document.getElementById("camera-follow-switch");
  const cameraStatus = document.getElementById("camera-follow-status");

  if (cameraSwitch) {
    if (isCameraFollowEnabled) {
      cameraSwitch.classList.add("active");
    } else {
      cameraSwitch.classList.remove("active");
    }
  }

  if (cameraStatus) {
    cameraStatus.textContent = isCameraFollowEnabled ? "Bật" : "Tắt";
  }
}

/**
 * Khởi tạo điều khiển camera theo dõi
 */
function initCameraFollowControl() {
  try {
    const saved = localStorage.getItem("cameraFollowEnabled");
    if (saved !== null) {
      isCameraFollowEnabled = saved === "true";
    }
  } catch (error) {
    console.warn("Không thể đọc cài đặt camera theo dõi:", error);
  }

  const cameraSwitch = document.getElementById("camera-follow-switch");
  if (cameraSwitch) {
    cameraSwitch.addEventListener("click", toggleCameraFollow);
  }

  updateCameraFollowUI();
}

// ==================== Chức năng làm nổi bật đường đi ====================
/**
 * Làm nổi bật đường đi của sự kiện được chỉ định
 */
function highlightEventPath(eventIndex) {
  if (
    !trajectoryData ||
    eventIndex < 0 ||
    eventIndex >= trajectoryData.events.length
  ) {
    return;
  }

  clearPathHighlight();

  const motionPath = motionPaths.get(eventIndex);

  if (motionPath && motionPath._map) {
    const originalStyle = {
      color: motionPath.options.color,
      weight: motionPath.options.weight,
      opacity: motionPath.options.opacity,
      dashArray: motionPath.options.dashArray,
    };

    motionPath.setStyle({
      color: "#e74c3c",
      weight: 5,
      opacity: 0.9,
      dashArray: "10, 0",
    });

    motionPath.motionStart();

    highlightedPaths.push({
      path: motionPath,
      originalStyle: originalStyle,
    });

    currentHighlightedEventIndex = eventIndex;

    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
    }

    highlightTimeout = setTimeout(() => {
      clearPathHighlight();
    }, 4000);

    // Tập trung vào đường đi
    if (motionPath.getBounds && isCameraFollowEnabled) {
      try {
        const bounds = motionPath.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 8,
            animate: true,
            duration: animationConfig.cameraFollowDuration / 1000, // Thời lượng camera
            easeLinearity: 0.5,
          });
        }
      } catch (error) {
        console.warn("Tập trung vào đường đi thất bại:", error);
      }
    }
  }
}

/**
 * Xóa làm nổi bật đường đi
 */
function clearPathHighlight() {
  if (highlightTimeout) {
    clearTimeout(highlightTimeout);
    highlightTimeout = null;
  }

  highlightedPaths.forEach(({ path, originalStyle }) => {
    if (path && path._map) {
      try {
        path.setStyle(originalStyle);
        path.motionStart();
      } catch (error) {
        console.warn("Khôi phục kiểu đường đi thất bại:", error);
      }
    }
  });

  highlightedPaths = [];
  currentHighlightedEventIndex = -1;
}

/**
 * Xóa nhanh làm nổi bật đường đi
 */
function quickClearPathHighlight() {
  if (highlightTimeout) {
    clearTimeout(highlightTimeout);
    highlightTimeout = null;
  }

  highlightedPaths.forEach(({ path, originalStyle }) => {
    if (path && path._map) {
      try {
        path.setStyle({
          ...originalStyle,
          opacity: originalStyle.opacity * 0.3,
        });

        setTimeout(() => {
          if (path && path._map) {
            path.setStyle(originalStyle);
            path.motionStart();
          }
        }, 200);
      } catch (error) {
        console.warn("Xóa nhanh làm nổi bật đường đi thất bại:", error);
      }
    }
  });

  highlightedPaths = [];
  currentHighlightedEventIndex = -1;
}

// ==================== Popup hiển thị thông tin event ====================
/**
 * Hiển thị popup thông tin event khi đến địa điểm
 */
function showEventPopup(event, eventIndex) {
  // Chỉ hiển thị khi đang phát tự động hoặc khi có endCoords
  if (!event || !event.endCoords) return;

  // Xóa popup cũ nếu có
  hideEventPopup();

  const popup = document.getElementById("event-popup");
  const popupDate = document.getElementById("event-popup-date");
  const popupAge = document.getElementById("event-popup-age");
  const popupLocation = document.getElementById("event-popup-location");
  const popupTitle = document.getElementById("event-popup-title");
  const popupImage = document.getElementById("event-popup-image");
  const popupImageContainer = document.getElementById("event-popup-image-container");
  const continueBtn = document.getElementById("event-popup-continue-btn");

  if (!popup || !popupDate || !popupAge || !popupLocation || !popupTitle) return;

  // Lưu event index hiện tại
  currentPopupEventIndex = eventIndex;

  // Định dạng ngày tháng
  const dateStr = event.date || "Không xác định";
  const formattedDate = formatEventDate(dateStr);

  // Cập nhật nội dung popup
  popupDate.textContent = formattedDate;
  popupAge.textContent = `Tuổi: ${event.age || 0}`;
  popupLocation.textContent = event.endLocation || "Địa điểm không xác định";
  popupTitle.textContent = event.event || "Không có mô tả";

  // Xử lý YouTube video hoặc hình ảnh
  const youtubeContainer = document.getElementById("event-popup-youtube-container");
  
  if (popupImage && popupImageContainer && youtubeContainer) {
    // Nếu có YouTube video, hiển thị video thay vì ảnh
    if (event.youtubeVideo) {
      // Ẩn ảnh
      popupImage.style.display = "none";
      // Hiển thị container để YouTube có thể render (container chứa cả ảnh và YouTube)
      popupImageContainer.style.display = "block";
      // Hiển thị YouTube container
      youtubeContainer.style.display = "block";
      youtubeContainer.style.visibility = "visible";
      youtubeContainer.style.opacity = "1";
      
      // Tắt nhạc nền nếu là event cuối cùng để tập trung vào video YouTube
      if (eventIndex === trajectoryData.events.length - 1) {
        pauseBackgroundMusic();
      }
      
      // Lấy video ID từ URL YouTube
      const videoId = extractYouTubeVideoId(event.youtubeVideo);
      if (videoId) {
        console.log("Đang tải YouTube video với ID:", videoId, "cho event:", eventIndex);
        // Đợi một chút để đảm bảo container đã được hiển thị
        setTimeout(() => {
          loadYouTubeVideo(videoId, eventIndex);
        }, 100);
      }
      
      // Ẩn nút Continue nếu là event cuối cùng (video sẽ tự động chuyển)
      if (eventIndex === trajectoryData.events.length - 1 && continueBtn) {
        continueBtn.style.display = "none";
      }
    } else {
      // Hiển thị hình ảnh nếu có
      youtubeContainer.style.display = "none";
      youtubeContainer.style.visibility = "hidden";
      popupImageContainer.style.display = "block";
      if (event.image) {
        popupImage.src = event.image;
        popupImage.style.display = "block";
        popupImage.onerror = () => {
          popupImage.style.display = "none";
        };
      } else {
        popupImage.style.display = "none";
      }
      
      // Hiển thị nút Continue cho các event không phải YouTube video
      if (continueBtn) {
        continueBtn.style.display = "block";
      }
    }
  }

  // Hiển thị popup với animation
  popup.classList.add("visible");

  // Thêm event listener cho nút Tiếp tục (phải làm trước khi phát audio)
  if (continueBtn) {
    // Xóa event listener cũ
    continueBtn.onclick = null;
    // Thêm event listener mới
    continueBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Đánh dấu user đã tương tác
      userHasInteracted = true;
      console.log("Nút Tiếp tục được click");
      // Dừng YouTube video nếu đang phát
      if (youtubePlayer) {
        try {
          youtubePlayer.stopVideo();
        } catch (e) {
          console.warn("Không thể dừng YouTube video:", e);
        }
      }
      continueToNextEvent(eventIndex);
    };
  }

  // Phát audio nếu có (chỉ khi không có YouTube video)
  if (!event.youtubeVideo) {
    playEventAudio(event, eventIndex);
  }
}

/**
 * Ẩn popup thông tin event
 */
function hideEventPopup() {
  const popup = document.getElementById("event-popup");
  if (popup) {
    popup.classList.remove("visible");
  }

  // Dừng audio đang phát
  stopEventAudio();

  // Dừng YouTube video nếu đang phát
  if (youtubePlayer) {
    try {
      youtubePlayer.stopVideo();
      youtubePlayer.destroy();
      youtubePlayer = null;
    } catch (e) {
      console.warn("Không thể dừng YouTube video:", e);
    }
  }
  
  // Xóa container YouTube
  const youtubeContainer = document.getElementById("event-popup-youtube-container");
  if (youtubeContainer) {
    youtubeContainer.innerHTML = "";
    youtubeContainer.style.display = "none";
  }

  if (eventPopupTimeout) {
    clearTimeout(eventPopupTimeout);
    eventPopupTimeout = null;
  }

  if (eventPopupProgressInterval) {
    clearInterval(eventPopupProgressInterval);
    eventPopupProgressInterval = null;
  }

  eventPopupRemainingTime = 0;
  currentPopupEventIndex = -1;
}

/**
 * Chuyển sang event tiếp theo
 */
function continueToNextEvent(eventIndex) {
  console.log("continueToNextEvent được gọi với eventIndex:", eventIndex, "isPlaying:", isPlaying);
  
  // Clear timeout trong playNextEvent nếu có
  if (playInterval) {
    clearTimeout(playInterval);
    playInterval = null;
  }
  
  // Dừng audio và đóng popup
  hideEventPopup();
  
  // Kiểm tra xem có event tiếp theo không
  if (eventIndex < trajectoryData.events.length - 1) {
    const nextIndex = eventIndex + 1;
    
    // Nếu đang phát tự động, gọi playNextEvent để tiếp tục chuỗi
    if (isPlaying) {
      if (typeof playNextEvent === 'function') {
        console.log("Gọi playNextEvent (đang phát tự động)");
        playNextEvent();
      } else {
        console.error("playNextEvent không tồn tại");
      }
    } else {
      // Nếu không đang phát tự động, chỉ chuyển sang event tiếp theo mà không tự động tiếp tục
      console.log("Chuyển sang event tiếp theo (không phát tự động):", nextIndex);
      showEventAtIndex(nextIndex, true);
    }
  } else {
    console.log("Đã đến event cuối cùng, không có event tiếp theo");
    // Nếu event cuối cùng có YouTube video, video sẽ tự động chuyển khi kết thúc
    // Logic xử lý video kết thúc đã được xử lý trong onStateChange của YouTube player
  }
}

/**
 * Phát audio cho event
 */
function playEventAudio(event, eventIndex) {
  // Dừng audio cũ nếu có
  stopEventAudio();

  // Không có audio thì tự động chuyển sang event tiếp theo sau một chút
  if (!event || !event.audio) {
    // Nếu không có audio, tự động chuyển sang event tiếp theo sau 8 giây
    if (eventIndex < trajectoryData.events.length - 1) {
      eventPopupTimeout = setTimeout(() => {
        continueToNextEvent(eventIndex);
      }, 8000);
    }
    return;
  }

  // Khởi tạo audio element nếu chưa có
  if (!eventAudio) {
    eventAudio = document.getElementById("event-audio");
    if (!eventAudio) {
      eventAudio = document.createElement("audio");
      eventAudio.id = "event-audio";
      eventAudio.preload = "auto";
      document.body.appendChild(eventAudio);
    }
  }

  // Xóa event listener cũ nếu có
  eventAudio.onended = null;
  
  // Thêm event listener khi audio kết thúc - luôn tự động chuyển sang event tiếp theo
  eventAudio.onended = () => {
    console.log("Audio đã phát xong, tự động chuyển sang event tiếp theo");
    // Tự động chuyển sang event tiếp theo khi audio phát xong (không phụ thuộc vào isPlaying)
    if (eventIndex < trajectoryData.events.length - 1) {
      continueToNextEvent(eventIndex);
    }
  };

  // Phát file audio MP3
  eventAudio.src = event.audio;
  eventAudio.volume = 0.7; // Volume 70% cho narration
  
  // Load audio
  eventAudio.load();
  
  // Chỉ phát audio nếu user đã tương tác với trang
  if (userHasInteracted) {
    const playPromise = eventAudio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("Audio đang phát:", event.audio);
        })
        .catch((error) => {
          console.warn("Không thể phát audio:", error);
          // Nếu không phát được audio, tự động chuyển sang event tiếp theo
          if (eventIndex < trajectoryData.events.length - 1) {
            setTimeout(() => {
              continueToNextEvent(eventIndex);
            }, 1000);
          }
        });
    }
  } else {
    // Nếu user chưa tương tác, tự động chuyển sau 8 giây
    console.log("User chưa tương tác, bỏ qua audio và tự động chuyển sau 8 giây");
    if (eventIndex < trajectoryData.events.length - 1) {
      eventPopupTimeout = setTimeout(() => {
        continueToNextEvent(eventIndex);
      }, 8000);
    }
  }
  
  currentEventAudio = eventAudio;
}

/**
 * Dừng audio đang phát
 */
function stopEventAudio() {
  if (eventAudio) {
    eventAudio.pause();
    eventAudio.currentTime = 0;
    eventAudio.onended = null;
    // Không xóa src để tránh lỗi khi load lại
  }
  
  currentEventAudio = null;
}

/**
 * Cập nhật thanh tiến độ popup
 */
function updatePopupProgress() {
  const popupProgressFill = document.getElementById("event-popup-progress-fill");
  const popupProgressText = document.getElementById("event-popup-progress-text");

  if (popupProgressFill && popupProgressText) {
    const progress = (eventPopupRemainingTime / 6) * 100;
    popupProgressFill.style.width = `${progress}%`;
    popupProgressText.textContent = `${eventPopupRemainingTime}s`;
  }
}

/**
 * Định dạng ngày tháng cho hiển thị
 */
function formatEventDate(dateStr) {
  if (!dateStr) return "Không xác định";

  // Nếu là định dạng YYYY-MM-DD
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }

  // Nếu chỉ có năm
  if (dateStr.match(/^\d{4}$/)) {
    return dateStr;
  }

  return dateStr;
}

// ==================== Cập nhật UI ====================
/**
 * Cập nhật hiển thị thông tin sự kiện hiện tại
 */
function updateCurrentEventInfo(event) {
  const pcElements = {
    "event-date": event.date,
    "event-title": event.event,
    "event-location": event.endLocation,
    "current-age": event.age,
  };

  Object.entries(pcElements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });

  const mobileElements = {
    "event-date-mobile": event.date,
    "event-title-mobile": event.event,
    "event-location-mobile": event.endLocation,
    "current-age-mobile": event.age,
  };

  Object.entries(mobileElements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });
}

/**
 * Cập nhật thông tin tiến độ
 */
function updateProgress() {
  const progress = trajectoryData
    ? ((currentEventIndex + 1) / trajectoryData.events.length) * 100
    : 0;

  const mobileElements = {
    "current-progress-mobile": progress.toFixed(1) + "%",
    "current-event-index-mobile": currentEventIndex + 1,
  };

  Object.entries(mobileElements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });

  const desktopElements = {
    "current-progress-desktop": progress.toFixed(1) + "%",
    "current-event-index-desktop": currentEventIndex + 1,
    "current-age-desktop": trajectoryData.events[currentEventIndex].age,
  };

  Object.entries(desktopElements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });

  const slider = document.getElementById("timeline-slider");
  if (slider && !slider.matches(":active")) {
    slider.value = currentEventIndex;
  }
}

/**
 * Cập nhật dữ liệu thống kê
 */
function updateStatistics() {
  if (!trajectoryData || !trajectoryData.events) return;

  const events = trajectoryData.events;
  const movementEvents = events.filter(
    (e) => e.movementType !== "Sinh ra" && e.movementType !== "Hoạt động tại chỗ"
  );
  const internationalEvents = events.filter(
    (e) => e.movementType === "Di chuyển quốc tế"
  );

  const visitedPlaces = new Set();
  events.forEach((event) => {
    if (event.endLocation) {
      // Thêm địa điểm vào danh sách đã đến
      visitedPlaces.add(event.endLocation);
    }
  });

  const startYear = parseInt(events[0].date.split("-")[0]);
  const endYear = parseInt(events[events.length - 1].date.split("-")[0]);
  const timeSpan = endYear - startYear;

  const pcStats = {
    "total-events": events.length,
    "movement-count": movementEvents.length,
    "visited-places": visitedPlaces.size,
    "international-count": internationalEvents.length,
    "time-span": timeSpan + " năm",
  };

  Object.entries(pcStats).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });
}

// ==================== Điều khiển phát ====================
/**
 * Chuyển đổi trạng thái phát/tạm dừng
 */
function togglePlay() {
  const btn = document.getElementById("play-btn");
  if (!btn) return;

  // Đánh dấu user đã tương tác
  userHasInteracted = true;

  if (isPlaying) {
    isPlaying = false;
    if (playInterval) {
      clearTimeout(playInterval);
      playInterval = null;
    }
    btn.textContent = "▶";
    btn.title = "Phát";
  } else {
    isPlaying = true;
    btn.textContent = "⏸";
    btn.title = "Tạm dừng";

    playNextEvent();
  }
}

// Phát đệ quy sự kiện tiếp theo
function playNextEvent() {
  if (!isPlaying || currentEventIndex >= trajectoryData.events.length - 1) {
    if (currentEventIndex >= trajectoryData.events.length - 1) {
      isPlaying = false;
      const btn = document.getElementById("play-btn");
      if (btn) {
        btn.textContent = "▶";
        btn.title = "Phát";
      }
    }
    return;
  }

  // Clear timeout cũ nếu có
  if (playInterval) {
    clearTimeout(playInterval);
    playInterval = null;
  }

  showEventAtIndex(currentEventIndex + 1, true);

  // Không cần setTimeout nữa vì audio sẽ tự động chuyển khi phát xong
  // Chỉ đặt timeout dự phòng nếu không có audio hoặc audio quá dài (tối đa 5 phút)
  playInterval = setTimeout(() => {
    // Chỉ chuyển nếu popup vẫn đang hiển thị (có thể audio đã kết thúc nhưng popup chưa đóng)
    if (currentPopupEventIndex === currentEventIndex && isPlaying) {
      console.log("Timeout dự phòng: chuyển sang event tiếp theo");
    playNextEvent();
    }
  }, 300000); // Timeout dự phòng 5 phút
}

/**
 * Sự kiện tiếp theo
 */
function nextEvent() {
  if (currentEventIndex < trajectoryData.events.length - 1) {
    showEventAtIndex(currentEventIndex + 1, true, true);
  }
}

/**
 * Sự kiện trước đó
 */
function previousEvent() {
  if (currentEventIndex > 0) {
    showEventAtIndex(currentEventIndex - 1, true, true);
  }
}

// ==================== Điều khiển bàn phím ====================
/**
 * Hàm xử lý sự kiện bàn phím thống nhất
 */
function handleTimelineKeydown(e) {
  if (!trajectoryData || !trajectoryData.events) return;

  let newIndex = currentEventIndex;
  let handled = false;

  switch (e.key) {
    case "ArrowLeft":
    case "ArrowDown":
      newIndex = Math.max(0, currentEventIndex - 1);
      handled = true;
      break;
    case "ArrowRight":
    case "ArrowUp":
      newIndex = Math.min(
        trajectoryData.events.length - 1,
        currentEventIndex + 1
      );
      handled = true;
      break;
    case "Home":
      newIndex = 0;
      handled = true;
      break;
    case "End":
      // Kiểm tra xem có animation đang phát không
      if (isPoetryAnimationPlaying) {
        e.preventDefault();
        return;
      }
      // Không chuyển, chỉ hiển thị animation thơ
      e.preventDefault();
      showPoetryMessage();
      return;
    case " ":
      e.preventDefault();
      togglePlay();
      return;
  }

  if (handled) {
    e.preventDefault();
    if (newIndex !== currentEventIndex) {
      showEventAtIndex(newIndex, true, true);
    }
  }
}

// ==================== Điều khiển cài đặt animation ====================
/**
 * Khởi tạo thanh trượt điều khiển animation
 */
function initAnimationControls() {
  const pathDurationSlider = document.getElementById("path-duration");
  const pathDurationDisplay = document.getElementById("path-duration-display");
  const cameraSpeedSlider = document.getElementById("camera-speed-slider");
  const cameraSpeedDisplay = document.getElementById("camera-speed-display");

  if (pathDurationSlider && pathDurationDisplay) {
    pathDurationSlider.value = animationConfig.pathDuration;
    pathDurationDisplay.textContent =
      (animationConfig.pathDuration / 1000).toFixed(1) + "s";

    pathDurationSlider.addEventListener("input", (e) => {
      const newDuration = parseInt(e.target.value);
      animationConfig.pathDuration = newDuration;

      if (currentPlaySpeed < newDuration) {
        currentPlaySpeed = newDuration + 500;
        updateSpeedUI();
      }

      pathDurationDisplay.textContent = (newDuration / 1000).toFixed(1) + "s";
      updateAnimationDuration(newDuration);
    });
  }

  if (cameraSpeedSlider && cameraSpeedDisplay) {
    // Khôi phục cài đặt từ lưu trữ cục bộ
    let savedSpeedLevel = 1;
    try {
      const saved = localStorage.getItem("cameraSpeedLevel");
      if (saved !== null) {
        savedSpeedLevel = parseInt(saved);
        if (
          savedSpeedLevel < 0 ||
          savedSpeedLevel >= CAMERA_SPEED_LEVELS.length
        ) {
          savedSpeedLevel = 1;
        }
      }
    } catch (error) {
      console.warn("Không thể đọc cài đặt tốc độ camera:", error);
    }

    cameraSpeedSlider.value = savedSpeedLevel;
    updateCameraSpeed(savedSpeedLevel);

    cameraSpeedSlider.addEventListener("input", (e) => {
      const levelIndex = parseInt(e.target.value);
      updateCameraSpeed(levelIndex);

      try {
        localStorage.setItem("cameraSpeedLevel", levelIndex.toString());
      } catch (error) {
        console.warn("Không thể lưu cài đặt tốc độ camera:", error);
      }
    });
  }
}

/**
 * Cập nhật cấu hình tốc độ camera
 */
function updateCameraSpeed(levelIndex) {
  if (levelIndex < 0 || levelIndex >= CAMERA_SPEED_LEVELS.length) {
    console.warn("Mức tốc độ camera không hợp lệ:", levelIndex);
    return;
  }

  const speedConfig = CAMERA_SPEED_LEVELS[levelIndex];
  const cameraSpeedDisplay = document.getElementById("camera-speed-display");

  animationConfig.cameraFollowDuration = speedConfig.cameraFollowDuration;
  animationConfig.cameraPanDuration = speedConfig.cameraPanDuration;

  if (cameraSpeedDisplay) {
    cameraSpeedDisplay.textContent = speedConfig.name;
  }

  console.log(`Tốc độ camera theo dõi đã được điều chỉnh: ${speedConfig.name}`, {
    "Thời lượng theo dõi": speedConfig.cameraFollowDuration + "ms",
    "Thời lượng di chuyển": speedConfig.cameraPanDuration + "ms",
  });
}

/**
 * Cập nhật cấu hình thời lượng animation
 */
function updateAnimationDuration(duration) {
  document.documentElement.style.setProperty(
    "--path-animation-duration",
    duration + "ms"
  );
}

// Cập nhật UI tốc độ phát
function updateSpeedUI() {
  const speedSelect = document.getElementById("custom-speed-select");
  if (speedSelect) {
    speedSelect.dataset.value = currentPlaySpeed.toString();
    const selectText = speedSelect.querySelector(".select-text");
    if (selectText) {
      selectText.textContent = getSpeedLabel(currentPlaySpeed);
    }
  }
}

/**
 * Lấy nhãn tốc độ
 */
function getSpeedLabel(speed) {
  const speedLabels = {
    500: "Rất nhanh",
    1000: "Nhanh",
    2000: "Bình thường",
    3000: "Chậm",
    5000: "Rất chậm",
  };
  return speedLabels[speed] || `${speed}ms`;
}

/**
 * Sao chép dữ liệu sự kiện hiện tại vào clipboard
 */
function copyCurrentEventData() {
  if (!trajectoryData || !trajectoryData.events || currentEventIndex < 0) {
    showTemporaryMessage("Hiện tại không có dữ liệu sự kiện để sao chép", "warning");
    return;
  }

  try {
    const currentEvent = trajectoryData.events[currentEventIndex];

    const cleanEventData = {
      date: currentEvent.date,
      age: currentEvent.age,
      movementType: currentEvent.movementType,
      event: currentEvent.event,
      coordinates: currentEvent.coordinates,
      verification: currentEvent.verification || "",
      userVerification: currentEvent.userVerification || [],
    };

    if (cleanEventData.userVerification.length === 0) {
      cleanEventData.userVerification = [
        {
          username: "Tên người nghiên cứu (tùy chọn)",
          comment: "Bổ sung nghiên cứu hoặc cảm nghĩ (tùy chọn)",
          date: "Ngày nghiên cứu (tùy chọn)",
        },
      ];
    }

    const jsonString = JSON.stringify(cleanEventData, null, 2);

    const formattedJson = `    ${jsonString.replace(/\n/g, "\n    ")},`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(formattedJson)
        .then(() => {
          const eventNumber = currentEventIndex + 1;
          showTemporaryMessage(
            `Dữ liệu sự kiện ${eventNumber} đã được sao chép vào clipboard`,
            "success"
          );
        })
        .catch(() => {
          fallbackCopyToClipboard(formattedJson);
        });
    } else {
      fallbackCopyToClipboard(formattedJson);
    }
  } catch (error) {
    console.error("Lỗi khi sao chép dữ liệu sự kiện:", error);
    showTemporaryMessage("Sao chép thất bại, vui lòng thử lại", "warning");
  }
}

/**
 * Phương án sao chép clipboard tương thích
 */
function fallbackCopyToClipboard(text) {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);

    if (successful) {
      const eventNumber = currentEventIndex + 1;
      showTemporaryMessage(`Dữ liệu sự kiện ${eventNumber} đã được sao chép vào clipboard`, "success");
    } else {
      showTemporaryMessage("Sao chép thất bại, vui lòng chọn và sao chép thủ công", "warning");
    }
  } catch (err) {
    console.error("Phương pháp sao chép truyền thống cũng thất bại:", err);
    showTemporaryMessage("Sao chép thất bại, trình duyệt không hỗ trợ sao chép tự động", "warning");
  }
}

/**
 * Ẩn thông báo tải
 */
function hideLoading() {
  const loading = document.getElementById("loading");
  if (loading) {
    loading.style.display = "none";
  }
}

// ==================== Bộ chọn dropdown tùy chỉnh ====================
/**
 * Khởi tạo bộ chọn tốc độ tùy chỉnh
 */
function initCustomSpeedSelect() {
  const customSelect = document.getElementById("custom-speed-select");
  if (!customSelect) return;

  const selectDisplay = customSelect.querySelector(".select-display");
  const selectText = customSelect.querySelector(".select-text");
  const selectDropdown = customSelect.querySelector(".select-dropdown");
  const selectOptions = customSelect.querySelectorAll(".select-option");

  let isOpen = false;

  function openDropdown() {
    if (isOpen) return;

    isOpen = true;
    customSelect.classList.add("open");

    setTimeout(() => {
      document.addEventListener("click", handleDocumentClick);
    }, 0);
  }

  function closeDropdown() {
    if (!isOpen) return;

    isOpen = false;
    customSelect.classList.remove("open");
    document.removeEventListener("click", handleDocumentClick);
  }

  function handleDocumentClick(e) {
    if (!customSelect.contains(e.target)) {
      closeDropdown();
    }
  }

  function toggleDropdown(e) {
    e.stopPropagation();
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  function selectOption(option) {
    const value = option.dataset.value;
    const text = option.textContent;

    selectText.textContent = text;

    customSelect.dataset.value = value;

    selectOptions.forEach((opt) => opt.classList.remove("selected"));
    option.classList.add("selected");

    currentPlaySpeed = parseInt(value);

    if (isPlaying) {
      togglePlay();
      setTimeout(() => togglePlay(), 100);
    }

    closeDropdown();
  }

  if (selectDisplay) {
    selectDisplay.addEventListener("click", toggleDropdown);
  }

  selectOptions.forEach((option) => {
    option.addEventListener("click", (e) => {
      e.stopPropagation();
      selectOption(option);
    });
  });

  customSelect.addEventListener("keydown", (e) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openDropdown();
      }
    } else {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          closeDropdown();
          break;
        case "ArrowUp":
          e.preventDefault();
          navigateOptions(-1);
          break;
        case "ArrowDown":
          e.preventDefault();
          navigateOptions(1);
          break;
        case "Enter":
          e.preventDefault();
          const selectedOption = selectDropdown.querySelector(
            ".select-option.selected"
          );
          if (selectedOption) {
            selectOption(selectedOption);
          }
          break;
      }
    }
  });

  function navigateOptions(direction) {
    const options = Array.from(selectOptions);
    const currentIndex = options.findIndex((opt) =>
      opt.classList.contains("selected")
    );
    let newIndex = currentIndex + direction;

    if (newIndex < 0) newIndex = options.length - 1;
    if (newIndex >= options.length) newIndex = 0;

    options.forEach((opt) => opt.classList.remove("selected"));
    options[newIndex].classList.add("selected");
  }

  customSelect.setAttribute("tabindex", "0");

  const initialValue = customSelect.dataset.value || "1000";
  const initialOption = customSelect.querySelector(
    `[data-value="${initialValue}"]`
  );
  if (initialOption) {
    selectText.textContent = initialOption.textContent;
    selectOptions.forEach((opt) => opt.classList.remove("selected"));
    initialOption.classList.add("selected");
  }
}

// ==================== Chức năng phát nhạc ====================
const MUSIC_PLAYLIST = [
  {
    id: "viettiepcauchuyenhoabinh",
    title: "Viết tiếp câu chuyện hòa bình",
    artist: "Nhạc sĩ Nguyễn Văn Chung",
    duration: "04:57",
    urls: [
      "https://res.cloudinary.com/dlrqtr4gs/video/upload/v1762971495/Viet-tiep-cau-chuyen-hoa-binh_vsxqyz.mp3",
      "https://res.cloudinary.com/dlrqtr4gs/video/upload/v1762971495/Viet-tiep-cau-chuyen-hoa-binh_vsxqyz.mp3",
    ],
  },
  {
    id: "cangoihochiminh",
    title: "Ca Ngợi Hồ Chủ Tịch",
    artist: "Nhạc sĩ Văn Cao",
    duration: "04:24",
    urls: [
      "https://res.cloudinary.com/dlrqtr4gs/video/upload/v1762971494/Ca-Ngoi-Ho-Chu-Tich_ffywf1.mp3",
      "https://res.cloudinary.com/dlrqtr4gs/video/upload/v1762971494/Ca-Ngoi-Ho-Chu-Tich_ffywf1.mp3",
    ],
  },
  {
    id: "bacdangcungchungchauhanhquan",
    title: "Bác đang cùng chúng cháu hành quân",
    artist: "Nhạc sĩ Huy Thục",
    duration: "03:36",
    urls: [
      "https://res.cloudinary.com/dlrqtr4gs/video/upload/v1762971494/Bac-Dang-Cung-Chung-Chau-Hanh-Quan_lgeqlw.mp3",
      "https://res.cloudinary.com/dlrqtr4gs/video/upload/v1762971494/Bac-Dang-Cung-Chung-Chau-Hanh-Quan_lgeqlw.mp3",
    ],
  },
];

/**
 * Dọn dẹp trình nghe sự kiện âm thanh
 */
function cleanupMusicEventListeners() {
  if (!musicAudio) return;

  console.log("Dọn dẹp trình nghe sự kiện âm thanh");

  const eventsToClean = [
    "loadedmetadata",
    "canplaythrough",
    "error",
    "loadstart",
    "loadeddata",
  ];

  eventsToClean.forEach((eventType) => {
    musicAudio.removeEventListener(eventType, () => {});
  });

  currentAudioEventListeners.clear();
}

/**
 * Chờ âm thanh sẵn sàng rồi tự động phát
 */
function autoPlayWhenReady(shouldPlay = true) {
  if (!musicAudio || !shouldPlay) {
    isAutoPlayPending = false;
    return Promise.resolve(false);
  }

  isAutoPlayPending = true;

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      console.warn("Tải âm thanh quá thời gian, hủy phát tự động");
      isAutoPlayPending = false;
      cleanup();
      resolve(false);
    }, 10000);

    const cleanup = () => {
      clearTimeout(timeoutId);
      musicAudio.removeEventListener("canplaythrough", handleCanPlay);
      musicAudio.removeEventListener("loadedmetadata", handleCanPlay);
      musicAudio.removeEventListener("error", handleError);
    };

    const handleCanPlay = () => {
      cleanup();

      if (isAutoPlayPending) {
        console.log("Âm thanh đã sẵn sàng, bắt đầu phát tự động");
        musicAudio
          .play()
          .then(() => {
            isMusicPlaying = true;
            startProgressUpdate();
            updatePlayButton();
            updateMusicBtnState();
            updateTimelineControlBackground();
            isAutoPlayPending = false;
            resolve(true);
          })
          .catch((error) => {
            console.warn("Phát tự động thất bại:", error);
            isAutoPlayPending = false;
            updatePlayButton();
            updateMusicBtnState();
            updateTimelineControlBackground();
            resolve(false);
          });
      } else {
        resolve(false);
      }
    };

    const handleError = (error) => {
      console.warn("Lỗi tải âm thanh, hủy phát tự động:", error);
      cleanup();
      isAutoPlayPending = false;
      resolve(false);
    };

    // Kiểm tra xem âm thanh đã sẵn sàng phát chưa
    if (musicAudio.readyState >= 3) {
      cleanup();
      handleCanPlay();
    } else {
      musicAudio.addEventListener("canplaythrough", handleCanPlay, {
        once: true,
      });
      musicAudio.addEventListener("loadedmetadata", handleCanPlay, {
        once: true,
      });
      musicAudio.addEventListener("error", handleError, { once: true });
    }
  });
}

/**
 * Tải file âm thanh
 */
function loadMusicAudio(song, autoPlay = false) {
  if (!musicAudio) return Promise.resolve(false);

  console.log(`Tải âm thanh: ${song.title}, Phát tự động: ${autoPlay}`);

  isAutoPlayPending = false;

  if (isMusicPlaying) {
    musicAudio.pause();
    isMusicPlaying = false;
    clearInterval(musicProgressInterval);
  }

  cleanupMusicEventListeners();

  musicAudio.currentTime = 0;
  updateMusicProgress();
  updatePlayButton();
  updateMusicBtnState();

  let urlIndex = 0;

  function tryLoadUrl() {
    return new Promise((resolve) => {
      if (urlIndex >= song.urls.length) {
      console.warn("Không thể tải file âm thanh:", song.title);
      showTemporaryMessage("Không thể tải file âm thanh, vui lòng thử tải lên file cục bộ", "warning");
        resolve(false);
        return;
      }

      const url = song.urls[urlIndex];
      console.log("Thử tải âm thanh:", url);

      const loadTimeoutId = setTimeout(() => {
        console.warn("Tải âm thanh quá thời gian:", url);
        handleLoadError();
      }, 8000);

      const cleanup = () => {
        clearTimeout(loadTimeoutId);
        musicAudio.removeEventListener("canplaythrough", handleLoadSuccess);
        musicAudio.removeEventListener("loadedmetadata", handleLoadSuccess);
        musicAudio.removeEventListener("error", handleLoadError);
      };

      const handleLoadSuccess = () => {
        console.log("Tải âm thanh thành công:", url);
        cleanup();

        // Đảm bảo volume được set đúng
        if (musicAudio) {
          musicAudio.volume = musicVolume;
        }

        updatePlayButton();
        updateMusicBtnState();

        if (autoPlay) {
          autoPlayWhenReady(true).then((success) => {
            if (!success) {
              console.warn("Tự động phát nhạc thất bại, có thể do browser autoplay policy");
            }
            resolve(success);
          });
        } else {
          resolve(true);
        }
      };

      const handleLoadError = () => {
        console.warn("Tải âm thanh thất bại:", url);
        cleanup();
        urlIndex++;
        tryLoadUrl().then(resolve);
      };

      musicAudio.addEventListener("canplaythrough", handleLoadSuccess, {
        once: true,
      });
      musicAudio.addEventListener("loadedmetadata", handleLoadSuccess, {
        once: true,
      });
      musicAudio.addEventListener("error", handleLoadError, { once: true });

      musicAudio.src = url;
      musicAudio.volume = musicVolume;
      musicAudio.load();
    });
  }

  audioLoadingPromise = tryLoadUrl();
  return audioLoadingPromise;
}

/**
 * Phát bài trước
 */
function playPreviousSong() {
  const prevIndex =
    currentMusicIndex > 0 ? currentMusicIndex - 1 : MUSIC_PLAYLIST.length - 1;
  const wasPlaying = isMusicPlaying;

  console.log(`Phát bài trước: Chỉ mục ${prevIndex}, Trước đó đang phát: ${wasPlaying}`);

  selectSong(prevIndex, wasPlaying);
}

/**
 * Phát bài tiếp theo
 */
function playNextSong() {
  const nextIndex =
    currentMusicIndex < MUSIC_PLAYLIST.length - 1 ? currentMusicIndex + 1 : 0;
  const wasPlaying = isMusicPlaying;

  console.log(`Phát bài tiếp theo: Chỉ mục ${nextIndex}, Trước đó đang phát: ${wasPlaying}`);

  selectSong(nextIndex, wasPlaying);
}

/**
 * Chọn bài hát
 */
function selectSong(index, autoPlay = false) {
  if (index < 0 || index >= MUSIC_PLAYLIST.length) return;

  console.log(`Chọn bài hát: Chỉ mục ${index}, Phát tự động: ${autoPlay}`);

  currentMusicIndex = index;
  const song = MUSIC_PLAYLIST[index];

  const titleEl = document.getElementById("current-song-title");
  const artistEl = document.getElementById("current-song-artist");

  if (titleEl) titleEl.textContent = song.title;
  if (artistEl) artistEl.textContent = song.artist;

  const playlistItems = document.querySelectorAll(".playlist-item");
  playlistItems.forEach((item, i) => {
    if (i === index) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  loadMusicAudio(song, autoPlay);
}

/**
 * Chuyển đổi phát/tạm dừng
 */
function toggleMusicPlay() {
  if (!musicAudio) return;

  if (isMusicPlaying) {
    console.log("Tạm dừng phát nhạc");
    musicAudio.pause();
    isMusicPlaying = false;
    clearInterval(musicProgressInterval);
    updatePlayButton();
    updateMusicBtnState();
    updateTimelineControlBackground();
  } else {
    console.log("Bắt đầu phát nhạc");
    const playBtn = document.getElementById("music-play-btn");
    if (playBtn) {
      playBtn.textContent = "⏳";
      playBtn.title = "Đang tải...";
    }

    if (musicAudio.readyState < 3) {
      console.log("Âm thanh chưa sẵn sàng, chờ tải...");
      autoPlayWhenReady(true);
    } else {
      console.log("Âm thanh đã sẵn sàng, phát trực tiếp");
      musicAudio
        .play()
        .then(() => {
          isMusicPlaying = true;
          startProgressUpdate();
          updatePlayButton();
          updateMusicBtnState();
          updateTimelineControlBackground();
        })
        .catch((error) => {
          console.error("Phát âm thanh thất bại:", error);
          showTemporaryMessage("Phát âm thanh thất bại, vui lòng kiểm tra định dạng file", "warning");

          isMusicPlaying = false;
          updatePlayButton();
          updateMusicBtnState();
        });
    }
  }
}

/**
 * Xử lý khi nhạc phát xong
 */
function handleMusicEnded() {
  console.log("Nhạc phát xong, chuẩn bị phát bài tiếp theo");

  isMusicPlaying = false;
  clearInterval(musicProgressInterval);
  updatePlayButton();
  updateMusicBtnState();
  updateTimelineControlBackground();

  // Tự động phát bài tiếp theo
  setTimeout(() => {
    const nextIndex =
      currentMusicIndex < MUSIC_PLAYLIST.length - 1 ? currentMusicIndex + 1 : 0;
    selectSong(nextIndex, true);
  }, 500);
}

/**
 * Tạm dừng nhạc nền
 */
function pauseBackgroundMusic() {
  if (!musicAudio || !isMusicPlaying) return;
  
  console.log("Tạm dừng nhạc nền để tập trung vào video YouTube");
  musicAudio.pause();
  isMusicPlaying = false;
  clearInterval(musicProgressInterval);
  updatePlayButton();
  updateMusicBtnState();
  updateTimelineControlBackground();
}

/**
 * Tiếp tục phát nhạc nền (nếu đang được phát trước đó)
 */
function resumeBackgroundMusic() {
  if (!musicAudio || isMusicPlaying) return;
  
  console.log("Tiếp tục phát nhạc nền");
  const playBtn = document.getElementById("music-play-btn");
  if (playBtn) {
    playBtn.textContent = "⏳";
    playBtn.title = "Đang tải...";
  }

  if (musicAudio.readyState < 3) {
    console.log("Âm thanh chưa sẵn sàng, chờ tải...");
    autoPlayWhenReady(true);
  } else {
    console.log("Âm thanh đã sẵn sàng, phát trực tiếp");
    musicAudio
      .play()
      .then(() => {
        isMusicPlaying = true;
        startProgressUpdate();
        updatePlayButton();
        updateMusicBtnState();
        updateTimelineControlBackground();
      })
      .catch((error) => {
        console.error("Phát âm thanh thất bại:", error);
        isMusicPlaying = false;
        updatePlayButton();
        updateMusicBtnState();
      });
  }
}

/**
 * Khởi tạo chức năng phát nhạc
 */
function initMusicPlayer() {
  const musicBtn = document.getElementById("music-btn");
  const musicModal = document.getElementById("music-modal");
  const musicBackdrop = document.getElementById("music-backdrop");
  const musicClose = document.getElementById("music-modal-close");
  const musicAudioElement = document.getElementById("music-audio");

  musicAudio = musicAudioElement;

  if (musicBtn) {
    musicBtn.addEventListener("click", showMusicModal);
  }

  if (musicClose) {
    musicClose.addEventListener("click", hideMusicModal);
  }

  if (musicBackdrop) {
    musicBackdrop.addEventListener("click", hideMusicModal);
  }

  if (musicModal) {
    musicModal.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  initMusicControls();
  initMusicPlaylist();
  initMusicUpload();
  initVolumeControl();

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isMusicModalVisible) {
      hideMusicModal();
    }
  });
}

/**
 * Hiển thị cửa sổ nhạc
 */
function showMusicModal() {
  const musicModal = document.getElementById("music-modal");
  const musicBackdrop = document.getElementById("music-backdrop");

  if (musicModal && musicBackdrop) {
    musicBackdrop.classList.add("visible");
    musicModal.classList.add("visible");
    isMusicModalVisible = true;

    document.body.style.overflow = "hidden";
  }
}

/**
 * Ẩn cửa sổ nhạc
 */
function hideMusicModal() {
  const musicModal = document.getElementById("music-modal");
  const musicBackdrop = document.getElementById("music-backdrop");

  if (musicModal && musicBackdrop) {
    musicBackdrop.classList.remove("visible");
    musicModal.classList.remove("visible");
    isMusicModalVisible = false;

    document.body.style.overflow = "";
  }
}

/**
 * Khởi tạo điều khiển phát nhạc
 */
function initMusicControls() {
  const playBtn = document.getElementById("music-play-btn");
  const prevBtn = document.getElementById("music-prev-btn");
  const nextBtn = document.getElementById("music-next-btn");
  const progressBar = document.querySelector(".music-progress-bar");

  if (playBtn) {
    playBtn.addEventListener("click", toggleMusicPlay);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", playPreviousSong);
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", playNextSong);
  }

  if (progressBar) {
    progressBar.addEventListener("click", handleProgressClick);
  }

  if (!musicAudio) {
    musicAudio = document.getElementById("music-audio");
  }

  // Liên kết trình nghe sự kiện cơ bản (những cái này sẽ không bị dọn dẹp)
  if (musicAudio) {
    musicAudio.addEventListener("loadedmetadata", updateMusicDuration);
    musicAudio.addEventListener("timeupdate", updateMusicProgress);
    musicAudio.addEventListener("ended", handleMusicEnded);
    musicAudio.addEventListener("error", handleMusicError);
  }
}

/**
 * Khởi tạo danh sách phát
 */
function initMusicPlaylist() {
  const playlistItems = document.getElementById("music-playlist-items");

  if (!playlistItems) return;

  playlistItems.innerHTML = "";

  MUSIC_PLAYLIST.forEach((song, index) => {
    const itemEl = document.createElement("div");
    itemEl.className = "playlist-item";
    itemEl.dataset.index = index;

    itemEl.innerHTML = `
      <div class="playlist-item-info">
        <div class="playlist-item-title">${song.title}</div>
        <div class="playlist-item-artist">${song.artist}</div>
      </div>
      <div class="playlist-item-duration">${song.duration}</div>
    `;

    itemEl.addEventListener("click", () => {
      const wasPlaying = isMusicPlaying;
      selectSong(index, wasPlaying); // Nếu trước đó đang phát, thì tự động phát bài hát mới được chọn
    });

    playlistItems.appendChild(itemEl);
  });

  if (MUSIC_PLAYLIST.length > 0) {
    selectSong(0, false); // Mặc định chọn bài đầu tiên, sẽ tự động phát sau khi initApp hoàn thành
  }
}

/**
 * Cập nhật trạng thái nút phát
 */
function updatePlayButton() {
  const playBtn = document.getElementById("music-play-btn");
  if (playBtn) {
    if (isMusicPlaying) {
      playBtn.textContent = "⏸";
      playBtn.title = "Tạm dừng";
    } else {
      playBtn.textContent = "▶";
      playBtn.title = "Phát";
    }
  }
}

/**
 * Cập nhật trạng thái nút nhạc
 */
function updateMusicBtnState() {
  const musicBtn = document.getElementById("music-btn");
  if (musicBtn) {
    if (isMusicPlaying) {
      musicBtn.classList.add("playing");
    } else {
      musicBtn.classList.remove("playing");
    }
  }
}

/**
 * Bắt đầu cập nhật tiến độ
 */
function startProgressUpdate() {
  musicProgressInterval = setInterval(() => {
    updateMusicProgress();
  }, 1000);
}

/**
 * Cập nhật tiến độ nhạc
 */
function updateMusicProgress() {
  if (!musicAudio || !musicAudio.duration) return;

  const currentTime = musicAudio.currentTime;
  const duration = musicAudio.duration;
  const progress = (currentTime / duration) * 100;

  const progressFill = document.getElementById("music-progress-fill");
  if (progressFill) {
    progressFill.style.width = `${progress}%`;
  }

  const currentTimeEl = document.getElementById("music-current-time");
  const totalTimeEl = document.getElementById("music-total-time");

  if (currentTimeEl) {
    currentTimeEl.textContent = formatTime(currentTime);
  }

  if (totalTimeEl) {
    totalTimeEl.textContent = formatTime(duration);
  }
}

/**
 * Cập nhật tổng thời lượng nhạc
 */
function updateMusicDuration() {
  if (!musicAudio || !musicAudio.duration) return;

  const totalTimeEl = document.getElementById("music-total-time");
  if (totalTimeEl) {
    totalTimeEl.textContent = formatTime(musicAudio.duration);
  }
}

/**
 * Xử lý click thanh tiến độ
 */
function handleProgressClick(e) {
  if (!musicAudio || !musicAudio.duration) return;

  const progressBar = e.currentTarget;
  const rect = progressBar.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const percentage = x / rect.width;
  const newTime = percentage * musicAudio.duration;

  musicAudio.currentTime = newTime;
  updateMusicProgress();
}

/**
 * Xử lý lỗi âm thanh
 */
function handleMusicError(e) {
  console.error("Lỗi phát âm thanh:", e);
  showTemporaryMessage("Lỗi phát âm thanh, vui lòng thử bài hát khác", "warning");

  isMusicPlaying = false;
  clearInterval(musicProgressInterval);
  updatePlayButton();
  updateMusicBtnState();
  updateTimelineControlBackground();
}

/**
 * Định dạng hiển thị thời gian
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Khởi tạo điều khiển âm lượng
 */
function initVolumeControl() {
  const volumeSlider = document.getElementById("music-volume-slider");
  const volumeValue = document.getElementById("music-volume-value");

  if (volumeSlider) {
    volumeSlider.addEventListener("input", (e) => {
      const volume = parseInt(e.target.value) / 100;
      setMusicVolume(volume);
    });

    volumeSlider.value = musicVolume * 100;
  }

  if (volumeValue) {
    volumeValue.textContent = Math.round(musicVolume * 100) + "%";
  }
}

/**
 * Đặt âm lượng nhạc
 */
function setMusicVolume(volume) {
  musicVolume = Math.max(0, Math.min(1, volume));

  if (musicAudio) {
    musicAudio.volume = musicVolume;
  }

  const volumeValue = document.getElementById("music-volume-value");
  if (volumeValue) {
    volumeValue.textContent = Math.round(musicVolume * 100) + "%";
  }

  try {
    localStorage.setItem("musicVolume", musicVolume.toString());
  } catch (error) {
    console.warn("Không thể lưu cài đặt âm lượng:", error);
  }
}

/**
 * Khởi tạo tải lên nhạc cục bộ
 */
function initMusicUpload() {
  const uploadBtn = document.getElementById("music-upload-btn");
  const fileInput = document.getElementById("music-file-input");

  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      fileInput?.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", handleMusicFileUpload);
  }
}

/**
 * Xử lý tải lên file nhạc cục bộ
 */
function handleMusicFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("audio/")) {
    showTemporaryMessage("Vui lòng chọn file âm thanh hợp lệ", "warning");
    return;
  }

  const tempUrl = URL.createObjectURL(file);

  const tempSong = {
    id: "local_" + Date.now(),
    title: file.name.replace(/\.[^/.]+$/, ""),
    artist: "Nhạc cục bộ",
    duration: "Không xác định",
    urls: [tempUrl],
    isLocal: true,
  };

  MUSIC_PLAYLIST.push(tempSong);

  initMusicPlaylist();

  selectSong(MUSIC_PLAYLIST.length - 1, false); // Chọn bài hát mới tải lên, nhưng không tự động phát

  showTemporaryMessage("Thêm file nhạc cục bộ thành công", "success");

  e.target.value = "";
}

/**
 * Khôi phục cài đặt nhạc từ lưu trữ cục bộ
 */
function restoreMusicSettings() {
  try {
    const savedVolume = localStorage.getItem("musicVolume");
    if (savedVolume !== null) {
      musicVolume = parseFloat(savedVolume);
      setMusicVolume(musicVolume);
    } else {
      // Nếu chưa có volume trong localStorage, đặt mặc định 6%
      setMusicVolume(0.06);
    }
  } catch (error) {
    console.warn("Không thể đọc cài đặt nhạc:", error);
    // Nếu có lỗi, đặt volume mặc định 6%
    setMusicVolume(0.06);
  }
}

/**
 * Cập nhật màu nền bảng điều khiển dòng thời gian
 */
function updateTimelineControlBackground() {
  const timelineControl = document.getElementById("timeline-control");

  if (timelineControl) {
    if (isMusicPlaying) {
      timelineControl.classList.add("music-playing");
    } else {
      timelineControl.classList.remove("music-playing");
    }
  }
}

// ==================== Kiểm tra plugin leaflet.motion và tối ưu hiệu suất ====================
/**
 * Kiểm tra xem plugin leaflet.motion có được tải đúng không
 */
function checkMotionPlugin() {
  if (
    typeof L.motion !== "undefined" &&
    typeof L.motion.polyline === "function"
  ) {
    console.log("✅ Plugin leaflet.motion tải thành công");
    return true;
  } else {
    console.error("❌ Plugin leaflet.motion chưa được tải đúng");
    return false;
  }
}

/**
 * Dọn dẹp tài nguyên motion
 */
function cleanupMotionResources() {
  const allPaths = Array.from(motionPaths.values());

  if (allPaths.length > 0) {
    batchAnimatePathsDisappear(allPaths, 100)
      .then(() => {
        motionPaths.clear();
        pathLayers = [];
        animationQueue = [];
        isAnimationInProgress = false;

        console.log("Dọn dẹp tài nguyên Motion hoàn tất");
      })
      .catch((error) => {
        console.warn("Dọn dẹp tài nguyên Motion thất bại:", error);
        motionPaths.forEach((path) => {
          if (path && path._map) {
            try {
              path.motionStop();
              map.removeLayer(path);
            } catch (e) {
              console.warn("Buộc dọn dẹp đường đi thất bại:", e);
            }
          }
        });

        motionPaths.clear();
        pathLayers = [];
        animationQueue = [];
        isAnimationInProgress = false;
      });
  } else {
    motionPaths.clear();
    animationQueue = [];
    isAnimationInProgress = false;
    console.log("Dọn dẹp tài nguyên Motion hoàn tất");
  }
}

/**
 * Tải trước animation đường đi quan trọng
 */
function preloadKeyAnimations() {
  if (!trajectoryData || !trajectoryData.events) return;

  const keyEvents = trajectoryData.events.slice(
    0,
    Math.min(10, trajectoryData.events.length)
  );

  keyEvents.forEach((event, index) => {
    if (
      event.startCoords &&
      event.endCoords &&
      event.movementType !== "Hoạt động tại chỗ"
    ) {
      const preloadPath = createMotionPath(
        event.startCoords,
        event.endCoords,
        event.transitCoords,
        false,
        index,
        false,
        false
      );

      if (preloadPath) {
        preloadPath.addTo(map);
        preloadPath.setStyle({ opacity: 0 });

        setTimeout(() => {
          if (preloadPath._map) {
            map.removeLayer(preloadPath);
          }
        }, 100);
      }
    }
  });

  console.log("Tải trước đường đi quan trọng hoàn tất");
}

/**
 * Tối ưu cấu hình hiệu suất motion
 */
function optimizeMotionPerformance() {
  if (!map || !map._renderer) {
    console.warn("Bản đồ chưa được khởi tạo hoàn toàn, bỏ qua tối ưu hiệu suất");
    return;
  }

  try {
    const renderer = map._renderer;
    if (renderer && renderer._container) {
      const container = renderer._container;

      container.style.willChange = "transform";
      container.style.transform = "translateZ(0)";
      container.style.backfaceVisibility = "hidden";

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeName === "path" && node.getAttribute("stroke")) {
                node.style.willChange = "stroke-dashoffset";
                node.style.transform = "translateZ(0)";
              }
            });
          }
        });
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
      });

      window.motionObserver = observer;

      console.log("Tối ưu hiệu suất Motion đã được bật");
    }
  } catch (error) {
    console.warn("Tối ưu hiệu suất Motion thất bại:", error);
  }
}

/**
 * Điều chỉnh động tham số motion
 */
function dynamicAdjustMotionParams() {
  const pathCount = motionPaths.size;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const isMobile = isMobileDevice();

  let durationMultiplier = 1;

  if (pathCount > 20) {
    durationMultiplier = 0.7;
  } else if (pathCount > 10) {
    durationMultiplier = 0.85;
  }

  if (isMobile) {
    durationMultiplier *= 0.8;
  }

  if (devicePixelRatio > 2) {
    durationMultiplier *= 0.9;
  }

  animationConfig.pathDuration = Math.max(
    1000,
    animationConfig.pathDuration * durationMultiplier
  );
}

/**
 * Lắng nghe chỉ số hiệu suất
 */
function monitorMotionPerformance() {
  let frameCount = 0;
  let lastTime = Date.now();
  let isMonitoring = false;

  function measureFPS() {
    if (!isMonitoring) return;

    frameCount++;
    const currentTime = Date.now();

    if (currentTime - lastTime >= 1000) {
      const fps = frameCount;
      frameCount = 0;
      lastTime = currentTime;

      // Nếu FPS quá thấp, tự động điều chỉnh tham số
      if (fps < 30 && motionPaths.size > 0) {
        console.warn("Hiệu suất Motion thấp, tự động điều chỉnh tham số");
        dynamicAdjustMotionParams();
      }

      if (motionPaths.size > 0) {
        console.log(
          `Giám sát hiệu suất Motion - FPS: ${fps}, Số lượng đường đi: ${motionPaths.size}`
        );
      }
    }

    if (motionPaths.size > 0 && isMonitoring) {
      requestAnimationFrame(measureFPS);
    }
  }

  isMonitoring = true;
  if (motionPaths.size > 0) {
    requestAnimationFrame(measureFPS);
  }

  return {
    stop: () => {
      isMonitoring = false;
    },
  };
}

// ==================== YouTube Video ====================
/**
 * Lấy video ID từ URL YouTube
 */
function extractYouTubeVideoId(url) {
  if (!url) return null;
  
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Khởi tạo YouTube IFrame API
 */
function onYouTubeIframeAPIReady() {
  console.log("YouTube IFrame API đã sẵn sàng");
}

/**
 * Tải và phát video YouTube
 */
function loadYouTubeVideo(videoId, eventIndex) {
  // Xóa player cũ nếu có
  if (youtubePlayer) {
    try {
      youtubePlayer.destroy();
    } catch (e) {
      console.warn("Không thể destroy YouTube player cũ:", e);
    }
    youtubePlayer = null;
  }

  const youtubeContainer = document.getElementById("event-popup-youtube-container");
  if (!youtubeContainer) return;

  // Kiểm tra xem YouTube API đã load chưa
  if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
    console.warn("YouTube IFrame API chưa sẵn sàng, thử lại sau 1 giây");
    setTimeout(() => {
      loadYouTubeVideo(videoId, eventIndex);
    }, 1000);
    return;
  }

  // Đảm bảo container được hiển thị và có kích thước
  youtubeContainer.style.display = "block";
  youtubeContainer.style.visibility = "visible";
  youtubeContainer.style.opacity = "1";
  
  // Tạo iframe container
  const playerId = `youtube-player-${Date.now()}`;
  youtubeContainer.innerHTML = `<div id="${playerId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>`;
  
  console.log("Đang tạo YouTube player với ID:", playerId, "Container:", youtubeContainer);
  
  // Tạo YouTube player
  youtubePlayer = new YT.Player(playerId, {
    videoId: videoId,
    playerVars: {
      autoplay: 1,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      playsinline: 1
    },
    events: {
      onReady: (event) => {
        console.log("YouTube video đã sẵn sàng, bắt đầu phát");
        // Chỉ phát nếu user đã tương tác
        if (userHasInteracted) {
          event.target.playVideo();
        }
      },
      onStateChange: (event) => {
        // Khi video kết thúc (state = 0)
        if (event.data === YT.PlayerState.ENDED) {
          console.log("YouTube video đã phát xong");
          // Nếu đây là video cuối cùng, chạy lại animation từ đầu đến cuối
          if (eventIndex === trajectoryData.events.length - 1) {
            hideEventPopup();
            setTimeout(() => {
              replayFullAnimation();
            }, 1000); // Đợi 1 giây để popup đóng hoàn toàn
          } else {
            // Tự động đóng popup cho các event khác
            hideEventPopup();
          }
        }
      },
      onError: (event) => {
        console.error("Lỗi khi phát YouTube video:", event.data);
        // Nếu có lỗi, đóng popup sau 2 giây
        setTimeout(() => {
          hideEventPopup();
        }, 2000);
      }
    }
  });
}

/**
 * Hiển thị video YouTube sau khi event cuối cùng kết thúc audio
 */
function showFinalYouTubeVideo() {
  console.log("Hiển thị video YouTube cuối cùng");
  
  // Hiển thị popup với video YouTube
  const popup = document.getElementById("event-popup");
  const popupImage = document.getElementById("event-popup-image");
  const popupImageContainer = document.getElementById("event-popup-image-container");
  const youtubeContainer = document.getElementById("event-popup-youtube-container");
  const popupDate = document.getElementById("event-popup-date");
  const popupAge = document.getElementById("event-popup-age");
  const popupLocation = document.getElementById("event-popup-location");
  const popupTitle = document.getElementById("event-popup-title");
  const continueBtn = document.getElementById("event-popup-continue-btn");
  
  if (!popup || !popupDate || !popupAge || !popupLocation || !popupTitle) return;
  
  // Lấy event cuối cùng
  const lastEvent = trajectoryData.events[trajectoryData.events.length - 1];
  const lastEventIndex = trajectoryData.events.length - 1;
  
  // Cập nhật nội dung popup
  const dateStr = lastEvent.date || "Không xác định";
  const formattedDate = formatEventDate(dateStr);
  popupDate.textContent = formattedDate;
  popupAge.textContent = `Tuổi: ${lastEvent.age || 0}`;
  popupLocation.textContent = lastEvent.endLocation || "Địa điểm không xác định";
  popupTitle.textContent = lastEvent.event || "Không có mô tả";
  
  // Ẩn ảnh và hiển thị video YouTube
  if (popupImage && popupImageContainer && youtubeContainer) {
    popupImage.style.display = "none";
    popupImageContainer.style.display = "none";
    youtubeContainer.style.display = "block";
    
    // Lấy video ID từ URL YouTube
    const videoId = extractYouTubeVideoId(FINAL_EVENT_YOUTUBE_VIDEO);
    if (videoId) {
      loadYouTubeVideo(videoId, lastEventIndex);
    }
  }
  
  // Ẩn nút Continue vì video sẽ tự động chuyển
  if (continueBtn) {
    continueBtn.style.display = "none";
  }
  
  // Hiển thị popup
  popup.classList.add("active");
  currentPopupEventIndex = lastEventIndex;
}

/**
 * Chạy lại animation từ đầu đến cuối (từ event 0 đến event cuối cùng)
 */
function replayFullAnimation() {
  console.log("Bắt đầu chạy lại animation từ đầu đến cuối");
  
  // Dừng tất cả animation và audio đang phát
  stopEventAudio();
  if (youtubePlayer) {
    try {
      youtubePlayer.stopVideo();
      youtubePlayer.destroy();
    } catch (e) {
      console.warn("Lỗi khi destroy YouTube player:", e);
    }
    youtubePlayer = null;
  }
  
  // Xóa tất cả đường đi và marker hiện tại
  pathLayers.forEach((path) => {
    if (path._map) {
      map.removeLayer(path);
    }
  });
  pathLayers = [];
  motionPaths.clear();
  
  // Xóa tất cả marker
  eventMarkers.forEach((marker) => {
    if (marker._map) {
      map.removeLayer(marker);
    }
  });
  eventMarkers = [];
  locationMarkers.clear();
  
  // Reset về event đầu tiên
  currentEventIndex = -1;
  previousEventIndex = -1;
  
  // Reset camera về vị trí ban đầu
  map.setView([16.0544, 108.2772], 5, {
    animate: true,
    duration: 1.0
  });
  
  // Bắt đầu phát lại từ đầu với animation
  isPlaying = true;
  const btn = document.getElementById("play-btn");
  if (btn) {
    btn.textContent = "⏸";
    btn.title = "Tạm dừng";
  }
  
  // Tiếp tục phát nhạc nền khi replay animation
  resumeBackgroundMusic();
  
  // Bắt đầu từ event đầu tiên sau khi camera đã reset
  setTimeout(() => {
    showEventAtIndex(0, true);
  }, 1000);
}

// Gán hàm onYouTubeIframeAPIReady vào window để YouTube API có thể gọi
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// ==================== Popup chào mừng ====================
/**
 * Hiển thị popup chào mừng khi vào trang
 */
function showWelcomePopup() {
  const welcomePopup = document.getElementById("welcome-popup");
  const exploreBtn = document.getElementById("welcome-explore-btn");
  
  if (!welcomePopup) return;
  
  // Hiển thị popup
  welcomePopup.classList.remove("hidden");
  
  // Thêm event listener cho nút Khám phá
  if (exploreBtn) {
    exploreBtn.onclick = () => {
      // Đánh dấu user đã tương tác
      userHasInteracted = true;
      
      // Ẩn popup chào mừng
      welcomePopup.classList.add("hidden");
      
      // Hiển thị event đầu tiên
      if (trajectoryData && trajectoryData.events.length > 0) {
        showEventAtIndex(0, false);
      }
      
      // Bắt đầu phát nhạc nền
      startBackgroundMusic();
      
      console.log("User đã tương tác, bắt đầu hành trình");
    };
  }
}

/**
 * Ẩn popup chào mừng
 */
function hideWelcomePopup() {
  const welcomePopup = document.getElementById("welcome-popup");
  if (welcomePopup) {
    welcomePopup.classList.add("hidden");
  }
}

/**
 * Bắt đầu phát nhạc nền sau khi user đã tương tác
 */
function startBackgroundMusic() {
  if (MUSIC_PLAYLIST.length > 0 && musicAudio && userHasInteracted) {
      console.log("Bắt đầu phát nhạc nền với volume 6%");
      // Đảm bảo volume là 6%
      if (Math.abs(musicVolume - 0.06) > 0.01) {
        setMusicVolume(0.06);
      }
      // Đảm bảo musicAudio có volume đúng
      if (musicAudio) {
        musicAudio.volume = 0.06;
      }
    // Tự động phát bài đầu tiên
    selectSong(0, true);
  }
}

// ==================== Liên kết sự kiện ====================
/**
 * Liên kết tất cả trình nghe sự kiện
 */
function bindEvents() {
  const playBtn = document.getElementById("play-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  if (playBtn) playBtn.addEventListener("click", togglePlay);
  if (prevBtn) prevBtn.addEventListener("click", previousEvent);
  if (nextBtn) nextBtn.addEventListener("click", nextEvent);

  const slider = document.getElementById("timeline-slider");
  if (slider) {
    slider.addEventListener("mousedown", () => {
      isDragging = true;
      console.log("Bắt đầu kéo (mousedown)");
    });

    slider.addEventListener("touchstart", () => {
      isDragging = true;
      console.log("Bắt đầu kéo (touchstart)");
    });

    slider.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        console.log("Kết thúc kéo (mouseup)");
        const finalIndex = parseInt(slider.value);
        if (finalIndex !== currentEventIndex) {
          showEventAtIndex(finalIndex, true, true);
        }
      }
    });

    slider.addEventListener("touchend", () => {
      if (isDragging) {
        isDragging = false;
        console.log("Kết thúc kéo (touchend)");
        const finalIndex = parseInt(slider.value);
        if (finalIndex !== currentEventIndex) {
          showEventAtIndex(finalIndex, true, true);
        }
      }
    });

    slider.addEventListener("input", (e) => {
      if (trajectoryData) {
        const newIndex = parseInt(e.target.value);
        console.log(`Đầu vào thanh trượt: ${newIndex}, Trạng thái kéo: ${isDragging}`);

        if (isDragging) {
          showEventAtIndex(newIndex, false, true);
        } else {
          showEventAtIndex(newIndex, true, true);
        }
      }
    });

    slider.addEventListener("dblclick", (e) => {
      e.preventDefault();
      copyCurrentEventData();
    });

    slider.addEventListener("keydown", (e) => {
      handleTimelineKeydown(e);
    });

    slider.addEventListener("focus", () => {
      slider.style.outline = "none";
    });

    slider.addEventListener("click", () => {
      slider.focus();
    });
  }

  document.addEventListener("keydown", (e) => {
    const activeElement = document.activeElement;
    const isInputElement =
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.tagName === "SELECT" ||
        activeElement.contentEditable === "true");

    const detailPanel = document.getElementById("location-detail-panel");
    const isPanelVisible =
      detailPanel && detailPanel.classList.contains("visible");

    if (!isInputElement && !isPanelVisible) {
      handleTimelineKeydown(e);
    }
  });

  const speedSelect = document.getElementById("speed-select");
  if (speedSelect) {
    speedSelect.addEventListener("change", (e) => {
      currentPlaySpeed = parseInt(e.target.value);
      if (isPlaying) {
        togglePlay();
        setTimeout(() => togglePlay(), 100);
      }
    });
  }
  initCustomSpeedSelect();

  const speedBtns = document.querySelectorAll(".speed-btn");
  speedBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      speedBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentPlaySpeed = parseInt(btn.dataset.speed);

      if (isPlaying) {
        togglePlay();
        setTimeout(() => togglePlay(), 100);
      }
    });
  });

  initAnimationControls();
  initStatsHover();
  initDetailPanel();
  initMobileInteractions();
  initFeedbackModal();
  initCameraFollowControl();
  initMusicPlayer();

  restoreMusicSettings();

  window.addEventListener("resize", () => {
    const mapEl = document.getElementById("map");
    if (isMobileDevice()) {
      if (isPanelVisible) {
        mapEl.classList.remove("panel-hidden");
        mapEl.classList.add("panel-visible");
      } else {
        mapEl.classList.remove("panel-visible");
        mapEl.classList.add("panel-hidden");
      }
    } else {
      mapEl.classList.remove("panel-hidden", "panel-visible");
      isPanelVisible = true;
      document.getElementById("timeline-control").classList.remove("hidden");
    }
  });
}

// ==================== Khởi động ứng dụng ====================
/**
 * Sửa đổi hàm khởi tạo ứng dụng, thêm kiểm tra plugin
 */
async function initApp() {
  try {
    initMap();

    const motionLoaded = checkMotionPlugin();
    if (!motionLoaded) {
      throw new Error(
        "Plugin leaflet.motion chưa được tải đúng, vui lòng đảm bảo đã nhập đúng file plugin"
      );
    }

    // Chờ bản đồ tải hoàn toàn
    await new Promise((resolve) => {
      if (map._loaded) {
        resolve();
      } else {
        map.on("load", resolve);
        setTimeout(resolve, 2000);
      }
    });

    const geoDataLoaded = await loadGeographicData();
    if (!geoDataLoaded) {
      throw new Error("Tải dữ liệu địa lý thất bại");
    }

    trajectoryData = await loadTrajectoryData();

    if (trajectoryData && trajectoryData.events.length > 0) {
      const slider = document.getElementById("timeline-slider");
      if (slider) {
        slider.max = trajectoryData.events.length - 1;
        slider.style.transition = `all ${animationConfig.timelineDuration}ms ease`;
      }

      const totalCountEls = document.querySelectorAll(
        "[id^='total-event-count']"
      );
      totalCountEls.forEach((el) => {
        if (el) el.textContent = trajectoryData.events.length;
      });

      updateStatistics();
      // Không tự động hiển thị event đầu tiên, đợi user click "Khám phá ngay"
      // showEventAtIndex(0, false);

      setTimeout(() => {
        optimizeMotionPerformance();

        if (motionLoaded) {
          preloadKeyAnimations();
        }

        const performanceMonitor = monitorMotionPerformance();
        window.motionPerformanceMonitor = performanceMonitor;
      }, 1500);
    } else {
      throw new Error("Dữ liệu hành trình trống");
    }

    bindEvents();
    hideLoading();

    const mapEl = document.getElementById("map");
    if (isMobileDevice()) {
      mapEl.classList.add("panel-visible");
    }

    // Hiển thị popup chào mừng sau khi app đã load xong
    setTimeout(() => {
      showWelcomePopup();
    }, 500);

    // Không tự động phát nhạc nền khi trang load để tránh autoplay policy
    // Nhạc sẽ được phát sau khi user click "Khám phá ngay" trong popup chào mừng

    window.addEventListener("beforeunload", () => {
      forceStopPoetryAnimation();

      cleanupMotionResources();
      if (window.motionObserver) {
        window.motionObserver.disconnect();
      }
      if (window.motionPerformanceMonitor) {
        window.motionPerformanceMonitor.stop();
      }
    });

    console.log("Trạng thái plugin leaflet.motion:", motionLoaded ? "Đã tải" : "Chưa tải");
  } catch (error) {
    console.error("Khởi tạo ứng dụng thất bại:", error);

    const loading = document.getElementById("loading");
    if (loading) {
      loading.innerHTML = `
        <div class="error">
          <h3>Tải thất bại</h3>
          <p>Đã xảy ra lỗi khi khởi tạo ứng dụng, vui lòng làm mới trang và thử lại.</p>
          <p>Thông tin lỗi: ${error.message}</p>
        </div>
      `;
    }
  }
}

// ==================== Bộ đếm lượt truy cập ====================
/**
 * Định dạng lại style của counter từ freevisitorcounters.com
 */
function styleVisitorCounter() {
  // Đợi một chút để counter được load và render
  setTimeout(() => {
    const counterContainer = document.getElementById("visitor-counter-container");
    if (!counterContainer) return;
    
    // Tìm counter được tạo bởi freevisitorcounters.com (có thể ở body hoặc các vị trí khác)
    const possibleCounterSelectors = [
      'a[href*="freevisitorcounters.com"]',
      'div[id*="counter"]',
      'span[id*="counter"]',
      'div[class*="counter"]',
      'span[class*="counter"]'
    ];
    
    let counterElement = null;
    
    // Tìm counter trong body
    for (const selector of possibleCounterSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (el.textContent && /^\d+/.test(el.textContent.trim())) {
          counterElement = el;
          break;
        }
      }
      if (counterElement) break;
    }
    
    // Nếu tìm thấy counter ở vị trí khác, di chuyển vào container
    if (counterElement && !counterContainer.contains(counterElement)) {
      counterElement.style.display = "inline-block";
      counterElement.style.fontWeight = "700";
      counterElement.style.color = "#c8102e";
      counterElement.style.fontSize = "16px";
      counterElement.style.textDecoration = "none";
      counterContainer.appendChild(counterElement);
    }
    
    // Áp dụng style cho tất cả các element trong container
    const counterElements = counterContainer.querySelectorAll("*");
    counterElements.forEach(el => {
      if (el.tagName === "A" || el.tagName === "SPAN" || el.tagName === "DIV") {
        el.style.fontWeight = "700";
        el.style.color = "#c8102e";
        el.style.fontSize = "16px";
        el.style.textDecoration = "none";
        el.style.display = "inline-block";
      }
    });
    
    // Nếu có link, loại bỏ underline và màu mặc định
    const links = counterContainer.querySelectorAll("a");
    links.forEach(link => {
      link.style.textDecoration = "none";
      link.style.color = "#c8102e";
    });
  }, 500);
  
  // Thử lại sau 1 giây và 2 giây nếu chưa có
  setTimeout(() => {
    const counterContainer = document.getElementById("visitor-counter-container");
    if (counterContainer && counterContainer.children.length === 0) {
      styleVisitorCounter();
    }
  }, 1000);
  
  setTimeout(() => {
    const counterContainer = document.getElementById("visitor-counter-container");
    if (counterContainer && counterContainer.children.length === 0) {
      styleVisitorCounter();
    }
  }, 6000);
}

// ==================== Khởi động ứng dụng ====================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    styleVisitorCounter();
    initApp();
  });
} else {
  styleVisitorCounter();
  initApp();
}
