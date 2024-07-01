import React, { useContext, useState } from 'react';
import { Card, Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components';
import GameStateContext from '../GameStateContext';

const OrderIngredients = () => {
  const { INGREDIENTS, setOrderIngredient, setOrderAmount, handleOrderIngredient, orderIngredient, orderAmount } = useContext(GameStateContext);

  return (
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
  );
};

export default OrderIngredients;
