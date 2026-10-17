const checks={
  crusoeKeyConfigured:!!process.env.CRUSOE_API_KEY,
  youKeyConfigured:!!process.env.YOU_API_KEY,
  liveCallsEnabled:process.env.ALLOW_LIVE_CALLS==='true'
};
console.log(JSON.stringify({checks,providerRequestsMade:0,liveIntegrationVerified:false},null,2));
if(!checks.crusoeKeyConfigured||!checks.youKeyConfigured)process.exitCode=1;
