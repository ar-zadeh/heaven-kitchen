import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import RestaurantSimulation from './RestaurantSimulation';
import IntroductionPage from './IntroductionPage';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<IntroductionPage />} />
        <Route path="/game" element={<RestaurantSimulation />} />
      </Routes>
    </Router>
  );
};

export default App;
