/* =============================
   BẢN ĐỒ CẢNH BÁO
==============================*/

const wmsUrl = 'http://115.146.126.49:8081/geoserver/iTwood_Workspace/wms';
const wfsUrl = 'http://115.146.126.49:8081/geoserver/iTwood_Workspace/wfs';

const map = L.map('map_canh_bao').setView([18.3, 105.9], 7);

// ===== Zoom control =====
map.removeControl(map.zoomControl);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// ===== Nền mặc định OSM =====
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// ===== Biến quản lý layer =====
let wmsLayer = null;
let currentWfsLayer = null;

/* ===============
   Hàm load WMS
=================*/
const loadWMS = (layerName) => {
    if (wmsLayer) {
        map.removeLayer(wmsLayer);
        wmsLayer = null;
    }

    wmsLayer = L.tileLayer.wms(wmsUrl, {
        layers: `iTwood_Workspace:${layerName}`,
        format: 'image/png',
        transparent: true
    }).addTo(map);

    wmsLayer.bringToFront();
};

/* ===============
   Hàm load WFS (toàn bộ cb_srt_map)
=================*/
// const loadWFS = (layerName) => {
//     if (currentWfsLayer) {
//         map.removeLayer(currentWfsLayer);
//         currentWfsLayer = null;
//     }

//     const url = `${wfsUrl}?service=WFS&version=1.1.0&request=GetFeature&typeName=iTwood_Workspace:${layerName}&outputFormat=application/json`;

//     fetch(url)
//         .then(res => res.json())
//         .then(data => {
//             if (!data.features?.length) {
//                 console.warn("Không có dữ liệu WFS");
//                 return;
//             }

//             const style = {
//                 color: "red",
//                 weight: 3,
//                 fillOpacity: 0.3,
//                 interactive: true
//             };

//             currentWfsLayer = L.geoJSON(data.features, {
//                 style,
//                 onEachFeature: (feature, layer) => {
//                     let props = feature.properties;
//                     let popupContent = "<b>Thông tin đối tượng:</b><br/>";
//                     for (let key in props) {
//                         popupContent += `${key}: ${props[key]}<br/>`;
//                     }
//                     layer.bindPopup(popupContent);
//                 }
//             }).addTo(map);

//             map.fitBounds(currentWfsLayer.getBounds());
//         })
//         .catch(err => console.error("Lỗi tải WFS:", err));
// };

/* ===============
   Hàm load WFS theo điều kiện
=================*/
const loadWFSByCondition = (layerName, conditions) => {
    if (currentWfsLayer) {
        map.removeLayer(currentWfsLayer);
        currentWfsLayer = null;
    }
    console.log(conditions)

    const cqlFilter = `xa='${conditions.xa}' AND tk='${conditions.tk}' AND khoanh='${conditions.khoanh}' AND lo='${conditions.lo}'`;
    const url = `${wfsUrl}?service=WFS&version=1.1.0&request=GetFeature&typeName=iTwood_Workspace:${layerName}&outputFormat=application/json&CQL_FILTER=${encodeURIComponent(cqlFilter)}`;

    console.log(url)

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data.features?.length) {
                console.warn("Không tìm thấy feature:", conditions);
                return;
            }

            currentWfsLayer = L.geoJSON(data.features, {
                style: { color: "blue", weight: 5, fillOpacity: 0.3, interactive: true }
            }).addTo(map);

            map.fitBounds(currentWfsLayer.getBounds());

            let featureLayer;
            currentWfsLayer.eachLayer(l => (featureLayer = l));
            if (featureLayer?.feature?.properties) {
                const props = featureLayer.feature.properties;
                const center = featureLayer.getBounds().getCenter();

                const content = `
                    <div class="info-popup">
                      <table style="font-family: 'Times New Roman', Times, serif;">
                        <tr><th>Xã</th><td>${props.xa || ''}</td></tr>
                        <tr><th>Tiểu Khu</th><td>${props.tk || ''}</td></tr>
                        <tr><th>Khoanh</th><td>${props.khoanh || ''}</td></tr>
                        <tr><th>Lô</th><td>${props.lo || ''}</td></tr>
                        <tr><th>Diện tích</th><td>${props.dtich || ''}</td></tr>
                        <tr><th>Loại rừng</th><td>${props.ldlr || ''}</td></tr>
                        <tr><th>Chủ rừng</th><td>${props.churung || ''}</td></tr>
                        <tr><th>Ảnh hưởng dự kiến</th><td>${props.muc_ah == 100 ? 'Rất nặng' : props.muc_ah == 75 ? 'Nặng' : props.muc_ah == 50 ? 'Trung bình' : ''}</td></tr>
                        <tr><td colspan="2"><b>Thời điểm phát dịch còn ${props.so_ngay_con_lai ? props.so_ngay_con_lai + ' ngày' : ''}</b></td></tr>
                      </table>
                    </div>
                `;
                L.popup().setLatLng(center).setContent(content).openOn(map);
                map.setView(center, 15);
            }
        })
        .catch(err => console.error("Lỗi tải WFS:", err));
};

