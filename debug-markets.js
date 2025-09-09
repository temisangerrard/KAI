// Quick debug script to check market statuses
// Run this in your browser console on the admin page

// This will log all markets and their statuses
fetch('/api/admin/markets')
  .then(response => response.json())
  .then(data => {
    console.log('All markets:', data);
    
    // Filter for ended markets
    const now = new Date();
    const endedMarkets = data.markets?.filter(market => {
      const endDate = market.endsAt ? new Date(market.endsAt.seconds * 1000) : null;
      return endDate && endDate <= now;
    });
    
    console.log('Ended markets:', endedMarkets);
    
    // Show status breakdown
    const statusCounts = {};
    endedMarkets?.forEach(market => {
      statusCounts[market.status] = (statusCounts[market.status] || 0) + 1;
    });
    
    console.log('Status breakdown for ended markets:', statusCounts);
  })
  .catch(error => console.error('Error:', error));