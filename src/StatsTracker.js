class StatsTracker {
    constructor(storageKey = 'restaurant_stats') {
      this.storageKey = storageKey;
      this.customersServed = 0;
      this.groupsServed = 0;
      this.groupsMissed = 0;
      this.moneyMade = 0;
      this.moneySpent = 0;
      this.userId = null;
    }
  
    setUserId(id) {
      this.userId = id;
    }
  
    incrementCustomersServed() {
      this.customersServed++;
    }
  
    incrementGroupsServed() {
      this.groupsServed++;
    }
  
    incrementGroupsMissed() {
      this.groupsMissed++;
    }
  
    addMoneyMade(amount) {
      this.moneyMade += amount;
    }
  
    addMoneySpent(amount) {
      this.moneySpent += amount;
    }
  
    saveStats() {
      if (!this.userId) {
        console.error('User ID not set');
        return;
      }
  
      const stats = {
        timestamp: new Date().toISOString(),
        userId: this.userId,
        customersServed: this.customersServed,
        groupsServed: this.groupsServed,
        groupsMissed: this.groupsMissed,
        moneyMade: this.moneyMade,
        moneySpent: this.moneySpent
      };
  
      try {
        // Get existing stats array or create new one
        const existingStats = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        existingStats.push(stats);
        localStorage.setItem(this.storageKey, JSON.stringify(existingStats));
      } catch (error) {
        console.error('Error saving stats:', error);
      }
    }
  
    reset() {
      this.customersServed = 0;
      this.groupsServed = 0;
      this.groupsMissed = 0;
      this.moneyMade = 0;
      this.moneySpent = 0;
    }
  
    // Helper method to get all saved stats
    getAllStats() {
      try {
        return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      } catch (error) {
        console.error('Error getting stats:', error);
        return [];
      }
    }
  }
  
  export default StatsTracker;