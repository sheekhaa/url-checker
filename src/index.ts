import express from "express";
import urlRoutes from "./routes/urlRoutes";
import http from "http";
import https from "https";

http.globalAgent.maxSockets = 5;
https.globalAgent.maxSockets = 5;

const PORT = 5001;
const app = express();

app.use(express.json());

app.use("/api", urlRoutes);

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
