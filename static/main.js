// Térkép inicializálása és alapértelmezett nézet beállítása Veszprémre
let map = L.map('map').setView([47.092, 17.909], 14);

// OpenStreetMap csempe hozzáadása
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Változók definiálása
let newPointLatLng = null;
let userLocationMarker = null;

// Helymeghatározás a mobilkészülékről
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    function (position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Térkép középpont beállítása a felhasználó pozíciójára
      map.setView([lat, lng], 14);

      // Felhasználói pozíció marker hozzáadása
      userLocationMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
      newPointLatLng = { lat, lng };

      userLocationMarker.on("dragend", function () {
        newPointLatLng = userLocationMarker.getLatLng();
      });
    },
    function (error) {
      // Pontos hibaüzenetek kiíratása
      let errorMessage;
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Hozzáférés megtagadva.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "A helyzet nem érhető el.";
          break;
        case error.TIMEOUT:
          errorMessage = "A kérés időtúllépést eredményezett.";
          break;
        default:
          errorMessage = "Ismeretlen hiba történt.";
          break;
      }
      console.error("Hiba történt a helymeghatározáskor:", errorMessage);
      alert(`Nem sikerült a helyzeted meghatározása: ${errorMessage}`);
    },
    { 
      enableHighAccuracy: true,
      timeout: 10000,       // 10 másodperces időtúllépés
      maximumAge: 0         // Mindig a legfrissebb pozíciót használja
    }
  );
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

  if (!pointName) {
    alert("Kérlek, add meg a pont nevét!");
    return;
  }

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
    savePointToDatabase(pointName, pointDescription, '');
  }
});

// Funkció a pont mentésére az adatbázisba
function savePointToDatabase(name, description, image) {
  const pointData = new FormData();
  pointData.append('name', name);
  pointData.append('description', description);
  pointData.append('image', image);
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
  modal.style.display = "none";
  document.getElementById('point-name').value = '';
  document.getElementById('point-description').value = '';
  document.getElementById('point-image').value = '';
  newPointLatLng = null;
}

// Gyroszkóp és iránytű adatok begyűjtése
window.addEventListener('deviceorientation', function (event) {
  const alpha = event.alpha;
  const beta = event.beta;
  const gamma = event.gamma;

  console.log(`Iránytű adatok: Alfa: ${alpha}, Béta: ${beta}, Gamma: ${gamma}`);
});

// A pont hozzáadásának megszakítása
cancelButton.addEventListener('click', function () {
  closeModalAndResetFields();
});

// Modális ablak bezárása az X gombbal
closeButton.addEventListener('click', function () {
  closeModalAndResetFields();
});

document.getElementById("location-button").addEventListener("click", function () {
  // Ellenőrizzük, hogy a geolokáció támogatott-e
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Ellenőrizzük, hogy már létezik-e marker, ha igen, frissítjük a helyzetét
        if (userLocationMarker) {
          userLocationMarker.setLatLng([lat, lng]);
        } else {
          // Új marker létrehozása a felhasználó pozíciójához
          userLocationMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
          map.setView([lat, lng], 14);

          // Marker pozíció frissítése, ha a felhasználó elhúzza
          userLocationMarker.on("dragend", function () {
            newPointLatLng = userLocationMarker.getLatLng();
          });
        }

        // Kép feltöltése csak kamera használatával
        const modal = document.getElementById("modal");
        modal.style.display = "block";  // A modális ablak megjelenítése

        // Kikényszerítjük a kamera használatát a kép feltöltéshez
        const pointImage = document.getElementById('point-image');
        pointImage.setAttribute("capture", "camera");

        // Beállítjuk a feltöltési helyzetet
        newPointLatLng = { lat, lng };
      },
      function (error) {
        // Pontos hibaüzenetek kiíratása
        let errorMessage;
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Hozzáférés megtagadva.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "A helyzet nem érhető el.";
            break;
          case error.TIMEOUT:
            errorMessage = "A kérés időtúllépést eredményezett.";
            break;
          default:
            errorMessage = "Ismeretlen hiba történt.";
            break;
        }
        console.error("Hiba történt a helymeghatározáskor:", errorMessage);
        alert(`Nem sikerült a helyzeted meghatározása: ${errorMessage}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,        // 10 másodperces időtúllépés
        maximumAge: 0          // Mindig a legfrissebb pozíciót használja
      }
    );
  } else {
    alert("Az eszköz nem támogatja a geolokációt.");
  }
});
