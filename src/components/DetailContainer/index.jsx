import React from 'react';
import './index.css';

export default function Container(props) {
  const { children } = props;
  return (
    <div className="detail-container">
      {children}
    </div>
  );
}
