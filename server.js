const app = require('./app');
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`E-commerce Backend Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Hero slides API: http://localhost:${PORT}/api/hero-slides`);
});

module.exports = app;
