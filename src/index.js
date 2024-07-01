import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import GameStateProvider from './GameStateProvider';

ReactDOM.render(
  <React.StrictMode>
    <GameStateProvider>
      <App />
    </GameStateProvider>
  </React.StrictMode>,
  document.getElementById('root')
);