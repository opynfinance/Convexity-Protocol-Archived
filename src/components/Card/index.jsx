import React from 'react';
import './index.css';

export default function Card({ children }) {
  return (
    <div className="card">
      {children}
    </div>
  );
}
