import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = document.getElementById('root');
const appRoot = ReactDOM.createRoot(root);

appRoot.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
