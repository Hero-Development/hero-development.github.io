import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { Toaster } from 'react-hot-toast';
import reportWebVitals from './reportWebVitals';

ReactDOM.render(
  <React.StrictMode>
    <App />
    {/* <Toaster
        position="top-right"
        toastOptions={{
          className: "dark:bg-gray-800 dark:text-white block-all",
          duration: 5000,
        }}
      /> */}
  </React.StrictMode>,
  document.getElementById('root')
);

reportWebVitals();
