// server.js
const express = require("express");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname,'public')));
app.get('/health', (req, res) => res.send('ok'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason && reason.stack ? reason.stack : reason);
});
// Middleware to serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Example route (homepage)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
