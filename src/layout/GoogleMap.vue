<template>
  <div ref="map" class="map-container"></div>
</template>

<script>
import { useLayout } from "@/layout/composables/layout";

export default {
  name: "GoogleMap",
  props: {
      operaciones: {
          type: Array,
          required: true,
      },
  },
  setup() {
      const { isDarkTheme, getDarkModeStyles, getLightModeStyles } = useLayout();
      return { isDarkTheme, getDarkModeStyles, getLightModeStyles };
  },
  watch: {
      operaciones: {
          handler() {
              if (Array.isArray(this.operaciones) && this.operaciones.length > 0) {
                  this.loadGoogleMapsApi().then(() => {
                      console.log('Google Maps API loaded');
                      this.initMap();
                  }).catch((error) => {
                      console.error('Error loading Google Maps API:', error);
                  });
              } else {
                  console.warn('No operations to display on the map.');
              }
          },
          immediate: true,
          deep: true,
      },
      isDarkTheme: {
          handler(newVal) {
              if (this.map) {
                  this.map.setOptions({ styles: newVal ? this.getDarkModeStyles : this.getLightModeStyles });
                  this.updateMarkers();
              }
          },
          immediate: true,
      },
  },
  methods: {
      loadGoogleMapsApi() {
          return new Promise((resolve, reject) => {
              if (typeof google !== 'undefined') {
                  resolve();
                  return;
              }

              window.onGoogleMapsLoad = () => resolve();

              const script = document.createElement('script');
              script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyBY9DdqQA0qfNATg16j54HHQtu-_hG4VJc&libraries=places&callback=onGoogleMapsLoad";
              script.onerror = reject;
              document.head.appendChild(script);
          });
      },
      initMap() {
          if (!Array.isArray(this.operaciones) || this.operaciones.length === 0) {
              console.error('No hay operaciones para mostrar en el mapa.');
              return;
          }

          const primeraOperacion = this.operaciones[0];
          const mapOptions = {
              center: { lat: parseFloat(primeraOperacion.lat), lng: parseFloat(primeraOperacion.lng) },
              zoom: 14,
              styles: this.isDarkTheme ? this.getDarkModeStyles : this.getLightModeStyles,
          };
          this.map = new google.maps.Map(this.$refs.map, mapOptions);

          this.updateMarkers();
      },
      updateMarkers() {
          if (!Array.isArray(this.operaciones)) {
              console.error('No hay operaciones para mostrar en el mapa.');
              return;
          }

          try {
              // Limpiar marcadores existentes si ya existen
              if (this.markers) {
                  this.markers.forEach(marker => marker.setMap(null));
              }
              this.markers = [];

              const pathCoordinates = [];
              const markerPositions = new Map();

              // Definición de íconos de marcador personalizados usando Icons8
              const iconUrls = {
                  'Inicio de sesión': 'https://img.icons8.com/stickers/50/nft-user.png',
                  'Cambio de ubicación': 'https://img.icons8.com/stickers/50/track-order.png',
                  'Terminar día': 'https://img.icons8.com/dusk/64/task-completed.png',
                  'Entrega realizada (parcial)': 'https://img.icons8.com/skeuomorphism/64/delivery.png',
                  'Entrega realizada (entregado)': 'https://img.icons8.com/stickers/50/paid.png',
                  'Entrega realizada (no_entregado)': 'https://img.icons8.com/stickers/50/delete-sign.png',
              };

              this.operaciones.forEach((operacion) => {
                  let lat = parseFloat(operacion.lat);
                  let lng = parseFloat(operacion.lng);
                  const positionKey = `${lat},${lng}`;

                  if (markerPositions.has(positionKey)) {
                      const offset = markerPositions.get(positionKey) * 0.00001;
                      lat += offset;
                      lng += offset;
                      markerPositions.set(positionKey, markerPositions.get(positionKey) + 1);
                  } else {
                      markerPositions.set(positionKey, 1);
                  }
                  const position = { lat, lng };
                  pathCoordinates.push(position);

                  let iconUrl = iconUrls[operacion.tipoSinNumero] || iconUrls['Entrega realizada (entregado)']; // Usar un icono predeterminado si no se encuentra el tipo

                  const marker = new google.maps.Marker({
                      position,
                      map: this.map,
                      title: operacion.tipo,
                      icon: {
                          url: iconUrl,
                          scaledSize: new google.maps.Size(42, 42), // Ajuste del tamaño del icono
                          labelOrigin: new google.maps.Point(21, 50) // Ajuste de la posición de la etiqueta
                      },
                      label: operacion.numero
                          ? {
                              text: operacion.numero.toString(),
                              color: 'white',
                              fontSize: '24px',
                              fontWeight: 'bold'
                          }
                          : null
                  });

                  const infoContent = `
                      <div class="info-window-content">
                          <p class="font-semibold text-lg">Acción: ${operacion.tipo}</p>
                          <p class="font-semibold text-lg">Usuario: ${operacion.usuario || 'N/A'}</p>
                          <p class="font-semibold text-lg">Cliente: ${operacion.cliente || 'N/A'}</p>
                          <p class="font-semibold text-lg">Entrega: ${operacion.vbeln || 'N/A'}</p>
                          <p class="font-semibold text-lg">Fecha-Hora: ${operacion.fechaHora || 'N/A'}</p>
                      </div>
                  `;

                  const infoWindow = new google.maps.InfoWindow({
                      content: infoContent,
                  });

                  marker.addListener('click', () => {
                      infoWindow.open(this.map, marker);
                  });

                  this.markers.push(marker);
              });

              const path = new google.maps.Polyline({
                  path: pathCoordinates,
                  geodesic: true,
                  strokeColor: '#e98d58',
                  strokeOpacity: 1.0,
                  strokeWeight: 4,
              });

              path.setMap(this.map);

              console.log('Path coordinates:', pathCoordinates);
          } catch (error) {
              console.error('Error updating markers:', error);
          }
      },
  },
};
</script>

<style>
.map-container {
  width: 100%;
  height: 500px; /* Asegúrate de que el contenedor tenga un tamaño adecuado */
}
.map-container .gm-style-iw {
  width: auto !important;
  max-width: 300px; /* Ajusta esto según sea necesario */
  white-space: nowrap;
}
.info-window-content p {
  color: #5c5c5c; /* Ajusta el color del texto */
  font-size: 14px; /* Ajusta el tamaño de la fuente */
  margin: 0; /* Elimina cualquier margen predeterminado */
}
</style>