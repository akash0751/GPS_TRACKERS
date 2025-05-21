import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import LocationDisplay from './LocationDisplay';
import './App.css';

const socket = io('https://gps-trackers-1.onrender.com');

const GpsApp = () => {
  const [myLocation, setMyLocation] = useState({ latitude: 0, longitude: 0 });
  const [cityName, setCityName] = useState('');
  const [othersLocations, setOthersLocations] = useState({}); // { userId: {latitude, longitude} }
  const [othersPlaces, setOthersPlaces] = useState({}); // { userId: cityName }

  // Function to get city/place name from lat,lng
  const getCityName = async (lat, lng) => {
    const apiKey = '96a9af76331d437f9e067eea4bb78e6a';
    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}`
      );
      const data = await response.json();

      if (data.results.length > 0) {
        const components = data.results[0].components;
        return (
          components.town ||
          components.city ||
          components.village ||
          components.county ||
          'Unknown'
        );
      }
    } catch (err) {
      console.error('Error fetching city name:', err);
    }
    return 'Unknown';
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const location = { latitude, longitude };
          setMyLocation(location);
          socket.emit('send-location', location);

          const city = await getCityName(latitude, longitude);
          setCityName(city);
        },
        (error) => {
          console.error('GPS Error:', error);
        },
        { enableHighAccuracy: true }
      );
    }

    socket.on('receive-locations', (locations) => {
      setOthersLocations(locations);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Whenever othersLocations updates, fetch place names for others
  useEffect(() => {
    const fetchPlaces = async () => {
      const entries = Object.entries(othersLocations);
      const newPlaces = {};

      await Promise.all(
        entries.map(async ([id, loc]) => {
          if (id !== socket.id) {
            // fetch city name for this user's location
            const city = await getCityName(loc.latitude, loc.longitude);
            newPlaces[id] = city;
          }
        })
      );

      setOthersPlaces(newPlaces);
    };

    if (Object.keys(othersLocations).length > 0) {
      fetchPlaces();
    }
  }, [othersLocations]);

  return (
    <div className="GpsApp">
      <h1>🌐 Real-Time GPS Tracker</h1>
      <p className="city-name">
        📍 City: <strong>{cityName}</strong>
      </p>

      {/* My location */}
      {myLocation.latitude !== 0 && (
        <LocationDisplay
          title="My Location"
          latitude={myLocation.latitude}
          longitude={myLocation.longitude}
          place={cityName}
        />
      )}

      {/* Other users' locations */}
      <h2>🧑‍🤝‍🧑 Other Users:</h2>
      {Object.entries(othersLocations).map(([id, loc]) =>
        id !== socket.id ? (
          <LocationDisplay
            key={id}
            title={`User ${loc.name.slice(0, 5)}`}
            latitude={loc.latitude}
            longitude={loc.longitude}
            place={othersPlaces[id] || 'Loading...'}
          />
        ) : null
      )}
    </div>
  );
};

export default GpsApp;
