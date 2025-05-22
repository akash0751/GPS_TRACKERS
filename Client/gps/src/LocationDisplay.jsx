import React from 'react';
import './App.css';

const LocationDisplay = ({ title, latitude, longitude, place }) => {
  return (
    <div className="card shadow-sm p-3">
      <h5>{title}</h5>
      <p className="mb-1">📌 {place}</p>
      <p className="mb-0">
        🧭 Lat: {latitude.toFixed(5)} | Lon: {longitude.toFixed(5)}
      </p>
    </div>
  );
};


export default LocationDisplay;
