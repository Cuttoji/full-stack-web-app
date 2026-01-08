(async ()=>{
  try {
    // Send departmentId as a name to reproduce frontend behavior
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'testuser+probe@example.com', password: 'TestPass123!', departmentId: 'tech' })
    });
    console.log('STATUS', res.status);
    const text = await res.text();
    console.log('BODY');
    console.log(text);
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  }
})();
