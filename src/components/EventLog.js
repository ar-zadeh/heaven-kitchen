import React, { useContext } from 'react';
import { Card } from '../components';
import GameStateContext from '../GameStateContext';

const EventLog = () => {
  const { logs } = useContext(GameStateContext);

  return (
    <Card title="Event Log">
      <div className="h-64 overflow-y-auto">
        {logs.map((log, index) => (
          <p key={index}>{log}</p>
        ))}
      </div>
    </Card>
  );
};

export default EventLog;
