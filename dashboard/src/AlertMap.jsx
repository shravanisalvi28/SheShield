import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import { useEffect } from "react";

import "leaflet/dist/leaflet.css";


// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});


// --------------------------------------------------
// Coordinate validation
// --------------------------------------------------

function isValidCoordinate(lat, lng) {
  return (
    lat !== undefined &&
    lng !== undefined &&
    !isNaN(Number(lat)) &&
    !isNaN(Number(lng))
  );
}


// --------------------------------------------------
// Map controller
// --------------------------------------------------

function MapController({ locations, selectedLocation }) {
  const map = useMap();

  // Automatically fit all locations
  useEffect(() => {
    if (!locations.length) return;

    const bounds = L.latLngBounds(
      locations.map((location) => [
        Number(location.latitude),
        Number(location.longitude),
      ])
    );

    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 15,
    });
  }, [locations, map]);


  // Focus selected location
  useEffect(() => {
    if (!selectedLocation) return;

    map.flyTo(
      [
        Number(selectedLocation.latitude),
        Number(selectedLocation.longitude),
      ],
      17,
      {
        duration: 1.2,
      }
    );
  }, [selectedLocation, map]);


  return null;
}


// --------------------------------------------------
// Main Map
// --------------------------------------------------

export default function AlertMap({
  alerts = [],
  guardianSessions = [],
  selectedLocation = null,
}) {

  const alertLocations = alerts.filter((alert) =>
    isValidCoordinate(alert.latitude, alert.longitude)
  );

  const guardianLocations = guardianSessions.filter((session) =>
    isValidCoordinate(session.latitude, session.longitude)
  );


  const allLocations = [
    ...alertLocations,
    ...guardianLocations,
  ];


  const defaultCenter = [20.5937, 78.9629];


  const center =
    allLocations.length > 0
      ? [
          Number(allLocations[0].latitude),
          Number(allLocations[0].longitude),
        ]
      : defaultCenter;


  return (
    <div className="map-container">

      <MapContainer
        center={center}
        zoom={allLocations.length > 0 ? 15 : 5}
        scrollWheelZoom={true}
        style={{
          height: "100%",
          width: "100%",
        }}
      >

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />


        <MapController
          locations={allLocations}
          selectedLocation={selectedLocation}
        />


        {/* =====================================
            EMERGENCY ALERT MARKERS
        ===================================== */}

        {alertLocations.map((alert) => {

          const position = [
            Number(alert.latitude),
            Number(alert.longitude),
          ];

          const active = alert.status === "active";


          return (
            <div key={`alert-${alert.id}`}>

              <Marker position={position}>

                <Popup>

                  <div>

                    <strong>
                      🚨 SheShield Emergency
                    </strong>

                    <hr />

                    <b>Status:</b>{" "}
                    {alert.status?.toUpperCase() || "UNKNOWN"}

                    <br />

                    <b>Trigger:</b>{" "}
                    {alert.trigger_type || "Emergency"}

                    <br />

                    <b>User:</b>{" "}
                    {alert.user_id || "Unknown"}

                    <br />

                    <b>Latitude:</b>{" "}
                    {Number(alert.latitude).toFixed(6)}

                    <br />

                    <b>Longitude:</b>{" "}
                    {Number(alert.longitude).toFixed(6)}


                    {alert.nearest_police && (
                      <>
                        <br />
                        <b>Police:</b>{" "}
                        {alert.nearest_police.name}
                      </>
                    )}


                    {alert.nearest_hospital && (
                      <>
                        <br />
                        <b>Hospital:</b>{" "}
                        {alert.nearest_hospital.name}
                      </>
                    )}

                  </div>

                </Popup>

              </Marker>


              <Circle
                center={position}
                radius={active ? 150 : 80}
                pathOptions={{
                  color: active
                    ? "#C00000"
                    : "#777",

                  fillColor: active
                    ? "#C00000"
                    : "#777",

                  fillOpacity: active
                    ? 0.15
                    : 0.08,
                }}
              />

            </div>
          );
        })}


        {/* =====================================
            GUARDIAN MARKERS
        ===================================== */}

        {guardianLocations.map((session) => {

          const position = [
            Number(session.latitude),
            Number(session.longitude),
          ];


          return (
            <div key={`guardian-${session.id}`}>

              <Marker position={position}>

                <Popup>

                  <div>

                    <strong>
                      🛡️ Guardian Mode
                    </strong>

                    <hr />

                    <b>User:</b>{" "}
                    {session.userId || "Unknown"}

                    <br />

                    <b>Guardian:</b>{" "}
                    {session.guardianName || "Unknown"}

                    <br />

                    <b>Status:</b> ACTIVE

                    <br />

                    <b>Latitude:</b>{" "}
                    {Number(session.latitude).toFixed(6)}

                    <br />

                    <b>Longitude:</b>{" "}
                    {Number(session.longitude).toFixed(6)}

                  </div>

                </Popup>

              </Marker>


              <Circle
                center={position}
                radius={100}
                pathOptions={{
                  color: "#4CAF50",
                  fillColor: "#4CAF50",
                  fillOpacity: 0.12,
                }}
              />

            </div>
          );
        })}

      </MapContainer>


      {/* =====================================
          MAP LEGEND
      ===================================== */}

      <div className="map-legend">

        <div>
          <span className="legend-dot emergency"></span>
          Emergency Alert
        </div>

        <div>
          <span className="legend-dot guardian"></span>
          Guardian Mode
        </div>

      </div>

    </div>
  );
}