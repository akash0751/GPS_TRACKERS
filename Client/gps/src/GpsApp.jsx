import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import LocationDisplay from './LocationDisplay';
import './App.css';

const socket = io('https://gps-trackers-1.onrender.com');

const GpsApp = () => {
  const [name, setName] = useState('');
  const [myLocation, setMyLocation] = useState({ latitude: 0, longitude: 0 });
  const [cityName, setCityName] = useState('');
  const [othersLocations, setOthersLocations] = useState({}); // { socketId: { name, latitude, longitude } }
  const [othersPlaces, setOthersPlaces] = useState({});

  const getCityName = async (lat, lng) => {
  const apiKey = '96a9af76331d437f9e067eea4bb78e6a';
  try {
    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}`
    );
    const data = await response.json();

    if (data.results.length > 0) {
      const components = data.results[0].components;
      console.log('OpenCage components:', components);  // <-- log components here

      return (
        components.town ||
        components.city ||
        components.village ||
        components.county ||
        components.state_district ||  // added this fallback
        components.state ||           // added this fallback
        'Unknown'
      );
    }
  } catch (err) {
    console.error('Error fetching city name:', err);
  }
  return 'Unknown';
};


  useEffect(() => {
    if (!name.trim()) return; // Only start geolocation when name is set (trim here)

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const location = { latitude, longitude };
          setMyLocation(location);

          // Send location + trimmed name to server
          socket.emit('send-location', { name: name.trim(), latitude, longitude });

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
  }, [name]);

  // Fetch places for others
  useEffect(() => {
    const fetchPlaces = async () => {
      const entries = Object.entries(othersLocations);
      const newPlaces = {};

      await Promise.all(
        entries.map(async ([id, loc]) => {
          if (id !== socket.id) {
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

  // Show input if name not entered or just spaces
  if (!name.trim()) {
    return (
      <div className="GpsApp">
        <h1>🌐 Real-Time GPS Tracker</h1>
        <label>
          Enter your name:{' '}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)} // raw input, no trim here
            placeholder="Your full name"
            autoFocus
          />
        </label>
      </div>
    );
  }

  return (
    <div className="GpsApp">
      <h1>🌐 Real-Time GPS Tracker</h1>
      <p className="city-name">
        📍 City: <strong>{cityName}</strong>
      </p>

      {/* My location */}
      {myLocation.latitude !== 0 && (
        <LocationDisplay
          title={`${name} (You)`}
          latitude={myLocation.latitude}
          longitude={myLocation.longitude}
          place={cityName}
        />
      )}

      {/* Other users */}
      <h2>🧑‍🤝‍🧑 Other Users:</h2>
      {Object.entries(othersLocations).map(([id, loc]) =>
        id !== socket.id ? (
          <LocationDisplay
            key={id}
            title={loc.name || `User ${id}`}
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
