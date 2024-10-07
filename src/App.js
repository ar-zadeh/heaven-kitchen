import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import WelcomePage from './WelcomePage';
import IntroductionPage from './IntroductionPage';
import RestaurantSimulation from './RestaurantSimulation';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/introduction" element={<IntroductionPage />} />
        <Route path="/game" element={<RestaurantSimulation />} />
      </Routes>
    </Router>
  );
};

export default App;