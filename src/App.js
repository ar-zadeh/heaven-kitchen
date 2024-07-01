import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './components';
import { Rnd } from 'react-rnd';
import KitchenGUI from './KitchenGUI';


const INGREDIENTS = [
  { name: 'BEEF', deliveryTime: 10, cost: 5 },
  { name: 'CHICKEN', deliveryTime: 8, cost: 4 },
  { name: 'PASTA', deliveryTime: 5, cost: 2 },
  { name: 'TOMATO', deliveryTime: 3, cost: 1 },
  { name: 'CHEESE', deliveryTime: 4, cost: 3 },
  { name: 'LETTUCE', deliveryTime: 2, cost: 1 }
];

const MENU_ITEMS = [
  { name: "Burger", ingredients: ['BEEF', 'LETTUCE', 'TOMATO'], cookingTime: 10, price: 10 },
  { name: "Pasta", ingredients: ['PASTA', 'TOMATO', 'CHEESE'], cookingTime: 15, price: 12 },
  { name: "Salad", ingredients: ['LETTUCE', 'TOMATO', 'CHEESE'], cookingTime: 5, price: 8 },
  { name: "Chicken Sandwich", ingredients: ['CHICKEN', 'LETTUCE', 'TOMATO'], cookingTime: 12, price: 11 },
  { name: "Pizza", ingredients: ['TOMATO', 'CHEESE'], cookingTime: 20, price: 15 }
];

const MAX_WAIT_TIME = 90;
const PENALTY = 20;

