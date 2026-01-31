const properties = [
    // Bottom Row (Right to Left in UI, but index 0 is GO)
    { id: 'go', name: 'GO', type: 'corner', price: 0 },
    { id: 'guwahati', name: 'Guwahati', group: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250] },
    { id: 'community_chest_1', name: 'Community Chest', type: 'special', price: 0 },
    { id: 'bhubaneswar', name: 'Bhubaneswar', group: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450] },
    { id: 'income_tax', name: 'Income Tax', type: 'tax', price: 0 },
    { id: 'station_1', name: 'Chennai Central', group: 'station', price: 200, rent: [25, 50, 100, 200] },
    { id: 'agra', name: 'Agra', group: 'light_blue', price: 100, rent: [6, 30, 90, 270, 400, 550] },
    { id: 'chance_1', name: 'Chance', type: 'special', price: 0 },
    { id: 'lucknow', name: 'Lucknow', group: 'light_blue', price: 100, rent: [6, 30, 90, 270, 400, 550] },
    { id: 'kanpur', name: 'Kanpur', group: 'light_blue', price: 120, rent: [8, 40, 100, 300, 450, 600] },

    // Jail (Corner)
    { id: 'jail', name: 'Jail', type: 'corner', price: 0 },

    // Left Column (Bottom to Top)
    { id: 'jaipur', name: 'Jaipur', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750] },
    { id: 'electric_company', name: 'Electric Company', type: 'utility', price: 150 },
    { id: 'udaipur', name: 'Udaipur', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750] },
    { id: 'jodhpur', name: 'Jodhpur', group: 'pink', price: 160, rent: [12, 60, 180, 500, 700, 900] },
    { id: 'station_2', name: 'Howrah Junction', group: 'station', price: 200, rent: [25, 50, 100, 200] },
    { id: 'kochi', name: 'Kochi', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950] },
    { id: 'community_chest_2', name: 'Community Chest', type: 'special', price: 0 },
    { id: 'calicut', name: 'Calicut', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950] },
    { id: 'trivandrum', name: 'Trivandrum', group: 'orange', price: 200, rent: [16, 80, 220, 600, 800, 1000] },

    // Free Parking (Corner)
    { id: 'parking', name: 'Free Parking', type: 'corner', price: 0 },

    // Top Row (Left to Right)
    { id: 'vizag', name: 'Visakhapatnam', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050] },
    { id: 'chance_2', name: 'Chance', type: 'special', price: 0 },
    { id: 'hyderabad', name: 'Hyderabad', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050] },
    { id: 'chennai', name: 'Chennai', group: 'red', price: 240, rent: [20, 100, 300, 750, 925, 1100] },
    { id: 'station_3', name: 'Secunderabad', group: 'station', price: 200, rent: [25, 50, 100, 200] },
    { id: 'patna', name: 'Patna', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150] },
    { id: 'ranchi', name: 'Ranchi', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150] },
    { id: 'water_works', name: 'Water Works', type: 'utility', price: 150 },
    { id: 'kolkata', name: 'Kolkata', group: 'yellow', price: 280, rent: [24, 120, 360, 850, 1025, 1200] },

    // Go To Jail (Corner)
    { id: 'goto_jail', name: 'Go To Jail', type: 'corner', price: 0 },

    // Right Column (Top to Bottom)
    { id: 'pune', name: 'Pune', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275] },
    { id: 'ahmedabad', name: 'Ahmedabad', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275] },
    { id: 'community_chest_3', name: 'Community Chest', type: 'special', price: 0 },
    { id: 'bangalore', name: 'Bangalore', group: 'green', price: 320, rent: [28, 150, 450, 1000, 1200, 1400] },
    { id: 'station_4', name: 'CST Mumbai', group: 'station', price: 200, rent: [25, 50, 100, 200] },
    { id: 'chance_3', name: 'Chance', type: 'special', price: 0 },
    { id: 'delhi', name: 'Delhi', group: 'dark_blue', price: 350, rent: [35, 175, 500, 1100, 1300, 1500] },
    { id: 'luxury_tax', name: 'Luxury Tax', type: 'tax', price: 0 },
    { id: 'mumbai', name: 'Mumbai', group: 'dark_blue', price: 400, rent: [50, 200, 600, 1400, 1700, 2000] }
];

module.exports = properties;
