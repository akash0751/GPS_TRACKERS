import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import LocationDisplay from './LocationDisplay';
import './App.css';

const socket = io('https://gps-trackers-1.onrender.com');

const GpsApp = () => {
  const [name, setName] = useState('');
  const [myLocation, setMyLocation] = useState({ latitude: 0, longitude: 0 });
  const [cityName, setCityName] = useState('');
  const [othersLocations, setOthersLocations] = useState({});

  // Fetch place name from lat/lng using OpenCage API
  const getCityName = async (lat, lng) => {
    try {
      const apiKey = '96a9af76331d437f9e067eea4bb78e6a';
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
      return 'Unknown';
    } catch (err) {
      console.error('Error fetching city name:', err);
      return 'Unknown';
    }
  };

  // Watch geolocation only after a valid name is entered
  useEffect(() => {
    if (!name.trim()) return;

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    const watcherId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMyLocation({ latitude, longitude });

        // Get city name for own location
        const city = await getCityName(latitude, longitude);
        setCityName(city);

        // Send name + location to server
        socket.emit('send-location', {
          name: name.trim(),
          latitude,
          longitude,
          place: city,
        });
      },
      (error) => {
        console.error('GPS Error:', error);
      },
      { enableHighAccuracy: true }
    );

    // Cleanup geolocation watcher on unmount or name change
    return () => {
      navigator.geolocation.clearWatch(watcherId);
    };
  }, [name]);

  // Listen for others' locations from server
  useEffect(() => {
    socket.on('receive-locations', (locations) => {
      setOthersLocations(locations);
    });

    return () => {
      socket.off('receive-locations');
      socket.disconnect();
    };
  }, []);

  // Show input until user enters a valid name
  if (!name.trim()) {
    return (
      <div className="GpsApp">
        <h1>🌐 Real-Time GPS Tracker</h1>
        <label>
          Enter your name:{' '}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
      <div className="others-container">
      {Object.entries(othersLocations).map(([id, loc]) =>
        id !== socket.id ? (
          <LocationDisplay
            key={id}
            title={loc.name || `User ${id.slice(0, 5)}`}
            latitude={loc.latitude}
            longitude={loc.longitude}
            place={loc.place || 'Unknown'}
          />
        ) : null
      )}
      </div>
    </div>
  );
};

export default GpsApp;