const RestaurantSimulation = () => {
  const [inventory, setInventory] = useState(() =>
    Object.fromEntries(INGREDIENTS.map(ing => [ing.name, 50]))
  );
  const [cooks, setCooks] = useState([
    { name: "Cook 1", busy: false, currentOrder: null },
    { name: "Cook 2", busy: false, currentOrder: null },
    { name: "Cook 3", busy: false, currentOrder: null },
    { name: "Cook 4", busy: false, currentOrder: null }
  ]);
  const [groups, setGroups] = useState([]);
  const [orders, setOrders] = useState([]);
  const [time, setTime] = useState(0);
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [orderIngredient, setOrderIngredient] = useState('');
  const [orderAmount, setOrderAmount] = useState(0);
  const [incomingDeliveries, setIncomingDeliveries] = useState([]);
  const [money, setMoney] = useState(0);
  const [groupCounter, setGroupCounter] = useState(1);

  const addLog = (message) => {
    setLogs(prevLogs => [...prevLogs, `Time ${time}: ${message}`]);
  };

  const addGroup = () => {
    const groupSize = [1, 2, 3, 4, 5, 6][Math.floor(Math.random() * 6)];
    const groupOrders = Array(groupSize).fill().map(() => ({
      ...MENU_ITEMS[Math.floor(Math.random() * MENU_ITEMS.length)],
      groupId: groupCounter
    }));
    const newGroup = { id: groupCounter, size: groupSize, orders: groupOrders, arrivalTime: time, completedOrders: 0 };
    setGroups(prev => [...prev, newGroup]);
    setOrders(prev => [...prev, ...groupOrders]);
    addLog(`New group ${groupCounter} of ${groupSize} arrived and ordered ${groupOrders.map(o => o.name).join(', ')}`);
    setGroupCounter(groupCounter => groupCounter + 1);
  };

  const assignOrderToCook = (cookIndex, orderIndex) => {
    const order = orders[orderIndex];
    if (order.ingredients.every(ing => inventory[ing] > 0)) {
      setCooks(prev => prev.map((cook, i) =>
        i === cookIndex ? { ...cook, busy: true, currentOrder: { ...order, startTime: time } } : cook
      ));
      setOrders(prev => prev.filter((_, i) => i !== orderIndex));
      addLog(`Assigned ${order.name} to ${cooks[cookIndex].name}`);
    } else {
      addLog(`Not enough ingredients for ${order.name}`);
    }
  };

  const updateCooks = () => {
    setCooks(prev => prev.map(cook => {
      if (cook.busy && cook.currentOrder) {
        cook.currentOrder.cookingTime--;
        if (cook.currentOrder.cookingTime <= 0) {
          setInventory(prevInventory => {
            const newInventory = { ...prevInventory };
            cook.currentOrder.ingredients.forEach(ing => newInventory[ing]--);
            return newInventory;
          });
          addLog(`${cook.name} finished ${cook.currentOrder.name}`);

          setGroups(prevGroups => {
            const groupIndex = prevGroups.findIndex(g => g.id === cook.currentOrder.groupId);
            if (groupIndex !== -1) {
              const group = prevGroups[groupIndex];
              const updatedGroup = {
                ...group,
                completedOrders: group.completedOrders + 1,
                orders: group.orders.filter(o => o.name !== cook.currentOrder.name)
              };

              if (updatedGroup.completedOrders === updatedGroup.size) {
                const waitTime = time - group.arrivalTime;
                const tip = Math.max(0, 5 - Math.floor(waitTime / 10)); // Max 5 tip, decreases by 1 every 10 seconds
                const baseEarnings = group.size * 10; // Assuming average price of 10
                const penalty = waitTime > MAX_WAIT_TIME ? PENALTY : 0;
                const totalEarned = baseEarnings + tip - penalty;

                setMoney(prev => prev + totalEarned);
                addLog(`Group ${group.id} of ${group.size} finished. Earned $${totalEarned} (${baseEarnings} + ${tip} tip - ${penalty} penalty)`);

                return prevGroups.filter((_, i) => i !== groupIndex);
              } else {
                return [
                  ...prevGroups.slice(0, groupIndex),
                  updatedGroup,
                  ...prevGroups.slice(groupIndex + 1)
                ];
              }
            }
            return prevGroups;
          });

          return { ...cook, busy: false, currentOrder: null };
        }
      }
      return cook;
    }));
  };

  const updateDeliveries = () => {
    setIncomingDeliveries(prev => {
      const updatedDeliveries = prev.map(delivery => ({
        ...delivery,
        timeLeft: delivery.timeLeft - 1
      }));

      updatedDeliveries.forEach(delivery => {
        if (delivery.timeLeft <= 0) {
          setInventory(prevInventory => ({
            ...prevInventory,
            [delivery.ingredient]: prevInventory[delivery.ingredient] + delivery.amount
          }));
          addLog(`Received delivery of ${delivery.amount} ${delivery.ingredient}`);
        }
      });

      return updatedDeliveries.filter(delivery => delivery.timeLeft > 0);
    });
  };

  const updateGroups = () => {
    setGroups(prev => {
      const updatedGroups = prev.map(group => {
        const waitTime = time - group.arrivalTime;
        if (waitTime >= MAX_WAIT_TIME && group.completedOrders === 0) {
          addLog(`Group ${group.id} of ${group.size} left due to long wait time. Lost $${PENALTY}`);
          setMoney(prevMoney => prevMoney - PENALTY);
          setOrders(prevOrders => prevOrders.filter(order => order.groupId !== group.id));
          return null;
        }
        return group;
      });
      return updatedGroups.filter(group => group !== null);
    });
  };

  const runSimulation = () => {
    setTime(prev => prev + 1);
    if (Math.random() < 0.3) addGroup();
    updateCooks();
    updateDeliveries();
    updateGroups();
  };

  useEffect(() => {
    let timer;
    if (isRunning) {
      timer = setInterval(runSimulation, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, runSimulation]); // Include runSimulation as a dependency

  const handleOrderIngredient = () => {
    if (orderIngredient && orderAmount > 0) {
      const ingredient = INGREDIENTS.find(ing => ing.name === orderIngredient);
      const cost = orderAmount * ingredient.cost;
      if (money >= cost) {
        setIncomingDeliveries(prev => [...prev, {
          ingredient: orderIngredient,
          amount: orderAmount,
          timeLeft: ingredient.deliveryTime
        }]);
        setMoney(prev => prev - cost);
        addLog(`Ordered ${orderAmount} units of ${orderIngredient} for $${cost}. Estimated delivery time: ${ingredient.deliveryTime} time units`);
        setOrderIngredient('');
        setOrderAmount(0);
      } else {
        addLog(`Not enough money to order ${orderAmount} units of ${orderIngredient}`);
      }
    } else {
      addLog('Invalid ingredient order');
    }
  };

  const cardStyle = {
    border: '1px solid #000',
    padding: '10px',
    backgroundColor: '#fff',
    overflow: 'hidden',
  };

  const contentStyle = {
    height: '100%',
    overflowY: 'auto',
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Restaurant Simulation</h1>
      <Button onClick={() => setIsRunning(!isRunning)} className="mb-4">
        {isRunning ? 'Pause Simulation' : 'Start Simulation'}
      </Button>
      <div className="grid grid-cols-2 gap-4">
        <Rnd
          default={{
            x: 0,
            y: 0,
            width: 320,
            height: 200,
          }}
          style={cardStyle}
        >
          <div style={contentStyle}>
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
          </div>
        </Rnd>
        <Rnd
  default={{
    x: 0,
    y: 220,
    width: 420,
    height: 320,
  }}
  style={cardStyle}
>
  <div style={contentStyle}>
    <Card title="Kitchen GUI">
      <KitchenGUI cooks={cooks} inventory={inventory} tables={groups} />
    </Card>
  </div>
</Rnd>
        <Rnd
          default={{
            x: 330,
            y: 0,
            width: 320,
            height: 200,
          }}
          style={cardStyle}
        >
          <div style={contentStyle}>
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
          </div>
        </Rnd>
        <Rnd
          default={{
            x: 660,
            y: 0,
            width: 320,
            height: 200,
          }}
          style={cardStyle}
        >
          <div style={contentStyle}>
            <Card title="Pending Orders">
              {orders.map((order, orderIndex) => (
                <div key={orderIndex} className="mb-2">
                  <p>{order.name} (${order.price}) - Group {order.groupId}</p>
                  {cooks.some(cook => !cook.busy) ? (
                    cooks.map((cook, cookIndex) => (
                      !cook.busy && (
                        <Button
                          key={cookIndex}
                          onClick={() => assignOrderToCook(cookIndex, orderIndex)}
                          className="mr-2 mt-1"
                        >
                          Assign to {cook.name}
                        </Button>
                      )
                    ))
                  ) : (
                    <Button className="mr-2 mt-1" disabled>No cook to assign</Button>
                  )}
                </div>
              ))}
            </Card>
          </div>
        </Rnd>
        <Rnd
          default={{
            x: 0,
            y: 220,
            width: 320,
            height: 200,
          }}
          style={cardStyle}
        >
          <div style={contentStyle}>
            <Card title="Order Ingredients">
              <Select onValueChange={setOrderIngredient} value={orderIngredient}>
                <SelectTrigger className="mb-2">
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {INGREDIENTS.map(ing => (
                    <SelectItem key={ing.name} value={ing.name}>
                      {ing.name} (Cost: ${ing.cost}, Delivery Time: {ing.deliveryTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={(value) => setOrderAmount(Number(value))} value={orderAmount.toString()}>
                <SelectTrigger className="mb-2">
                  <SelectValue placeholder="Select amount" />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 25].map(amount => (
                    <SelectItem key={amount} value={amount.toString()}>
                      {amount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleOrderIngredient}>Order Ingredient</Button>
            </Card>
          </div>
        </Rnd>
      </div>
      <Rnd
        default={{
          x: 330,
          y: 220,
          width: 320,
          height: 200,
        }}
        style={cardStyle}
      >
        <div style={contentStyle}>
          <Card title="Event Log">
            <div className="h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <p key={index}>{log}</p>
              ))}
            </div>
          </Card>
        </div>
      </Rnd>
      <Button className="mt-4" onClick={() => setLogs([])}>Clear Log</Button>
    </div>
  );

};

export default RestaurantSimulation;
