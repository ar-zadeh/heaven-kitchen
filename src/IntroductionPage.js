import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const IntroductionPage = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const introSteps = [
    {
      title: "Information Blocks",
      content: (
        <img src="HeavensKitchen.png" alt="Slide Image" className="w-full h-auto" />
      ),
      explanation: "This is the main game screen. It is divided into several information blocks that provide you with important details about your restaurant's status, pending orders, and other key information."
    },
    {
      title: "Restaurant Status",
      content: (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p>Time: 120</p>
          <p>Money: $500</p>
          <p>Groups waiting: 3</p>
          <p>Orders pending: 5</p>
          <p>Total groups served: 10</p>
          <h3 className="font-bold mt-2">Inventory:</h3>
          <ul className="list-disc list-inside">
            <li>BEEF: 30</li>
            <li>CHICKEN: 25</li>
            <li>PASTA: 40</li>
            <li>TOMATO: 35</li>
            <li>CHEESE: 20</li>
            <li>LETTUCE: 15</li>
          </ul>
          <h3 className="font-bold mt-2">Cooks:</h3>
          <ul className="list-disc list-inside">
            <li>Cook 1: Cooking Burger (5 time units left)</li>
            <li>Cook 2: Available</li>
            <li>Cook 3: Cooking Pasta (8 time units left)</li>
            <li>Cook 4: Available</li>
          </ul>
          <h3 className="font-bold mt-2">Incoming Deliveries:</h3>
          <ul className="list-disc list-inside">
            <li>10 BEEF (Arriving in 8 time units)</li>
            <li>15 TOMATO (Arriving in 2 time units)</li>
          </ul>
        </div>
      ),
      explanation: "This section provides an overview of your restaurant's current status. Keep an eye on your inventory levels and cook availability to manage your restaurant efficiently."
    },
    {
      title: "Pending Orders",
      content: (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="mb-2">
            <p>Burger ($10) - Group 3</p>
            <button className="mr-2 mt-1 px-2 py-1 bg-blue-500 text-white rounded">Assign to Cook 2</button>
            <button className="mr-2 mt-1 px-2 py-1 bg-blue-500 text-white rounded">Assign to Cook 4</button>
          </div>
          <div className="mb-2">
            <p>Pasta ($12) - Group 4</p>
            <button className="mr-2 mt-1 px-2 py-1 bg-blue-500 text-white rounded">Assign to Cook 2</button>
            <button className="mr-2 mt-1 px-2 py-1 bg-blue-500 text-white rounded">Assign to Cook 4</button>
          </div>
          <div className="mb-2">
            <p>Salad ($8) - Group 3</p>
            <button className="mr-2 mt-1 px-2 py-1 bg-blue-500 text-white rounded">Assign to Cook 2</button>
            <button className="mr-2 mt-1 px-2 py-1 bg-blue-500 text-white rounded">Assign to Cook 4</button>
          </div>
        </div>
      ),
      explanation: "Here you can see the orders waiting to be prepared. Assign these orders to available cooks to start preparing the meals. Quick assignment helps reduce customer wait times."
    },
    {
      title: "Order Ingredients",
      content: (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <select className="mb-2 p-2 border rounded w-full">
            <option value="">Select Ingredient</option>
            <option value="BEEF">BEEF (Cost: $5, Delivery Time: 10)</option>
            <option value="CHICKEN">CHICKEN (Cost: $4, Delivery Time: 8)</option>
            <option value="PASTA">PASTA (Cost: $2, Delivery Time: 5)</option>
            <option value="TOMATO">TOMATO (Cost: $1, Delivery Time: 3)</option>
            <option value="CHEESE">CHEESE (Cost: $3, Delivery Time: 4)</option>
            <option value="LETTUCE">LETTUCE (Cost: $1, Delivery Time: 2)</option>
          </select>
          <select className="mb-2 p-2 border rounded w-full">
            <option value="0">Select Amount</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="20">20</option>
            <option value="25">25</option>
          </select>
          <button className="px-4 py-2 bg-green-500 text-white rounded w-full">Order Ingredient</button>
        </div>
      ),
      explanation: "Use this section to order more ingredients for your restaurant. Pay attention to the cost and delivery time of each ingredient to manage your inventory efficiently."
    },
    {
      title: "Event Log",
      content: (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p>Time 120: New group 11 of 4 arrived and ordered Burger, Pasta, Salad, Chicken Sandwich</p>
          <p>Time 119: Cook 1 finished Burger</p>
          <p>Time 118: Received delivery of 15 TOMATO</p>
          <p>Time 117: Assigned Pasta to Cook 3</p>
          <p>Time 116: Group 9 of 2 finished. Earned $25 (20 + 5 tip - 0 penalty)</p>
        </div>
      ),
      explanation: "The Event Log shows you a chronological list of events in your restaurant. This helps you keep track of new orders, completed meals, and other important occurrences."
    },
    {
      title: "Alerts",
      content: (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-red-500">Time 120: Low inventory: Only 5 LETTUCE left!</p>
          <p className="text-red-500">Time 115: Group 8 has been waiting for 80 seconds!</p>
          <p className="text-red-500">Time 110: Not enough ingredients for Pizza</p>
        </div>
      ),
      explanation: "Alerts notify you of urgent situations that require your attention, such as low inventory or long customer wait times. Address these promptly to keep your restaurant running smoothly."
    },
    {
      title: "Hire Cook",
      content: (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p>Current cooks: 4</p>
          <p>Cost for next cook: $150</p>
          <button className="mt-2 px-4 py-2 bg-purple-500 text-white rounded w-full">
            Hire New Cook ($150)
          </button>
        </div>
      ),
      explanation: "As your restaurant gets busier, you may need to hire more cooks. Use this section to add new cooks to your staff. Remember, each new cook increases your operational capacity but also adds to your expenses."
    },
    {
      title: "Menu Details",
      content: (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="mb-4">
            <h3 className="font-bold text-lg">Burger</h3>
            <p>Price: $10</p>
            <p>Cooking Time: 10 seconds</p>
            <p className="font-semibold mt-1">Ingredients:</p>
            <ul className="list-disc list-inside">
              <li>BEEF</li>
              <li>LETTUCE</li>
              <li>TOMATO</li>
            </ul>
          </div>
          <div className="mb-4">
            <h3 className="font-bold text-lg">Pasta</h3>
            <p>Price: $12</p>
            <p>Cooking Time: 15 seconds</p>
            <p className="font-semibold mt-1">Ingredients:</p>
            <ul className="list-disc list-inside">
              <li>PASTA</li>
              <li>TOMATO</li>
              <li>CHEESE</li>
            </ul>
          </div>
        </div>
      ),
      explanation: "This section shows details about the items on your menu. Knowing the ingredients, cooking time, and price of each dish helps you manage your inventory and plan your cooking strategy."
    },
    {
      title: "Navigate to Game",
      content: (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <button className="px-4 py-2 bg-blue-500 text-white rounded w-full" onClick={() => window.location.href = "/game"}>
            Go to Game
          </button>
        </div>
      ),
      explanation: "Click the button to navigate to the game (RestaurantSimulation)."
    }
  ];

  const handleNextStep = () => {
    if (currentStep < introSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = introSteps[currentStep];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-gray-300 p-8 rounded-lg shadow-lg border-2 border-gray-500 max-w-2xl w-full relative">
        <h2 className="text-2xl font-semibold mb-4 text-center">{currentStepData.title}</h2>
        <div className="mb-4">
          {currentStepData.content}
        </div>
        <div className="mt-4 p-4 bg-blue-100 rounded-lg">
          <h3 className="font-bold text-lg mb-2">Explanation:</h3>
          <p>{currentStepData.explanation}</p>
        </div>
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={handlePrevStep}
            disabled={currentStep === 0}
            className="p-2 bg-gray-300 rounded-full disabled:opacity-50"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={handleNextStep}
            disabled={currentStep === introSteps.length - 1}
            className="p-2 bg-gray-300 rounded-full disabled:opacity-50"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntroductionPage;
