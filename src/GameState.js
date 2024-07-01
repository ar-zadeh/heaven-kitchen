import { useState, useEffect } from 'react';

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

const useGameState = () => {
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
    setGroupCounter(prev => prev + 1);
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

  const handleOrderIngredient = (ingredient, amount) => {
    const ingredientInfo = INGREDIENTS.find(ing => ing.name === ingredient);
    if (ingredientInfo && amount > 0) {
      const cost = amount * ingredientInfo.cost;
      if (money >= cost) {
        setIncomingDeliveries(prev => [...prev, {
          ingredient: ingredient,
          amount: amount,
          timeLeft: ingredientInfo.deliveryTime
        }]);
        setMoney(prev => prev - cost);
        addLog(`Ordered ${amount} units of ${ingredient} for $${cost}. Estimated delivery time: ${ingredientInfo.deliveryTime} time units`);
      } else {
        addLog(`Not enough money to order ${amount} units of ${ingredient}`);
      }
    } else {
      addLog('Invalid ingredient order');
    }
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
  }, [isRunning]);

  const startSimulation = () => {
    setIsRunning(true);
  };

  const pauseSimulation = () => {
    setIsRunning(false);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return {
    inventory,
    cooks,
    groups,
    orders,
    time,
    logs,
    isRunning,
    incomingDeliveries,
    money,
    groupCounter,
    INGREDIENTS,
    MENU_ITEMS,
    startSimulation,
    pauseSimulation,
    assignOrderToCook,
    handleOrderIngredient,
    clearLogs
  };
};

export default useGameState;
