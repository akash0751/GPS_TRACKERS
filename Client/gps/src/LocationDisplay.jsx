import React from 'react';
import './App.css';

const LocationDisplay = ({ title, latitude, longitude, place }) => {
  return (
    <div className="location-box">
      <h2>{title}</h2>
      <p>
        <strong>Latitude:</strong> {latitude.toFixed(5)}
      </p>
      <p>
        <strong>Longitude:</strong> {longitude.toFixed(5)}
      </p>
      {place && (
        <p>
          <strong>Place:</strong> {place}
        </p>
      )}
    </div>
  );
};

export default LocationDisplay;
