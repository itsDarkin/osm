// Térkép inicializálása
let map = L.map('map').setView([47.092, 17.909], 14);

// OpenStreetMap csempe hozzáadása
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// Helymeghatározás a mobilkészülékről
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(function (position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    // Állítsuk be a térképen a felhasználó pozícióját
    map.setView([lat, lng], 14);

    // Marker helyének automatikus beállítása a GPS pozíció alapján
    newPointLatLng = { lat, lng };
  }, function (error) {
    console.error('Hiba történt a helymeghatározáskor:', error);
  });
} else {
  alert('Az eszköz nem támogatja a geolokációt.');
}

// Adatbázisban tárolt marker-ek lekérése és megjelenítése
fetch('/get_markers')
  .then(response => response.json())
  .then(markers => {
    markers.forEach(markerData => {
      const marker = L.marker([markerData.lat, markerData.lng]).addTo(map);
      let popupContent = `<strong>${markerData.name}</strong><br>${markerData.description}`;
      if (markerData.image) {
        popupContent += `<br><img src="${markerData.image}" width="200" height="auto">`;
      }
      marker.bindPopup(popupContent);
    });
  })
  .catch(error => console.error('Hiba történt a marker-ek lekérésekor:', error));

// Modális ablakok kezelése
let newPointLatLng = null;
const modal = document.getElementById("modal");
const saveButton = document.getElementById("save-point");
const cancelButton = document.getElementById("cancel-point");
const closeButton = document.querySelector(".close-btn");

// Modális ablak megjelenítése a térképen való kattintáskor
map.on('click', function (e) {
  newPointLatLng = e.latlng;
  modal.style.display = "block";  // Modális ablak megjelenítése
});

// Kép feltöltése és mentése (kamera vagy galéria)
saveButton.addEventListener('click', function () {
  const pointName = document.getElementById('point-name').value;
  const pointDescription = document.getElementById('point-description').value;
  const pointImage = document.getElementById('point-image').files[0];

  // Ellenőrizzük, hogy a név meg van-e adva
  if (!pointName) {
    alert("Kérlek, add meg a pont nevét!");
    return;
  }

  // Kép feltöltése
  if (newPointLatLng && pointImage) {
    const formData = new FormData();
    formData.append('file', pointImage);

    fetch('/upload_image', {
      method: 'POST',
      body: formData
    }).then(response => response.json())
      .then(data => {
        if (data.error) {
          console.error('Kép feltöltési hiba:', data.error);
          alert('Hiba történt a kép feltöltésekor.');
          return;
        }
        const imageUrl = data.image_url;

        // Pont mentése az adatbázisba a képpel együtt
        savePointToDatabase(pointName, pointDescription, imageUrl);
      })
      .catch(error => {
        console.error('Hiba történt a kép feltöltésekor:', error);
        alert('Hiba történt a kép feltöltésekor.');
      });

  } else if (newPointLatLng) {
    // Ha nincs kép, csak a pontot mentjük
    savePointToDatabase(pointName, pointDescription, '');
  }
});

// Funkció a pont mentésére az adatbázisba
function savePointToDatabase(name, description, image) {
  const pointData = new FormData();
  pointData.append('name', name);
  pointData.append('description', description);
  pointData.append('image', image);  // üres string, ha nincs kép
  pointData.append('lat', newPointLatLng.lat);
  pointData.append('lng', newPointLatLng.lng);

  fetch('/add_point', {
    method: 'POST',
    body: pointData
  }).then(() => {
    // Pont megjelenítése a térképen
    let marker = L.marker(newPointLatLng).addTo(map);
    let popupContent = `<strong>${name}</strong><br>${description}`;
    if (image) {
      popupContent += `<br><img src="${image}" width="200" height="auto">`;
    }
    marker.bindPopup(popupContent);

    // Modális ablak bezárása és mezők ürítése
    closeModalAndResetFields();
  }).catch(error => {
    console.error('Hiba történt a pont mentésekor:', error);
    alert('Hiba történt a pont mentésekor.');
  });
}

// Modális ablak bezárása és mezők alaphelyzetbe állítása
function closeModalAndResetFields() {
  modal.style.display = "none";  // Modális ablak bezárása
  document.getElementById('point-name').value = '';  // Név mező ürítése
  document.getElementById('point-description').value = '';  // Leírás mező ürítése
  document.getElementById('point-image').value = '';  // Kép mező ürítése
  newPointLatLng = null;  // Koordináták alaphelyzetbe állítása
}

// Gyroszkóp és iránytű adatok begyűjtése
window.addEventListener('deviceorientation', function (event) {
  const alpha = event.alpha;  // A készülék forgása a Z tengely körül
  const beta = event.beta;    // A készülék dőlése a X tengely körül
  const gamma = event.gamma;  // A készülék dőlése a Y tengely körül

  console.log(`Iránytű adatok: Alfa: ${alpha}, Béta: ${beta}, Gamma: ${gamma}`);
});

// A pont hozzáadásának megszakítása
cancelButton.addEventListener('click', function () {
  closeModalAndResetFields();  // Modális ablak bezárása és alaphelyzetbe állítás
});

// Modális ablak bezárása az X gombbal
closeButton.addEventListener('click', function () {
  closeModalAndResetFields();  // Modális ablak bezárása és alaphelyzetbe állítás
});
