import React, { useContext } from 'react';
import { Card, Button } from '../components';
import GameStateContext from '../GameStateContext';

const PendingOrders = () => {
  const { orders, cooks, assignOrderToCook } = useContext(GameStateContext);

  return (
    <Card title="Pending Orders">
      {orders.map((order, orderIndex) => (
        <div key={orderIndex} className="mb-2">
          <p>{order.name} (${order.price}) - Group {order.groupId}</p>
          {cooks.map((cook, cookIndex) => (
            !cook.busy && (
              <Button 
                key={cookIndex} 
                onClick={() => assignOrderToCook(cookIndex, orderIndex)}
                className="mr-2 mt-1"
              >
                Assign to {cook.name}
              </Button>
            )
          ))}
        </div>
      ))}
    </Card>
  );
};

export default PendingOrders;
