import React, { useContext } from 'react';
import { Card } from '../components';
import GameStateContext from '../GameStateContext';

const RestaurantStatus = () => {
  const { time, money, groups, orders, groupCounter, inventory, cooks, incomingDeliveries } = useContext(GameStateContext);

  return (
    <Card title="Restaurant Status">
      <p>Time: {time}</p>
      <p>Money: ${money}</p>
      <p>Groups waiting: {groups.length}</p>
      <p>Orders pending: {orders.length}</p>
      <p>Total groups served: {groupCounter - 1}</p>
      <h3 className="font-bold mt-2">Inventory:</h3>
      <ul>
        {Object.entries(inventory).map(([ing, count]) => (
          <li key={ing}>{ing}: {count}</li>
        ))}
      </ul>
      <h3 className="font-bold mt-2">Cooks:</h3>
      <ul>
        {cooks.map((cook, index) => (
          <li key={index}>
            {cook.name}: {cook.busy ? `Cooking ${cook.currentOrder.name} (${cook.currentOrder.cookingTime} time units left)` : 'Available'}
          </li>
        ))}
      </ul>
      <h3 className="font-bold mt-2">Incoming Deliveries:</h3>
      <ul>
        {incomingDeliveries.map((delivery, index) => (
          <li key={index}>{delivery.amount} {delivery.ingredient} (Arriving in {delivery.timeLeft} time units)</li>
        ))}
      </ul>
    </Card>
  );
};

export default RestaurantStatus;
