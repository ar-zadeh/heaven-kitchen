import React, { useContext } from 'react';
import { Card } from '../components';
import GameStateContext from '../GameStateContext';

const WaitingGroups = () => {
  const { time, groups } = useContext(GameStateContext);

  return (
    <Card title="Waiting Groups">
      {groups.map((group) => {
        const waitTime = time - group.arrivalTime;
        const color = waitTime > 60 ? 'text-red-500' : waitTime > 30 ? 'text-yellow-500' : 'text-green-500';
        return (
          <div key={group.id} className={`mb-2 ${color}`}>
            Group {group.id} of {group.size}: Waiting for {waitTime} seconds (Completed: {group.completedOrders}/{group.size})
          </div>
        );
      })}
    </Card>
  );
};

export default WaitingGroups;
