import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Input,
} from './components';
import { Rnd } from 'react-rnd';
import KitchenGUI from './KitchenGUI';
import { Bell, Play, Trash2, Pause, Save, Download,Settings } from 'lucide-react';
import StatsTracker from './StatsTracker';
const stats = new StatsTracker();

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
class Random {
  constructor(seed = 12345) {
    this.seed = seed;
  }

  // Random number between 0 and 1
  random() {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  // Generate exponential distribution
  exponential(lambda) {
    return -Math.log(1 - this.random()) / lambda;
  }
}
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
  const [alerts, setAlerts] = useState([]);
  const [busyButtonStates, setBusyButtonStates] = useState({});
  const [useFixedLayout, setUseFixedLayout] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [randomSeed, setRandomSeed] = useState(12345);
  const [arrivalRate, setArrivalRate] = useState(0.15);
  const [rng] = useState(() => new Random(randomSeed));
  const [savedLayouts, setSavedLayouts] = useState([]);
  const [missedGroups, setMissedGroups] = useState(0);
  const [moneySpent, setMoneySpent] = useState(0);
  const [userId, setUserId] = useState('');

  // useEffect(() => {
  //   const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
  //   stats.setUserId(userId);
  // }, []);
  
  useEffect(() => {
    if (!isRunning) {
      stats.saveStats();
    }
  }, [isRunning]);
  // Add the cleanup effect here
  useEffect(() => {
    return () => {
      stats.saveStats();
    };
  }, []);
  const [selectedLayout, setSelectedLayout] = useState('');
  useEffect(() => {
    const layouts = JSON.parse(localStorage.getItem('savedLayouts')) || [];
    setSavedLayouts(layouts);
  }, []);
  const renderSimulationConfig = () => {
    if (!showConfig) return null;
  
    const downloadStats = () => {
      const allStats = stats.getAllStats();
      if (allStats.length === 0) {
        alert('No stats available to download');
        return;
      }
  
      // Create CSV content
      const csvHeader = 'timestamp,userId,customersServed,groupsServed,groupsMissed,moneyMade,moneySpent\n';
      const csvContent = allStats.map(stat => 
        `${stat.timestamp},${stat.userId},${stat.customersServed},${stat.groupsServed},${stat.groupsMissed},${stat.moneyMade},${stat.moneySpent}`
      ).join('\n');
  
      // Create and trigger download
      const blob = new Blob([csvHeader + csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'restaurant_stats.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    
    return (
      <Card className="mb-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Simulation Configuration</h2>
            <Button 
              onClick={() => setShowConfig(false)}
              className="bg-gray-500 hover:bg-gray-600"
            >
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">User ID</label>
              <Input
                type="text"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  stats.setUserId(e.target.value);
                }}
                placeholder="Enter experiment ID"
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Random Seed</label>
              <Input
                type="number"
                value={randomSeed}
                onChange={(e) => {
                  const newSeed = parseInt(e.target.value);
                  setRandomSeed(newSeed);
                  rng.seed = newSeed;
                }}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Average Arrivals per Minute (λ)</label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={arrivalRate}
                onChange={(e) => setArrivalRate(parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex space-x-4">
            <Button onClick={downloadStats}>
              <Download className="mr-2 h-4 w-4" />
              Download Stats CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };
  


  const saveCurrentLayout = () => {
    const layoutName = prompt("Enter a name for this layout:");
    if (layoutName) {
      const newLayout = { name: layoutName, positions: boxPositions };
      const updatedLayouts = [...savedLayouts, newLayout];
      setSavedLayouts(updatedLayouts);
      localStorage.setItem('savedLayouts', JSON.stringify(updatedLayouts));
      alert(`Layout "${layoutName}" saved successfully!`);
    }
  };

  const loadSavedLayout = () => {
    const layoutOptions = savedLayouts.map(layout => layout.name);
    const selectedLayoutName = prompt(`Select a layout to load:\n${layoutOptions.join('\n')}`);

    if (selectedLayoutName) {
      const layout = savedLayouts.find(l => l.name === selectedLayoutName);
      if (layout) {
        setBoxPositions(layout.positions);
        setUseFixedLayout(true);
        alert(`Layout "${selectedLayoutName}" loaded successfully!`);
      } else {
        alert("Layout not found. Please try again.");
      }
    } else {
      alert("No layout selected.");
    }
  };


  const initialLayout = {
    menuDetails: {
      width: 342,
      height: 222,
      x: 100,
      y: 159
    },
    waitingGroups: {
      width: 342,
      height: 222,
      x: 103,
      y: 397
    },
    status: {
      width: 342,
      height: 842,
      x: 705,
      y: 73
    },
    pendingOrders: {
      width: 342,
      height: 836,
      x: 1059,
      y: 75
    },
    hireCook: {
      width: 342,
      height: 222,
      x: 1412,
      y: 90
    },
    orderIngredients: {
      width: 342,
      height: 237,
      x: 1414,
      y: 328
    },
    alerts: {
      width: 342,
      height: 222,
      x: 1761,
      y: 91
    },
    eventLog: {
      width: 342,
      height: 232,
      x: 1765,
      y: 329
    },
    kitchenGUI: {
      width: 548,
      height: 427,
      x: 1436,
      y: 606
    }
  };
  const [boxPositions, setBoxPositions] = useState(initialLayout);

  const handleLayoutToggle = (checked) => {
    setUseFixedLayout(checked);
    if (checked) {
      setBoxPositions(initialLayout);
    }
  };


  const handleCookClick = (cookIndex, orderIndex) => {
    if (cooks[cookIndex].busy) {
      setBusyButtonStates(prev => ({ ...prev, [cookIndex]: true }));
      setTimeout(() => {
        setBusyButtonStates(prev => ({ ...prev, [cookIndex]: false }));
      }, 1000);
    } else {
      assignOrderToCook(cookIndex, orderIndex);
    }
  };
  const [cookCost, setCookCost] = useState(100); // Cost to hire a new cook
  const renderPendingOrders = () => {
    const groupedOrders = orders.reduce((acc, order) => {
      if (!acc[order.groupId]) {
        acc[order.groupId] = [];
      }
      acc[order.groupId].push(order);
      return acc;
    }, {});
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold mb-2">Pending Orders</h2>
        </CardHeader>
        <CardContent>
          {Object.entries(groupedOrders).map(([groupId, groupOrders]) => (
            <div key={groupId} className="mb-4">
              <h3 className="text-lg font-semibold border-b pb-1 mb-2">Group {groupId}</h3>
              {groupOrders.map((order, orderIndex) => (
                <div key={orderIndex} className="mb-3">
                  <p className="font-medium text-sm">{order.name} (${order.price})</p>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {cooks.map((cook, cookIndex) => (
                      <Button
                        key={cookIndex}
                        onClick={() => handleCookClick(cookIndex, orders.findIndex(o => o === order))}
                        className={`text-sm py-1 ${cook.busy ? 'bg-gray-400 hover:bg-gray-500' : ''}`}
                      >
                        {busyButtonStates[cookIndex] ? 'BUSY' : `Assign ${cook.name}`}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const addLog = (message) => {
    setLogs(prevLogs => [...prevLogs, `Time ${time}: ${message}`]);
  };
  const addAlert = (message) => {
    setAlerts(prevAlerts => [...prevAlerts, { id: Date.now(), message, time }]);
  };
  const hireCook = () => {
    if (money >= cookCost) {
      const newCook = { name: `Cook ${cooks.length + 1}`, busy: false, currentOrder: null };
      setCooks(prevCooks => [...prevCooks, newCook]);
      setMoney(prevMoney => prevMoney - cookCost);
      addLog(`Hired a new cook for $${cookCost}`);
      setCookCost(prevCost => Math.floor(prevCost * 1.5)); // Increase the cost for the next cook
      stats.addMoneySpent(cookCost);

    } else {
      addAlert(`Not enough money to hire a new cook. Need $${cookCost}.`);
    }
  };
  const checkForAlerts = () => {
    // Check for low inventory
    Object.entries(inventory).forEach(([ing, count]) => {
      if (count <= 10) {
        addAlert(`Low inventory: Only ${count} ${ing} left!`);
      }
    });


    // Check for long-waiting groups
    groups.forEach(group => {
      const waitTime = time - group.arrivalTime;
      if (waitTime >= 75) {
        addAlert(`Group ${group.id} has been waiting for ${waitTime} seconds!`);
      }
    });
  };

  const addGroup = () => {
    const groupSize = Math.floor(rng.random() * 6) + 1; // 1 to 6 people
    const groupOrders = Array(groupSize).fill().map(() => ({
      ...MENU_ITEMS[Math.floor(rng.random() * MENU_ITEMS.length)],
      groupId: groupCounter
    }));
    const newGroup = { 
      id: groupCounter, 
      size: groupSize, 
      orders: groupOrders, 
      arrivalTime: time, 
      completedOrders: 0 
    };
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
      stats.incrementCustomersServed(); // Track each order as a customer served
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
                stats.addMoneyMade(totalEarned);
                stats.incrementGroupsServed(); // Add this line here

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
          stats.incrementGroupsMissed();
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
    
    // Generate exponentially distributed arrival times
    const timeUntilNextArrival = rng.exponential(arrivalRate);
    
    // If the time until next arrival is less than 1 (our time step),
    // add a new group
    if (timeUntilNextArrival < 1) {
      addGroup();
    }
    
    updateCooks();
    updateDeliveries();
    updateGroups();
    checkForAlerts();
  };


  useEffect(() => {
    let timer;
    if (isRunning) {
      timer = setInterval(runSimulation, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, runSimulation]); // Include runSimulation as a dependency
  // useEffect(() => {
  //   // You can generate a random user ID or use any other method to identify users
  //   const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
  //   stats.setUserId(userId);
  // }, []);
  
  

  <Select 
  onValueChange={(value) => setOrderAmount(Number(value))} 
  value={orderAmount.toString()}
>
  <SelectTrigger className="mb-2">
    <SelectValue placeholder="Select amount" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="0">Select Amount</SelectItem>
    {[5, 10, 15, 20, 25].map(amount => (
      <SelectItem key={amount} value={amount.toString()}>
        {amount}
      </SelectItem>
    ))}
  </SelectContent>
</Select>


const handleOrderIngredient = () => {
  if (orderIngredient === '' || orderAmount === 0) {
    addLog('Please select both an ingredient and an amount');
    return;
  }

  const ingredient = INGREDIENTS.find(ing => ing.name === orderIngredient);
  if (!ingredient) {
    addLog(`Error: Ingredient ${orderIngredient} not found`);
    return;
  }

  const cost = orderAmount * ingredient.cost;
  if (money >= cost) {
    stats.addMoneySpent(cost);


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
};  
  const boxRefs = {
    status: useRef(null),
    waitingGroups: useRef(null),
    pendingOrders: useRef(null),
    orderIngredients: useRef(null),
    eventLog: useRef(null),
    alerts: useRef(null),
    hireCook: useRef(null),
    menuDetails: useRef(null),
  };

  const [boxSizes, setBoxSizes] = useState({
    status: { width: 320, height: 200 },
    waitingGroups: { width: 320, height: 200 },
    pendingOrders: { width: 320, height: 200 },
    orderIngredients: { width: 320, height: 200 },
    eventLog: { width: 320, height: 200 },
    alerts: { width: 320, height: 200 },
    hireCook: { width: 320, height: 200 },
    menuDetails: { width: 320, height: 200 },
  });

  // useEffect(() => {
  //   const updateBoxSizes = () => {
  //     const newSizes = {};
  //     Object.entries(boxRefs).forEach(([key, ref]) => {
  //       if (ref.current) {
  //         newSizes[key] = {
  //           width: boxSizes[key].width,
  //           height: ref.current.scrollHeight + 20, // Add some padding
  //         };
  //       }
  //     });
  //     setBoxSizes(prevSizes => ({ ...prevSizes, ...newSizes }));
  //   };

  //   updateBoxSizes();
  //   // Rerun this effect when relevant state changes
  // }, [time, groups, orders, logs, alerts, cooks, inventory, incomingDeliveries]);

  const commonBoxStyle = {
    border: '1px solid #000',
    padding: '10px',
    backgroundColor: '#fff',
    overflow: 'auto',
    width: '100%',
    height: '100%',
  };
  const cardStyle = {
    border: '1px solid #000',
    padding: '10px',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    height: '100%', // Ensure it takes full height
  };

  const contentStyle = {
    flexGrow: 1,
    overflowY: 'auto',
  };
  const commonResizeConfig = {
    top:true, 
    right:true, 
    bottom:true, 
    left:true, 
    topRight:true, 
    bottomRight:true, 
    bottomLeft:true, 
    topLeft:true 
  };

  const renderBox = (key, content) => (
    <Rnd
      default={{
        x: boxPositions[key].x,
        y: boxPositions[key].y,
        width: boxPositions[key].width,
        height: boxPositions[key].height,
      }}
      size={{ width: boxPositions[key].width, height: boxPositions[key].height }}
      position={{ x: boxPositions[key].x, y: boxPositions[key].y }}
      minWidth={200}
      minHeight={100}
      enableResizing={!useFixedLayout}
      disableDragging={useFixedLayout}
      onDragStop={(e, d) => {
        if (!useFixedLayout) {
          setBoxPositions(prev => ({
            ...prev,
            [key]: { ...prev[key], x: d.x, y: d.y }
          }));
        }
      }}
      onResize={(e, direction, ref, delta, position) => {
        if (!useFixedLayout) {
          setBoxPositions(prev => ({
            ...prev,
            [key]: { 
              ...prev[key], 
              width: ref.offsetWidth, 
              height: ref.offsetHeight,
              x: position.x,
              y: position.y
            }
          }));
        }
      }}
      dragHandleClassName="handle"
    >
      <div ref={boxRefs[key]} style={{...commonBoxStyle, height: '100%'}}>
        <div className="handle" style={{cursor: useFixedLayout ? 'default' : 'move', padding: '5px', backgroundColor: '#f0f0f0'}}>
          {key}
        </div>
        <div style={{height: 'calc(100% - 30px)', overflowY: 'auto'}}>
          {content}
        </div>
      </div>
    </Rnd>
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Heaven's Kitchen</h1>
      
      <div className="mb-4 flex items-center space-x-4">
        <Checkbox
          id="fixed-layout"
          checked={useFixedLayout}
          onCheckedChange={handleLayoutToggle}
          label="Use Fixed Layout"
        />
        <Button onClick={saveCurrentLayout} className="flex items-center">
          <Save className="mr-2 h-4 w-4" />
          Save Current Layout
        </Button>
        <Button onClick={loadSavedLayout} className="flex items-center">
          <Download className="mr-2 h-4 w-4" />
          Load Saved Layout
        </Button>
        <Button 
          onClick={() => setShowConfig(!showConfig)} 
          className="flex items-center"
        >
          <Settings className="mr-2 h-4 w-4" />
          {showConfig ? 'Hide Configuration' : 'Show Configuration'}
        </Button>
      </div>

      {renderSimulationConfig()}

      <div className="relative" style={{ height: '1000px', width: '2000px' }}>
        {renderBox('status', (
          <>
            <h2 className="text-xl font-bold mb-2">Restaurant Status</h2>
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
          </>
        ), 0, 0)}

        {renderBox('waitingGroups', (
          <>
            <h2 className="text-xl font-bold mb-2">Waiting Groups</h2>
            {groups.map((group) => {
              const waitTime = time - group.arrivalTime;
              const color = waitTime > 60 ? 'text-red-500' : waitTime > 30 ? 'text-yellow-500' : 'text-green-500';
              return (
                <div key={group.id} className={`mb-2 ${color}`}>
                  Group {group.id} of {group.size}: Waiting for {waitTime} seconds (Completed: {group.completedOrders}/{group.size})
                </div>
              );
            })}
          </>
        ), 330, 0)}

{renderBox('pendingOrders', renderPendingOrders())}

{renderBox('orderIngredients', (
  <>
    <h2 className="text-xl font-bold mb-2">Order Ingredients</h2>
    <Select 
      onValueChange={(value) => setOrderIngredient(value)} 
      value={orderIngredient}
    >
      <SelectTrigger className="mb-2">
        <SelectValue placeholder="Select ingredient" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Select Ingredient</SelectItem>
        {INGREDIENTS.map(ing => (
          <SelectItem key={ing.name} value={ing.name}>
            {ing.name} (Cost: ${ing.cost}, Delivery Time: {ing.deliveryTime})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select 
      onValueChange={(value) => setOrderAmount(Number(value))} 
      value={orderAmount.toString()}
    >
      <SelectTrigger className="mb-2">
        <SelectValue placeholder="Select amount" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="0">Select Amount</SelectItem>
        {[5, 10, 15, 20, 25].map(amount => (
          <SelectItem key={amount} value={amount.toString()}>
            {amount}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Button onClick={handleOrderIngredient}>Order Ingredient</Button>
  </>
), 0, 210)}

        {renderBox('eventLog', (
          <>
            <h2 className="text-xl font-bold mb-2">Event Log</h2>
            <div>
              {logs.map((log, index) => (
                <p key={index}>{log}</p>
              ))}
            </div>
          </>
        ), 330, 210)}

        {renderBox('alerts', (
          <>
            <h2 className="text-xl font-bold mb-2">Alerts</h2>
            <div>
              {alerts.map((alert) => (
                <p key={alert.id} className="text-red-500">
                  Time {alert.time}: {alert.message}
                </p>
              ))}
            </div>
          </>
        ), 660, 210)}

        {renderBox('hireCook', (
          <>
            <h2 className="text-xl font-bold mb-2">Hire Cook</h2>
            <p>Current cooks: {cooks.length}</p>
            <p>Cost for next cook: ${cookCost}</p>
            <Button onClick={hireCook} className="mt-2">
              Hire New Cook (${cookCost})
            </Button>
          </>
        ), 0, 420)}

        {renderBox('menuDetails', (
          <>
            <h2 className="text-xl font-bold mb-2">Menu Details</h2>
            {MENU_ITEMS.map((item, index) => (
              <div key={index} className="mb-4">
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p>Price: ${item.price}</p>
                <p>Cooking Time: {item.cookingTime} seconds</p>
                <p className="font-semibold mt-1">Ingredients:</p>
                <ul className="list-disc list-inside">
                  {item.ingredients.map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        ), 330, 420)}
                <Rnd
          default={{
            x: 0,
            y: 220,
            width: 420,
            height: 320,
          }}
          style={commonBoxStyle}
        >
          <div style={commonBoxStyle}>
            <Card title="Kitchen GUI">
              <KitchenGUI cooks={cooks} inventory={inventory} tables={groups} />
            </Card>
          </div>
        </Rnd>
      </div>
      <div className="mt-4 flex space-x-4">
        <Button onClick={() => setAlerts([])}>
          <Bell className="mr-2 h-4 w-4" />
          Clear Alerts
        </Button>
        <Button onClick={() => setLogs([])}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Log
        </Button>
        <Button 
        onClick={() => setIsRunning(!isRunning)} 
        className={`mb-4 ${!isRunning ? 'bg-green-500 hover:bg-green-600' : ''}`}
      >
        {isRunning ? (
          <Pause className="mr-2 h-4 w-4" />
        ) : (
          <Play className="mr-2 h-4 w-4" />
        )}
        {isRunning ? 'Pause Simulation' : 'Start Simulation'}
      </Button>

      </div>
    </div>
  );
};

export default RestaurantSimulation;

