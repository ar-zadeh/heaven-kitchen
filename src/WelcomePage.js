import React from 'react';
import { useNavigate } from 'react-router-dom';

const WelcomePage = () => {
  const navigate = useNavigate();

  const handleShowIntro = () => {
    navigate('/introduction');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold mb-6">Welcome to Restaurant Simulator</h1>
        <p className="mb-6">
          Welcome to Heaven's kitchen! Manage your own restaurant, handle orders, 
          hire staff, and keep your customers happy. Are you ready for the challenge?
        </p>
        <div className="flex justify-center">
          <button
            onClick={handleShowIntro}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Yes, show me how it's done!
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;