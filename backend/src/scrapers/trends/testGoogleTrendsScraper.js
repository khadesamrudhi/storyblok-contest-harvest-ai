// testGoogleTrendsScraper.js
const { getDailyTrends, getRealtimeTrends, getInterestOverTime } = require('./GoogleTrendsScraper');

(async () => {
  console.log('--- Daily Trends (US) ---');
  const daily = await getDailyTrends('US');
  console.log(daily);

  console.log('\n--- Realtime Trends (US, all) ---');
  const realtime = await getRealtimeTrends('US', 'all');
  console.log(realtime);

  console.log('\n--- Interest Over Time ("AI", US) ---');
  const interest = await getInterestOverTime('AI', 'US');
  console.log(interest);
})();
