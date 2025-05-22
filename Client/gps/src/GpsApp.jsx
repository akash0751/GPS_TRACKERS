import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import LocationDisplay from './LocationDisplay';
import './App.css';

const socket = io('https://gps-trackers-1.onrender.com');

const GpsApp = () => {
  const [name, setName] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [myLocation, setMyLocation] = useState({ latitude: 0, longitude: 0 });
  const [cityName, setCityName] = useState('');
  const [othersLocations, setOthersLocations] = useState({});
  const [othersPlaces, setOthersPlaces] = useState({});

  const getCityName = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await response.json();
      if (data.address) {
        return (
          data.address.town ||
          data.address.village ||
          data.address.city ||
          data.address.county ||
          data.address.state ||
          data.address.country ||
          'Unknown'
        );
      }
    } catch (err) {
      console.error('Error fetching city name:', err);
    }
    return 'Unknown';
  };

  useEffect(() => {
    if (!isStarted || !name.trim()) return;

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const location = { latitude, longitude };
          setMyLocation(location);

          socket.emit('send-location', {
            name: name.trim(),
            latitude,
            longitude,
          });

          const city = await getCityName(latitude, longitude);
          setCityName(city);
        },
        (error) => {
          console.error('GPS Error:', error);
        },
        { enableHighAccuracy: true }
      );

      socket.on('receive-locations', (locations) => {
        setOthersLocations(locations);
      });

      return () => {
        navigator.geolocation.clearWatch(watchId);
        socket.disconnect();
      };
    }
  }, [isStarted, name]);

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

  // === UI ===
  if (!isStarted) {
    return (
      <div className="container py-5 text-center">
        <div className="card p-4 shadow mx-auto" style={{ maxWidth: '400px' }}>
          <h2 className="mb-4">🌐 Real-Time GPS Tracker</h2>
          <div className="form-group mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <button
            className="btn btn-primary w-100"
            onClick={() => setIsStarted(true)}
            disabled={!name.trim()}
          >
            Start Tracking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="text-center mb-4">
        <h1 className="mb-2">🌐 Real-Time GPS Tracker</h1>
        <p className="lead">
          📍 City: <strong>{cityName}</strong>
        </p>
      </div>

      <div className="mb-4">
        <LocationDisplay
          title={`${name} (You)`}
          latitude={myLocation.latitude}
          longitude={myLocation.longitude}
          place={cityName}
        />
      </div>

      <h4>🧑‍🤝‍🧑 Other Users:</h4>
      <div className="row">
        {Object.entries(othersLocations).map(([id, loc]) =>
          id !== socket.id ? (
            <div className="col-md-6 mb-3" key={id}>
              <LocationDisplay
                title={loc.name || `User ${id}`}
                latitude={loc.latitude}
                longitude={loc.longitude}
                place={othersPlaces[id] || 'Loading...'}
              />
            </div>
          ) : null
        )}
      </div>
    </div>
  );
};

export default GpsApp;
