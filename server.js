const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(__dirname));

// Simple backend API
app.post("/analyze", (req, res) => {
    console.log("Received from frontend:", req.body);

    res.json({
        success: true,
        message: "Backend connected successfully",
        data: req.body
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});