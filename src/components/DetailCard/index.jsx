import React from 'react';
import './index.css';

export default function Card(props) {
  const { children } = props;
  return (
    <div className="card">
      {children}
    </div>
  );
}
