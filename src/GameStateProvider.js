import React from 'react';
import useGameState from './GameState';
import GameStateContext from './GameStateContext';

const GameStateProvider = ({ children }) => {
  const gameState = useGameState();

  return (
    <GameStateContext.Provider value={gameState}>
      {children}
    </GameStateContext.Provider>
  );
};

export default GameStateProvider;
