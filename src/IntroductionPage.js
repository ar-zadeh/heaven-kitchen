import React from 'react';
import { useNavigate } from 'react-router-dom';

const IntroductionPage = () => {
  const navigate = useNavigate();

  const handleStartGame = () => {
    navigate('/game');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-6">Welcome to Restaurant Simulator</h1>
      <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl w-full">
        <p className="mb-4">
          Welcome to Heaven's kitchen! Manage your own restaurant, handle orders, 
          hire staff, and keep your customers happy. Are you ready for the challenge?
        </p>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold mb-2">
            How to Play? There are multiple blocks with different information represented in them. The following images indicate what each block is representing. Your job is to assign Cooks to different foods, keep track of ingredients and order if necessary, and finally, hire cooks if the system is getting crowded!
          </h2>
          <div className="bg-gray-300 w-full h-64 flex items-center justify-center mb-2">
            <img src="/HeavensKitchen.png" alt="Restaurant overview" className="max-w-full max-h-full object-cover" />
          </div>
          <p className="text-sm text-gray-500 italic mb-4">
            An overview of your restaurant management interface.
          </p>
          <div className="bg-gray-300 w-full h-64 flex items-center justify-center mb-2">
            <img src="/sectionsHeaven.png" alt="Order management" className="max-w-full max-h-full object-cover" />
          </div>
          <p className="text-sm text-gray-500 italic">
            Manage orders and keep your kitchen running smoothly.
          </p>
        </div>
        <p className="mb-4">
          Study the images above to familiarize yourself with the game interface. 
          You'll be managing orders, inventory, and staff to keep your restaurant thriving!
        </p>
      </div>
      <button
        onClick={handleStartGame}
        className="mt-6 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Start the Game
      </button>
    </div>
  );
};

export default IntroductionPage;
