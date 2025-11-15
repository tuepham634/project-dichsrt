/* =============================
   BẢN ĐỒ Giá GIÁM SÁT
==============================*/
const wmsUrl = 'http://115.146.126.49:8081/geoserver/iTwood_Workspace/wms';
const wfsUrl = 'http://115.146.126.49:8081/geoserver/iTwood_Workspace/wfs';

const map = L.map('map_giam_sat').setView([18.3, 105.9], 8);

// ===== Zoom control =====
map.removeControl(map.zoomControl);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// ===== Nền mặc định OSM =====
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// ===== LayerGroups quản lý overlay =====
const layerGroups = {
    wms: L.layerGroup(),
    wfs_defor: L.layerGroup().addTo(map),
    wfs_degrad: L.layerGroup().addTo(map)
};

let wmsLayer = null;
let wfslayerFind

/* ===============
   Hàm load WMS 
=================*/
function loadWMS(layerName) {
    if (wmsLayer) layerGroups.wms.removeLayer(wmsLayer);

    wmsLayer = L.tileLayer.wms(wmsUrl, {
        layers: `iTwood_Workspace:${layerName}`,
        format: 'image/png',
        transparent: true
    }).addTo(layerGroups.wms);

    wmsLayer.bringToFront();
}

/* ===============
   Hàm load WFS
=================*/
function loadWFS(typeMap) {
    layerGroups.wfs_defor.clearLayers();
    layerGroups.wfs_degrad.clearLayers();

    let layersToLoad = [];
    if (typeMap === "Sauromthong_6tinh") {
        layersToLoad = ["srt_defor_forest_map", "srt_degrad_forest_map"];
    } else if (typeMap === "Benhhaikeo_8tinh") {
        layersToLoad = ["bhk_defor_forest_map", "bhk_degrad_forest_map"];
    } else {
        layersToLoad = ["shk_defor_forest_map", "shk_degrad_forest_map"];
    }

    layersToLoad.forEach(layerName => {
        const url = `${wfsUrl}?service=WFS&version=1.1.0&request=GetFeature&typeName=iTwood_Workspace:${layerName}&outputFormat=application/json`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (!data.features?.length) return;

                const style = {
                    color: layerName.includes("defor") ? "red" : "yellow",
                    weight: 3,
                    fillOpacity: 0.3,
                    interactive: true
                };

                const geoLayer = L.geoJSON(data.features, { style });
                if (layerName.includes("defor")) geoLayer.addTo(layerGroups.wfs_defor);
                else geoLayer.addTo(layerGroups.wfs_degrad);
            })
            .catch(err => console.error("Lỗi tải WFS:", err));
    });
}

// ===== tạo nhóm  để chọn riêng cho conditon
const layerGroups2 = {
    wms: L.layerGroup(),
    wfs_defor: L.layerGroup().addTo(map),
    wfs_degrad: L.layerGroup().addTo(map)
};