/* =============================
   COMBOBOX LOAD MAP
==============================*/
const comboBoxMap = document.getElementById("layerSelect");
comboBoxMap.addEventListener("change", e => {
    const selected = e.target.value;
    if (selected) {
        loadWMS(selected);
        const url = new URL(window.location.href);
        url.searchParams.set("bando", selected);
        window.location.href = url;
    }
});

/* =============================
   LOAD MAP THEO URL KHI VÀO TRANG
==============================*/
window.addEventListener("DOMContentLoaded", () => {
    const url = new URL(window.location.href);
    let bando = url.searchParams.get("bando");

    if (!bando) {
        bando = comboBoxMap.value;
        url.searchParams.set("bando", bando);
        window.location.href = url;
    }

    comboBoxMap.value = bando;
    loadWMS(bando);
});

/* =============================
   CLICK ROW TRONG BẢNG
==============================*/
document.querySelectorAll('.info-table tbody tr').forEach(row => {
    row.addEventListener('click', () => {
        document.querySelectorAll('.info-table tbody tr').forEach(r => r.classList.remove('active'));
        row.classList.add('active');

        const conditions = {
            xa: `Xã ${row.dataset.xa}`,
            tk: row.dataset.tk,
            khoanh: row.dataset.khoanh,
            lo: row.dataset.lo
        };
        loadWFSByCondition(comboBoxMap.value, conditions);
    });
});

/* =============================
   ĐỌC PARAM ADMIN TRÊN URL
==============================*/
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const { bando, xa, tk, khoanh, lo } = Object.fromEntries(params.entries());

    if (xa && tk && khoanh && lo) {
        loadWFSByCondition(bando, { xa, tk, khoanh, lo });
        const infoTable = document.querySelector(".info-table");
        const header = document.querySelector(".header")
        const topheader = document.querySelector(".top-header")
        const footer = document.querySelector(".footer")
        const map = document.querySelector("#map_canh_bao")
        if (map) map.style.height = "100vh"
        if (header) header.style.display = "none"
        if (topheader) topheader.style.display = "none"
        if (footer) footer.style.display = "none"
        if (infoTable) infoTable.style.display = "none";
    }
});


/* ========================== 
    Control nền chọn nền bản đồ
   ============================*/
const basemapControl = L.Control.extend({
    options: { position: 'bottomright' },

    onAdd: (map) => {
        const container = L.DomUtil.create('div', 'basemapControl');

        // Nút chính
        const mainBtn = L.DomUtil.create('div', 'basemap-main', container);

        // Overlay icon + text
        const overlay = L.DomUtil.create('div', 'basemap-overlay', mainBtn);
        const overlayIcon = L.DomUtil.create('i', 'fas fa-layer-group', overlay);
        const overlayText = L.DomUtil.create('span', '', overlay);
        overlayText.innerText = 'Lớp bản đồ'; // mặc định

        // Menu ẩn chứa các lựa chọn
        const menu = L.DomUtil.create('div', 'basemap-menu', container);

        // Các basemap bạn định nghĩa
        const basemaps = {
            GoogleStreets: L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            }),
            GoogleHybrid: L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            }),
            GoogleSatellite: L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            }),
            GoogleTerrain: L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            }),
            OpenMapStreets: L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        };

        // Thêm mặc định
        basemaps.GoogleStreets.addTo(map);

        // Tạo danh sách menu trực tiếp từ basemaps
        Object.keys(basemaps).forEach((key) => {
            const item = L.DomUtil.create('div', 'basemap-item', menu);
            item.innerText = key; // hiển thị đúng tên key gốc

            item.addEventListener('click', () => {
                // Xóa layer cũ
                Object.values(basemaps).forEach(l => map.removeLayer(l));
                // Thêm layer mới
                basemaps[key].addTo(map);

                // Chỉ cập nhật text, không đè mất CSS/icon
                overlayText.innerText = key;

                // Ẩn menu
                menu.style.display = 'none';
            });
        });

        // Toggle menu khi click
        mainBtn.addEventListener('click', () => {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        });

        L.DomEvent.disableClickPropagation(container);
        return container;
    }
});

const mapControl = new basemapControl();
map.addControl(mapControl);


/* =============================
   CHÚ THÍCH BẢN ĐỒ
==============================*/
/* ========================== 
     Chú thích bản đồ
    ============================*/

const legendControl = L.Control.extend({
    options: { position: 'bottomleft' }, // vị trí góc trái dưới

    onAdd: (map) => {
        const container = L.DomUtil.create('div', 'legendControl');

        // Tiêu đề
        const title = L.DomUtil.create('div', 'legend-title', container);
        title.innerText = 'Chú thích';

        // Danh sách các mức
        const items = [
            { color: 'yellow', label: 'Trung Bình' },
            { color: 'orange', label: 'Nặng' },
            { color: 'red', label: 'Rất Nặng' }
        ];

        items.forEach(item => {
            const row = L.DomUtil.create('div', 'legend-item', container);

            const box = L.DomUtil.create('span', 'legend-box', row);
            box.style.backgroundColor = item.color;

            const text = L.DomUtil.create('span', 'legend-text', row);
            text.innerText = item.label;
        });

        L.DomEvent.disableClickPropagation(container);
        return container;
    }
});

// Thêm vào map
map.addControl(new legendControl());
