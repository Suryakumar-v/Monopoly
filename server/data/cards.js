// Chance Cards (16 cards)
const chanceCards = [
    { id: 'c1', text: 'Advance to GO. Collect ₹200.', action: 'move', destination: 0, collectGO: true },
    { id: 'c2', text: 'Advance to Mumbai (dark blue). If you pass GO, collect ₹200.', action: 'move', destination: 39 },
    { id: 'c3', text: 'Advance to Hyderabad (red). If you pass GO, collect ₹200.', action: 'move', destination: 23 },
    { id: 'c4', text: 'Advance to Chennai Central Station. If you pass GO, collect ₹200.', action: 'move', destination: 5 },
    { id: 'c5', text: 'Advance to nearest Station. Pay owner twice the rental.', action: 'nearest_station', doubleRent: true },
    { id: 'c6', text: 'Advance to nearest Utility. If unowned, you may buy it. If owned, pay 10× dice roll.', action: 'nearest_utility' },
    { id: 'c7', text: 'Bank pays you dividend of ₹50.', action: 'collect', amount: 50 },
    { id: 'c8', text: 'Get Out of Jail Free.', action: 'jail_card' },
    { id: 'c9', text: 'Go back 3 spaces.', action: 'move_back', spaces: 3 },
    { id: 'c10', text: 'Go to Jail. Do not pass GO. Do not collect ₹200.', action: 'go_jail' },
    { id: 'c11', text: 'Make general repairs. Pay ₹25 per house, ₹100 per hotel.', action: 'repairs', housePrice: 25, hotelPrice: 100 },
    { id: 'c12', text: 'Pay poor tax of ₹15.', action: 'pay', amount: 15 },
    { id: 'c13', text: 'Take a trip to Trivandrum (orange). If you pass GO, collect ₹200.', action: 'move', destination: 19 },
    { id: 'c14', text: 'You have been elected Chairman of the Board. Pay each player ₹50.', action: 'pay_each', amount: 50 },
    { id: 'c15', text: 'Your building loan matures. Collect ₹150.', action: 'collect', amount: 150 },
    { id: 'c16', text: 'You have won a crossword competition. Collect ₹100.', action: 'collect', amount: 100 }
];

// Community Chest Cards (16 cards)
const communityChestCards = [
    { id: 'cc1', text: 'Advance to GO. Collect ₹200.', action: 'move', destination: 0, collectGO: true },
    { id: 'cc2', text: 'Bank error in your favor. Collect ₹200.', action: 'collect', amount: 200 },
    { id: 'cc3', text: 'Doctor\'s fees. Pay ₹50.', action: 'pay', amount: 50 },
    { id: 'cc4', text: 'From sale of stock you get ₹50.', action: 'collect', amount: 50 },
    { id: 'cc5', text: 'Get Out of Jail Free.', action: 'jail_card' },
    { id: 'cc6', text: 'Go to Jail. Do not pass GO. Do not collect ₹200.', action: 'go_jail' },
    { id: 'cc7', text: 'Holiday fund matures. Receive ₹100.', action: 'collect', amount: 100 },
    { id: 'cc8', text: 'Income tax refund. Collect ₹20.', action: 'collect', amount: 20 },
    { id: 'cc9', text: 'It is your birthday. Collect ₹10 from each player.', action: 'collect_each', amount: 10 },
    { id: 'cc10', text: 'Life insurance matures. Collect ₹100.', action: 'collect', amount: 100 },
    { id: 'cc11', text: 'Hospital fees. Pay ₹100.', action: 'pay', amount: 100 },
    { id: 'cc12', text: 'School fees. Pay ₹50.', action: 'pay', amount: 50 },
    { id: 'cc13', text: 'Receive ₹25 consultancy fee.', action: 'collect', amount: 25 },
    { id: 'cc14', text: 'You are assessed for street repairs. ₹40 per house, ₹115 per hotel.', action: 'repairs', housePrice: 40, hotelPrice: 115 },
    { id: 'cc15', text: 'You have won second prize in a beauty contest. Collect ₹10.', action: 'collect', amount: 10 },
    { id: 'cc16', text: 'You inherit ₹100.', action: 'collect', amount: 100 }
];

// Shuffle function
function shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

module.exports = {
    chanceCards,
    communityChestCards,
    shuffle
};