/* ===============
   Hàm load WFS theo điều kiện
=================*/
function loadWFSByCondition(layerName, conditions) {



    // Xóa các lớp cũ
    if (layerGroups2.wfs_defor) {
        layerGroups2.wfs_defor.clearLayers();
    }
    if (layerGroups2.wfs_degrad) {
        layerGroups2.wfs_degrad.clearLayers();
    }

    console.log("Load Layer Name:", layerName)
    // Xác định danh sách layer WFS theo loại bản đồ
    let layersToLoad = [];
    if (layerName === "Sauromthong_6tinh") {
        layersToLoad = ["srt_defor_forest_map", "srt_degrad_forest_map"];
    } else if (layerName === "Benhhaikeo_8tinh") {
        layersToLoad = ["bhk_defor_forest_map", "bhk_degrad_forest_map"];
    } else if (layerName === "Benhhaikeo_8tinh") {
        layersToLoad = ["shk_defor_forest_map", "shk_degrad_forest_map"];
    } else {
        return
    }

    // Tạo CQL filter
    const cqlFilter = `xa='${conditions.xa}' AND tk='${conditions.tk}' AND khoanh='${conditions.khoanh}' AND lo='${conditions.lo}'`;

    // Lặp qua từng layer để load
    layersToLoad.forEach(typeName => {
        const url = `${wfsUrl}?service=WFS&version=1.1.0&request=GetFeature&typeName=iTwood_Workspace:${typeName}&outputFormat=application/json&CQL_FILTER=${encodeURIComponent(cqlFilter)}`;

        fetch(url)
            .then(res => res.json())
            .then(data => {

                console.log("wfs:", data)

                if (!data.features?.length) {
                    console.warn("Không tìm thấy feature:", conditions, typeName);
                    return;
                }

                const geoJsonLayer = L.geoJSON(data.features, {
                    style: {
                        color: "blue",
                        weight: 5,
                        fillOpacity: 0.3,
                        interactive: true
                    }
                });

                // Thêm vào group tương ứng
                if (typeName.includes("defor")) {
                    geoJsonLayer.addTo(layerGroups2.wfs_defor);
                } else {
                    geoJsonLayer.addTo(layerGroups2.wfs_degrad);
                }

                // Fit map đến vùng tìm được
                map.fitBounds(geoJsonLayer.getBounds());

                // Hiển thị popup cho feature đầu tiên
                let featureLayer;
                geoJsonLayer.eachLayer(l => (featureLayer = l));
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
                          </table>
                        </div>
                    `;
                    L.popup().setLatLng(center).setContent(content).openOn(map);
                    map.setView(center, 15);
                }
            })
            .catch(err => console.error("Lỗi tải WFS:", err));
    });
}


/* =============================
   COMBOBOX LOAD MAP
==============================*/
const comboBoxMap = document.getElementById("layerSelect");
comboBoxMap.addEventListener("change", e => {
    const selected = e.target.value;
    if (selected) {
        loadWMS(selected);
        loadWFS(selected);

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
    loadWFS(bando);
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
        console.log("condition:", conditions)
        loadWFSByCondition(comboBoxMap.value, conditions);
    });
});

/* =============================
   ĐỌC PARAM ADMIN TRÊN URL
==============================*/
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const { bando, xa, tk, khoanh, lo } = Object.fromEntries(params.entries());
    console.log(bando)

    // if (bando) {
    //     comboBoxMap.value = bando;
    // }
    // console.log(comboBoxMap.value)

    if (xa && tk && khoanh && lo) {
        loadWFSByCondition(bando, { xa, tk, khoanh, lo });
        const infoTable = document.querySelector(".info-table");
        const header = document.querySelector(".header")
        const topheader = document.querySelector(".top-header")
        const footer = document.querySelector(".footer")
        const map = document.querySelector("#map_giam_sat")
        if (map) map.style.height = "100vh"
        if (header) header.style.display = "none"
        if (topheader) topheader.style.display = "none"
        if (footer) footer.style.display = "none"
        if (infoTable) infoTable.style.display = "none";
    }
});

/* =============================
   CONTROL NỀN + CHECKBOX
==============================*/
const basemapControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd: (map) => {
        const container = L.DomUtil.create('div', 'basemapControl');

        // Nút chính
        const mainBtn = L.DomUtil.create('div', 'basemap-main', container);
        const overlay = L.DomUtil.create('div', 'basemap-overlay', mainBtn);
        L.DomUtil.create('i', 'fas fa-layer-group', overlay);
        const overlayText = L.DomUtil.create('span', '', overlay);
        overlayText.innerText = 'Lớp bản đồ';

        // Menu
        const menu = L.DomUtil.create('div', 'basemap-menu', container);

        // Các basemap
        const basemaps = {
            GoogleStreets: L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }),
            GoogleHybrid: L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }),
            GoogleSatellite: L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }),
            GoogleTerrain: L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }),
            OpenMapStreets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        };

        basemaps.GoogleStreets.addTo(map);

        Object.keys(basemaps).forEach(key => {
            const item = L.DomUtil.create('div', 'basemap-item', menu);
            item.innerText = key;
            item.addEventListener('click', () => {
                Object.values(basemaps).forEach(l => map.removeLayer(l));
                basemaps[key].addTo(map);
                overlayText.innerText = key;
                menu.style.display = 'none';
            });
        });

        // Separator
        L.DomUtil.create('hr', '', menu);

        // Checkbox overlay
        const overlayGroup = L.DomUtil.create('div', 'overlay-checkboxes', menu);
        overlayGroup.innerHTML = `
            <label><input type="checkbox" name="overlayLayer" value="wms"> WMS Layer</label><br>
            <label><input type="checkbox" name="overlayLayer" value="wfs_defor" checked> WFS (defor)</label><br>
            <label><input type="checkbox" name="overlayLayer" value="wfs_degrad" checked> WFS (degrad)</label><br>
        `;

        overlayGroup.querySelectorAll("input[name='overlayLayer']").forEach(cb => {
            cb.addEventListener("change", e => {
                const value = e.target.value;
                if (e.target.checked) map.addLayer(layerGroups[value]);
                else map.removeLayer(layerGroups[value]);
            });
        });

        mainBtn.addEventListener('click', () => {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        });

        L.DomEvent.disableClickPropagation(container);
        return container;
    }
});
map.addControl(new basemapControl());

/* =============================
   CHÚ THÍCH BẢN ĐỒ
==============================*/
const legendControl = L.Control.extend({
    options: { position: 'bottomleft' },
    onAdd: () => {
        const container = L.DomUtil.create('div', 'legendControl');
        const title = L.DomUtil.create('div', 'legend-title', container);
        title.innerText = 'Chú thích';

        const items = [
            { color: 'yellow', label: 'Vàng - Nhẹ' },
            { color: 'red', label: 'Đỏ - Nặng' }
        ];

        items.forEach(({ color, label }) => {
            const row = L.DomUtil.create('div', 'legend-item', container);
            const box = L.DomUtil.create('span', 'legend-box', row);
            box.style.backgroundColor = color;
            L.DomUtil.create('span', 'legend-text', row).innerText = label;
        });

        L.DomEvent.disableClickPropagation(container);
        return container;
    }
});
map.addControl(new legendControl());


